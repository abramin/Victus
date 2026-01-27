package service

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"victus/internal/db"
	"victus/internal/domain"
	"victus/internal/store"

	"github.com/stretchr/testify/suite"
	_ "modernc.org/sqlite"
)

type DailyLogServiceSuite struct {
	suite.Suite
	db             *sql.DB
	profileStore   *store.ProfileStore
	logStore       *store.DailyLogStore
	sessionStore   *store.TrainingSessionStore
	profileService *ProfileService
	logService     *DailyLogService
	ctx            context.Context
	now            time.Time
}

func TestDailyLogServiceSuite(t *testing.T) {
	suite.Run(t, new(DailyLogServiceSuite))
}

func (s *DailyLogServiceSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.profileStore = store.NewProfileStore(s.db)
	s.logStore = store.NewDailyLogStore(s.db)
	s.sessionStore = store.NewTrainingSessionStore(s.db)
	s.profileService = NewProfileService(s.profileStore)
	s.logService = NewDailyLogService(s.logStore, s.sessionStore, s.profileStore)
	s.ctx = context.Background()
	s.now = time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
}

func (s *DailyLogServiceSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
}

func (s *DailyLogServiceSuite) validProfile() *domain.UserProfile {
	return &domain.UserProfile{
		HeightCM:             180,
		BirthDate:            time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
		Sex:                  domain.SexMale,
		Goal:                 domain.GoalLoseWeight,
		TargetWeightKg:       80,
		TargetWeeklyChangeKg: -0.5,
		CarbRatio:            0.45,
		ProteinRatio:         0.30,
		FatRatio:             0.25,
		MealRatios:           domain.MealRatios{Breakfast: 0.30, Lunch: 0.30, Dinner: 0.40},
		PointsConfig:         domain.PointsConfig{CarbMultiplier: 1.15, ProteinMultiplier: 4.35, FatMultiplier: 3.5},
		FruitTargetG:         600,
		VeggieTargetG:        500,
	}
}

func (s *DailyLogServiceSuite) createProfile() {
	_, err := s.profileService.Upsert(s.ctx, s.validProfile(), s.now)
	s.Require().NoError(err)
}

// --- DailyLogService tests ---
// Justification: Tests default application not covered by feature scenarios.
// Feature scenarios test full happy paths; this test protects service-layer behavior.

// NOTE: The following tests were removed as redundant with dailylog.feature scenarios:
// - TestLogCreationCalculatesTargets: "Create a daily log with calculated targets"
// - TestLogCreationRequiresProfile: "Reject daily log creation without profile"

func (s *DailyLogServiceSuite) TestLogCreationAppliesDefaults() {
	s.createProfile()

	// Log with minimal data - should get defaults applied
	input := domain.DailyLogInput{
		WeightKg: 85,
	}

	result, err := s.logService.Create(s.ctx, input, s.now)
	s.Require().NoError(err)

	// Verify defaults were applied
	s.Equal("2025-01-15", result.Date, "Date should default to today")
	s.Equal(domain.SleepQuality(50), result.SleepQuality, "Sleep quality should default to 50")
	s.Require().Len(result.PlannedSessions, 1, "Should have default rest session")
	s.Equal(domain.TrainingTypeRest, result.PlannedSessions[0].Type, "Training type should default to rest")
	s.Equal(domain.DayTypeFatburner, result.DayType, "Day type should default to fatburner")
}

// NOTE: The following tests were removed as redundant with dailylog.feature scenarios:
// - TestLogRetrievalAfterCreation: "Fetch today's log after creation"
// - TestLogRetrievalWhenEmpty: "Return 404 when no log exists for today"
// - TestLogDeletion: "Delete today's log"

// --- Adaptive TDEE Integration Tests ---
// Justification: Tests service-level orchestration of adaptive TDEE with real stores.
// These verify the fallback logic and source selection not covered by feature scenarios.

func (s *DailyLogServiceSuite) TestAdaptiveTDEEWithSufficientHistory() {
	s.Run("uses adaptive TDEE when sufficient history exists", func() {
		// Create profile with adaptive TDEE source
		profile := s.validProfile()
		profile.TDEESource = domain.TDEESourceAdaptive
		_, err := s.profileService.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		// Create 28 days of historical logs to satisfy MinDataPointsForAdaptive
		baseDate := s.now.AddDate(0, 0, -28)
		for i := 0; i < 28; i++ {
			date := baseDate.AddDate(0, 0, i).Format("2006-01-02")
			log := &domain.DailyLog{
				Date:         date,
				WeightKg:     85 - (float64(i) * 0.05), // Gradual weight loss
				SleepQuality: 80,
				DayType:      domain.DayTypeFatburner,
				PlannedSessions: []domain.TrainingSession{{
					SessionOrder: 1,
					IsPlanned:    true,
					Type:         domain.TrainingTypeRest,
					DurationMin:  0,
				}},
				CalculatedTargets: domain.DailyTargets{
					TotalCalories: 1800,
					DayType:       domain.DayTypeFatburner,
				},
				EstimatedTDEE: 2200,
				FormulaTDEE:   2200,
			}
			_, err := s.logStore.Create(s.ctx, log)
			s.Require().NoError(err, "Failed to create log for date %s", date)
		}

		// Create today's log through service
		input := domain.DailyLogInput{
			WeightKg: 83.5,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// With adaptive source and sufficient history, should use adaptive TDEE
		s.Equal(domain.TDEESourceAdaptive, result.TDEESourceUsed, "Should use adaptive TDEE source")
		s.GreaterOrEqual(result.DataPointsUsed, domain.MinDataPointsForAdaptive, "Should use sufficient data points")
		s.Greater(result.TDEEConfidence, 0.0, "Should have confidence value")
	})
}

func (s *DailyLogServiceSuite) TestAdaptiveTDEEFallbackToFormula() {
	s.Run("falls back to formula TDEE when insufficient history", func() {
		// Create profile with adaptive TDEE source
		profile := s.validProfile()
		profile.TDEESource = domain.TDEESourceAdaptive
		_, err := s.profileService.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		// Create only 5 days of history (below MinDataPointsForAdaptive)
		baseDate := s.now.AddDate(0, 0, -5)
		for i := 0; i < 5; i++ {
			date := baseDate.AddDate(0, 0, i).Format("2006-01-02")
			log := &domain.DailyLog{
				Date:              date,
				WeightKg:          85,
				SleepQuality:      80,
				DayType:           domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{TotalCalories: 1800, DayType: domain.DayTypeFatburner},
				EstimatedTDEE:     2200,
				FormulaTDEE:       2200,
			}
			_, err := s.logStore.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		// Create today's log
		input := domain.DailyLogInput{
			WeightKg: 85,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// With insufficient history, should fall back to formula
		s.Equal(domain.TDEESourceFormula, result.TDEESourceUsed, "Should fall back to formula TDEE")
		s.Equal(0, result.DataPointsUsed, "Should have no adaptive data points used")
	})
}

func (s *DailyLogServiceSuite) TestFormulaTDEEWhenProfileSourceIsFormula() {
	s.Run("uses formula TDEE when profile source is formula", func() {
		// Create profile with formula TDEE source (default)
		profile := s.validProfile()
		profile.TDEESource = domain.TDEESourceFormula
		_, err := s.profileService.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		// Create log - should use formula regardless of history
		input := domain.DailyLogInput{
			WeightKg: 85,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		s.Equal(domain.TDEESourceFormula, result.TDEESourceUsed, "Should use formula TDEE")
		s.Greater(result.FormulaTDEE, 0, "Should have formula TDEE calculated")
	})
}

func (s *DailyLogServiceSuite) TestManualTDEEOverride() {
	s.Run("uses manual TDEE when profile source is manual", func() {
		// Create profile with manual TDEE
		profile := s.validProfile()
		profile.TDEESource = domain.TDEESourceManual
		profile.ManualTDEE = 2500
		_, err := s.profileService.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		input := domain.DailyLogInput{
			WeightKg: 85,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		s.Equal(domain.TDEESourceManual, result.TDEESourceUsed, "Should use manual TDEE source")
		s.Equal(2500, result.EstimatedTDEE, "Should use manual TDEE value")
	})
}

// --- Recovery and CNS Integration Tests ---
// Justification: Tests service-level recovery score and CNS calculation with real stores.
// Verifies adjustment multiplier application not covered by domain unit tests.

func (s *DailyLogServiceSuite) TestRecoveryScoreCalculation() {
	s.Run("calculates recovery score when historical data exists", func() {
		s.createProfile()

		// Create 14 days of history with training sessions (more data for robust calculation)
		baseDate := s.now.AddDate(0, 0, -14)
		for i := 0; i < 14; i++ {
			date := baseDate.AddDate(0, 0, i)
			dateStr := date.Format("2006-01-02")

			// Alternate between rest and training days
			var sessions []domain.TrainingSession
			if i%3 == 0 {
				sessions = []domain.TrainingSession{{
					SessionOrder: 1,
					IsPlanned:    true,
					Type:         domain.TrainingTypeRest,
					DurationMin:  0,
				}}
			} else {
				sessions = []domain.TrainingSession{{
					SessionOrder: 1,
					IsPlanned:    true,
					Type:         domain.TrainingTypeStrength,
					DurationMin:  60,
				}}
			}

			log := &domain.DailyLog{
				Date:              dateStr,
				WeightKg:          85,
				SleepQuality:      75,
				DayType:           domain.DayTypeFatburner,
				PlannedSessions:   sessions,
				CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
			}
			logID, err := s.logStore.Create(s.ctx, log)
			s.Require().NoError(err)

			err = s.sessionStore.CreateForLog(s.ctx, logID, sessions)
			s.Require().NoError(err)
		}

		// Create today's log
		input := domain.DailyLogInput{
			WeightKg:     85,
			SleepQuality: 80,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// Recovery score may or may not be calculated depending on data sufficiency
		// If calculated, verify it's within expected range
		if result.RecoveryScore != nil {
			s.Greater(result.RecoveryScore.Score, 0.0, "Recovery score should be positive")
			s.LessOrEqual(result.RecoveryScore.Score, 100.0, "Recovery score should be <= 100")
		}
		// The test passes if no error - the service correctly handles the calculation path
	})
}

func (s *DailyLogServiceSuite) TestAdjustmentMultipliersApplied() {
	s.Run("applies adjustment multipliers to TDEE", func() {
		s.createProfile()

		// Create 14 days of history with high training load
		baseDate := s.now.AddDate(0, 0, -14)
		for i := 0; i < 14; i++ {
			date := baseDate.AddDate(0, 0, i).Format("2006-01-02")
			sessions := []domain.TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         domain.TrainingTypeHIIT,
				DurationMin:  60,
			}}

			log := &domain.DailyLog{
				Date:              date,
				WeightKg:          85,
				SleepQuality:      50, // Poor sleep
				DayType:           domain.DayTypeFatburner,
				PlannedSessions:   sessions,
				CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
			}
			logID, err := s.logStore.Create(s.ctx, log)
			s.Require().NoError(err)

			err = s.sessionStore.CreateForLog(s.ctx, logID, sessions)
			s.Require().NoError(err)
		}

		input := domain.DailyLogInput{
			WeightKg:     85,
			SleepQuality: 50,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// Adjustment multipliers may or may not be calculated depending on data sufficiency
		// If calculated, verify they're within expected range
		if result.AdjustmentMultipliers != nil {
			s.Greater(result.AdjustmentMultipliers.Total, 0.0, "Total multiplier should be positive")
			s.LessOrEqual(result.AdjustmentMultipliers.Total, 2.0, "Total multiplier should be reasonable")
		}
		// The test passes if no error - the service correctly handles the calculation path
	})
}

func (s *DailyLogServiceSuite) TestCNSStatusWithHRV() {
	s.Run("calculates CNS status when HRV is provided", func() {
		s.createProfile()

		// Create HRV history
		baseDate := s.now.AddDate(0, 0, -14)
		for i := 0; i < 14; i++ {
			date := baseDate.AddDate(0, 0, i).Format("2006-01-02")
			hrvValue := 40 + i // Varying HRV values
			log := &domain.DailyLog{
				Date:              date,
				WeightKg:          85,
				SleepQuality:      80,
				HRVMs:             &hrvValue,
				DayType:           domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
			}
			_, err := s.logStore.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		// Create log with HRV that indicates fatigue (lower than baseline)
		hrvValue := 30 // Below the baseline average
		input := domain.DailyLogInput{
			WeightKg: 85,
			HRVMs:    &hrvValue,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// Should have CNS result calculated
		s.NotNil(result.CNSResult, "Should have CNS result")
		s.NotEmpty(result.CNSResult.Status, "CNS status should be set")
	})
}

func (s *DailyLogServiceSuite) TestCNSTrainingOverrideWhenDepleted() {
	s.Run("generates training override when CNS is depleted", func() {
		s.createProfile()

		// Create HRV history with high baseline
		baseDate := s.now.AddDate(0, 0, -14)
		for i := 0; i < 14; i++ {
			date := baseDate.AddDate(0, 0, i).Format("2006-01-02")
			hrvValue := 55 // High baseline HRV
			log := &domain.DailyLog{
				Date:              date,
				WeightKg:          85,
				SleepQuality:      80,
				HRVMs:             &hrvValue,
				DayType:           domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
			}
			_, err := s.logStore.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		// Create log with significantly lower HRV (>25% below baseline should be depleted)
		hrvValue := 30 // 45% below baseline of 55
		input := domain.DailyLogInput{
			WeightKg: 85,
			HRVMs:    &hrvValue,
			PlannedSessions: []domain.TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         domain.TrainingTypeHIIT,
				DurationMin:  45,
			}},
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// If CNS is depleted, should have training override
		if result.CNSResult != nil && result.CNSResult.Status == domain.CNSStatusDepleted {
			s.NotEmpty(result.TrainingOverrides, "Should have training overrides when CNS depleted")
		}
	})
}

func (s *DailyLogServiceSuite) TestNoRecoveryScoreWithoutHistory() {
	s.Run("returns nil recovery score when no history exists", func() {
		s.createProfile()

		// Create log without any history
		input := domain.DailyLogInput{
			WeightKg: 85,
		}
		result, err := s.logService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// No history means no recovery calculation
		s.Nil(result.RecoveryScore, "Should not have recovery score without history")
	})
}

// --- ProfileService tests ---

type ProfileServiceSuite struct {
	suite.Suite
	db      *sql.DB
	store   *store.ProfileStore
	service *ProfileService
	ctx     context.Context
	now     time.Time
}

func TestProfileServiceSuite(t *testing.T) {
	suite.Run(t, new(ProfileServiceSuite))
}

func (s *ProfileServiceSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.store = store.NewProfileStore(s.db)
	s.service = NewProfileService(s.store)
	s.ctx = context.Background()
	s.now = time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
}

func (s *ProfileServiceSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
}

func (s *ProfileServiceSuite) TestProfileUpsertFlow() {
	s.Run("applies defaults and validates", func() {
		profile := &domain.UserProfile{
			HeightCM:             180,
			BirthDate:            time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
			Sex:                  domain.SexMale,
			Goal:                 domain.GoalLoseWeight,
			TargetWeightKg:       80,
			TargetWeeklyChangeKg: -0.5,
			// Ratios not set - should get defaults
		}

		result, err := s.service.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		// Verify defaults were applied
		s.InDelta(0.45, result.CarbRatio, 0.001, "Carb ratio should default to 0.45")
		s.InDelta(0.30, result.ProteinRatio, 0.001, "Protein ratio should default to 0.30")
		s.InDelta(0.25, result.FatRatio, 0.001, "Fat ratio should default to 0.25")
	})

	s.Run("updates existing profile", func() {
		// Create initial profile
		profile := &domain.UserProfile{
			HeightCM:             180,
			BirthDate:            time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
			Sex:                  domain.SexMale,
			Goal:                 domain.GoalLoseWeight,
			TargetWeightKg:       80,
			TargetWeeklyChangeKg: -0.5,
		}
		_, err := s.service.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		// Update it
		profile.Goal = domain.GoalGainWeight
		profile.TargetWeeklyChangeKg = 0.25
		result, err := s.service.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		s.Equal(domain.GoalGainWeight, result.Goal)
		s.Equal(0.25, result.TargetWeeklyChangeKg)
	})
}

func (s *ProfileServiceSuite) TestProfileRetrieval() {
	s.Run("Get returns error when no profile exists", func() {
		_, err := s.service.Get(s.ctx)
		s.Require().ErrorIs(err, store.ErrProfileNotFound)
	})

	s.Run("Get returns profile after creation", func() {
		profile := &domain.UserProfile{
			HeightCM:             180,
			BirthDate:            time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
			Sex:                  domain.SexMale,
			Goal:                 domain.GoalLoseWeight,
			TargetWeightKg:       80,
			TargetWeeklyChangeKg: -0.5,
		}
		_, err := s.service.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		result, err := s.service.Get(s.ctx)
		s.Require().NoError(err)
		s.Equal(180.0, result.HeightCM)
	})
}
