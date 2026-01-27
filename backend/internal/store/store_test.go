package store

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"victus/internal/domain"
	"victus/internal/testutil"

	"github.com/stretchr/testify/suite"
)

// Justification: Store tests verify persistence and schema constraints beyond
// feature-level coverage.

// --- Profile Store Suite ---

type ProfileStoreSuite struct {
	suite.Suite
	pg    *testutil.PostgresContainer
	db    *sql.DB
	store *ProfileStore
	ctx   context.Context
}

func TestProfileStoreSuite(t *testing.T) {
	suite.Run(t, new(ProfileStoreSuite))
}

func (s *ProfileStoreSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *ProfileStoreSuite) SetupTest() {
	s.ctx = context.Background()
	s.Require().NoError(s.pg.ClearTables(s.ctx))
	s.store = NewProfileStore(s.db)
}

func (s *ProfileStoreSuite) validProfile() *domain.UserProfile {
	return &domain.UserProfile{
		HeightCM:             180,
		BirthDate:            time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
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

func (s *ProfileStoreSuite) TestProfileNotFoundBeforeCreation() {
	s.Run("Get returns ErrProfileNotFound when empty", func() {
		_, err := s.store.Get(s.ctx)
		s.Require().ErrorIs(err, ErrProfileNotFound)
	})
}

func (s *ProfileStoreSuite) TestProfileDataIntegrity() {
	s.Run("all fields survive serialization", func() {
		profile := s.validProfile()
		err := s.store.Upsert(s.ctx, profile)
		s.Require().NoError(err)

		loaded, err := s.store.Get(s.ctx)
		s.Require().NoError(err)

		s.Equal(profile.HeightCM, loaded.HeightCM)
		s.Equal(profile.BirthDate.Format("2006-01-02"), loaded.BirthDate.Format("2006-01-02"))
		s.Equal(profile.Sex, loaded.Sex)
		s.Equal(profile.Goal, loaded.Goal)
		s.Equal(profile.TargetWeightKg, loaded.TargetWeightKg)
		s.Equal(profile.TargetWeeklyChangeKg, loaded.TargetWeeklyChangeKg)
		s.InDelta(profile.CarbRatio, loaded.CarbRatio, 0.001)
		s.InDelta(profile.ProteinRatio, loaded.ProteinRatio, 0.001)
		s.InDelta(profile.FatRatio, loaded.FatRatio, 0.001)
		s.InDelta(profile.MealRatios.Breakfast, loaded.MealRatios.Breakfast, 0.001)
		s.InDelta(profile.PointsConfig.CarbMultiplier, loaded.PointsConfig.CarbMultiplier, 0.001)
		s.Equal(profile.FruitTargetG, loaded.FruitTargetG)
		s.Equal(profile.VeggieTargetG, loaded.VeggieTargetG)
	})

	s.Run("upsert updates existing profile", func() {
		profile := s.validProfile()
		err := s.store.Upsert(s.ctx, profile)
		s.Require().NoError(err)

		// Update
		profile.HeightCM = 175
		profile.Goal = domain.GoalGainWeight
		err = s.store.Upsert(s.ctx, profile)
		s.Require().NoError(err)

		loaded, err := s.store.Get(s.ctx)
		s.Require().NoError(err)
		s.Equal(175.0, loaded.HeightCM)
		s.Equal(domain.GoalGainWeight, loaded.Goal)
	})
}

func (s *ProfileStoreSuite) TestProfileRemoval() {
	s.Run("removes profile from store", func() {
		profile := s.validProfile()
		err := s.store.Upsert(s.ctx, profile)
		s.Require().NoError(err)

		err = s.store.Delete(s.ctx)
		s.Require().NoError(err)

		_, err = s.store.Get(s.ctx)
		s.Require().ErrorIs(err, ErrProfileNotFound)
	})

	s.Run("is idempotent on missing profile", func() {
		// Ensure no profile exists
		_ = s.store.Delete(s.ctx)

		// Deleting again should not error
		err := s.store.Delete(s.ctx)
		s.Require().NoError(err, "Deleting nonexistent profile should not error")
	})
}

// --- Daily Log Store Suite ---

type DailyLogStoreSuite struct {
	suite.Suite
	pg    *testutil.PostgresContainer
	db    *sql.DB
	store *DailyLogStore
	ctx   context.Context
}

func TestDailyLogStoreSuite(t *testing.T) {
	suite.Run(t, new(DailyLogStoreSuite))
}

func (s *DailyLogStoreSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *DailyLogStoreSuite) SetupTest() {
	s.ctx = context.Background()
	s.Require().NoError(s.pg.ClearTables(s.ctx))
	s.store = NewDailyLogStore(s.db)
}

func (s *DailyLogStoreSuite) TestLogNotFoundBeforeCreation() {
	s.Run("GetByDate returns ErrDailyLogNotFound when empty", func() {
		_, err := s.store.GetByDate(s.ctx, "2025-01-15")
		s.Require().ErrorIs(err, ErrDailyLogNotFound)
	})
}

func (s *DailyLogStoreSuite) TestLogFieldPreservation() {
	s.Run("all fields including nested structures survive persistence", func() {
		log := &domain.DailyLog{
			Date:         "2025-01-15",
			WeightKg:     85,
			SleepQuality: 80,
			DayType:      domain.DayTypePerformance,
			CalculatedTargets: domain.DailyTargets{
				TotalCarbsG:   250,
				TotalProteinG: 150,
				TotalFatsG:    80,
				TotalCalories: 2400,
				Meals: domain.MealTargets{
					Breakfast: domain.MacroPoints{Carbs: 60, Protein: 40, Fats: 20},
					Lunch:     domain.MacroPoints{Carbs: 80, Protein: 50, Fats: 30},
					Dinner:    domain.MacroPoints{Carbs: 110, Protein: 60, Fats: 30},
				},
				FruitG:   300,
				VeggiesG: 400,
				WaterL:   3.4,
				DayType:  domain.DayTypePerformance,
			},
			EstimatedTDEE: 2500,
			FormulaTDEE:   2450,
		}

		logID, err := s.store.Create(s.ctx, log)
		s.Require().NoError(err)
		s.Greater(logID, int64(0))

		loaded, err := s.store.GetByDate(s.ctx, "2025-01-15")
		s.Require().NoError(err)

		s.Equal(log.Date, loaded.Date)
		s.Equal(log.WeightKg, loaded.WeightKg)
		s.Equal(log.SleepQuality, loaded.SleepQuality)
		s.Equal(log.DayType, loaded.DayType)
		s.Equal(log.CalculatedTargets.TotalCalories, loaded.CalculatedTargets.TotalCalories)
		s.Equal(log.CalculatedTargets.Meals.Breakfast.Carbs, loaded.CalculatedTargets.Meals.Breakfast.Carbs)
		s.Equal(log.EstimatedTDEE, loaded.EstimatedTDEE)
		s.Equal(log.FormulaTDEE, loaded.FormulaTDEE)
	})
}

func (s *DailyLogStoreSuite) TestLogNullableFieldRoundTrip() {
	s.Run("nil optional fields stay nil", func() {
		log := &domain.DailyLog{
			Date:              "2025-01-15",
			WeightKg:          85,
			BodyFatPercent:    nil,
			RestingHeartRate:  nil,
			SleepQuality:      80,
			SleepHours:        nil,
			DayType:           domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
		}

		_, err := s.store.Create(s.ctx, log)
		s.Require().NoError(err)

		loaded, err := s.store.GetByDate(s.ctx, "2025-01-15")
		s.Require().NoError(err)

		s.Nil(loaded.BodyFatPercent, "BodyFatPercent should be nil")
		s.Nil(loaded.RestingHeartRate, "RestingHeartRate should be nil")
		s.Nil(loaded.SleepHours, "SleepHours should be nil")
	})

	s.Run("set optional fields are preserved", func() {
		bf := 15.5
		hr := 55
		sh := 7.5

		log := &domain.DailyLog{
			Date:              "2025-01-16",
			WeightKg:          85,
			BodyFatPercent:    &bf,
			RestingHeartRate:  &hr,
			SleepQuality:      80,
			SleepHours:        &sh,
			DayType:           domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
		}

		_, err := s.store.Create(s.ctx, log)
		s.Require().NoError(err)

		loaded, err := s.store.GetByDate(s.ctx, "2025-01-16")
		s.Require().NoError(err)

		s.Require().NotNil(loaded.BodyFatPercent)
		s.Equal(15.5, *loaded.BodyFatPercent)

		s.Require().NotNil(loaded.RestingHeartRate)
		s.Equal(55, *loaded.RestingHeartRate)

		s.Require().NotNil(loaded.SleepHours)
		s.Equal(7.5, *loaded.SleepHours)
	})
}

func (s *DailyLogStoreSuite) TestLogDateUniqueness() {
	s.Run("duplicate date returns error", func() {
		log := &domain.DailyLog{
			Date:              "2025-01-15",
			WeightKg:          85,
			SleepQuality:      80,
			DayType:           domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
		}

		_, err := s.store.Create(s.ctx, log)
		s.Require().NoError(err)

		// Try to create again with same date
		log2 := &domain.DailyLog{
			Date:              "2025-01-15",
			WeightKg:          90,
			SleepQuality:      70,
			DayType:           domain.DayTypePerformance,
			CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypePerformance},
		}

		_, err = s.store.Create(s.ctx, log2)
		s.Require().ErrorIs(err, ErrDailyLogAlreadyExists)
	})
}

func (s *DailyLogStoreSuite) TestLogRemoval() {
	s.Run("removes log from store", func() {
		log := &domain.DailyLog{
			Date:              "2025-01-15",
			WeightKg:          85,
			SleepQuality:      80,
			DayType:           domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
		}

		_, err := s.store.Create(s.ctx, log)
		s.Require().NoError(err)

		err = s.store.DeleteByDate(s.ctx, "2025-01-15")
		s.Require().NoError(err)

		_, err = s.store.GetByDate(s.ctx, "2025-01-15")
		s.Require().ErrorIs(err, ErrDailyLogNotFound)
	})

	s.Run("is idempotent on missing log", func() {
		err := s.store.DeleteByDate(s.ctx, "2025-12-31")
		s.Require().NoError(err, "Deleting nonexistent log should not error")
	})
}

func (s *DailyLogStoreSuite) TestLogMultipleDates() {
	s.Run("can store logs for different dates", func() {
		dates := []string{"2025-01-10", "2025-01-11", "2025-01-12"}

		for _, date := range dates {
			log := &domain.DailyLog{
				Date:              date,
				WeightKg:          85,
				SleepQuality:      80,
				DayType:           domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
			}
			_, err := s.store.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		// Verify each can be retrieved
		for _, date := range dates {
			loaded, err := s.store.GetByDate(s.ctx, date)
			s.Require().NoError(err)
			s.Equal(date, loaded.Date)
		}
	})
}

// --- ListAdaptiveDataPoints Tests ---
// Justification: Tests edge cases for adaptive TDEE data retrieval not covered
// by feature scenarios.

func (s *DailyLogStoreSuite) TestListAdaptiveDataPointsEmptyHistory() {
	s.Run("returns empty slice when no logs exist", func() {
		result, err := s.store.ListAdaptiveDataPoints(s.ctx, "2026-01-15", 28)
		s.Require().NoError(err)
		s.Empty(result)
	})
}

func (s *DailyLogStoreSuite) TestListAdaptiveDataPointsFiltersZeroCalories() {
	s.Run("excludes logs with zero total calories", func() {
		// Create log with calories
		logWithCalories := &domain.DailyLog{
			Date:         "2026-01-10",
			WeightKg:     85,
			SleepQuality: 80,
			DayType:      domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{
				TotalCalories: 1800,
				DayType:       domain.DayTypeFatburner,
			},
			EstimatedTDEE: 2200,
			FormulaTDEE:   2200,
		}
		_, err := s.store.Create(s.ctx, logWithCalories)
		s.Require().NoError(err)

		// Create log without calories (zero)
		logWithoutCalories := &domain.DailyLog{
			Date:         "2026-01-11",
			WeightKg:     85,
			SleepQuality: 80,
			DayType:      domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{
				TotalCalories: 0,
				DayType:       domain.DayTypeFatburner,
			},
		}
		_, err = s.store.Create(s.ctx, logWithoutCalories)
		s.Require().NoError(err)

		result, err := s.store.ListAdaptiveDataPoints(s.ctx, "2026-01-15", 28)
		s.Require().NoError(err)
		s.Len(result, 1, "Should only include logs with calories > 0")
		s.Equal("2026-01-10", result[0].Date)
	})
}

func (s *DailyLogStoreSuite) TestListAdaptiveDataPointsDateBoundary() {
	s.Run("respects endDate boundary", func() {
		dates := []string{"2026-01-10", "2026-01-15", "2026-01-20"}
		for _, date := range dates {
			log := &domain.DailyLog{
				Date:         date,
				WeightKg:     85,
				SleepQuality: 80,
				DayType:      domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{
					TotalCalories: 1800,
					DayType:       domain.DayTypeFatburner,
				},
				EstimatedTDEE: 2200,
				FormulaTDEE:   2200,
			}
			_, err := s.store.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		// Query with endDate before the last log
		result, err := s.store.ListAdaptiveDataPoints(s.ctx, "2026-01-15", 28)
		s.Require().NoError(err)
		s.Len(result, 2, "Should exclude logs after endDate")
	})
}

func (s *DailyLogStoreSuite) TestListAdaptiveDataPointsMaxDaysLimit() {
	s.Run("respects maxDays limit", func() {
		// Create 10 logs
		for i := 0; i < 10; i++ {
			date := time.Date(2026, 1, 10+i, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
			log := &domain.DailyLog{
				Date:         date,
				WeightKg:     85,
				SleepQuality: 80,
				DayType:      domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{
					TotalCalories: 1800,
					DayType:       domain.DayTypeFatburner,
				},
				EstimatedTDEE: 2200,
				FormulaTDEE:   2200,
			}
			_, err := s.store.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		// Request only 5 days
		result, err := s.store.ListAdaptiveDataPoints(s.ctx, "2026-01-25", 5)
		s.Require().NoError(err)
		s.Len(result, 5, "Should respect maxDays limit")
	})
}

func (s *DailyLogStoreSuite) TestListAdaptiveDataPointsWithGaps() {
	s.Run("handles gaps in date sequence", func() {
		// Create logs with gaps
		dates := []string{"2026-01-05", "2026-01-10", "2026-01-15"} // Gaps between dates
		for _, date := range dates {
			log := &domain.DailyLog{
				Date:         date,
				WeightKg:     85,
				SleepQuality: 80,
				DayType:      domain.DayTypeFatburner,
				CalculatedTargets: domain.DailyTargets{
					TotalCalories: 1800,
					DayType:       domain.DayTypeFatburner,
				},
				EstimatedTDEE: 2200,
				FormulaTDEE:   2200,
			}
			_, err := s.store.Create(s.ctx, log)
			s.Require().NoError(err)
		}

		result, err := s.store.ListAdaptiveDataPoints(s.ctx, "2026-01-20", 28)
		s.Require().NoError(err)
		s.Len(result, 3, "Should return all logs regardless of gaps")
	})
}

func (s *DailyLogStoreSuite) TestListAdaptiveDataPointsFieldValues() {
	s.Run("returns correct field values", func() {
		log := &domain.DailyLog{
			Date:         "2026-01-15",
			WeightKg:     87.5,
			SleepQuality: 80,
			DayType:      domain.DayTypeFatburner,
			CalculatedTargets: domain.DailyTargets{
				TotalCalories: 1950,
				DayType:       domain.DayTypeFatburner,
			},
			EstimatedTDEE: 2350,
			FormulaTDEE:   2300,
		}
		_, err := s.store.Create(s.ctx, log)
		s.Require().NoError(err)

		result, err := s.store.ListAdaptiveDataPoints(s.ctx, "2026-01-15", 28)
		s.Require().NoError(err)
		s.Require().Len(result, 1)

		point := result[0]
		s.Equal("2026-01-15", point.Date)
		s.InDelta(87.5, point.WeightKg, 0.01)
		s.Equal(1950, point.TargetCalories)
		s.Equal(2350, point.EstimatedTDEE)
		s.Equal(2300, point.FormulaTDEE)
	})
}

// --- Training Session Store Suite ---

type TrainingSessionStoreSuite struct {
	suite.Suite
	pg           *testutil.PostgresContainer
	db           *sql.DB
	logStore     *DailyLogStore
	sessionStore *TrainingSessionStore
	ctx          context.Context
}

func TestTrainingSessionStoreSuite(t *testing.T) {
	suite.Run(t, new(TrainingSessionStoreSuite))
}

func (s *TrainingSessionStoreSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *TrainingSessionStoreSuite) SetupTest() {
	s.ctx = context.Background()
	s.Require().NoError(s.pg.ClearTables(s.ctx))
	s.logStore = NewDailyLogStore(s.db)
	s.sessionStore = NewTrainingSessionStore(s.db)
}

func (s *TrainingSessionStoreSuite) createDailyLog(date string) int64 {
	log := &domain.DailyLog{
		Date:              date,
		WeightKg:          85,
		SleepQuality:      80,
		DayType:           domain.DayTypePerformance,
		CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypePerformance},
	}
	logID, err := s.logStore.Create(s.ctx, log)
	s.Require().NoError(err)
	return logID
}

func (s *TrainingSessionStoreSuite) TestSessionPersistence() {
	s.Run("sessions are persisted and retrieved", func() {
		logID := s.createDailyLog("2025-01-15")

		sessions := []domain.TrainingSession{
			{SessionOrder: 1, IsPlanned: true, Type: domain.TrainingTypeQigong, DurationMin: 20},
			{SessionOrder: 2, IsPlanned: true, Type: domain.TrainingTypeStrength, DurationMin: 60},
		}

		err := s.sessionStore.CreateForLog(s.ctx, logID, sessions)
		s.Require().NoError(err)

		loaded, err := s.sessionStore.GetByLogID(s.ctx, logID)
		s.Require().NoError(err)
		s.Require().Len(loaded, 2)

		s.Equal(domain.TrainingTypeQigong, loaded[0].Type)
		s.Equal(20, loaded[0].DurationMin)
		s.Equal(domain.TrainingTypeStrength, loaded[1].Type)
		s.Equal(60, loaded[1].DurationMin)
	})
}

func (s *TrainingSessionStoreSuite) TestSessionCascadeDelete() {
	s.Run("sessions are deleted with log via cascade", func() {
		logID := s.createDailyLog("2025-01-16")

		sessions := []domain.TrainingSession{
			{SessionOrder: 1, IsPlanned: true, Type: domain.TrainingTypeStrength, DurationMin: 60},
		}
		err := s.sessionStore.CreateForLog(s.ctx, logID, sessions)
		s.Require().NoError(err)

		// Delete log
		err = s.logStore.DeleteByDate(s.ctx, "2025-01-16")
		s.Require().NoError(err)

		// Sessions should be gone
		loaded, err := s.sessionStore.GetByLogID(s.ctx, logID)
		s.Require().NoError(err)
		s.Empty(loaded, "Sessions should be deleted with log")
	})
}

// --- Nutrition Plan Store Suite ---
// NOTE: Many of these tests overlap with plan.feature E2E scenarios. Review for redundancy.
// Tests marked with [OVERLAP] may be candidates for removal once E2E coverage is verified.
// Tests marked with [KEEP] test store-specific behavior not covered by feature scenarios.

type NutritionPlanStoreSuite struct {
	suite.Suite
	pg    *testutil.PostgresContainer
	db    *sql.DB
	store *NutritionPlanStore
	ctx   context.Context
	now   time.Time
}

func TestNutritionPlanStoreSuite(t *testing.T) {
	suite.Run(t, new(NutritionPlanStoreSuite))
}

func (s *NutritionPlanStoreSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *NutritionPlanStoreSuite) SetupTest() {
	s.ctx = context.Background()
	s.Require().NoError(s.pg.ClearTables(s.ctx))
	s.store = NewNutritionPlanStore(s.db)
	s.now = time.Date(2026, 1, 24, 12, 0, 0, 0, time.UTC)
}

func (s *NutritionPlanStoreSuite) validPlan() *domain.NutritionPlan {
	return &domain.NutritionPlan{
		StartDate:                s.now,
		StartWeightKg:            90.0,
		GoalWeightKg:             80.0,
		DurationWeeks:            20,
		RequiredWeeklyChangeKg:   -0.5,
		RequiredDailyDeficitKcal: -550,
		Status:                   domain.PlanStatusActive,
		WeeklyTargets: []domain.WeeklyTarget{
			{
				WeekNumber:        1,
				StartDate:         s.now,
				EndDate:           s.now.AddDate(0, 0, 6),
				ProjectedWeightKg: 89.5,
				ProjectedTDEE:     2400,
				TargetIntakeKcal:  1850,
				TargetCarbsG:      208,
				TargetProteinG:    139,
				TargetFatsG:       51,
			},
			{
				WeekNumber:        2,
				StartDate:         s.now.AddDate(0, 0, 7),
				EndDate:           s.now.AddDate(0, 0, 13),
				ProjectedWeightKg: 89.0,
				ProjectedTDEE:     2380,
				TargetIntakeKcal:  1830,
				TargetCarbsG:      206,
				TargetProteinG:    137,
				TargetFatsG:       51,
			},
		},
	}
}

// [OVERLAP] plan.feature: "Fetch active plan when none exists", "Fetch non-existent plan by ID"
func (s *NutritionPlanStoreSuite) TestPlanNotFoundBeforeCreation() {
	s.Run("GetByID returns ErrPlanNotFound when empty", func() {
		_, err := s.store.GetByID(s.ctx, 999)
		s.Require().ErrorIs(err, ErrPlanNotFound)
	})

	s.Run("GetActive returns ErrPlanNotFound when no active plan", func() {
		_, err := s.store.GetActive(s.ctx)
		s.Require().ErrorIs(err, ErrPlanNotFound)
	})
}

// [KEEP] Tests field-level persistence integrity for weekly targets - not asserted at HTTP level
func (s *NutritionPlanStoreSuite) TestPlanCreationAndRetrieval() {
	s.Run("creates plan with weekly targets", func() {
		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)
		s.Greater(planID, int64(0))

		loaded, err := s.store.GetByID(s.ctx, planID)
		s.Require().NoError(err)

		s.Equal(plan.StartWeightKg, loaded.StartWeightKg)
		s.Equal(plan.GoalWeightKg, loaded.GoalWeightKg)
		s.Equal(plan.DurationWeeks, loaded.DurationWeeks)
		s.InDelta(plan.RequiredWeeklyChangeKg, loaded.RequiredWeeklyChangeKg, 0.001)
		s.Equal(plan.Status, loaded.Status)
		s.Len(loaded.WeeklyTargets, 2)
	})

	s.Run("weekly targets preserve all fields", func() {
		// Clear tables to avoid active plan constraint
		s.Require().NoError(s.pg.ClearTables(s.ctx))

		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		loaded, err := s.store.GetByID(s.ctx, planID)
		s.Require().NoError(err)

		target := loaded.WeeklyTargets[0]
		s.Equal(1, target.WeekNumber)
		s.InDelta(89.5, target.ProjectedWeightKg, 0.1)
		s.Equal(2400, target.ProjectedTDEE)
		s.Equal(1850, target.TargetIntakeKcal)
		s.Equal(208, target.TargetCarbsG)
		s.Equal(139, target.TargetProteinG)
		s.Equal(51, target.TargetFatsG)
		s.Nil(target.ActualWeightKg)
		s.Nil(target.ActualIntakeKcal)
		s.Equal(0, target.DaysLogged)
	})
}

// [OVERLAP] plan.feature: "Reject creating second active plan"
// [KEEP] "allows creating new plan after completing previous" - sequence behavior not in feature
func (s *NutritionPlanStoreSuite) TestActivePlanConstraint() {
	s.Run("prevents creating second active plan", func() {
		plan1 := s.validPlan()
		_, err := s.store.Create(s.ctx, plan1)
		s.Require().NoError(err)

		plan2 := s.validPlan()
		plan2.StartDate = s.now.AddDate(0, 0, 30)
		_, err = s.store.Create(s.ctx, plan2)
		s.Require().ErrorIs(err, ErrActivePlanExists)
	})

	s.Run("allows creating new plan after completing previous", func() {
		// Clear tables to start fresh
		s.Require().NoError(s.pg.ClearTables(s.ctx))

		plan1 := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan1)
		s.Require().NoError(err)

		err = s.store.UpdateStatus(s.ctx, planID, domain.PlanStatusCompleted)
		s.Require().NoError(err)

		plan2 := s.validPlan()
		plan2.StartDate = s.now.AddDate(0, 0, 30)
		planID2, err := s.store.Create(s.ctx, plan2)
		s.Require().NoError(err)
		s.Greater(planID2, planID)
	})
}

// [OVERLAP] plan.feature: "Fetch active nutrition plan"
func (s *NutritionPlanStoreSuite) TestGetActivePlan() {
	s.Run("returns active plan", func() {
		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		active, err := s.store.GetActive(s.ctx)
		s.Require().NoError(err)
		s.Equal(planID, active.ID)
		s.Equal(domain.PlanStatusActive, active.Status)
	})
}

// [OVERLAP] plan.feature: "Complete a nutrition plan", "Abandon a nutrition plan"
func (s *NutritionPlanStoreSuite) TestUpdateStatus() {
	s.Run("updates plan status", func() {
		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		err = s.store.UpdateStatus(s.ctx, planID, domain.PlanStatusCompleted)
		s.Require().NoError(err)

		loaded, err := s.store.GetByID(s.ctx, planID)
		s.Require().NoError(err)
		s.Equal(domain.PlanStatusCompleted, loaded.Status)
	})

	s.Run("returns error for non-existent plan", func() {
		err := s.store.UpdateStatus(s.ctx, 999, domain.PlanStatusCompleted)
		s.Require().ErrorIs(err, ErrPlanNotFound)
	})
}

// [KEEP] Tests UpdateWeeklyActuals store method - no corresponding feature scenario yet
func (s *NutritionPlanStoreSuite) TestUpdateWeeklyActuals() {
	s.Run("updates actual values for a week", func() {
		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		actualWeight := 89.2
		actualIntake := 1900
		err = s.store.UpdateWeeklyActuals(s.ctx, planID, 1, &actualWeight, &actualIntake, 7)
		s.Require().NoError(err)

		loaded, err := s.store.GetByID(s.ctx, planID)
		s.Require().NoError(err)

		target := loaded.WeeklyTargets[0]
		s.Require().NotNil(target.ActualWeightKg)
		s.InDelta(89.2, *target.ActualWeightKg, 0.1)
		s.Require().NotNil(target.ActualIntakeKcal)
		s.Equal(1900, *target.ActualIntakeKcal)
		s.Equal(7, target.DaysLogged)
	})

	s.Run("handles nil actual values", func() {
		// Clear tables to avoid active plan constraint
		s.Require().NoError(s.pg.ClearTables(s.ctx))

		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		err = s.store.UpdateWeeklyActuals(s.ctx, planID, 2, nil, nil, 3)
		s.Require().NoError(err)

		loaded, err := s.store.GetByID(s.ctx, planID)
		s.Require().NoError(err)

		target := loaded.WeeklyTargets[1]
		s.Nil(target.ActualWeightKg)
		s.Nil(target.ActualIntakeKcal)
		s.Equal(3, target.DaysLogged)
	})
}

// [OVERLAP] plan.feature: "Delete a nutrition plan"
// [KEEP] "is idempotent on missing plan" - store-specific behavior
func (s *NutritionPlanStoreSuite) TestDeletePlan() {
	s.Run("deletes plan making it inaccessible", func() {
		plan := s.validPlan()
		s.Require().Len(plan.WeeklyTargets, 2, "test plan should have weekly targets")

		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		// Verify plan and weekly targets are accessible before delete
		loaded, err := s.store.GetByID(s.ctx, planID)
		s.Require().NoError(err)
		s.Len(loaded.WeeklyTargets, 2)

		// Delete the plan
		err = s.store.Delete(s.ctx, planID)
		s.Require().NoError(err)

		// Verify plan (and its weekly targets) are no longer accessible
		_, err = s.store.GetByID(s.ctx, planID)
		s.ErrorIs(err, ErrPlanNotFound)
	})

	s.Run("is idempotent on missing plan", func() {
		err := s.store.Delete(s.ctx, 999)
		s.Require().NoError(err, "Deleting nonexistent plan should not error")
	})
}

// [OVERLAP] plan.feature: "List all plans"
// [KEEP] Verifies ordering behavior (start_date DESC) not asserted at HTTP level
func (s *NutritionPlanStoreSuite) TestListAllPlans() {
	s.Run("returns all plans ordered by start date descending", func() {
		// Create plan 1
		plan1 := s.validPlan()
		planID1, err := s.store.Create(s.ctx, plan1)
		s.Require().NoError(err)

		// Complete plan 1
		err = s.store.UpdateStatus(s.ctx, planID1, domain.PlanStatusCompleted)
		s.Require().NoError(err)

		// Create plan 2 with later date
		plan2 := s.validPlan()
		plan2.StartDate = s.now.AddDate(0, 1, 0)
		_, err = s.store.Create(s.ctx, plan2)
		s.Require().NoError(err)

		plans, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Len(plans, 2)

		// Should be ordered by start_date DESC (plan2 first)
		s.True(plans[0].StartDate.After(plans[1].StartDate))
	})

	s.Run("returns empty slice when no plans", func() {
		// Clear tables to ensure no plans exist
		s.Require().NoError(s.pg.ClearTables(s.ctx))

		plans, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Empty(plans)
	})
}

// --- Food Reference Store Suite ---
// Justification: Tests food reference persistence and retrieval not covered by feature scenarios.
// These verify data integrity for the macro tetris solver and food library.

type FoodReferenceStoreSuite struct {
	suite.Suite
	pg    *testutil.PostgresContainer
	db    *sql.DB
	store *FoodReferenceStore
	ctx   context.Context
}

func TestFoodReferenceStoreSuite(t *testing.T) {
	suite.Run(t, new(FoodReferenceStoreSuite))
}

func (s *FoodReferenceStoreSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *FoodReferenceStoreSuite) SetupTest() {
	s.ctx = context.Background()
	// Clear only food_reference for these tests, preserving seeded data in first run
	_, err := s.db.ExecContext(s.ctx, "DELETE FROM food_reference")
	s.Require().NoError(err)
	s.store = NewFoodReferenceStore(s.db)
}

func (s *FoodReferenceStoreSuite) seedFoodReference(category domain.FoodCategory, foodItem string, plateMultiplier *float64) int64 {
	var pm interface{}
	if plateMultiplier != nil {
		pm = *plateMultiplier
	}
	var id int64
	err := s.db.QueryRowContext(s.ctx,
		`INSERT INTO food_reference (category, food_item, plate_multiplier) VALUES ($1, $2, $3) RETURNING id`,
		category, foodItem, pm,
	).Scan(&id)
	s.Require().NoError(err)
	return id
}

func (s *FoodReferenceStoreSuite) seedFoodNutrition(category domain.FoodCategory, foodItem string, protein, carbs, fat float64, isPantry bool) int64 {
	var id int64
	err := s.db.QueryRowContext(s.ctx,
		`INSERT INTO food_reference (category, food_item, protein_g_per_100, carbs_g_per_100, fat_g_per_100, is_pantry_staple)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		category, foodItem, protein, carbs, fat, isPantry,
	).Scan(&id)
	s.Require().NoError(err)
	return id
}

func (s *FoodReferenceStoreSuite) TestListAllEmptyTable() {
	s.Run("returns empty slice when no foods exist", func() {
		foods, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Empty(foods)
	})
}

func (s *FoodReferenceStoreSuite) TestListAllOrdering() {
	s.Run("returns foods ordered by category then name", func() {
		// Insert in random order
		s.seedFoodReference(domain.FoodCategoryHighProtein, "Chicken Breast", nil)
		s.seedFoodReference(domain.FoodCategoryHighCarb, "Rice", nil)
		s.seedFoodReference(domain.FoodCategoryHighCarb, "Oats", nil)
		s.seedFoodReference(domain.FoodCategoryHighFat, "Avocado", nil)

		foods, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 4)

		// Verify ordering: high_carb comes before high_fat (alphabetically)
		// Within high_carb: Oats before Rice
		s.Equal(domain.FoodCategoryHighCarb, foods[0].Category)
		s.Equal("Oats", foods[0].FoodItem)
		s.Equal(domain.FoodCategoryHighCarb, foods[1].Category)
		s.Equal("Rice", foods[1].FoodItem)
	})
}

func (s *FoodReferenceStoreSuite) TestListAllPlateMultiplier() {
	s.Run("preserves null and non-null plate multipliers", func() {
		pm := 1.5
		s.seedFoodReference(domain.FoodCategoryHighCarb, "With Multiplier", &pm)
		s.seedFoodReference(domain.FoodCategoryHighCarb, "Without Multiplier", nil)

		foods, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 2)

		// Find the food with multiplier
		var withMultiplier, withoutMultiplier *domain.FoodReference
		for i := range foods {
			if foods[i].FoodItem == "With Multiplier" {
				withMultiplier = &foods[i]
			} else {
				withoutMultiplier = &foods[i]
			}
		}

		s.Require().NotNil(withMultiplier.PlateMultiplier)
		s.InDelta(1.5, *withMultiplier.PlateMultiplier, 0.001)
		s.Nil(withoutMultiplier.PlateMultiplier)
	})
}

func (s *FoodReferenceStoreSuite) TestListByCategory() {
	s.Run("filters by category", func() {
		s.seedFoodReference(domain.FoodCategoryHighProtein, "Chicken", nil)
		s.seedFoodReference(domain.FoodCategoryHighProtein, "Beef", nil)
		s.seedFoodReference(domain.FoodCategoryHighCarb, "Rice", nil)

		foods, err := s.store.ListByCategory(s.ctx, domain.FoodCategoryHighProtein)
		s.Require().NoError(err)
		s.Require().Len(foods, 2)

		for _, food := range foods {
			s.Equal(domain.FoodCategoryHighProtein, food.Category)
		}
	})

	s.Run("returns empty slice for category with no foods", func() {
		// Clear table to avoid duplicate key violations
		_, err := s.db.ExecContext(s.ctx, "DELETE FROM food_reference")
		s.Require().NoError(err)

		s.seedFoodReference(domain.FoodCategoryHighCarb, "Rice", nil)

		foods, err := s.store.ListByCategory(s.ctx, domain.FoodCategoryHighFat)
		s.Require().NoError(err)
		s.Empty(foods)
	})
}

func (s *FoodReferenceStoreSuite) TestUpdatePlateMultiplier() {
	s.Run("sets plate multiplier", func() {
		id := s.seedFoodReference(domain.FoodCategoryHighCarb, "Rice", nil)

		newMultiplier := 2.0
		err := s.store.UpdatePlateMultiplier(s.ctx, id, &newMultiplier)
		s.Require().NoError(err)

		foods, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 1)
		s.Require().NotNil(foods[0].PlateMultiplier)
		s.InDelta(2.0, *foods[0].PlateMultiplier, 0.001)
	})

	s.Run("clears plate multiplier when nil", func() {
		// Clear table to avoid duplicate key violations
		_, err := s.db.ExecContext(s.ctx, "DELETE FROM food_reference")
		s.Require().NoError(err)

		pm := 1.5
		id := s.seedFoodReference(domain.FoodCategoryHighCarb, "Rice", &pm)

		err = s.store.UpdatePlateMultiplier(s.ctx, id, nil)
		s.Require().NoError(err)

		foods, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 1)
		s.Nil(foods[0].PlateMultiplier)
	})
}

func (s *FoodReferenceStoreSuite) TestListPantryFoods() {
	s.Run("returns foods with nutritional data", func() {
		// Food with nutrition data
		s.seedFoodNutrition(domain.FoodCategoryHighProtein, "Chicken", 25.0, 0.0, 3.0, true)
		// Food without nutrition data (all zeros)
		s.seedFoodReference(domain.FoodCategoryHighCarb, "Unknown Food", nil)

		foods, err := s.store.ListPantryFoods(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 1)
		s.Equal("Chicken", foods[0].FoodItem)
	})

	s.Run("prioritizes pantry staples", func() {
		// Clear table to start fresh
		_, err := s.db.ExecContext(s.ctx, "DELETE FROM food_reference")
		s.Require().NoError(err)

		s.seedFoodNutrition(domain.FoodCategoryHighProtein, "Exotic Meat", 20.0, 0.0, 5.0, false)
		s.seedFoodNutrition(domain.FoodCategoryHighProtein, "Chicken", 25.0, 0.0, 3.0, true)

		foods, err := s.store.ListPantryFoods(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 2)

		// Pantry staples should come first
		s.True(foods[0].IsPantryStaple, "First food should be pantry staple")
		s.Equal("Chicken", foods[0].FoodItem)
	})

	s.Run("includes all required nutrition fields", func() {
		// Clear table to start fresh
		_, err := s.db.ExecContext(s.ctx, "DELETE FROM food_reference")
		s.Require().NoError(err)

		s.seedFoodNutrition(domain.FoodCategoryHighProtein, "Greek Yogurt", 10.0, 4.0, 5.0, true)

		foods, err := s.store.ListPantryFoods(s.ctx)
		s.Require().NoError(err)
		s.Require().Len(foods, 1)

		food := foods[0]
		s.Equal(domain.FoodCategoryHighProtein, food.Category)
		s.Equal("Greek Yogurt", food.FoodItem)
		s.InDelta(10.0, food.ProteinGPer100, 0.001)
		s.InDelta(4.0, food.CarbsGPer100, 0.001)
		s.InDelta(5.0, food.FatGPer100, 0.001)
	})
}
