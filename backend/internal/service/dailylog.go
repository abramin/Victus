package service

import (
	"context"
	"time"

	"victus/internal/calc"
	"victus/internal/models"
	"victus/internal/store"
)

// DailyLogService handles business logic for daily logs.
type DailyLogService struct {
	logStore     *store.DailyLogStore
	profileStore *store.ProfileStore
}

// NewDailyLogService creates a new DailyLogService.
func NewDailyLogService(ls *store.DailyLogStore, ps *store.ProfileStore) *DailyLogService {
	return &DailyLogService{
		logStore:     ls,
		profileStore: ps,
	}
}

// Create creates a new daily log with calculated targets.
// Returns store.ErrProfileNotFound if no profile exists.
func (s *DailyLogService) Create(ctx context.Context, log *models.DailyLog, now time.Time) (*models.DailyLog, error) {
	// Get profile (required for calculations)
	profile, err := s.profileStore.Get(ctx)
	if err != nil {
		return nil, err
	}

	// Apply defaults and validate
	log.SetDefaultsAt(now)
	if err := log.Validate(); err != nil {
		return nil, err
	}

	// Calculate targets
	log.CalculatedTargets = calc.CalculateDailyTargets(profile, log, now)
	log.EstimatedTDEE = calc.CalculateEstimatedTDEE(
		profile,
		log.WeightKg,
		log.PlannedTraining.Type,
		log.PlannedTraining.PlannedDurationMin,
		now,
	)

	// Persist
	if err := s.logStore.Create(ctx, log); err != nil {
		return nil, err
	}

	return s.logStore.GetByDate(ctx, log.Date)
}

// GetToday retrieves today's daily log.
// Returns store.ErrDailyLogNotFound if no log exists for today.
func (s *DailyLogService) GetToday(ctx context.Context, now time.Time) (*models.DailyLog, error) {
	today := now.Format("2006-01-02")
	return s.logStore.GetByDate(ctx, today)
}

// DeleteToday removes today's daily log.
func (s *DailyLogService) DeleteToday(ctx context.Context, now time.Time) error {
	today := now.Format("2006-01-02")
	return s.logStore.DeleteByDate(ctx, today)
}
