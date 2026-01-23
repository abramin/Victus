package service

import (
	"context"
	"database/sql"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// DailyLogService handles business logic for daily logs.
type DailyLogService struct {
	logStore     *store.DailyLogStore
	sessionStore *store.TrainingSessionStore
	profileStore *store.ProfileStore
}

// NewDailyLogService creates a new DailyLogService.
func NewDailyLogService(ls *store.DailyLogStore, ss *store.TrainingSessionStore, ps *store.ProfileStore) *DailyLogService {
	return &DailyLogService{
		logStore:     ls,
		sessionStore: ss,
		profileStore: ps,
	}
}

// Create creates a new daily log with calculated targets.
// Returns store.ErrProfileNotFound if no profile exists.
func (s *DailyLogService) Create(ctx context.Context, input domain.DailyLogInput, now time.Time) (*domain.DailyLog, error) {
	// Get profile (required for calculations)
	profile, err := s.profileStore.Get(ctx)
	if err != nil {
		return nil, err
	}

	log, err := domain.NewDailyLogFromInput(input, now)
	if err != nil {
		return nil, err
	}

	// Calculate formula-based TDEE first
	formulaTDEE := domain.CalculateEstimatedTDEE(
		profile,
		log.WeightKg,
		log.PlannedSessions,
		now,
	)

	// Try to calculate adaptive TDEE if profile uses adaptive source
	var adaptiveResult *domain.AdaptiveTDEEResult
	if profile.TDEESource == domain.TDEESourceAdaptive {
		// Fetch historical data for adaptive calculation
		dataPoints, err := s.logStore.ListAdaptiveDataPoints(ctx, log.Date, domain.MaxDataPointsForAdaptive)
		if err == nil && len(dataPoints) >= domain.MinDataPointsForAdaptive {
			adaptiveResult = domain.CalculateAdaptiveTDEE(dataPoints)
		}
	}

	// Get effective TDEE based on profile settings
	effectiveTDEE, tdeeSource, confidence, dataPointsUsed := domain.GetEffectiveTDEE(
		profile, formulaTDEE, adaptiveResult,
	)

	log.EstimatedTDEE = effectiveTDEE
	log.TDEESourceUsed = tdeeSource
	log.TDEEConfidence = confidence
	log.DataPointsUsed = dataPointsUsed

	// Calculate targets using the effective TDEE
	log.CalculatedTargets = domain.CalculateDailyTargets(profile, log, now)

	if err := s.logStore.WithTx(ctx, func(tx *sql.Tx) error {
		// Persist daily log
		logID, err := s.logStore.CreateWithTx(ctx, tx, log)
		if err != nil {
			return err
		}

		// Persist training sessions
		return s.sessionStore.CreateForLogWithTx(ctx, tx, logID, log.PlannedSessions)
	}); err != nil {
		return nil, err
	}

	return s.GetByDate(ctx, log.Date)
}

// GetByDate retrieves a daily log by date with its training sessions.
// Returns store.ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogService) GetByDate(ctx context.Context, date string) (*domain.DailyLog, error) {
	log, err := s.logStore.GetByDate(ctx, date)
	if err != nil {
		return nil, err
	}

	// Load planned training sessions
	planned, err := s.sessionStore.GetPlannedByLogID(ctx, log.ID)
	if err != nil {
		return nil, err
	}
	log.PlannedSessions = planned

	// Load actual training sessions
	actual, err := s.sessionStore.GetActualByLogID(ctx, log.ID)
	if err != nil {
		return nil, err
	}
	log.ActualSessions = actual

	return log, nil
}

// GetToday retrieves today's daily log with its training sessions.
// Returns store.ErrDailyLogNotFound if no log exists for today.
func (s *DailyLogService) GetToday(ctx context.Context, now time.Time) (*domain.DailyLog, error) {
	today := now.Format("2006-01-02")
	return s.GetByDate(ctx, today)
}

// UpdateActualTraining updates the actual training sessions for a given date.
// Returns store.ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogService) UpdateActualTraining(ctx context.Context, date string, sessions []domain.TrainingSession) (*domain.DailyLog, error) {
	// Get existing log to validate it exists and get ID
	log, err := s.logStore.GetByDate(ctx, date)
	if err != nil {
		return nil, err
	}

	// Set IsPlanned=false and assign sequential order
	for i := range sessions {
		sessions[i].IsPlanned = false
		sessions[i].SessionOrder = i + 1
	}

	if err := domain.ValidateTrainingSessions(sessions); err != nil {
		return nil, err
	}

	if err := s.logStore.WithTx(ctx, func(tx *sql.Tx) error {
		// Delete existing actual sessions
		if err := s.sessionStore.DeleteActualByLogIDWithTx(ctx, tx, log.ID); err != nil {
			return err
		}

		// Insert new actual sessions
		return s.sessionStore.CreateForLogWithTx(ctx, tx, log.ID, sessions)
	}); err != nil {
		return nil, err
	}

	// Return updated log with all sessions
	return s.GetByDate(ctx, date)
}

// DeleteToday removes today's daily log.
// Training sessions are deleted automatically via ON DELETE CASCADE.
func (s *DailyLogService) DeleteToday(ctx context.Context, now time.Time) error {
	today := now.Format("2006-01-02")
	return s.logStore.DeleteByDate(ctx, today)
}

// GetWeightTrend returns weight samples and regression trend for the given start date.
// If startDate is empty, all samples are returned.
func (s *DailyLogService) GetWeightTrend(ctx context.Context, startDate string) ([]domain.WeightSample, *domain.WeightTrend, error) {
	samples, err := s.logStore.ListWeights(ctx, startDate)
	if err != nil {
		return nil, nil, err
	}

	trend := domain.CalculateWeightTrend(samples)
	return samples, trend, nil
}
