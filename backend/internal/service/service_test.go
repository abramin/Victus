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
// Justification: Tests default application and edge cases not covered by feature scenarios.
// Feature scenarios test full happy paths; these test service-layer behaviors.

// NOTE: The following tests were removed as redundant with dailylog.feature scenarios:
// - TestLogCreationCalculatesTargets: "Create a daily log with calculated targets"
// - TestLogCreationRequiresProfile: "Reject daily log creation without profile"

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
	s.Require().Len(result.PlannedSessions, 1, "Should have default rest session")
	s.Equal(domain.TrainingTypeRest, result.PlannedSessions[0].Type, "Training type should default to rest")
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
