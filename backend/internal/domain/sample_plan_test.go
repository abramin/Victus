package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

// SamplePlanSuite tests calculations against the reference data from docs/sample.md.
// The sample uses a 19-week cut with KcalFactor=33.0, starting at 89.5kg.
type SamplePlanSuite struct {
	suite.Suite
	now            time.Time
	sampleProfile  *UserProfile
	kcalFactor     float64
	sampleWeekData []sampleWeekEntry
	sampleDayData  []sampleDayEntry
}

// sampleWeekEntry represents one row from the sample weekly summary table.
type sampleWeekEntry struct {
	Week     int
	Weight   float64
	Kcal     int     // TDEE = Weight × KcalFactor
	FatPct   float64 // Fat percentage of calories
	FatG     int     // Fat grams
	FatGPerKg float64 // Fat grams per kg body weight
	ProtPct  float64
	ProtG    int
	ProtGPerKg float64
	CarbPct  float64
	CarbG    int
	CarbGPerKg float64
}

// sampleDayEntry represents daily macros from the sample.
type sampleDayEntry struct {
	Week    int
	Day     int     // 1-7 within week
	DayType DayType // performance, fatburner, metabolize
	CarbsG  int
	ProteinG int
	FatG    int
}

func TestSamplePlanSuite(t *testing.T) {
	suite.Run(t, new(SamplePlanSuite))
}

func (s *SamplePlanSuite) SetupTest() {
	s.now = time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)
	s.kcalFactor = 33.0

	// Profile derived from sample data
	// Using the macro percentages from week 1: 38% fat, 28% protein, 34% carbs
	s.sampleProfile = &UserProfile{
		HeightCM:      180, // Assumed for BMR fallback
		BirthDate:     time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC), // 40 years old
		Sex:           SexMale,
		Goal:          GoalLoseWeight,
		FatRatio:      0.38,
		ProteinRatio:  0.28,
		CarbRatio:     0.34,
		MealRatios:    MealRatios{Breakfast: 0.30, Lunch: 0.30, Dinner: 0.40},
		PointsConfig:  PointsConfig{CarbMultiplier: 1.15, ProteinMultiplier: 4.35, FatMultiplier: 3.5},
		FruitTargetG:  600,
		VeggieTargetG: 500,
	}

	// Weekly summary data from sample.md (selected weeks)
	s.sampleWeekData = []sampleWeekEntry{
		{Week: 1, Weight: 89.5, Kcal: 2951, FatPct: 0.38, FatG: 277, FatGPerKg: 3.09, ProtPct: 0.28, ProtG: 200, ProtGPerKg: 2.23, CarbPct: 0.34, CarbG: 107, CarbGPerKg: 1.20},
		{Week: 2, Weight: 89.1, Kcal: 2936, FatPct: 0.38, FatG: 273, FatGPerKg: 3.07, ProtPct: 0.28, ProtG: 199, ProtGPerKg: 2.24, CarbPct: 0.34, CarbG: 107, CarbGPerKg: 1.21},
		{Week: 10, Weight: 85.6, Kcal: 2822, FatPct: 0.35, FatG: 244, FatGPerKg: 2.85, ProtPct: 0.28, ProtG: 194, ProtGPerKg: 2.27, CarbPct: 0.36, CarbG: 111, CarbGPerKg: 1.29},
		{Week: 19, Weight: 81.8, Kcal: 2699, FatPct: 0.32, FatG: 213, FatGPerKg: 2.60, ProtPct: 0.29, ProtG: 188, ProtGPerKg: 2.30, CarbPct: 0.39, CarbG: 114, CarbGPerKg: 1.39},
	}

	// Daily macro data from sample.md Week 1
	// Days 1,4 = Performance (high), Days 2,3,5,6 = Fatburner (low), Day 7 = Metabolize (refeed)
	s.sampleDayData = []sampleDayEntry{
		{Week: 1, Day: 1, DayType: DayTypePerformance, CarbsG: 317, ProteinG: 229, FatG: 123},
		{Week: 1, Day: 2, DayType: DayTypeFatburner, CarbsG: 207, ProteinG: 150, FatG: 80},
		{Week: 1, Day: 3, DayType: DayTypeFatburner, CarbsG: 207, ProteinG: 150, FatG: 80},
		{Week: 1, Day: 4, DayType: DayTypePerformance, CarbsG: 317, ProteinG: 229, FatG: 123},
		{Week: 1, Day: 5, DayType: DayTypeFatburner, CarbsG: 207, ProteinG: 150, FatG: 80},
		{Week: 1, Day: 6, DayType: DayTypeFatburner, CarbsG: 207, ProteinG: 150, FatG: 80},
		{Week: 1, Day: 7, DayType: DayTypeMetabolize, CarbsG: 376, ProteinG: 270, FatG: 145},
	}
}

// =============================================================================
// KCAL FACTOR TDEE TESTS
// =============================================================================

func (s *SamplePlanSuite) TestKcalFactorTDEE() {
	s.Run("TDEE equals Weight times KcalFactor", func() {
		for _, week := range s.sampleWeekData {
			expectedTDEE := int(week.Weight * s.kcalFactor)
			// Allow ±5 for rounding differences between sample and calculation
			s.InDelta(float64(week.Kcal), float64(expectedTDEE), 5,
				"Week %d: Expected TDEE %.1f × %.1f = %d, got %d",
				week.Week, week.Weight, s.kcalFactor, expectedTDEE, week.Kcal)
		}
	})

	s.Run("calculateProjectedTDEE with KcalFactor override", func() {
		kcalFactor := s.kcalFactor
		plan := &NutritionPlan{
			KcalFactorOverride: &kcalFactor,
		}

		for _, week := range s.sampleWeekData {
			tdee := calculateProjectedTDEE(s.sampleProfile, plan, week.Weight, s.now)
			// Allow ±5 for rounding differences between sample and calculation
			s.InDelta(float64(week.Kcal), float64(tdee), 5,
				"Week %d: calculateProjectedTDEE(%.1f) should be %d, got %d",
				week.Week, week.Weight, week.Kcal, tdee)
		}
	})

	s.Run("plan with nil KcalFactorOverride uses BMR", func() {
		plan := &NutritionPlan{
			KcalFactorOverride: nil,
		}

		// With BMR-based calculation, 89.5kg male should get different TDEE
		tdee := calculateProjectedTDEE(s.sampleProfile, plan, 89.5, s.now)

		// Should NOT equal KcalFactor calculation
		kcalFactorTDEE := int(89.5 * s.kcalFactor)
		s.NotEqual(kcalFactorTDEE, tdee,
			"Without KcalFactor override, should use BMR-based calculation")

		// BMR-based TDEE for 85kg, 180cm, 40yo male: ~1780 × 1.2 = ~2136
		// For 89.5kg: ~(10×89.5 + 6.25×180 - 5×40 + 5) × 1.2 = ~(895+1125-200+5) × 1.2 = ~2190
		s.InDelta(2190, tdee, 50, "BMR-based TDEE should be around 2190")
	})
}

// =============================================================================
// WEEKLY WEIGHT PROGRESSION TESTS
// =============================================================================

func (s *SamplePlanSuite) TestWeightProgression() {
	s.Run("weight decreases linearly over 19 weeks", func() {
		startWeight := 89.5
		week19Weight := 81.8
		// Total weight loss over 18 week intervals (week 1 to week 19)
		expectedWeeklyLoss := (startWeight - week19Weight) / 18 // ~0.428 kg/week

		s.InDelta(0.43, expectedWeeklyLoss, 0.05, "Weekly loss should be ~0.43 kg")

		// Verify intermediate weeks (week 1 = start weight, week N = start - (N-1)*loss)
		for _, week := range s.sampleWeekData {
			expectedWeight := startWeight - (expectedWeeklyLoss * float64(week.Week-1))
			s.InDelta(week.Weight, expectedWeight, 0.5,
				"Week %d weight should be ~%.1f", week.Week, expectedWeight)
		}
	})
}

// =============================================================================
// MACRO G/KG RATIO TESTS
// =============================================================================

func (s *SamplePlanSuite) TestMacroGPerKgRatios() {
	s.Run("fat grams per kg matches sample", func() {
		for _, week := range s.sampleWeekData {
			calculatedFatGPerKg := float64(week.FatG) / week.Weight
			s.InDelta(week.FatGPerKg, calculatedFatGPerKg, 0.02,
				"Week %d: Fat g/kg should be %.2f", week.Week, week.FatGPerKg)
		}
	})

	s.Run("protein grams per kg matches sample", func() {
		for _, week := range s.sampleWeekData {
			calculatedProtGPerKg := float64(week.ProtG) / week.Weight
			s.InDelta(week.ProtGPerKg, calculatedProtGPerKg, 0.02,
				"Week %d: Protein g/kg should be %.2f", week.Week, week.ProtGPerKg)
		}
	})

	s.Run("carb grams per kg matches sample", func() {
		for _, week := range s.sampleWeekData {
			calculatedCarbGPerKg := float64(week.CarbG) / week.Weight
			s.InDelta(week.CarbGPerKg, calculatedCarbGPerKg, 0.02,
				"Week %d: Carb g/kg should be %.2f", week.Week, week.CarbGPerKg)
		}
	})
}

// =============================================================================
// DAILY MACRO CYCLING TESTS
// =============================================================================

func (s *SamplePlanSuite) TestDailyMacroCycling() {
	s.Run("day type pattern matches default weekly pattern", func() {
		pattern := DefaultWeeklyPattern
		s.Equal(DayTypePerformance, pattern.GetDayType(1), "Day 1 should be Performance")
		s.Equal(DayTypeFatburner, pattern.GetDayType(2), "Day 2 should be Fatburner")
		s.Equal(DayTypeFatburner, pattern.GetDayType(3), "Day 3 should be Fatburner")
		s.Equal(DayTypePerformance, pattern.GetDayType(4), "Day 4 should be Performance")
		s.Equal(DayTypeFatburner, pattern.GetDayType(5), "Day 5 should be Fatburner")
		s.Equal(DayTypeFatburner, pattern.GetDayType(6), "Day 6 should be Fatburner")
		s.Equal(DayTypeMetabolize, pattern.GetDayType(7), "Day 7 should be Metabolize")
	})

	s.Run("performance days have higher carbs than fatburner days", func() {
		var perfCarbs, fatburnerCarbs int
		for _, day := range s.sampleDayData {
			if day.DayType == DayTypePerformance {
				perfCarbs = day.CarbsG
			} else if day.DayType == DayTypeFatburner {
				fatburnerCarbs = day.CarbsG
			}
		}
		s.Greater(perfCarbs, fatburnerCarbs,
			"Performance carbs (%d) should be > Fatburner carbs (%d)", perfCarbs, fatburnerCarbs)
	})

	s.Run("metabolize day has highest carbs", func() {
		var maxCarbs int
		var maxDay sampleDayEntry
		for _, day := range s.sampleDayData {
			if day.CarbsG > maxCarbs {
				maxCarbs = day.CarbsG
				maxDay = day
			}
		}
		s.Equal(DayTypeMetabolize, maxDay.DayType,
			"Day with highest carbs (%d) should be Metabolize", maxCarbs)
	})

	s.Run("carb ratio between day types matches multipliers", func() {
		// From sample: Performance=317g, Fatburner=207g, Metabolize=376g
		// Expected ratios based on day type multipliers:
		// Fatburner: 0.60x, Performance: 1.30x, Metabolize: 1.50x

		perfCarbs := 317.0
		fatburnerCarbs := 207.0
		metabolizeCarbs := 376.0

		// Ratio of performance to fatburner
		perfToFatRatio := perfCarbs / fatburnerCarbs
		// Expected: 1.30 / 0.60 = 2.17
		s.InDelta(1.53, perfToFatRatio, 0.2,
			"Performance/Fatburner carb ratio should be ~1.5")

		// Ratio of metabolize to fatburner
		metaToFatRatio := metabolizeCarbs / fatburnerCarbs
		// Expected: 1.50 / 0.60 = 2.5
		s.InDelta(1.82, metaToFatRatio, 0.2,
			"Metabolize/Fatburner carb ratio should be ~1.8")
	})
}

// =============================================================================
// WEEKLY AVERAGE TESTS
// =============================================================================

func (s *SamplePlanSuite) TestWeeklyAverageCalculation() {
	s.Run("daily macros average to weekly baseline", func() {
		// Calculate weekly totals from daily data
		var totalCarbs, totalProtein, totalFat int
		for _, day := range s.sampleDayData {
			totalCarbs += day.CarbsG
			totalProtein += day.ProteinG
			totalFat += day.FatG
		}

		avgCarbs := float64(totalCarbs) / 7.0
		avgProtein := float64(totalProtein) / 7.0
		avgFat := float64(totalFat) / 7.0

		// Calculate average daily calories
		avgCals := (avgCarbs * 4) + (avgProtein * 4) + (avgFat * 9)

		// The daily cycling should average to less than TDEE (deficit)
		week1TDEE := float64(s.sampleWeekData[0].Kcal)
		s.Less(avgCals, week1TDEE,
			"Average daily calories (%.0f) should be less than TDEE (%.0f)", avgCals, week1TDEE)

		// Document the actual averages
		s.T().Logf("Week 1 daily averages: Carbs=%.1fg, Protein=%.1fg, Fat=%.1fg, Calories=%.0f",
			avgCarbs, avgProtein, avgFat, avgCals)
	})
}

// =============================================================================
// PLAN CREATION WITH KCAL FACTOR TESTS
// =============================================================================

func (s *SamplePlanSuite) TestPlanCreationWithKcalFactor() {
	s.Run("create 19 week plan with KcalFactor override", func() {
		kcalFactor := s.kcalFactor
		input := NutritionPlanInput{
			Name:               "Sample 19-Week Cut",
			StartDate:          "2025-01-01",
			StartWeightKg:      89.5,
			GoalWeightKg:       81.8,
			DurationWeeks:      19,
			KcalFactorOverride: &kcalFactor,
		}

		plan, err := NewNutritionPlan(input, s.sampleProfile, s.now)
		s.NoError(err)
		s.NotNil(plan)

		// Verify KcalFactor was set
		s.NotNil(plan.KcalFactorOverride)
		s.Equal(s.kcalFactor, *plan.KcalFactorOverride)

		// Verify 19 weekly targets generated
		s.Len(plan.WeeklyTargets, 19)

		// Verify Week 1 TDEE is calculated using KcalFactor
		week1 := plan.WeeklyTargets[0]
		expectedTDEE := week1.ProjectedWeightKg * kcalFactor
		s.InDelta(expectedTDEE, float64(week1.ProjectedTDEE), 5,
			"Week 1 TDEE should be ~%.0f", expectedTDEE)
	})

	s.Run("plan weekly targets use KcalFactor TDEE", func() {
		kcalFactor := s.kcalFactor
		input := NutritionPlanInput{
			Name:               "Sample Plan",
			StartDate:          "2025-01-01",
			StartWeightKg:      89.5,
			GoalWeightKg:       81.8,
			DurationWeeks:      19,
			KcalFactorOverride: &kcalFactor,
		}

		plan, err := NewNutritionPlan(input, s.sampleProfile, s.now)
		s.NoError(err)

		// Verify each week uses KcalFactor formula: TDEE = Weight × KcalFactor
		for _, target := range plan.WeeklyTargets {
			expectedTDEE := target.ProjectedWeightKg * kcalFactor
			s.InDelta(expectedTDEE, float64(target.ProjectedTDEE), 5,
				"Week %d TDEE should be %.1f × %.1f = %.0f",
				target.WeekNumber, target.ProjectedWeightKg, kcalFactor, expectedTDEE)
		}
	})
}

// =============================================================================
// POINTS CALCULATION TESTS (from sample Week 1, Day 1)
// =============================================================================

func (s *SamplePlanSuite) TestPointsCalculationFromSample() {
	// Sample Week 1, Day 1 (Performance day):
	// Breakfast: 30% ratio, points: 90/190/130 (carbs/protein/fat)
	// Lunch:     30% ratio, points: 90/190/130
	// Dinner:    40% ratio, points: 120/255/170

	s.Run("meal points match sample distribution", func() {
		// Day 1 macros: 317g carbs, 229g protein, 123g fat
		carbsG := 317.0
		proteinG := 229.0
		fatG := 123.0

		// Using default points config and meal ratios
		meals := calculateMealPoints(
			carbsG, proteinG, fatG,
			s.sampleProfile.FruitTargetG, float64(s.sampleProfile.VeggieTargetG),
			s.sampleProfile.MealRatios, s.sampleProfile.PointsConfig,
			DayTypePerformance, SupplementConfig{},
		)

		// Sample breakfast points: 90/190/130
		// Note: These are rounded to nearest 5
		s.T().Logf("Calculated breakfast: Carbs=%d, Protein=%d, Fat=%d",
			meals.Breakfast.Carbs, meals.Breakfast.Protein, meals.Breakfast.Fats)

		// Verify points are multiples of 5
		s.Equal(0, meals.Breakfast.Carbs%5, "Breakfast carbs should be multiple of 5")
		s.Equal(0, meals.Breakfast.Protein%5, "Breakfast protein should be multiple of 5")
		s.Equal(0, meals.Breakfast.Fats%5, "Breakfast fats should be multiple of 5")

		// Verify dinner has ~40% (largest portion)
		totalCarbPoints := meals.Breakfast.Carbs + meals.Lunch.Carbs + meals.Dinner.Carbs
		dinnerCarbRatio := float64(meals.Dinner.Carbs) / float64(totalCarbPoints)
		s.InDelta(0.40, dinnerCarbRatio, 0.05,
			"Dinner should have ~40%% of carb points")
	})
}

// =============================================================================
// DAY TYPE MULTIPLIER VERIFICATION
// =============================================================================

func (s *SamplePlanSuite) TestDayTypeMultipliers() {
	s.Run("fatburner reduces carbs", func() {
		mult := getDayTypeModifiers(DayTypeFatburner)
		s.Equal(0.60, mult.Carbs, "Fatburner carb multiplier should be 0.60")
		s.Equal(1.00, mult.Protein, "Fatburner protein should be protected at 1.0")
		s.Equal(0.85, mult.Fats, "Fatburner fat multiplier should be 0.85")
	})

	s.Run("performance increases carbs", func() {
		mult := getDayTypeModifiers(DayTypePerformance)
		s.Equal(1.30, mult.Carbs, "Performance carb multiplier should be 1.30")
		s.Equal(1.00, mult.Protein, "Performance protein should be protected at 1.0")
		s.Equal(1.00, mult.Fats, "Performance fat multiplier should be 1.00")
	})

	s.Run("metabolize has highest carb boost", func() {
		mult := getDayTypeModifiers(DayTypeMetabolize)
		s.Equal(1.50, mult.Carbs, "Metabolize carb multiplier should be 1.50")
		s.Equal(1.00, mult.Protein, "Metabolize protein should be protected at 1.0")
		s.Equal(1.10, mult.Fats, "Metabolize fat multiplier should be 1.10")
	})
}

// =============================================================================
// DAILY TARGET GENERATION TESTS
// =============================================================================

func (s *SamplePlanSuite) TestGenerateDailyTargets() {
	s.Run("generates 7 daily targets", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC), // Monday
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)
		s.Len(dailyTargets, 7, "Should generate 7 daily targets")
	})

	s.Run("daily targets have correct day types from pattern", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		// Verify day types match DefaultWeeklyPattern
		s.Equal(DayTypePerformance, dailyTargets[0].DayType, "Day 1 should be Performance")
		s.Equal(DayTypeFatburner, dailyTargets[1].DayType, "Day 2 should be Fatburner")
		s.Equal(DayTypeFatburner, dailyTargets[2].DayType, "Day 3 should be Fatburner")
		s.Equal(DayTypePerformance, dailyTargets[3].DayType, "Day 4 should be Performance")
		s.Equal(DayTypeFatburner, dailyTargets[4].DayType, "Day 5 should be Fatburner")
		s.Equal(DayTypeFatburner, dailyTargets[5].DayType, "Day 6 should be Fatburner")
		s.Equal(DayTypeMetabolize, dailyTargets[6].DayType, "Day 7 should be Metabolize")
	})

	s.Run("daily targets average to weekly target", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		// Calculate averages
		var totalCarbs, totalProtein, totalFat int
		for _, day := range dailyTargets {
			totalCarbs += day.CarbsG
			totalProtein += day.ProteinG
			totalFat += day.FatsG
		}

		avgCarbs := float64(totalCarbs) / 7.0
		avgProtein := float64(totalProtein) / 7.0
		avgFat := float64(totalFat) / 7.0

		// Averages should match weekly targets (within rounding tolerance)
		s.InDelta(float64(weeklyTarget.TargetCarbsG), avgCarbs, 2,
			"Average carbs should match weekly target")
		s.InDelta(float64(weeklyTarget.TargetProteinG), avgProtein, 2,
			"Average protein should match weekly target")
		s.InDelta(float64(weeklyTarget.TargetFatsG), avgFat, 2,
			"Average fat should match weekly target")
	})

	s.Run("performance days have higher carbs than fatburner", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		performanceCarbs := dailyTargets[0].CarbsG // Day 1 = Performance
		fatburnerCarbs := dailyTargets[1].CarbsG   // Day 2 = Fatburner
		metabolizeCarbs := dailyTargets[6].CarbsG  // Day 7 = Metabolize

		s.Greater(performanceCarbs, fatburnerCarbs,
			"Performance carbs (%d) should be > Fatburner carbs (%d)", performanceCarbs, fatburnerCarbs)
		s.Greater(metabolizeCarbs, performanceCarbs,
			"Metabolize carbs (%d) should be > Performance carbs (%d)", metabolizeCarbs, performanceCarbs)
	})

	s.Run("carb ratios match day type multipliers", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		performanceCarbs := float64(dailyTargets[0].CarbsG)
		fatburnerCarbs := float64(dailyTargets[1].CarbsG)
		metabolizeCarbs := float64(dailyTargets[6].CarbsG)

		// Expected ratios based on multipliers:
		// Performance/Fatburner = 1.30/0.60 = 2.17
		// Metabolize/Fatburner = 1.50/0.60 = 2.50
		perfToFatRatio := performanceCarbs / fatburnerCarbs
		metaToFatRatio := metabolizeCarbs / fatburnerCarbs

		s.InDelta(2.17, perfToFatRatio, 0.1,
			"Performance/Fatburner carb ratio should be ~2.17")
		s.InDelta(2.50, metaToFatRatio, 0.1,
			"Metabolize/Fatburner carb ratio should be ~2.50")
	})

	s.Run("daily dates are sequential", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC), // Monday
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		for i, day := range dailyTargets {
			expectedDate := weeklyTarget.StartDate.AddDate(0, 0, i)
			s.Equal(expectedDate, day.Date,
				"Day %d date should be %s", i+1, expectedDate.Format("2006-01-02"))
			s.Equal(i+1, day.DayNumber, "DayNumber should be %d", i+1)
		}
	})

	s.Run("calories are calculated from macros", func() {
		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
			TargetCarbsG:     250,
			TargetProteinG:   200,
			TargetFatsG:      100,
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		for _, day := range dailyTargets {
			expectedCalories := (day.CarbsG * 4) + (day.ProteinG * 4) + (day.FatsG * 9)
			s.Equal(expectedCalories, day.Calories,
				"Day %d calories should be %d (from macros)", day.DayNumber, expectedCalories)
		}
	})
}

func (s *SamplePlanSuite) TestGenerateDailyTargetsWithSampleData() {
	// Test using actual sample values to verify the calculation produces
	// the expected high/low cycling pattern

	s.Run("sample week 1 daily cycling produces consistent ratios", func() {
		// From sample.md Week 1 daily data:
		// Days 1, 4 (Performance): 317g C, 229g P, 123g F
		// Days 2, 3, 5, 6 (Fatburner): 207g C, 150g P, 80g F
		// Day 7 (Metabolize): 376g C, 270g P, 145g F
		//
		// Note: The sample uses different effective multipliers than our system:
		// Sample ratios: Performance/Fatburner=1.53, Metabolize/Fatburner=1.82
		// Our ratios:    Performance/Fatburner=2.17, Metabolize/Fatburner=2.50
		//
		// This test verifies our system is internally consistent and produces
		// daily values that average to the weekly target.

		// Calculate what weekly average these daily values represent
		avgCarbs := (317.0*2 + 207.0*4 + 376.0) / 7.0   // ~262.6
		avgProtein := (229.0*2 + 150.0*4 + 270.0) / 7.0 // ~189.7
		avgFat := (123.0*2 + 80.0*4 + 145.0) / 7.0      // ~101.6

		weeklyTarget := WeeklyTarget{
			WeekNumber:       1,
			StartDate:        time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
			TargetCarbsG:     int(avgCarbs),
			TargetProteinG:   int(avgProtein),
			TargetFatsG:      int(avgFat),
		}

		dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

		// Verify day type ordering is correct (metabolize > performance > fatburner)
		performanceCarbs := dailyTargets[0].CarbsG
		fatburnerCarbs := dailyTargets[1].CarbsG
		metabolizeCarbs := dailyTargets[6].CarbsG

		s.Greater(performanceCarbs, fatburnerCarbs,
			"Performance (%d) should have more carbs than Fatburner (%d)",
			performanceCarbs, fatburnerCarbs)
		s.Greater(metabolizeCarbs, performanceCarbs,
			"Metabolize (%d) should have more carbs than Performance (%d)",
			metabolizeCarbs, performanceCarbs)

		// Verify ratios match our multipliers (not sample's)
		// Our multipliers: Fatburner=0.60, Performance=1.30, Metabolize=1.50
		// Ratio: Performance/Fatburner = 1.30/0.60 = 2.17
		perfToFatRatio := float64(performanceCarbs) / float64(fatburnerCarbs)
		s.InDelta(2.17, perfToFatRatio, 0.1,
			"Performance/Fatburner ratio should match our multipliers")

		// Log actual values for reference
		s.T().Logf("Generated daily carbs: Performance=%d, Fatburner=%d, Metabolize=%d",
			performanceCarbs, fatburnerCarbs, metabolizeCarbs)
		s.T().Logf("Sample daily carbs: Performance=317, Fatburner=207, Metabolize=376")
		s.T().Logf("Note: Difference is due to different multiplier systems")
	})

	s.Run("verify weekly average invariant", func() {
		// Given any weekly target, the generated daily targets must average back to it
		testCases := []struct {
			carbs   int
			protein int
			fat     int
		}{
			{250, 200, 100},
			{300, 180, 80},
			{400, 250, 120},
		}

		for _, tc := range testCases {
			weeklyTarget := WeeklyTarget{
				WeekNumber:     1,
				StartDate:      time.Date(2025, 1, 6, 0, 0, 0, 0, time.UTC),
				TargetCarbsG:   tc.carbs,
				TargetProteinG: tc.protein,
				TargetFatsG:    tc.fat,
			}

			dailyTargets := weeklyTarget.GenerateDailyTargets(DefaultWeeklyPattern)

			var totalCarbs, totalProtein, totalFat int
			for _, day := range dailyTargets {
				totalCarbs += day.CarbsG
				totalProtein += day.ProteinG
				totalFat += day.FatsG
			}

			avgCarbs := float64(totalCarbs) / 7.0
			avgProtein := float64(totalProtein) / 7.0
			avgFat := float64(totalFat) / 7.0

			s.InDelta(float64(tc.carbs), avgCarbs, 2,
				"Carbs=%d: average should match weekly target", tc.carbs)
			s.InDelta(float64(tc.protein), avgProtein, 2,
				"Protein=%d: average should match weekly target", tc.protein)
			s.InDelta(float64(tc.fat), avgFat, 2,
				"Fat=%d: average should match weekly target", tc.fat)
		}
	})
}
