package domain

import (
	"math"
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

// Justification: Dual-track analysis contains numeric invariants for variance
// calculations and recalibration logic that are pure domain functions.

type AnalysisSuite struct {
	suite.Suite
	basePlan *NutritionPlan
}

func TestAnalysisSuite(t *testing.T) {
	suite.Run(t, new(AnalysisSuite))
}

func (s *AnalysisSuite) SetupTest() {
	// Default plan: 5 kg loss over 10 weeks = 0.5 kg/week = safe deficit
	s.basePlan = s.createTestPlan("2026-01-01", 90.0, 85.0, 10)
}

func (s *AnalysisSuite) TestVarianceCalculation() {
	// Week 1 projected weight for 90->85 in 10 weeks = 90 + (-0.5) = 89.5
	analysisDate := s.mustParseDate("2026-01-05")

	s.Run("exact match shows zero variance", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   89.5,
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.False(result.RecalibrationNeeded)
		s.InDelta(0, result.VariancePercent, 0.1)
	})

	s.Run("slightly over projected stays within tolerance", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   90.0, // ~0.5% over projected 89.5
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.False(result.RecalibrationNeeded)
		s.InDelta(0.56, result.VariancePercent, 0.1)
	})

	s.Run("5% over triggers recalibration", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   94.0,
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)
		s.InDelta(5.03, result.VariancePercent, 0.1)
	})

	s.Run("just over 3% triggers recalibration", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   92.2,
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)
		s.InDelta(3.02, result.VariancePercent, 0.1)
	})

	s.Run("custom 5% tolerance accepts larger variance", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   93.0, // ~3.9% over
			TolerancePercent: 5,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.False(result.RecalibrationNeeded)
		s.InDelta(3.91, result.VariancePercent, 0.1)
	})
}

func (s *AnalysisSuite) TestCurrentWeekCalculation() {
	cases := []struct {
		name         string
		analysisDate string
		wantWeek     int
	}{
		{"day 1 of plan", "2026-01-01", 1},
		{"day 7 of plan", "2026-01-07", 1},
		{"day 8 of plan", "2026-01-08", 2},
		{"day 14 of plan", "2026-01-14", 2},
		{"day 15 of plan", "2026-01-15", 3},
		{"week 10", "2026-03-05", 10},
	}

	for _, tc := range cases {
		s.Run(tc.name, func() {
			input := AnalysisInput{
				Plan:             s.basePlan,
				ActualWeightKg:   89.0,
				TolerancePercent: 3,
				AnalysisDate:     s.mustParseDate(tc.analysisDate),
			}
			result, err := CalculateDualTrackAnalysis(input)
			s.Require().NoError(err)
			s.Equal(tc.wantWeek, result.CurrentWeek)
		})
	}
}

func (s *AnalysisSuite) TestPlanBoundaryErrors() {
	s.Run("analysis after plan ends returns ErrPlanEnded", func() {
		plan := s.createTestPlan("2026-01-01", 90.0, 88.0, 4)
		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   85.0,
			TolerancePercent: 3,
			AnalysisDate:     s.mustParseDate("2026-02-15"),
		}
		_, err := CalculateDualTrackAnalysis(input)
		s.ErrorIs(err, ErrPlanEnded)
	})

	s.Run("analysis before plan starts returns ErrPlanNotStarted", func() {
		plan := s.createTestPlan("2026-02-01", 90.0, 88.0, 4)
		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   90.0,
			TolerancePercent: 3,
			AnalysisDate:     s.mustParseDate("2026-01-15"),
		}
		_, err := CalculateDualTrackAnalysis(input)
		s.ErrorIs(err, ErrPlanNotStarted)
	})
}

func (s *AnalysisSuite) TestRecalibrationOptions() {
	s.Run("generates all four option types when recalibration needed", func() {
		// Analysis date in week 3 with significant variance
		// Week 3 projected: 90 - (0.5 * 3) = 88.5 kg
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   92.0, // Should be ~88.5, so significantly behind
			TolerancePercent: 3,
			AnalysisDate:     s.mustParseDate("2026-01-17"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)
		s.Len(result.Options, 4)

		// Verify all option types are present
		optionTypes := make(map[RecalibrationOptionType]bool)
		for _, opt := range result.Options {
			optionTypes[opt.Type] = true
			s.NotEmpty(opt.FeasibilityTag, "option %s missing feasibility tag", opt.Type)
			s.NotEmpty(opt.NewParameter, "option %s missing new parameter", opt.Type)
			s.NotEmpty(opt.Impact, "option %s missing impact", opt.Type)
		}

		expectedTypes := []RecalibrationOptionType{
			RecalibrationIncreaseDeficit,
			RecalibrationExtendTimeline,
			RecalibrationReviseGoal,
			RecalibrationKeepCurrent,
		}
		for _, expected := range expectedTypes {
			s.True(optionTypes[expected], "missing option type: %s", expected)
		}
	})
}

func (s *AnalysisSuite) TestPlanProjection() {
	s.Run("generates projection points from start to goal", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   89.0,
			TolerancePercent: 3,
			AnalysisDate:     s.mustParseDate("2026-01-05"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		// Should have 11 projection points (week 0 + 10 weeks)
		s.Len(result.PlanProjection, 11)

		// First point should be start weight
		s.Equal(90.0, result.PlanProjection[0].WeightKg)

		// Last point should be goal weight (or close to it)
		lastWeight := result.PlanProjection[len(result.PlanProjection)-1].WeightKg
		s.InDelta(85.0, lastWeight, 0.5)
	})
}

func (s *AnalysisSuite) TestTrendProjection() {
	s.Run("uses weight trend for future projection", func() {
		trend := &WeightTrend{
			WeeklyChangeKg: -0.4, // Losing 0.4 kg/week (slower than plan's -0.5 kg/week)
			RSquared:       0.9,
			StartWeightKg:  90.0,
			EndWeightKg:    88.8,
		}

		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   88.5,
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"), // Week 3
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.NotEmpty(result.TrendProjection)

		// Verify trend projection uses the trend's weekly change
		if len(result.TrendProjection) >= 2 {
			point1 := result.TrendProjection[0]
			point2 := result.TrendProjection[1]
			weeklyChange := point2.WeightKg - point1.WeightKg
			s.InDelta(-0.4, weeklyChange, 0.1)
		}
	})
}

func (s *AnalysisSuite) TestDefaultTolerance() {
	s.Run("zero tolerance defaults to 3%", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   89.0,
			TolerancePercent: 0,
			AnalysisDate:     s.mustParseDate("2026-01-05"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.Equal(3.0, result.TolerancePercent)
	})
}

func (s *AnalysisSuite) TestFeasibilityTags() {
	s.Run("all options have valid feasibility tags", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   92.0, // Triggers recalibration
			TolerancePercent: 3,
			AnalysisDate:     s.mustParseDate("2026-01-17"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)

		validTags := map[FeasibilityTag]bool{
			FeasibilityAchievable: true,
			FeasibilityModerate:   true,
			FeasibilityAmbitious:  true,
		}

		for _, opt := range result.Options {
			s.True(validTags[opt.FeasibilityTag], "option %s has invalid tag: %s", opt.Type, opt.FeasibilityTag)
		}
	})

	s.Run("major variance late in plan produces ambitious options", func() {
		plan := s.createTestPlan("2026-01-01", 90.0, 85.0, 10)
		// Week 8 with only 2 weeks left, should be ~86
		analysisDate := plan.StartDate.AddDate(0, 0, 7*7+3)

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   90.0, // Very behind - no progress at all
			TolerancePercent: 1,
			AnalysisDate:     analysisDate,
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		hasAmbitious := false
		for _, opt := range result.Options {
			if opt.FeasibilityTag == FeasibilityAmbitious {
				hasAmbitious = true
				break
			}
		}
		s.True(hasAmbitious, "expected at least one ambitious option when major variance late in plan")
	})
}

func (s *AnalysisSuite) TestPostRecalibrationHealthStaysOnTrack() {
	// Simulate post-recalibration state: plan was aligned to actual weight
	// (current variance ≈ 0) but historical trend still diverges from goal.
	// RecalibrationNeeded must stay false — the stale trend must not override.
	s.Run("aligned plan with divergent trend stays on track", func() {
		// Plan recalibrated so week 3 projected weight matches actual (92 kg)
		plan := s.createTestPlan("2026-01-01", 90.0, 85.0, 10)
		// Manually set week 3 projected weight to match actual (simulates regenerateWeeklyTargets)
		plan.WeeklyTargets[2].ProjectedWeightKg = 92.0

		// Trend shows weight is actually increasing (+0.5 kg/week)
		trend := &WeightTrend{
			WeeklyChangeKg: 0.5, // Gaining — diverges from loss goal
			RSquared:       0.85,
			StartWeightKg:  90.0,
			EndWeightKg:    92.0,
		}

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   92.0, // Matches the recalibrated projected weight
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"), // Week 3
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		// Current variance is 0 (plan aligned) — recalibration must NOT be needed
		// even though trend projects landing well above goal
		s.False(result.RecalibrationNeeded,
			"post-recalibration: stale trend must not override aligned plan state")

		// Landing point should still be populated for informational display
		s.NotNil(result.LandingPoint)
		s.True(result.LandingPoint.VarianceFromGoalKg > 1.0,
			"landing point still shows trend divergence for display purposes")
	})
}

func (s *AnalysisSuite) TestLandingPointIsInformationalOnly() {
	// Landing point is displayed for informational purposes but does NOT
	// trigger recalibration. The trend data is stale after recalibration
	// and shouldn't override the current variance check.

	s.Run("landing point divergence does not trigger recalibration when variance within tolerance", func() {
		plan := s.createTestPlan("2026-01-01", 80.0, 75.0, 10)

		// Trend: losing weight very slowly (-0.1 kg/week vs plan's -0.5 kg/week)
		trend := &WeightTrend{
			WeeklyChangeKg: -0.1,
			RSquared:       0.9,
			StartWeightKg:  80.0,
			EndWeightKg:    79.6,
		}

		// Week 3: projected ~78.5, actual ~80.0 — variance is ~1.9% (within 3% tolerance)
		// Landing point shows severe divergence but should NOT trigger recalibration
		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   80.0,
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"), // Week 3
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		// Current variance is within tolerance
		s.True(math.Abs(result.VariancePercent) < 3.0,
			"current week variance should be within tolerance")

		// Landing point is populated for display
		s.NotNil(result.LandingPoint)
		s.True(math.Abs(result.LandingPoint.VarianceFromGoalKg) > 3.0,
			"landing point should show divergence for informational display")

		// But recalibration is NOT triggered (variance within tolerance)
		s.False(result.RecalibrationNeeded,
			"landing point should not trigger recalibration when variance is within tolerance")
		s.Empty(result.Options)
	})

	s.Run("landing point displayed even when plan is on track", func() {
		plan := s.createTestPlan("2026-01-01", 90.0, 85.0, 10)
		plan.WeeklyTargets[2].ProjectedWeightKg = 92.0 // Freshly recalibrated

		trend := &WeightTrend{
			WeeklyChangeKg: 0.5, // Gaining — stale trend (diverging from goal)
			RSquared:       0.85,
			StartWeightKg:  90.0,
			EndWeightKg:    92.0,
		}

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   92.0, // Exactly matches recalibrated target
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		// Plan variance is on track (zero variance)
		s.False(result.RecalibrationNeeded)

		// But trend is diverging (gaining on a loss plan), so options are provided
		s.True(result.TrendDiverging)
		s.NotEmpty(result.Options, "options should be generated when trend is diverging")

		// Landing point still populated for informational display
		s.NotNil(result.LandingPoint)
	})
}

func (s *AnalysisSuite) TestOptionsGateMatchesRecalibrationFlag() {
	// Invariant: RecalibrationNeeded and len(Options) > 0 must be in sync.
	// This gate prevents the UI discrepancy where the health panel says
	// OFF TRACK but the strategy modal has no options to offer.

	analysisDate := s.mustParseDate("2026-01-05") // Week 1; projected = 89.5 kg

	s.Run("on track: recalibrationNeeded false produces empty options", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   89.5, // Exact match — zero variance
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.False(result.RecalibrationNeeded)
		s.Empty(result.Options, "on-track plan must not generate recalibration options")
	})

	s.Run("off track: recalibrationNeeded true produces all four options", func() {
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   94.0, // ~4.7 kg over projected — well past 3% tolerance
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)
		s.Len(result.Options, 4, "off-track plan must generate all four recalibration options")

		// Every option must be fully populated
		for _, opt := range result.Options {
			s.NotEmpty(opt.Type, "option missing Type")
			s.NotEmpty(opt.FeasibilityTag, "option missing FeasibilityTag")
			s.NotEmpty(opt.NewParameter, "option missing NewParameter")
			s.NotEmpty(opt.Impact, "option missing Impact")
		}
	})

	s.Run("borderline at-risk: just over tolerance produces options", func() {
		// 89.5 * 1.0301 ≈ 92.19 — variance just above 3%
		input := AnalysisInput{
			Plan:             s.basePlan,
			ActualWeightKg:   92.2,
			TolerancePercent: 3,
			AnalysisDate:     analysisDate,
		}
		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)
		s.True(result.RecalibrationNeeded)
		s.Len(result.Options, 4, "at-risk plan crossing tolerance must generate options")
	})

	s.Run("bidirectional gate: RecalibrationNeeded iff Options non-empty", func() {
		cases := []struct {
			name           string
			actualWeightKg float64
		}{
			{"well within tolerance", 89.5},
			{"slightly under projected", 89.0},
			{"at upper tolerance edge", 92.1}, // ~2.85% — still under 3%
			{"just over tolerance", 92.2},     // ~3.02%
			{"significantly over", 94.0},
			{"significantly under", 86.0},     // negative variance, also triggers
		}

		for _, tc := range cases {
			s.Run(tc.name, func() {
				input := AnalysisInput{
					Plan:             s.basePlan,
					ActualWeightKg:   tc.actualWeightKg,
					TolerancePercent: 3,
					AnalysisDate:     analysisDate,
				}
				result, err := CalculateDualTrackAnalysis(input)
				s.Require().NoError(err)

				hasOptions := len(result.Options) > 0
				s.Equal(result.RecalibrationNeeded, hasOptions,
					"RecalibrationNeeded (%v) and Options presence (%v) must be in sync for actual=%.1f",
					result.RecalibrationNeeded, hasOptions, tc.actualWeightKg)
			})
		}
	})
}

func (s *AnalysisSuite) TestTrendDiverging() {
	s.Run("weight loss plan with gaining trend sets TrendDiverging", func() {
		plan := s.createTestPlan("2026-01-01", 90.0, 85.0, 10)

		// Trend shows weight is increasing (+0.3 kg/week) instead of decreasing
		trend := &WeightTrend{
			WeeklyChangeKg: 0.3,
			RSquared:       0.85,
			StartWeightKg:  89.5,
			EndWeightKg:    90.4,
		}

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   89.5, // Within variance tolerance
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"), // Week 3
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		// Variance is within tolerance so recalibration not needed
		s.False(result.RecalibrationNeeded)
		// But trend is diverging (gaining instead of losing)
		s.True(result.TrendDiverging)
		s.Contains(result.TrendDivergingMsg, "+0.3")
		s.Contains(result.TrendDivergingMsg, "kg/wk")
	})

	s.Run("weight loss plan with losing trend does not set TrendDiverging", func() {
		plan := s.createTestPlan("2026-01-01", 90.0, 85.0, 10)

		trend := &WeightTrend{
			WeeklyChangeKg: -0.4, // Losing weight (correct direction)
			RSquared:       0.85,
			StartWeightKg:  90.0,
			EndWeightKg:    88.8,
		}

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   88.8,
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		s.False(result.TrendDiverging)
		s.Empty(result.TrendDivergingMsg)
	})

	s.Run("weight gain plan with losing trend sets TrendDiverging", func() {
		// Weight gain plan: 70 -> 72.5 kg over 10 weeks (0.25 kg/week, within safe limit)
		plan := s.createTestPlan("2026-01-01", 70.0, 72.5, 10)

		// Trend shows weight is decreasing (-0.2 kg/week) instead of increasing
		trend := &WeightTrend{
			WeeklyChangeKg: -0.2,
			RSquared:       0.85,
			StartWeightKg:  70.5,
			EndWeightKg:    69.9,
		}

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   70.5, // Within variance tolerance
			TolerancePercent: 3,
			WeightTrend:      trend,
			AnalysisDate:     s.mustParseDate("2026-01-17"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		s.True(result.TrendDiverging)
		s.Contains(result.TrendDivergingMsg, "-0.2")
	})

	s.Run("no trend data does not set TrendDiverging", func() {
		plan := s.createTestPlan("2026-01-01", 90.0, 85.0, 10)

		input := AnalysisInput{
			Plan:             plan,
			ActualWeightKg:   89.5,
			TolerancePercent: 3,
			WeightTrend:      nil, // No trend data
			AnalysisDate:     s.mustParseDate("2026-01-17"),
		}

		result, err := CalculateDualTrackAnalysis(input)
		s.Require().NoError(err)

		s.False(result.TrendDiverging)
		s.Empty(result.TrendDivergingMsg)
	})
}

// --- Helper methods ---

func (s *AnalysisSuite) createTestPlan(startDateStr string, startWeight, goalWeight float64, durationWeeks int) *NutritionPlan {
	s.T().Helper()

	startDate := s.mustParseDate(startDateStr)

	profile := &UserProfile{
		HeightCM:               175,
		Sex:                    "male",
		BirthDate:              s.mustParseDate("1990-01-01"),
		CurrentWeightKg:        startWeight,
		BMREquation:            BMREquationMifflinStJeor,
		CarbRatio:              0.45,
		ProteinRatio:           0.30,
		FatRatio:               0.25,
		RecalibrationTolerance: 3,
	}

	input := NutritionPlanInput{
		StartDate:     startDate.Format("2006-01-02"),
		StartWeightKg: startWeight,
		GoalWeightKg:  goalWeight,
		DurationWeeks: durationWeeks,
	}

	plan, err := NewNutritionPlan(input, profile, startDate)
	s.Require().NoError(err)

	plan.ID = 1 // Set a test ID

	return plan
}

func (s *AnalysisSuite) mustParseDate(dateStr string) time.Time {
	t, err := time.Parse("2006-01-02", dateStr)
	s.Require().NoError(err)
	return t
}
