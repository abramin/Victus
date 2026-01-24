package store

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"victus/internal/db"
	"victus/internal/domain"

	"github.com/stretchr/testify/suite"
	_ "modernc.org/sqlite"
)

// Justification: Store tests verify persistence and schema constraints beyond
// feature-level coverage.

// --- Profile Store Suite ---

type ProfileStoreSuite struct {
	suite.Suite
	db    *sql.DB
	store *ProfileStore
	ctx   context.Context
}

func TestProfileStoreSuite(t *testing.T) {
	suite.Run(t, new(ProfileStoreSuite))
}

func (s *ProfileStoreSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.store = NewProfileStore(s.db)
	s.ctx = context.Background()
}

func (s *ProfileStoreSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
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
	db    *sql.DB
	store *DailyLogStore
	ctx   context.Context
}

func TestDailyLogStoreSuite(t *testing.T) {
	suite.Run(t, new(DailyLogStoreSuite))
}

func (s *DailyLogStoreSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.store = NewDailyLogStore(s.db)
	s.ctx = context.Background()
}

func (s *DailyLogStoreSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
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

func (s *DailyLogStoreSuite) TestLogTargetsDefaultsForLegacyRows() {
	s.Run("null calculated targets scan without error", func() {
		_, err := s.db.ExecContext(
			s.ctx,
			`INSERT INTO daily_logs (log_date, weight_kg, sleep_quality, planned_training_type, planned_duration_min)
			 VALUES (?, ?, ?, ?, ?)`,
			"2025-02-01", 85, 80, "rest", 0,
		)
		s.Require().NoError(err)

		log, err := s.store.GetByDate(s.ctx, "2025-02-01")
		s.Require().NoError(err)
		s.Equal(domain.DayTypeFatburner, log.CalculatedTargets.DayType)
		s.Equal(0, log.CalculatedTargets.TotalCalories)
		s.Equal(0, log.CalculatedTargets.Meals.Breakfast.Carbs)

		points, err := s.store.ListDailyTargets(s.ctx, "2025-02-01", "2025-02-01")
		s.Require().NoError(err)
		s.Require().Len(points, 1)
		s.Equal(domain.DayTypeFatburner, points[0].Targets.DayType)
		s.Equal(0, points[0].Targets.TotalCalories)
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

// --- Training Session Store Suite ---

type TrainingSessionStoreSuite struct {
	suite.Suite
	db           *sql.DB
	logStore     *DailyLogStore
	sessionStore *TrainingSessionStore
	ctx          context.Context
}

func TestTrainingSessionStoreSuite(t *testing.T) {
	suite.Run(t, new(TrainingSessionStoreSuite))
}

func (s *TrainingSessionStoreSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.logStore = NewDailyLogStore(s.db)
	s.sessionStore = NewTrainingSessionStore(s.db)
	s.ctx = context.Background()
}

func (s *TrainingSessionStoreSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
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

type NutritionPlanStoreSuite struct {
	suite.Suite
	db    *sql.DB
	store *NutritionPlanStore
	ctx   context.Context
	now   time.Time
}

func TestNutritionPlanStoreSuite(t *testing.T) {
	suite.Run(t, new(NutritionPlanStoreSuite))
}

func (s *NutritionPlanStoreSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.store = NewNutritionPlanStore(s.db)
	s.ctx = context.Background()
	s.now = time.Date(2026, 1, 24, 12, 0, 0, 0, time.UTC)
}

func (s *NutritionPlanStoreSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
}

func (s *NutritionPlanStoreSuite) validPlan() *domain.NutritionPlan {
	return &domain.NutritionPlan{
		StartDate:              s.now,
		StartWeightKg:          90.0,
		GoalWeightKg:           80.0,
		DurationWeeks:          20,
		RequiredWeeklyChangeKg: -0.5,
		RequiredDailyDeficitKcal: -550,
		Status:                 domain.PlanStatusActive,
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

func (s *NutritionPlanStoreSuite) TestDeletePlan() {
	s.Run("deletes plan and weekly targets cascade", func() {
		plan := s.validPlan()
		planID, err := s.store.Create(s.ctx, plan)
		s.Require().NoError(err)

		err = s.store.Delete(s.ctx, planID)
		s.Require().NoError(err)

		_, err = s.store.GetByID(s.ctx, planID)
		s.Require().ErrorIs(err, ErrPlanNotFound)

		// Verify weekly targets are also deleted
		var count int
		err = s.db.QueryRowContext(s.ctx, "SELECT COUNT(*) FROM weekly_targets WHERE plan_id = ?", planID).Scan(&count)
		s.Require().NoError(err)
		s.Equal(0, count)
	})

	s.Run("is idempotent on missing plan", func() {
		err := s.store.Delete(s.ctx, 999)
		s.Require().NoError(err, "Deleting nonexistent plan should not error")
	})
}

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
		plans, err := s.store.ListAll(s.ctx)
		s.Require().NoError(err)
		s.Empty(plans)
	})
}
