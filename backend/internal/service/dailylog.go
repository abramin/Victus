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
	logStore       *store.DailyLogStore
	sessionStore   *store.TrainingSessionStore
	profileStore   *store.ProfileStore
	metabolicStore *store.MetabolicStore
}

// NewDailyLogService creates a new DailyLogService.
func NewDailyLogService(ls *store.DailyLogStore, ss *store.TrainingSessionStore, ps *store.ProfileStore) *DailyLogService {
	return &DailyLogService{
		logStore:     ls,
		sessionStore: ss,
		profileStore: ps,
	}
}

// SetMetabolicStore sets the metabolic store for Flux Engine integration.
// This is optional - if not set, Flux calculations are skipped.
func (s *DailyLogService) SetMetabolicStore(ms *store.MetabolicStore) {
	s.metabolicStore = ms
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

	// Check for recent body fat data for BMR auto-tuning (Precision Mode)
	// This enables Katch-McArdle equation which is more accurate when body fat is known
	const bmrBodyFatLookbackDays = 7
	recentBodyFat, bodyFatDate, _ := s.logStore.GetRecentBodyFat(ctx, log.Date, bmrBodyFatLookbackDays)

	// Use auto-tune for BMR calculation
	bmrEquation := profile.BMREquation
	if bmrEquation == "" {
		bmrEquation = domain.BMREquationMifflinStJeor
	}
	bmrResult := domain.CalculateBMRWithAutoTune(profile, log.WeightKg, now, bmrEquation, recentBodyFat, bodyFatDate)

	// Store precision mode metadata
	log.BMRPrecisionMode = bmrResult.IsPrecisionMode
	log.BodyFatUsedDate = bmrResult.BodyFatDate

	// Calculate formula-based TDEE using the auto-tuned BMR
	exerciseCalories := domain.CalculateTotalExerciseCalories(log.PlannedSessions, log.WeightKg)
	formulaTDEE := int(bmrResult.BMR*1.2 + exerciseCalories)
	log.FormulaTDEE = formulaTDEE

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

	// Calculate recovery score and adjustment multipliers
	recoveryScore, adjustmentMultipliers := s.calculateRecoveryAndAdjustments(ctx, log.Date, int(log.SleepQuality), log.RestingHeartRate)

	if recoveryScore != nil {
		log.RecoveryScore = recoveryScore
	}
	if adjustmentMultipliers != nil {
		log.AdjustmentMultipliers = adjustmentMultipliers
		// Apply adjustment multiplier to effective TDEE
		log.EstimatedTDEE = int(float64(effectiveTDEE) * adjustmentMultipliers.Total)
	}

	// Calculate CNS status if HRV is provided
	if log.HRVMs != nil {
		hrvHistory, _ := s.logStore.GetHRVHistory(ctx, log.Date, domain.HRVBaselineWindowDays)
		cnsInput := domain.CNSInput{
			CurrentHRV: *log.HRVMs,
			HRVHistory: hrvHistory,
		}
		cnsResult := domain.CalculateCNSStatus(cnsInput)
		if cnsResult != nil {
			log.CNSResult = cnsResult

			// Check for training override when CNS is depleted
			if cnsResult.Status == domain.CNSStatusDepleted {
				log.TrainingOverrides = domain.CalculateTrainingOverride(cnsResult.Status, log.PlannedSessions)
			}
		}
	}

	// Calculate targets using the adjusted effective TDEE
	log.CalculatedTargets = domain.CalculateDailyTargets(profile, log, now)

	var createdLogID int64
	if err := s.logStore.WithTx(ctx, func(tx *sql.Tx) error {
		// Persist daily log
		logID, err := s.logStore.CreateWithTx(ctx, tx, log)
		if err != nil {
			return err
		}
		createdLogID = logID

		// Persist training sessions
		return s.sessionStore.CreateForLogWithTx(ctx, tx, logID, log.PlannedSessions)
	}); err != nil {
		return nil, err
	}

	// Record Flux calculation if metabolic store is configured
	if s.metabolicStore != nil {
		s.recordFluxCalculation(ctx, createdLogID, bmrResult.BMR, formulaTDEE, adaptiveResult)
	}

	return s.GetByDate(ctx, log.Date)
}

// recordFluxCalculation calculates and persists Flux Engine data.
// Errors are logged but don't fail the main operation.
func (s *DailyLogService) recordFluxCalculation(
	ctx context.Context,
	dailyLogID int64,
	currentBMR float64,
	formulaTDEE int,
	adaptiveResult *domain.AdaptiveTDEEResult,
) {
	config := domain.DefaultFluxConfig

	// Get previous TDEE for swing constraint
	previousTDEE, err := s.metabolicStore.GetPreviousTDEE(ctx)
	if err != nil {
		return // Skip if we can't get previous TDEE
	}

	// Get adherence (days logged in last 7 days)
	adherenceDays, err := s.metabolicStore.CountRecentLogs(ctx, config.AdherenceWindowDays)
	if err != nil {
		return
	}

	// Get recent weight history for EMA smoothing
	weightHistory, err := s.metabolicStore.ListRecentWeights(ctx, 14) // 2 weeks for smoothing
	if err != nil {
		return
	}

	// Build Flux input
	input := domain.FluxInput{
		CurrentBMR:     currentBMR,
		PreviousTDEE:   float64(previousTDEE),
		WeightHistory:  weightHistory,
		AdaptiveResult: adaptiveResult,
		FormulaTDEE:    formulaTDEE,
		AdherenceDays:  adherenceDays,
	}

	// Calculate Flux with constraints
	result := domain.CalculateFlux(input, config)

	// Determine if notification should be triggered
	notificationPending := domain.ShouldTriggerNotification(result.DeltaKcal) && result.UsedAdaptive

	// Build history record
	record := &domain.MetabolicHistoryRecord{
		DailyLogID:          dailyLogID,
		CalculatedTDEE:      result.TDEE,
		PreviousTDEE:        result.PreviousTDEE,
		DeltaKcal:           result.DeltaKcal,
		TDEESource:          string(result.Source),
		WasSwingConstrained: result.WasSwingConstrained,
		BMRFloorApplied:     result.BMRFloorApplied,
		AdherenceGatePassed: result.AdherenceGatePassed,
		Confidence:          result.Confidence,
		DataPointsUsed:      result.DataPointsUsed,
		EMAWeightKg:         result.EMASmoothedWeight,
		BMRValue:            currentBMR,
		NotificationPending: notificationPending,
	}

	// Persist the record (errors are swallowed - Flux is supplementary)
	_, _ = s.metabolicStore.Create(ctx, record)
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

// UpdateActiveCaloriesBurned updates the active calories burned for a given date.
// Returns store.ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogService) UpdateActiveCaloriesBurned(ctx context.Context, date string, calories *int) (*domain.DailyLog, error) {
	if err := s.logStore.UpdateActiveCaloriesBurned(ctx, date, calories); err != nil {
		return nil, err
	}
	return s.GetByDate(ctx, date)
}

// UpdateFastingOverride updates the fasting override for a given date.
// Pass nil to clear the override (revert to profile default).
// Returns store.ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogService) UpdateFastingOverride(ctx context.Context, date string, override *string) (*domain.DailyLog, error) {
	// Validate the fasting protocol if provided
	if override != nil {
		if _, err := domain.ParseFastingProtocol(*override); err != nil {
			return nil, err
		}
	}

	if err := s.logStore.UpdateFastingOverride(ctx, date, override); err != nil {
		return nil, err
	}
	return s.GetByDate(ctx, date)
}

// UpsertHealthKitMetrics creates or updates a daily log with HealthKit data.
// If a log exists for the date, only non-nil fields are updated.
// If no log exists, a new minimal log is created with defaults.
// Weight is required to create a new log; returns store.ErrWeightRequired if missing.
func (s *DailyLogService) UpsertHealthKitMetrics(ctx context.Context, date string, metrics store.HealthKitMetrics) (*domain.DailyLog, error) {
	if err := s.logStore.UpsertHealthKitMetrics(ctx, date, metrics); err != nil {
		return nil, err
	}
	return s.GetByDate(ctx, date)
}

// AddConsumedMacros adds consumed macros to the existing totals for a given date.
// This is additive - it increments the existing values rather than replacing them.
// Returns store.ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogService) AddConsumedMacros(ctx context.Context, date string, macros store.ConsumedMacros) (*domain.DailyLog, error) {
	if err := s.logStore.AddConsumedMacros(ctx, date, macros); err != nil {
		return nil, err
	}
	return s.GetByDate(ctx, date)
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

// GetHistorySummary returns history points, weight trend, and training aggregates for a range.
func (s *DailyLogService) GetHistorySummary(ctx context.Context, startDate, endDate string) (*domain.HistorySummary, error) {
	points, err := s.logStore.ListHistoryPoints(ctx, startDate)
	if err != nil {
		return nil, err
	}

	weightSamples := make([]domain.WeightSample, len(points))
	for i, point := range points {
		weightSamples[i] = domain.WeightSample{
			Date:     point.Date,
			WeightKg: point.WeightKg,
		}
	}

	var plannedSummary domain.TrainingSummaryAggregate
	var actualSummary domain.TrainingSummaryAggregate

	// Track per-day training details including notes
	type dayTrainingInfo struct {
		HasTraining         bool
		PlannedSessionCount int
		ActualSessionCount  int
		PlannedDurationMin  int
		ActualDurationMin   int
		Notes               string // Aggregated notes from training sessions
	}
	trainingByDate := make(map[string]dayTrainingInfo)

	if len(points) > 0 {
		rangeStart := startDate
		if rangeStart == "" {
			rangeStart = points[0].Date
		}
		rangeEnd := endDate
		if rangeEnd == "" {
			rangeEnd = points[len(points)-1].Date
		}

		if rangeStart != "" && rangeEnd != "" {
			sessionsData, err := s.sessionStore.GetSessionsForDateRange(ctx, rangeStart, rangeEnd)
			if err != nil {
				return nil, err
			}

			var plannedSessions []domain.TrainingSession
			var actualSessions []domain.TrainingSession
			for _, sd := range sessionsData {
				plannedSessions = append(plannedSessions, sd.PlannedSessions...)
				actualSessions = append(actualSessions, sd.ActualSessions...)

				// Calculate per-day details
				info := dayTrainingInfo{
					HasTraining:         len(sd.ActualSessions) > 0,
					PlannedSessionCount: len(sd.PlannedSessions),
					ActualSessionCount:  len(sd.ActualSessions),
				}
				for _, sess := range sd.PlannedSessions {
					info.PlannedDurationMin += sess.DurationMin
				}
				// Aggregate notes from actual sessions (or planned if no actual)
				var noteParts []string
				sessionsToCheck := sd.ActualSessions
				if len(sessionsToCheck) == 0 {
					sessionsToCheck = sd.PlannedSessions
				}
				for _, sess := range sessionsToCheck {
					info.ActualDurationMin += sess.DurationMin
					if sess.Notes != "" {
						noteParts = append(noteParts, sess.Notes)
					}
				}
				if len(noteParts) > 0 {
					info.Notes = joinNotes(noteParts)
				}
				trainingByDate[sd.Date] = info
			}

			plannedSummary = aggregateTrainingSummary(plannedSessions)
			actualSummary = aggregateTrainingSummary(actualSessions)
		}
	}

	// Update points with training details and notes
	for i := range points {
		if info, ok := trainingByDate[points[i].Date]; ok {
			points[i].HasTraining = info.HasTraining
			points[i].PlannedSessionCount = info.PlannedSessionCount
			points[i].ActualSessionCount = info.ActualSessionCount
			points[i].PlannedDurationMin = info.PlannedDurationMin
			points[i].ActualDurationMin = info.ActualDurationMin
			points[i].Notes = info.Notes
		}
	}

	return &domain.HistorySummary{
		Points:          points,
		Trend:           domain.CalculateWeightTrend(weightSamples),
		PlannedTraining: plannedSummary,
		ActualTraining:  actualSummary,
	}, nil
}

// GetDailyTargetsRange returns calculated targets for logs in the date range.
func (s *DailyLogService) GetDailyTargetsRange(ctx context.Context, startDate, endDate string) ([]domain.DailyTargetsPoint, error) {
	return s.logStore.ListDailyTargets(ctx, startDate, endDate)
}

// GetDailyTargetsRangeWithSessions returns calculated targets with training sessions for logs in the date range.
// Used for calendar views that need to correlate nutrition with training.
func (s *DailyLogService) GetDailyTargetsRangeWithSessions(ctx context.Context, startDate, endDate string) ([]domain.DailyTargetsPointWithSessions, error) {
	// Get daily targets
	targets, err := s.logStore.ListDailyTargets(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Get training sessions for the range
	sessionsData, err := s.sessionStore.GetSessionsForDateRange(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Build sessions lookup map for O(1) access
	sessionsByDate := make(map[string]store.SessionsByDate, len(sessionsData))
	for _, sd := range sessionsData {
		sessionsByDate[sd.Date] = sd
	}

	// Merge targets with sessions
	result := make([]domain.DailyTargetsPointWithSessions, len(targets))
	for i, target := range targets {
		result[i] = domain.DailyTargetsPointWithSessions{
			DailyTargetsPoint: target,
		}
		if sd, ok := sessionsByDate[target.Date]; ok {
			result[i].PlannedSessions = sd.PlannedSessions
			result[i].ActualSessions = sd.ActualSessions
		}
	}

	return result, nil
}

// GetLogWithTrainingLoad retrieves a daily log by date with its training load metrics.
// Returns the log and training load (nil if unavailable). The training load is supplementary -
// errors fetching it are swallowed and nil is returned.
func (s *DailyLogService) GetLogWithTrainingLoad(ctx context.Context, date string) (*domain.DailyLog, *domain.TrainingLoadResult, error) {
	log, err := s.GetByDate(ctx, date)
	if err != nil {
		return nil, nil, err
	}
	trainingLoad, _ := s.GetTrainingLoadMetrics(ctx, log.Date, log.ActualSessions, log.PlannedSessions)
	return log, trainingLoad, nil
}

// GetTrainingLoadMetrics calculates ACR metrics for a given date.
// Uses up to 28 days of historical data for chronic load calculation.
// The todayLoad is calculated from the provided actual/planned sessions.
func (s *DailyLogService) GetTrainingLoadMetrics(ctx context.Context, date string, actualSessions, plannedSessions []domain.TrainingSession) (*domain.TrainingLoadResult, error) {
	// Calculate date range (28 days back from date)
	targetDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, err
	}
	startDate := targetDate.AddDate(0, 0, -27).Format("2006-01-02") // 28 days including target

	// Fetch sessions for date range
	sessionsData, err := s.sessionStore.GetSessionsForDateRange(ctx, startDate, date)
	if err != nil {
		return nil, err
	}

	// Convert to daily load data points
	dataPoints := make([]domain.DailyLoadDataPoint, len(sessionsData))
	for i, sd := range sessionsData {
		dataPoints[i] = domain.DailyLoadDataPoint{
			Date:      sd.Date,
			DailyLoad: domain.DailyLoad(sd.ActualSessions, sd.PlannedSessions),
		}
	}

	// Calculate today's load from provided sessions (not from historical data)
	// This allows the API response to reflect current session state accurately
	todayLoad := domain.DailyLoad(actualSessions, plannedSessions)

	// Calculate ACR metrics
	result := domain.CalculateTrainingLoadResult(todayLoad, dataPoints)
	return &result, nil
}

func aggregateTrainingSummary(sessions []domain.TrainingSession) domain.TrainingSummaryAggregate {
	return domain.TrainingSummaryAggregate{
		SessionCount:     len(sessions),
		TotalDurationMin: domain.TotalDurationMin(sessions),
		TotalLoadScore:   domain.TotalLoadScore(sessions),
	}
}

// joinNotes combines multiple note strings into a single string.
// Uses semicolon separator for multiple notes.
func joinNotes(notes []string) string {
	if len(notes) == 0 {
		return ""
	}
	if len(notes) == 1 {
		return notes[0]
	}
	result := notes[0]
	for i := 1; i < len(notes); i++ {
		result += "; " + notes[i]
	}
	return result
}

// calculateRecoveryAndAdjustments computes recovery score and adjustment multipliers
// using historical training and sleep data. Returns nil for both if insufficient data.
func (s *DailyLogService) calculateRecoveryAndAdjustments(ctx context.Context, date string, todaySleepQuality int, currentRHR *int) (*domain.RecoveryScore, *domain.AdjustmentMultipliers) {
	const recoveryLookbackDays = 7
	const rhrLookbackDays = 30

	// Parse target date
	targetDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, nil
	}

	// Get yesterday's date for max load score check
	yesterdayDate := targetDate.AddDate(0, 0, -1).Format("2006-01-02")

	// Calculate date range for 7-day lookback (excluding today for historical data)
	startDate := targetDate.AddDate(0, 0, -recoveryLookbackDays).Format("2006-01-02")

	// Fetch sleep quality history for last 7 days
	sleepData, err := s.logStore.GetRecoveryData(ctx, yesterdayDate, recoveryLookbackDays)
	if err != nil {
		return nil, nil
	}

	// Fetch training sessions for the same date range (for ACR and rest days)
	sessionsData, err := s.sessionStore.GetSessionsForDateRange(ctx, startDate, yesterdayDate)
	if err != nil {
		return nil, nil
	}

	// If no historical data, return nil (first day or insufficient history)
	if len(sleepData) == 0 && len(sessionsData) == 0 {
		return nil, nil
	}

	// Calculate average sleep quality over last 7 days
	var totalSleepQuality float64
	for _, dp := range sleepData {
		totalSleepQuality += float64(dp.SleepQuality)
	}
	avgSleepQuality := 50.0 // Default if no data
	if len(sleepData) > 0 {
		avgSleepQuality = totalSleepQuality / float64(len(sleepData))
	}

	// Fetch 30-day RHR average for recovery score calculation
	var avgRHR *float64
	if currentRHR != nil {
		avgRHR, _ = s.logStore.GetRHRAverage(ctx, date, rhrLookbackDays)
	}

	// Analyze session patterns for rest days and yesterday's max load
	patternData := make([]domain.SessionPatternData, len(sessionsData))
	for i, sd := range sessionsData {
		patternData[i] = domain.SessionPatternData{
			Date:            sd.Date,
			PlannedSessions: sd.PlannedSessions,
			ActualSessions:  sd.ActualSessions,
		}
	}
	pattern := domain.AnalyzeSessionPattern(patternData, yesterdayDate)

	// Get ACR using existing method (uses 28-day lookback for chronic load)
	trainingLoadResult, err := s.GetTrainingLoadMetrics(ctx, date, nil, nil)
	if err != nil {
		// If we can't get ACR, use default of 1.0
		trainingLoadResult = &domain.TrainingLoadResult{ACR: 1.0}
	}

	// Calculate recovery score
	recoveryInput := domain.RecoveryScoreInput{
		RestDaysLast7:     pattern.RestDays,
		ACR:               trainingLoadResult.ACR,
		AvgSleepQualityL7: avgSleepQuality,
		CurrentRHR:        currentRHR,
		AvgRHRLast30:      avgRHR,
	}
	recoveryScore := domain.CalculateRecoveryScore(recoveryInput)

	// Calculate adjustment multipliers
	adjustmentInput := domain.AdjustmentInput{
		ACR:               trainingLoadResult.ACR,
		RecoveryScore:     recoveryScore.Score,
		TodaySleepQuality: todaySleepQuality,
		YesterdayMaxLoad:  pattern.YesterdayMaxLoad,
	}
	adjustmentMultipliers := domain.CalculateAdjustmentMultipliers(adjustmentInput)

	return &recoveryScore, &adjustmentMultipliers
}
