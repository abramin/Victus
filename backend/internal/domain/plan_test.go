package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

// Justification: NutritionPlan validation and calculation are domain invariants;
// unit tests ensure safety limits and weekly target generation remain stable
// without requiring HTTP/database integration.
type PlanSuite struct {
	suite.Suite
	now     time.Time
	profile *UserProfile
}

func TestPlanSuite(t *testing.T) {
	suite.Run(t, new(PlanSuite))
}

func (s *PlanSuite) SetupTest() {
	s.now = time.Date(2026, 1, 24, 12, 0, 0, 0, time.UTC)
	s.profile = &UserProfile{
		HeightCM:       180,
		BirthDate:      time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
		Sex:            SexMale,
		Goal:           GoalLoseWeight,
		CarbRatio:      0.45,
		ProteinRatio:   0.30,
		FatRatio:       0.25,
		BMREquation:    BMREquationMifflinStJeor,
	}
}

func (s *PlanSuite) validInput() NutritionPlanInput {
	return NutritionPlanInput{
		StartDate:     s.now.Format("2006-01-02"),
		StartWeightKg: 90.0,
		GoalWeightKg:  80.0,
		DurationWeeks: 20, // 10kg over 20 weeks = 0.5 kg/week (safe)
	}
}

// =============================================================================
// PLAN STATUS VALIDATION
// =============================================================================

func (s *PlanSuite) TestPlanStatusParsing() {
	s.Run("accepts all valid statuses", func() {
		validStatuses := []string{"active", "completed", "abandoned"}
		for _, status := range validStatuses {
			parsed, err := ParsePlanStatus(status)
			s.Require().NoError(err, "Should accept status: %s", status)
			s.Equal(PlanStatus(status), parsed)
		}
	})

	s.Run("defaults empty to active", func() {
		status, err := ParsePlanStatus("")
		s.Require().NoError(err)
		s.Equal(PlanStatusActive, status)
	})

	s.Run("accepts paused status", func() {
		status, err := ParsePlanStatus("paused")
		s.Require().NoError(err)
		s.Equal(PlanStatusPaused, status)
	})

	s.Run("rejects invalid status", func() {
		_, err := ParsePlanStatus("invalid_status")
		s.Require().ErrorIs(err, ErrInvalidPlanStatus)
	})
}

// =============================================================================
// PLAN DURATION VALIDATION
// =============================================================================

func (s *PlanSuite) TestPlanDurationLimits() {
	s.Run("accepts minimum duration of 4 weeks", func() {
		input := s.validInput()
		input.DurationWeeks = 4
		input.GoalWeightKg = 88.0 // 2kg over 4 weeks = safe
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Equal(4, plan.DurationWeeks)
	})

	s.Run("accepts maximum duration of 104 weeks", func() {
		input := s.validInput()
		input.DurationWeeks = 104
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Equal(104, plan.DurationWeeks)
	})

	s.Run("rejects duration below minimum", func() {
		input := s.validInput()
		input.DurationWeeks = 3
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanDuration)
	})

	s.Run("rejects duration above maximum", func() {
		input := s.validInput()
		input.DurationWeeks = 105
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanDuration)
	})
}

// =============================================================================
// PLAN WEIGHT VALIDATION
// =============================================================================

func (s *PlanSuite) TestPlanWeightValidation() {
	s.Run("accepts start weight at boundaries", func() {
		input := s.validInput()
		input.StartWeightKg = 30
		input.GoalWeightKg = 31
		input.DurationWeeks = 8 // gain scenario, safe rate
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		input.StartWeightKg = 300
		input.GoalWeightKg = 295
		input.DurationWeeks = 20 // loss scenario, safe rate
		_, err = NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
	})

	s.Run("rejects start weight below minimum", func() {
		input := s.validInput()
		input.StartWeightKg = 29.9
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanStartWeight)
	})

	s.Run("rejects start weight above maximum", func() {
		input := s.validInput()
		input.StartWeightKg = 300.1
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanStartWeight)
	})

	s.Run("rejects goal weight below minimum", func() {
		input := s.validInput()
		input.GoalWeightKg = 29.9
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanGoalWeight)
	})

	s.Run("rejects goal weight above maximum", func() {
		input := s.validInput()
		input.GoalWeightKg = 300.1
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanGoalWeight)
	})
}

// =============================================================================
// PLAN DATE VALIDATION
// =============================================================================

func (s *PlanSuite) TestPlanStartDateValidation() {
	s.Run("accepts today as start date", func() {
		input := s.validInput()
		input.StartDate = s.now.Format("2006-01-02")
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Equal(s.now.Truncate(24*time.Hour), plan.StartDate.Truncate(24*time.Hour))
	})

	s.Run("accepts future start date", func() {
		input := s.validInput()
		input.StartDate = s.now.AddDate(0, 0, 7).Format("2006-01-02")
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
	})

	s.Run("accepts start date up to 7 days in past", func() {
		input := s.validInput()
		input.StartDate = s.now.AddDate(0, 0, -6).Format("2006-01-02")
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
	})

	s.Run("rejects start date more than 7 days in past", func() {
		input := s.validInput()
		input.StartDate = s.now.AddDate(0, 0, -8).Format("2006-01-02")
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrPlanStartDateTooOld)
	})

	s.Run("rejects invalid date format", func() {
		input := s.validInput()
		input.StartDate = "01-24-2026"
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrInvalidPlanStartDate)
	})
}

// =============================================================================
// DEFICIT AND SURPLUS SAFETY LIMITS
// =============================================================================

func (s *PlanSuite) TestPlanDeficitSafetyLimits() {
	s.Run("accepts safe weight loss rate (~0.5 kg/week)", func() {
		input := s.validInput()
		input.StartWeightKg = 90
		input.GoalWeightKg = 80
		input.DurationWeeks = 20 // 0.5 kg/week
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.InDelta(-0.5, plan.RequiredWeeklyChangeKg, 0.01)
	})

	s.Run("accepts maximum safe deficit (~750 kcal/day)", func() {
		input := s.validInput()
		input.StartWeightKg = 90
		input.GoalWeightKg = 80
		// 750 kcal/day = 0.68 kg/week max loss
		// 10 kg / 0.68 kg/week = ~15 weeks minimum
		input.DurationWeeks = 15
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
	})

	s.Run("rejects aggressive deficit exceeding 750 kcal/day", func() {
		input := s.validInput()
		input.StartWeightKg = 90
		input.GoalWeightKg = 70
		input.DurationWeeks = 10 // 2 kg/week = ~2200 kcal/day deficit (unsafe)
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrPlanDeficitTooAggressive)
	})
}

func (s *PlanSuite) TestPlanSurplusSafetyLimits() {
	s.Run("accepts safe weight gain rate (~0.25 kg/week)", func() {
		input := s.validInput()
		input.StartWeightKg = 70
		input.GoalWeightKg = 75
		input.DurationWeeks = 20 // 0.25 kg/week
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.InDelta(0.25, plan.RequiredWeeklyChangeKg, 0.01)
	})

	s.Run("accepts maximum safe surplus (~500 kcal/day)", func() {
		input := s.validInput()
		input.StartWeightKg = 70
		input.GoalWeightKg = 77
		// 500 kcal/day = 0.45 kg/week max gain
		// 7 kg / 0.45 kg/week = ~16 weeks minimum
		input.DurationWeeks = 16
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
	})

	s.Run("rejects aggressive surplus exceeding 500 kcal/day", func() {
		input := s.validInput()
		input.StartWeightKg = 70
		input.GoalWeightKg = 90
		input.DurationWeeks = 10 // 2 kg/week = ~2200 kcal/day surplus (unsafe)
		_, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().ErrorIs(err, ErrPlanSurplusTooAggressive)
	})
}

// =============================================================================
// WEEKLY TARGETS GENERATION
// =============================================================================

func (s *PlanSuite) TestWeeklyTargetsGeneration() {
	s.Run("generates correct number of weekly targets", func() {
		input := s.validInput()
		input.DurationWeeks = 20 // keep default safe deficit
		input.GoalWeightKg = 85  // 5kg over 20 weeks = safe
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Len(plan.WeeklyTargets, 20)
	})

	s.Run("weekly targets have sequential week numbers", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		for i, target := range plan.WeeklyTargets {
			s.Equal(i+1, target.WeekNumber)
		}
	})

	s.Run("first week starts on plan start date", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Equal(plan.StartDate, plan.WeeklyTargets[0].StartDate)
	})

	s.Run("each week spans 7 days", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		for _, target := range plan.WeeklyTargets {
			duration := target.EndDate.Sub(target.StartDate)
			s.Equal(6*24*time.Hour, duration, "Week %d should span 6 days (end - start)", target.WeekNumber)
		}
	})

	s.Run("consecutive weeks are contiguous", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		for i := 1; i < len(plan.WeeklyTargets); i++ {
			prev := plan.WeeklyTargets[i-1]
			curr := plan.WeeklyTargets[i]
			expectedStart := prev.EndDate.AddDate(0, 0, 1)
			s.Equal(expectedStart, curr.StartDate, "Week %d should start day after week %d ends", curr.WeekNumber, prev.WeekNumber)
		}
	})
}

func (s *PlanSuite) TestWeeklyTargetsWeightProjection() {
	s.Run("projected weight decreases linearly for weight loss", func() {
		input := s.validInput()
		input.StartWeightKg = 90
		input.GoalWeightKg = 80
		input.DurationWeeks = 20 // 0.5 kg/week (safe)
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// Week 1 should be start - 0.5kg, week 20 should be goal weight
		s.InDelta(89.5, plan.WeeklyTargets[0].ProjectedWeightKg, 0.1)
		s.InDelta(80.0, plan.WeeklyTargets[19].ProjectedWeightKg, 0.1)
	})

	s.Run("projected weight increases linearly for weight gain", func() {
		input := s.validInput()
		input.StartWeightKg = 70
		input.GoalWeightKg = 75
		input.DurationWeeks = 20 // 0.25 kg/week (safe)
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		s.InDelta(70.25, plan.WeeklyTargets[0].ProjectedWeightKg, 0.1)
		s.InDelta(75.0, plan.WeeklyTargets[19].ProjectedWeightKg, 0.1)
	})
}

func (s *PlanSuite) TestWeeklyTargetsCalorieCalculation() {
	s.Run("target intake equals projected TDEE minus deficit", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		for _, target := range plan.WeeklyTargets {
			expectedIntake := float64(target.ProjectedTDEE) + plan.RequiredDailyDeficitKcal
			s.InDelta(expectedIntake, float64(target.TargetIntakeKcal), 1.0, "Week %d intake mismatch", target.WeekNumber)
		}
	})

	s.Run("TDEE decreases as projected weight decreases", func() {
		input := s.validInput()
		input.StartWeightKg = 100
		input.GoalWeightKg = 80
		input.DurationWeeks = 40
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		firstWeekTDEE := plan.WeeklyTargets[0].ProjectedTDEE
		lastWeekTDEE := plan.WeeklyTargets[len(plan.WeeklyTargets)-1].ProjectedTDEE
		s.Greater(firstWeekTDEE, lastWeekTDEE, "TDEE should decrease as weight decreases")
	})
}

func (s *PlanSuite) TestWeeklyTargetsMacroDistribution() {
	s.Run("macro grams follow profile ratios", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		target := plan.WeeklyTargets[0]
		totalCalories := float64(target.TargetIntakeKcal)

		expectedCarbCals := totalCalories * s.profile.CarbRatio
		expectedProteinCals := totalCalories * s.profile.ProteinRatio
		expectedFatCals := totalCalories * s.profile.FatRatio

		actualCarbCals := float64(target.TargetCarbsG) * CaloriesPerGramCarb
		actualProteinCals := float64(target.TargetProteinG) * CaloriesPerGramProtein
		actualFatCals := float64(target.TargetFatsG) * CaloriesPerGramFat

		s.InDelta(expectedCarbCals, actualCarbCals, 10, "Carb calories mismatch")
		s.InDelta(expectedProteinCals, actualProteinCals, 10, "Protein calories mismatch")
		s.InDelta(expectedFatCals, actualFatCals, 10, "Fat calories mismatch")
	})
}

// =============================================================================
// PLAN NAVIGATION
// =============================================================================

func (s *PlanSuite) TestGetCurrentWeek() {
	s.Run("returns 0 before plan starts", func() {
		input := s.validInput()
		input.StartDate = s.now.AddDate(0, 0, 7).Format("2006-01-02") // Starts next week
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		currentWeek := plan.GetCurrentWeek(s.now)
		s.Equal(0, currentWeek)
	})

	s.Run("returns 1 on first day of plan", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		currentWeek := plan.GetCurrentWeek(s.now)
		s.Equal(1, currentWeek)
	})

	s.Run("returns 2 on day 8 of plan", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		day8 := s.now.AddDate(0, 0, 7)
		currentWeek := plan.GetCurrentWeek(day8)
		s.Equal(2, currentWeek)
	})

	s.Run("returns week number after plan ends", func() {
		input := s.validInput()
		input.DurationWeeks = 4
		input.GoalWeightKg = 89 // 1kg over 4 weeks = safe rate
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		afterPlan := s.now.AddDate(0, 0, 35) // 5 weeks later
		currentWeek := plan.GetCurrentWeek(afterPlan)
		s.Equal(6, currentWeek) // Beyond duration
	})
}

func (s *PlanSuite) TestGetWeeklyTarget() {
	s.Run("returns target for valid week", func() {
		input := s.validInput()
		input.DurationWeeks = 20 // safe with default 10kg loss
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		target := plan.GetWeeklyTarget(5)
		s.Require().NotNil(target)
		s.Equal(5, target.WeekNumber)
	})

	s.Run("returns nil for week 0", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		target := plan.GetWeeklyTarget(0)
		s.Nil(target)
	})

	s.Run("returns nil for week beyond duration", func() {
		input := s.validInput()
		input.DurationWeeks = 20 // safe with default 10kg loss
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		target := plan.GetWeeklyTarget(21)
		s.Nil(target)
	})
}

func (s *PlanSuite) TestIsActive() {
	s.Run("returns true for active plan", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.True(plan.IsActive())
	})

	s.Run("returns false for completed plan", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		plan.Status = PlanStatusCompleted
		s.False(plan.IsActive())
	})

	s.Run("returns false for abandoned plan", func() {
		input := s.validInput()
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		plan.Status = PlanStatusAbandoned
		s.False(plan.IsActive())
	})
}

// =============================================================================
// DERIVED FIELDS CALCULATION
// =============================================================================

func (s *PlanSuite) TestDerivedFieldsCalculation() {
	s.Run("calculates required weekly change correctly for weight loss", func() {
		input := s.validInput()
		input.StartWeightKg = 100
		input.GoalWeightKg = 90
		input.DurationWeeks = 20
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// (90 - 100) / 20 = -0.5 kg/week
		s.InDelta(-0.5, plan.RequiredWeeklyChangeKg, 0.001)
	})

	s.Run("calculates required weekly change correctly for weight gain", func() {
		input := s.validInput()
		input.StartWeightKg = 70
		input.GoalWeightKg = 80
		input.DurationWeeks = 40
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// (80 - 70) / 40 = 0.25 kg/week
		s.InDelta(0.25, plan.RequiredWeeklyChangeKg, 0.001)
	})

	s.Run("calculates daily deficit from weekly change", func() {
		input := s.validInput()
		input.StartWeightKg = 90
		input.GoalWeightKg = 80
		input.DurationWeeks = 20 // -0.5 kg/week
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// -0.5 kg/week * 7700 kcal/kg / 7 days = -550 kcal/day
		s.InDelta(-550, plan.RequiredDailyDeficitKcal, 1)
	})

	s.Run("calculates daily surplus from weekly change", func() {
		input := s.validInput()
		input.StartWeightKg = 70
		input.GoalWeightKg = 77
		input.DurationWeeks = 28 // 0.25 kg/week
		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// 0.25 kg/week * 7700 kcal/kg / 7 days = 275 kcal/day
		s.InDelta(275, plan.RequiredDailyDeficitKcal, 1)
	})
}

// =============================================================================
// KCAL FACTOR OVERRIDE TESTS
// =============================================================================

func (s *PlanSuite) TestKcalFactorOverride() {
	s.Run("accepts KcalFactor override in input", func() {
		input := s.validInput()
		kcalFactor := 33.0
		input.KcalFactorOverride = &kcalFactor

		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Require().NotNil(plan.KcalFactorOverride)
		s.Equal(33.0, *plan.KcalFactorOverride)
	})

	s.Run("nil KcalFactor uses BMR-based calculation", func() {
		input := s.validInput()
		input.KcalFactorOverride = nil

		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)
		s.Nil(plan.KcalFactorOverride)

		// BMR-based TDEE for 90kg, 180cm, 35yo male should be around:
		// BMR = (10 × 90) + (6.25 × 180) - (5 × 35) + 5 = 900 + 1125 - 175 + 5 = 1855
		// TDEE = 1855 × 1.2 = 2226
		week1 := plan.WeeklyTargets[0]
		s.InDelta(2200, week1.ProjectedTDEE, 100, "BMR-based TDEE should be around 2200")
	})

	s.Run("KcalFactor override produces Weight × Factor TDEE", func() {
		input := s.validInput()
		kcalFactor := 33.0
		input.KcalFactorOverride = &kcalFactor
		input.StartWeightKg = 90.0

		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// Week 1 projected weight = 90 - (10/20) = 89.5
		// TDEE = 89.5 × 33.0 = 2953.5 ≈ 2954
		week1 := plan.WeeklyTargets[0]
		expectedTDEE := 89.5 * 33.0
		s.InDelta(expectedTDEE, float64(week1.ProjectedTDEE), 2,
			"KcalFactor TDEE should be %.1f × %.1f = %.0f", 89.5, kcalFactor, expectedTDEE)
	})

	s.Run("KcalFactor TDEE differs from BMR-based TDEE", func() {
		// Create two plans with same parameters, one with KcalFactor, one without
		inputWithFactor := s.validInput()
		kcalFactor := 33.0
		inputWithFactor.KcalFactorOverride = &kcalFactor

		inputWithoutFactor := s.validInput()
		inputWithoutFactor.KcalFactorOverride = nil

		planWithFactor, err := NewNutritionPlan(inputWithFactor, s.profile, s.now)
		s.Require().NoError(err)

		planWithoutFactor, err := NewNutritionPlan(inputWithoutFactor, s.profile, s.now)
		s.Require().NoError(err)

		s.NotEqual(
			planWithFactor.WeeklyTargets[0].ProjectedTDEE,
			planWithoutFactor.WeeklyTargets[0].ProjectedTDEE,
			"KcalFactor and BMR-based TDEE should differ",
		)
	})

	s.Run("weekly targets use KcalFactor TDEE throughout plan", func() {
		input := s.validInput()
		kcalFactor := 33.0
		input.KcalFactorOverride = &kcalFactor
		input.StartWeightKg = 90.0
		input.GoalWeightKg = 80.0
		input.DurationWeeks = 20

		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		for _, target := range plan.WeeklyTargets {
			expectedTDEE := target.ProjectedWeightKg * kcalFactor
			s.InDelta(expectedTDEE, float64(target.ProjectedTDEE), 2,
				"Week %d: TDEE should be %.1f × %.1f = %.0f, got %d",
				target.WeekNumber, target.ProjectedWeightKg, kcalFactor, expectedTDEE, target.ProjectedTDEE)
		}
	})

	s.Run("zero KcalFactor falls back to BMR", func() {
		input := s.validInput()
		kcalFactor := 0.0
		input.KcalFactorOverride = &kcalFactor

		plan, err := NewNutritionPlan(input, s.profile, s.now)
		s.Require().NoError(err)

		// With zero factor, should fall back to BMR-based calculation
		week1 := plan.WeeklyTargets[0]
		s.Greater(week1.ProjectedTDEE, 0, "TDEE should be positive even with zero factor")
		// BMR-based TDEE should be around 2200 for this profile
		s.InDelta(2200, week1.ProjectedTDEE, 150, "Should fall back to BMR-based TDEE")
	})
}
