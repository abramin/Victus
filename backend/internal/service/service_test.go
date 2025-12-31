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
	s.profileService = NewProfileService(s.profileStore)
	s.logService = NewDailyLogService(s.logStore, s.profileStore)
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

// --- DailyLogService.Create tests ---

func (s *DailyLogServiceSuite) TestLogCreationCalculatesTargets() {
	s.createProfile()

	log := &domain.DailyLog{
		Date:            "2025-01-15",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: domain.PlannedTraining{Type: domain.TrainingTypeStrength, PlannedDurationMin: 60},
		DayType:         domain.DayTypePerformance,
	}

	result, err := s.logService.Create(s.ctx, log, s.now)
	s.Require().NoError(err)

	// Verify targets were calculated
	s.Greater(result.CalculatedTargets.TotalCalories, 0, "Should have calculated calories")
	s.Greater(result.CalculatedTargets.TotalProteinG, 0, "Should have calculated protein")
	s.Greater(result.CalculatedTargets.TotalCarbsG, 0, "Should have calculated carbs")
	s.Greater(result.CalculatedTargets.TotalFatsG, 0, "Should have calculated fats")
	s.Greater(result.EstimatedTDEE, 0, "Should have calculated TDEE")
}

func (s *DailyLogServiceSuite) TestLogCreationRequiresProfile() {
	// No profile created - database is fresh from SetupTest
	log := &domain.DailyLog{
		Date:            "2025-01-15",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: domain.PlannedTraining{Type: domain.TrainingTypeStrength, PlannedDurationMin: 60},
		DayType:         domain.DayTypePerformance,
	}

	_, err := s.logService.Create(s.ctx, log, s.now)
	s.Require().ErrorIs(err, store.ErrProfileNotFound)
}

func (s *DailyLogServiceSuite) TestLogCreationAppliesDefaults() {
	s.createProfile()

	// Log with minimal data - should get defaults applied
	log := &domain.DailyLog{
		WeightKg: 85,
	}

	result, err := s.logService.Create(s.ctx, log, s.now)
	s.Require().NoError(err)

	// Verify defaults were applied
	s.Equal("2025-01-15", result.Date, "Date should default to today")
	s.Equal(domain.SleepQuality(50), result.SleepQuality, "Sleep quality should default to 50")
	s.Equal(domain.TrainingTypeRest, result.PlannedTraining.Type, "Training type should default to rest")
	s.Equal(domain.DayTypeFatburner, result.DayType, "Day type should default to fatburner")
}

func (s *DailyLogServiceSuite) TestLogCreationRejectsInvalidInput() {
	s.createProfile()

	// Invalid weight - should fail validation even with defaults
	log := &domain.DailyLog{
		WeightKg: 25, // Below 30kg minimum
	}

	_, err := s.logService.Create(s.ctx, log, s.now)
	s.Require().ErrorIs(err, domain.ErrInvalidWeight)
}

func (s *DailyLogServiceSuite) TestLogRetrievalAfterCreation() {
	s.createProfile()

	// Create a log for today
	log := &domain.DailyLog{
		Date:            "2025-01-15",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: domain.PlannedTraining{Type: domain.TrainingTypeStrength, PlannedDurationMin: 60},
		DayType:         domain.DayTypePerformance,
	}
	_, err := s.logService.Create(s.ctx, log, s.now)
	s.Require().NoError(err)

	// Retrieve it
	result, err := s.logService.GetToday(s.ctx, s.now)
	s.Require().NoError(err)
	s.Equal("2025-01-15", result.Date)
	s.Equal(85.0, result.WeightKg)
}

func (s *DailyLogServiceSuite) TestLogRetrievalWhenEmpty() {
	_, err := s.logService.GetToday(s.ctx, s.now)
	s.Require().ErrorIs(err, store.ErrDailyLogNotFound)
}

func (s *DailyLogServiceSuite) TestLogDeletion() {
	s.Run("DeleteToday removes today's log", func() {
		s.createProfile()

		// Create a log
		log := &domain.DailyLog{
			Date:            "2025-01-15",
			WeightKg:        85,
			SleepQuality:    80,
			PlannedTraining: domain.PlannedTraining{Type: domain.TrainingTypeRest, PlannedDurationMin: 0},
			DayType:         domain.DayTypeFatburner,
		}
		_, err := s.logService.Create(s.ctx, log, s.now)
		s.Require().NoError(err)

		// Delete it
		err = s.logService.DeleteToday(s.ctx, s.now)
		s.Require().NoError(err)

		// Verify it's gone
		_, err = s.logService.GetToday(s.ctx, s.now)
		s.Require().ErrorIs(err, store.ErrDailyLogNotFound)
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

	s.Run("rejects invalid profile", func() {
		profile := &domain.UserProfile{
			HeightCM:             50, // Too short
			BirthDate:            time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
			Sex:                  domain.SexMale,
			Goal:                 domain.GoalLoseWeight,
			TargetWeightKg:       80,
			TargetWeeklyChangeKg: -0.5,
		}

		_, err := s.service.Upsert(s.ctx, profile, s.now)
		s.Require().ErrorIs(err, domain.ErrInvalidHeight)
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
