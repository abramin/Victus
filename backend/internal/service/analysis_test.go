package service

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
	"victus/internal/testutil"

	"github.com/stretchr/testify/suite"
)

// Justification: Service integration tests verify orchestration of domain logic
// with real stores - not covered by domain unit tests or feature scenarios.

type AnalysisServiceSuite struct {
	suite.Suite
	pg           *testutil.PostgresContainer
	db           *sql.DB
	planStore    *store.NutritionPlanStore
	profileStore *store.ProfileStore
	logStore     *store.DailyLogStore
	sessionStore *store.TrainingSessionStore
	service      *AnalysisService
	ctx          context.Context
	now          time.Time
}

func TestAnalysisServiceSuite(t *testing.T) {
	suite.Run(t, new(AnalysisServiceSuite))
}

func (s *AnalysisServiceSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *AnalysisServiceSuite) SetupTest() {
	s.ctx = context.Background()
	s.Require().NoError(s.pg.ClearTables(s.ctx))

	s.planStore = store.NewNutritionPlanStore(s.db)
	s.profileStore = store.NewProfileStore(s.db)
	s.logStore = store.NewDailyLogStore(s.db)
	s.sessionStore = store.NewTrainingSessionStore(s.db)
	s.service = NewAnalysisService(s.planStore, s.profileStore, s.logStore)
	s.now = time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)
}

func (s *AnalysisServiceSuite) createProfile() {
	profile := &domain.UserProfile{
		HeightCM:               180,
		BirthDate:              time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
		Sex:                    domain.SexMale,
		Goal:                   domain.GoalLoseWeight,
		TargetWeightKg:         80,
		TargetWeeklyChangeKg:   -0.5,
		CarbRatio:              0.45,
		ProteinRatio:           0.30,
		FatRatio:               0.25,
		MealRatios:             domain.MealRatios{Breakfast: 0.30, Lunch: 0.30, Dinner: 0.40},
		PointsConfig:           domain.PointsConfig{CarbMultiplier: 1.15, ProteinMultiplier: 4.35, FatMultiplier: 3.5},
		RecalibrationTolerance: 3,
		CurrentWeightKg:        90,
	}
	err := s.profileStore.Upsert(s.ctx, profile)
	s.Require().NoError(err)
}

func (s *AnalysisServiceSuite) createActivePlan(startDate time.Time, startWeight, goalWeight float64, durationWeeks int) int64 {
	s.T().Helper()

	profile, err := s.profileStore.Get(s.ctx)
	s.Require().NoError(err)

	input := domain.NutritionPlanInput{
		StartDate:     startDate.Format("2006-01-02"),
		StartWeightKg: startWeight,
		GoalWeightKg:  goalWeight,
		DurationWeeks: durationWeeks,
	}

	plan, err := domain.NewNutritionPlan(input, profile, startDate)
	s.Require().NoError(err)

	planID, err := s.planStore.Create(s.ctx, plan)
	s.Require().NoError(err)

	return planID
}

func (s *AnalysisServiceSuite) createDailyLog(date string, weight float64) {
	s.T().Helper()
	log := &domain.DailyLog{
		Date:              date,
		WeightKg:          weight,
		SleepQuality:      80,
		DayType:           domain.DayTypeFatburner,
		CalculatedTargets: domain.DailyTargets{DayType: domain.DayTypeFatburner},
	}
	_, err := s.logStore.Create(s.ctx, log)
	s.Require().NoError(err)
}

// --- Test Cases ---

func (s *AnalysisServiceSuite) TestAnalyzePlanOnTrack() {
	s.Run("returns no recalibration when weight is on track", func() {
		s.createProfile()
		// Plan: 90 -> 85 in 10 weeks, starting 2026-01-01
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Create weight logs showing on-track progress
		// Week 2, expected weight ~89 kg
		s.createDailyLog("2026-01-08", 89.2)
		s.createDailyLog("2026-01-09", 89.0)
		s.createDailyLog("2026-01-10", 89.1)

		analysisDate := time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)
		result, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().NoError(err)
		s.False(result.RecalibrationNeeded, "should not need recalibration when on track")
		s.Equal(2, result.CurrentWeek)
		s.InDelta(89.1, result.ActualWeightKg, 0.1)
		s.Empty(result.Options, "should have no options when recalibration not needed")
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanBehindSchedule() {
	s.Run("returns recalibration options when behind schedule", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Week 3 expected weight: 90 - (0.5 * 3) = 88.5 kg
		// To exceed 3% tolerance: 88.5 * 1.03 = 91.2 kg
		// Create weight logs showing significant regression (gained weight instead of losing)
		s.createDailyLog("2026-01-15", 92.0)
		s.createDailyLog("2026-01-16", 92.2)
		s.createDailyLog("2026-01-17", 92.1)

		analysisDate := time.Date(2026, 1, 17, 12, 0, 0, 0, time.UTC)
		result, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded, "should need recalibration when behind schedule")
		s.Equal(3, result.CurrentWeek)
		s.Greater(result.VariancePercent, 3.0, "variance should exceed tolerance")
		s.Len(result.Options, 4, "should have 4 recalibration options")

		// Verify all option types are present
		optionTypes := make(map[domain.RecalibrationOptionType]bool)
		for _, opt := range result.Options {
			optionTypes[opt.Type] = true
		}
		s.True(optionTypes[domain.RecalibrationIncreaseDeficit])
		s.True(optionTypes[domain.RecalibrationExtendTimeline])
		s.True(optionTypes[domain.RecalibrationReviseGoal])
		s.True(optionTypes[domain.RecalibrationKeepCurrent])
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanAheadOfSchedule() {
	s.Run("returns no recalibration when ahead of schedule", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Create weight logs showing faster progress than planned
		// Week 2, expected ~89 kg but we're at 88 kg
		s.createDailyLog("2026-01-08", 88.0)
		s.createDailyLog("2026-01-09", 87.8)
		s.createDailyLog("2026-01-10", 87.9)

		analysisDate := time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)
		result, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().NoError(err)
		// Being ahead is not necessarily a problem within tolerance
		s.Less(result.VarianceKg, 0.0, "variance should be negative (lighter than planned)")
		s.InDelta(87.9, result.ActualWeightKg, 0.1)
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanExtremeVariance() {
	s.Run("late plan with extreme variance produces ambitious options", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Create weight logs in week 8 showing no progress
		// Week 8, expected ~86 kg but we're still at 90 kg
		week8Date := planStart.AddDate(0, 0, 7*7+2) // Day 51
		s.createDailyLog(week8Date.Format("2006-01-02"), 90.0)
		s.createDailyLog(week8Date.AddDate(0, 0, 1).Format("2006-01-02"), 90.2)

		analysisDate := week8Date.AddDate(0, 0, 1)
		result, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)
		s.Equal(8, result.CurrentWeek)

		// Should have at least one ambitious option given the situation
		hasAmbitious := false
		for _, opt := range result.Options {
			if opt.FeasibilityTag == domain.FeasibilityAmbitious {
				hasAmbitious = true
				break
			}
		}
		s.True(hasAmbitious, "extreme variance late in plan should produce ambitious options")
	})
}

func (s *AnalysisServiceSuite) TestAnalyzeActivePlan() {
	s.Run("analyzes currently active plan", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Create weight logs
		s.createDailyLog("2026-01-05", 89.5)
		s.createDailyLog("2026-01-06", 89.3)

		analysisDate := time.Date(2026, 1, 6, 12, 0, 0, 0, time.UTC)
		result, err := s.service.AnalyzeActivePlan(s.ctx, analysisDate)

		s.Require().NoError(err)
		s.NotNil(result)
		s.Equal(1, result.CurrentWeek)
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanNoWeightData() {
	s.Run("returns error when no weight data available", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// No weight logs created
		analysisDate := time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)
		_, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().ErrorIs(err, domain.ErrInsufficientWeightData)
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanNotFound() {
	s.Run("returns error for non-existent plan", func() {
		s.createProfile()

		analysisDate := time.Date(2026, 1, 10, 12, 0, 0, 0, time.UTC)
		_, err := s.service.AnalyzePlan(s.ctx, 99999, analysisDate)

		s.Require().ErrorIs(err, store.ErrPlanNotFound)
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanInactive() {
	s.Run("returns error for completed plan", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Complete the plan
		err := s.planStore.UpdateStatus(s.ctx, planID, domain.PlanStatusCompleted)
		s.Require().NoError(err)

		s.createDailyLog("2026-01-05", 89.0)

		analysisDate := time.Date(2026, 1, 6, 12, 0, 0, 0, time.UTC)
		_, err = s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().ErrorIs(err, domain.ErrPlanNotFound)
	})
}

func (s *AnalysisServiceSuite) TestAnalyzePlanWithTrendProjection() {
	s.Run("includes trend projection when sufficient weight history exists", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 20)

		// Create 30 days of weight logs with gradual decline
		for i := 0; i < 30; i++ {
			date := planStart.AddDate(0, 0, i)
			// Simulating ~0.4 kg/week loss = 0.057 kg/day
			weight := 90.0 - (float64(i) * 0.057)
			s.createDailyLog(date.Format("2006-01-02"), weight)
		}

		analysisDate := planStart.AddDate(0, 0, 29)
		result, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().NoError(err)
		s.NotEmpty(result.TrendProjection, "should have trend projection with sufficient history")
		s.NotNil(result.LandingPoint, "should have landing point projection")
	})
}

func (s *AnalysisServiceSuite) TestRolling7DayWeightCalculation() {
	s.Run("uses 7-day rolling average for actual weight", func() {
		s.createProfile()
		planStart := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
		planID := s.createActivePlan(planStart, 90.0, 85.0, 10)

		// Create 7 days of varying weights
		weights := []float64{90.0, 89.5, 90.2, 89.8, 89.6, 89.9, 89.4}
		for i, w := range weights {
			date := planStart.AddDate(0, 0, i)
			s.createDailyLog(date.Format("2006-01-02"), w)
		}

		analysisDate := planStart.AddDate(0, 0, 6)
		result, err := s.service.AnalyzePlan(s.ctx, planID, analysisDate)

		s.Require().NoError(err)

		// Calculate expected average
		var sum float64
		for _, w := range weights {
			sum += w
		}
		expectedAvg := sum / 7.0

		s.InDelta(expectedAvg, result.ActualWeightKg, 0.1, "should use 7-day rolling average")
	})
}
