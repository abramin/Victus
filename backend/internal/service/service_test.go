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

// --- NutritionPlanService tests ---
// Justification: Tests service-layer orchestration between domain, profile, and store.
// Domain unit tests cover calculation invariants; these tests verify integration behavior.

type NutritionPlanServiceSuite struct {
	suite.Suite
	db             *sql.DB
	planStore      *store.NutritionPlanStore
	profileStore   *store.ProfileStore
	planService    *NutritionPlanService
	profileService *ProfileService
	ctx            context.Context
	now            time.Time
}

func TestNutritionPlanServiceSuite(t *testing.T) {
	suite.Run(t, new(NutritionPlanServiceSuite))
}

func (s *NutritionPlanServiceSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.planStore = store.NewNutritionPlanStore(s.db)
	s.profileStore = store.NewProfileStore(s.db)
	s.planService = NewNutritionPlanService(s.planStore, s.profileStore)
	s.profileService = NewProfileService(s.profileStore)
	s.ctx = context.Background()
	s.now = time.Date(2026, 1, 24, 12, 0, 0, 0, time.UTC)
}

func (s *NutritionPlanServiceSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
}

func (s *NutritionPlanServiceSuite) validProfile() *domain.UserProfile {
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
		BMREquation:          domain.BMREquationMifflinStJeor,
	}
}

func (s *NutritionPlanServiceSuite) createProfile() {
	_, err := s.profileService.Upsert(s.ctx, s.validProfile(), s.now)
	s.Require().NoError(err)
}

func (s *NutritionPlanServiceSuite) validPlanInput() domain.NutritionPlanInput {
	return domain.NutritionPlanInput{
		StartDate:     s.now.Format("2006-01-02"),
		StartWeightKg: 90.0,
		GoalWeightKg:  80.0,
		DurationWeeks: 20, // Safe: 0.5 kg/week
	}
}

// =============================================================================
// PLAN CREATION ORCHESTRATION
// =============================================================================

func (s *NutritionPlanServiceSuite) TestPlanCreationRequiresProfile() {
	s.Run("returns error when no profile exists", func() {
		input := s.validPlanInput()
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().ErrorIs(err, store.ErrProfileNotFound)
	})

	s.Run("creates plan after profile exists", func() {
		s.createProfile()
		input := s.validPlanInput()
		plan, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)
		s.Greater(plan.ID, int64(0))
		s.Equal(domain.PlanStatusActive, plan.Status)
		s.Len(plan.WeeklyTargets, 20)
	})
}

func (s *NutritionPlanServiceSuite) TestPlanCreationUsesProfileForTDEE() {
	s.Run("weekly targets reflect profile-based TDEE", func() {
		s.createProfile()
		input := s.validPlanInput()
		plan, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		// TDEE should be > 0 (calculated from profile)
		s.Greater(plan.WeeklyTargets[0].ProjectedTDEE, 0)
		// Target intake = TDEE + deficit (deficit is negative for weight loss)
		expectedIntake := float64(plan.WeeklyTargets[0].ProjectedTDEE) + plan.RequiredDailyDeficitKcal
		s.InDelta(expectedIntake, float64(plan.WeeklyTargets[0].TargetIntakeKcal), 1.0)
	})
}

func (s *NutritionPlanServiceSuite) TestPlanCreationValidation() {
	s.createProfile()

	s.Run("rejects aggressive deficit", func() {
		input := s.validPlanInput()
		input.GoalWeightKg = 70  // 20kg loss
		input.DurationWeeks = 10 // 2 kg/week (unsafe)
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().ErrorIs(err, domain.ErrPlanDeficitTooAggressive)
	})

	s.Run("rejects duration below minimum", func() {
		input := s.validPlanInput()
		input.DurationWeeks = 3
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().ErrorIs(err, domain.ErrInvalidPlanDuration)
	})
}

func (s *NutritionPlanServiceSuite) TestActivePlanConstraint() {
	s.createProfile()

	s.Run("prevents second active plan", func() {
		input := s.validPlanInput()
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		_, err = s.planService.Create(s.ctx, input, s.now)
		s.Require().ErrorIs(err, store.ErrActivePlanExists)
	})

	s.Run("allows new plan after completing previous", func() {
		// Complete the existing plan
		plan, _ := s.planService.GetActive(s.ctx)
		err := s.planService.Complete(s.ctx, plan.ID)
		s.Require().NoError(err)

		// Can now create a new plan
		input := s.validPlanInput()
		input.StartDate = s.now.AddDate(0, 0, 7).Format("2006-01-02")
		newPlan, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)
		s.Greater(newPlan.ID, plan.ID)
	})
}

// =============================================================================
// CURRENT WEEK TARGET RETRIEVAL
// =============================================================================

func (s *NutritionPlanServiceSuite) TestCurrentWeekTargetRetrieval() {
	s.createProfile()

	s.Run("returns nil when no active plan", func() {
		target, err := s.planService.GetCurrentWeekTarget(s.ctx, s.now)
		s.Require().ErrorIs(err, store.ErrPlanNotFound)
		s.Nil(target)
	})

	s.Run("returns week 1 target on plan start date", func() {
		input := s.validPlanInput()
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		target, err := s.planService.GetCurrentWeekTarget(s.ctx, s.now)
		s.Require().NoError(err)
		s.Require().NotNil(target)
		s.Equal(1, target.WeekNumber)
	})

	s.Run("returns nil before plan starts", func() {
		// Clear existing plan
		plan, _ := s.planService.GetActive(s.ctx)
		if plan != nil {
			s.planService.Cancel(s.ctx, plan.ID)
		}

		input := s.validPlanInput()
		input.StartDate = s.now.AddDate(0, 0, 7).Format("2006-01-02") // Starts next week
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		target, err := s.planService.GetCurrentWeekTarget(s.ctx, s.now)
		s.Require().NoError(err)
		s.Nil(target, "Should return nil before plan starts")
	})

	s.Run("returns nil after plan ends", func() {
		// Clear existing plan
		plan, _ := s.planService.GetActive(s.ctx)
		if plan != nil {
			s.planService.Cancel(s.ctx, plan.ID)
		}

		input := s.validPlanInput()
		input.DurationWeeks = 4
		input.GoalWeightKg = 89 // 1kg over 4 weeks = safe
		_, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		afterPlan := s.now.AddDate(0, 0, 35) // 5 weeks later
		target, err := s.planService.GetCurrentWeekTarget(s.ctx, afterPlan)
		s.Require().NoError(err)
		s.Nil(target, "Should return nil after plan ends")
	})
}

// =============================================================================
// PLAN LIFECYCLE (STATUS UPDATES)
// =============================================================================

func (s *NutritionPlanServiceSuite) TestPlanStatusTransitions() {
	s.createProfile()

	s.Run("complete marks plan as completed", func() {
		input := s.validPlanInput()
		plan, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		err = s.planService.Complete(s.ctx, plan.ID)
		s.Require().NoError(err)

		loaded, err := s.planService.GetByID(s.ctx, plan.ID)
		s.Require().NoError(err)
		s.Equal(domain.PlanStatusCompleted, loaded.Status)
	})

	s.Run("cancel marks plan as cancelled", func() {
		// Create new plan (previous was completed)
		input := s.validPlanInput()
		input.StartDate = s.now.AddDate(0, 0, 7).Format("2006-01-02")
		plan, err := s.planService.Create(s.ctx, input, s.now)
		s.Require().NoError(err)

		err = s.planService.Cancel(s.ctx, plan.ID)
		s.Require().NoError(err)

		loaded, err := s.planService.GetByID(s.ctx, plan.ID)
		s.Require().NoError(err)
		s.Equal(domain.PlanStatusCancelled, loaded.Status)
	})

	s.Run("returns error for non-existent plan", func() {
		err := s.planService.Complete(s.ctx, 99999)
		s.Require().ErrorIs(err, store.ErrPlanNotFound)

		err = s.planService.Cancel(s.ctx, 99999)
		s.Require().ErrorIs(err, store.ErrPlanNotFound)
	})
}
