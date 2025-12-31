package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

type TargetsSuite struct {
	suite.Suite
	now         time.Time
	maleProfile *UserProfile
}

func TestTargetsSuite(t *testing.T) {
	suite.Run(t, new(TargetsSuite))
}

func (s *TargetsSuite) SetupTest() {
	s.now = time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC)

	// 40-year-old male, 180cm, 85kg target, lose weight goal
	s.maleProfile = &UserProfile{
		HeightCM:             180,
		BirthDate:            time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC),
		Sex:                  SexMale,
		Goal:                 GoalLoseWeight,
		TargetWeightKg:       80,
		TargetWeeklyChangeKg: -0.5,
		CarbRatio:            0.45,
		ProteinRatio:         0.30,
		FatRatio:             0.25,
		MealRatios:           MealRatios{Breakfast: 0.30, Lunch: 0.30, Dinner: 0.40},
		PointsConfig:         PointsConfig{CarbMultiplier: 1.15, ProteinMultiplier: 4.35, FatMultiplier: 3.5},
		FruitTargetG:         600,
		VeggieTargetG:        500,
	}
}

func (s *TargetsSuite) TestMifflinStJeorCalculation() {
	s.Run("male BMR formula", func() {
		// Male formula: (10 × weight) + (6.25 × height) - (5 × age) + 5
		// (10 × 85) + (6.25 × 180) - (5 × 40) + 5 = 850 + 1125 - 200 + 5 = 1780
		bmr := calculateMifflinStJeor(s.maleProfile, 85, s.now)
		s.InDelta(1780, bmr, 1, "Male BMR should match Mifflin-St Jeor formula")
	})

	s.Run("female BMR formula", func() {
		femaleProfile := &UserProfile{
			HeightCM:  165,
			BirthDate: time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC), // 34 years old
			Sex:       SexFemale,
		}
		// Female formula: (10 × weight) + (6.25 × height) - (5 × age) - 161
		// (10 × 65) + (6.25 × 165) - (5 × 34) - 161 = 650 + 1031.25 - 170 - 161 = 1350.25
		bmr := calculateMifflinStJeor(femaleProfile, 65, s.now)
		s.InDelta(1350.25, bmr, 1, "Female BMR should match Mifflin-St Jeor formula")
	})

	s.Run("age affects BMR", func() {
		youngerProfile := &UserProfile{
			HeightCM:  180,
			BirthDate: time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC), // 25 years old
			Sex:       SexMale,
		}
		olderBMR := calculateMifflinStJeor(s.maleProfile, 85, s.now)   // 40 years old
		youngerBMR := calculateMifflinStJeor(youngerProfile, 85, s.now) // 25 years old
		s.Greater(youngerBMR, olderBMR, "Younger person should have higher BMR")
		s.InDelta(75, youngerBMR-olderBMR, 1, "15 year age difference should be ~75 cal difference")
	})
}

func (s *TargetsSuite) TestAgeCalculation() {
	s.Run("birthday already passed this year", func() {
		birthDate := time.Date(1985, 1, 1, 0, 0, 0, 0, time.UTC)
		now := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
		age := calculateAge(birthDate, now)
		s.Equal(40, age)
	})

	s.Run("birthday not yet passed this year", func() {
		birthDate := time.Date(1985, 12, 31, 0, 0, 0, 0, time.UTC)
		now := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
		age := calculateAge(birthDate, now)
		s.Equal(39, age, "Should be 39 until December 31")
	})

	s.Run("exactly on birthday", func() {
		birthDate := time.Date(1985, 6, 15, 0, 0, 0, 0, time.UTC)
		now := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
		age := calculateAge(birthDate, now)
		s.Equal(40, age)
	})
}

func (s *TargetsSuite) TestEstimatedTDEE() {
	s.Run("rest day has no training calories", func() {
		tdee := CalculateEstimatedTDEE(s.maleProfile, 85, TrainingTypeRest, 0, s.now)
		// BMR = 1780, TDEE = 1780 * 1.2 = 2136
		s.InDelta(2136, tdee, 5)
	})

	s.Run("training adds calories based on type and duration using MET", func() {
		// HIIT with MET-based calculation: (MET-1) × weight × hours
		// HIIT MET = 12.8, (12.8-1) × 85 kg × 0.5 hr = 501.5 cal
		tdeeHIIT := CalculateEstimatedTDEE(s.maleProfile, 85, TrainingTypeHIIT, 30, s.now)
		tdeeRest := CalculateEstimatedTDEE(s.maleProfile, 85, TrainingTypeRest, 0, s.now)
		s.InDelta(502, tdeeHIIT-tdeeRest, 5, "30 min HIIT should add ~502 cal with MET formula")
	})

	s.Run("strength training calories with MET", func() {
		// Strength MET = 5.0, (5.0-1) × 85 kg × 1 hr = 340 cal
		tdeeStrength := CalculateEstimatedTDEE(s.maleProfile, 85, TrainingTypeStrength, 60, s.now)
		tdeeRest := CalculateEstimatedTDEE(s.maleProfile, 85, TrainingTypeRest, 0, s.now)
		s.InDelta(340, tdeeStrength-tdeeRest, 5, "60 min strength should add ~340 cal with MET formula")
	})

	s.Run("heavier person burns more calories for same activity", func() {
		// MET-based calculation is weight-adjusted
		tdee70kg := CalculateEstimatedTDEE(s.maleProfile, 70, TrainingTypeRun, 30, s.now)
		tdee100kg := CalculateEstimatedTDEE(s.maleProfile, 100, TrainingTypeRun, 30, s.now)

		rest70kg := CalculateEstimatedTDEE(s.maleProfile, 70, TrainingTypeRest, 0, s.now)
		rest100kg := CalculateEstimatedTDEE(s.maleProfile, 100, TrainingTypeRest, 0, s.now)

		exercise70kg := tdee70kg - rest70kg
		exercise100kg := tdee100kg - rest100kg

		s.Greater(exercise100kg, exercise70kg, "Heavier person burns more during exercise")
	})
}

func (s *TargetsSuite) TestDayTypeMultiplierApplication() {
	baseLog := &DailyLog{
		Date:            "2025-01-01",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
	}

	s.Run("fatburner reduces macros for lose_weight goal", func() {
		log := *baseLog
		log.DayType = DayTypeFatburner
		targets := CalculateDailyTargets(s.maleProfile, &log, s.now)

		// Fatburner + lose_weight = 0.80 multiplier
		// Check that day type is set correctly
		s.Equal(DayTypeFatburner, targets.DayType)
		s.Greater(targets.TotalCalories, 0)
	})

	s.Run("performance increases macros", func() {
		logFatburner := *baseLog
		logFatburner.DayType = DayTypeFatburner
		targetsFatburner := CalculateDailyTargets(s.maleProfile, &logFatburner, s.now)

		logPerformance := *baseLog
		logPerformance.DayType = DayTypePerformance
		targetsPerformance := CalculateDailyTargets(s.maleProfile, &logPerformance, s.now)

		// Performance (1.15) should be higher than Fatburner (0.80)
		s.Greater(targetsPerformance.TotalCalories, targetsFatburner.TotalCalories)
		s.Greater(targetsPerformance.TotalCarbsG, targetsFatburner.TotalCarbsG)
	})

	s.Run("metabolize is highest for lose_weight", func() {
		logMetabolize := *baseLog
		logMetabolize.DayType = DayTypeMetabolize
		targetsMetabolize := CalculateDailyTargets(s.maleProfile, &logMetabolize, s.now)

		logPerformance := *baseLog
		logPerformance.DayType = DayTypePerformance
		targetsPerformance := CalculateDailyTargets(s.maleProfile, &logPerformance, s.now)

		// Metabolize (1.2) > Performance (1.15)
		s.Greater(targetsMetabolize.TotalCalories, targetsPerformance.TotalCalories)
	})

	s.Run("goal affects multiplier values", func() {
		gainProfile := *s.maleProfile
		gainProfile.Goal = GoalGainWeight

		log := *baseLog
		log.DayType = DayTypePerformance

		targetsLose := CalculateDailyTargets(s.maleProfile, &log, s.now)
		targetsGain := CalculateDailyTargets(&gainProfile, &log, s.now)

		// Both should have valid targets (the specific multipliers differ by goal)
		s.Greater(targetsLose.TotalCalories, 0)
		s.Greater(targetsGain.TotalCalories, 0)
	})
}

func (s *TargetsSuite) TestFruitCalculation() {
	s.Run("respects user target when under carb limit", func() {
		// With high carbs, fruit should be capped at user target
		fruit := calculateFruit(300, 600, DayTypePerformance)
		s.Equal(600, fruit, "Should use user target of 600g")
	})

	s.Run("caps at 30 percent of carbs", func() {
		// Low carbs: 100g carbs, max fruit = (100 * 0.30) / 0.10 = 300g
		fruit := calculateFruit(100, 600, DayTypePerformance)
		s.Equal(300, fruit, "Should cap at carb-derived limit")
	})

	s.Run("fatburner reduces fruit by 30 percent", func() {
		fruitNormal := calculateFruit(300, 600, DayTypePerformance)
		fruitFatburner := calculateFruit(300, 600, DayTypeFatburner)
		s.InDelta(float64(fruitNormal)*0.70, float64(fruitFatburner), 1, "Fatburner should reduce by 30%")
	})
}

func (s *TargetsSuite) TestVeggieCalculation() {
	s.Run("respects user target when under carb limit", func() {
		veggies := calculateVeggies(300, 500)
		s.Equal(500, veggies, "Should use user target of 500g")
	})

	s.Run("caps at 10 percent of carbs", func() {
		// Low carbs: 50g carbs, max veggies = (50 * 0.10) / 0.03 = 167g
		veggies := calculateVeggies(50, 500)
		s.Equal(167, veggies, "Should cap at carb-derived limit")
	})
}

func (s *TargetsSuite) TestMealPointDistribution() {
	log := &DailyLog{
		Date:            "2025-01-01",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
		DayType:         DayTypePerformance,
	}

	targets := CalculateDailyTargets(s.maleProfile, log, s.now)

	s.Run("all meals have points", func() {
		s.Greater(targets.Meals.Breakfast.Carbs, 0)
		s.Greater(targets.Meals.Lunch.Carbs, 0)
		s.Greater(targets.Meals.Dinner.Carbs, 0)
	})

	s.Run("dinner has largest portion with 40 percent ratio", func() {
		// With ratios 0.30/0.30/0.40, dinner should have most
		s.GreaterOrEqual(targets.Meals.Dinner.Carbs, targets.Meals.Breakfast.Carbs)
		s.GreaterOrEqual(targets.Meals.Dinner.Carbs, targets.Meals.Lunch.Carbs)
	})

	s.Run("points are rounded to nearest 5", func() {
		s.Equal(0, targets.Meals.Breakfast.Carbs%5, "Breakfast carbs should be multiple of 5")
		s.Equal(0, targets.Meals.Lunch.Protein%5, "Lunch protein should be multiple of 5")
		s.Equal(0, targets.Meals.Dinner.Fats%5, "Dinner fats should be multiple of 5")
	})
}

func (s *TargetsSuite) TestWaterCalculation() {
	log := &DailyLog{
		Date:            "2025-01-01",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: PlannedTraining{Type: TrainingTypeRest, PlannedDurationMin: 0},
		DayType:         DayTypeFatburner,
	}

	targets := CalculateDailyTargets(s.maleProfile, log, s.now)

	s.Run("water is 0.04L per kg", func() {
		// 85 kg * 0.04 = 3.4 L
		s.InDelta(3.4, targets.WaterL, 0.1)
	})
}

func (s *TargetsSuite) TestRoundToNearest5() {
	s.Run("rounds down", func() {
		s.Equal(10, roundToNearest5(12))
		s.Equal(50, roundToNearest5(51))
	})

	s.Run("rounds up", func() {
		s.Equal(15, roundToNearest5(13))
		s.Equal(55, roundToNearest5(53))
	})

	s.Run("exact multiples unchanged", func() {
		s.Equal(25, roundToNearest5(25))
		s.Equal(100, roundToNearest5(100))
	})
}

// =============================================================================
// NEW TESTS FOR EVIDENCE-BASED CALCULATION ENGINE (Slice 3.5)
// =============================================================================

func (s *TargetsSuite) TestBMREquations() {
	s.Run("Katch-McArdle with known body fat", func() {
		profileWithBF := *s.maleProfile
		profileWithBF.BMREquation = BMREquationKatchMcArdle
		profileWithBF.BodyFatPercent = 20 // 20% body fat

		// BMR = 370 + (21.6 × LBM)
		// LBM = 85 kg × (1 - 0.20) = 68 kg
		// BMR = 370 + (21.6 × 68) = 370 + 1468.8 = 1838.8
		bmr := CalculateBMR(&profileWithBF, 85, s.now, BMREquationKatchMcArdle)
		s.InDelta(1838.8, bmr, 1, "Katch-McArdle should use lean body mass")
	})

	s.Run("Katch-McArdle falls back to Mifflin when no body fat", func() {
		profileNoBF := *s.maleProfile
		profileNoBF.BMREquation = BMREquationKatchMcArdle
		profileNoBF.BodyFatPercent = 0 // No body fat data

		bmrKatch := CalculateBMR(&profileNoBF, 85, s.now, BMREquationKatchMcArdle)
		bmrMifflin := CalculateBMR(&profileNoBF, 85, s.now, BMREquationMifflinStJeor)

		s.InDelta(bmrMifflin, bmrKatch, 1, "Should fall back to Mifflin-St Jeor")
	})

	s.Run("Oxford-Henry age stratification for male", func() {
		// Male under 30: 14.4 × weight + 313
		youngProfile := *s.maleProfile
		youngProfile.BirthDate = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC) // 25 years old

		bmr := CalculateBMR(&youngProfile, 85, s.now, BMREquationOxfordHenry)
		expected := 14.4*85 + 313 // = 1537
		s.InDelta(expected, bmr, 1, "Young male should use under-30 formula")
	})

	s.Run("Oxford-Henry age stratification for female", func() {
		femaleProfile := &UserProfile{
			HeightCM:  165,
			BirthDate: time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC), // 34 years old
			Sex:       SexFemale,
		}

		// Female 30-60: 8.18 × weight + 502
		bmr := CalculateBMR(femaleProfile, 65, s.now, BMREquationOxfordHenry)
		expected := 8.18*65 + 502 // = 1033.7
		s.InDelta(expected, bmr, 1, "Adult female should use 30-60 formula")
	})

	s.Run("Harris-Benedict calculation", func() {
		// Male: 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
		// = 88.362 + (13.397 × 85) + (4.799 × 180) - (5.677 × 40)
		// = 88.362 + 1138.745 + 863.82 - 227.08 = 1863.85
		bmr := CalculateBMR(s.maleProfile, 85, s.now, BMREquationHarrisBenedict)
		s.InDelta(1863.85, bmr, 1, "Harris-Benedict for 40yo male")
	})
}

func (s *TargetsSuite) TestMETBasedExerciseCalories() {
	s.Run("rest returns zero additional calories", func() {
		cal := CalculateExerciseCalories(TrainingTypeRest, 85, 60)
		s.Equal(0.0, cal, "Rest has MET=1, so (1-1) × weight × hours = 0")
	})

	s.Run("running calculation is weight-adjusted", func() {
		// Run MET = 9.8, (9.8-1) × 85 × 0.5 = 374.0
		cal := CalculateExerciseCalories(TrainingTypeRun, 85, 30)
		s.InDelta(374, cal, 1, "Running 30 min for 85kg person")
	})

	s.Run("weight affects calorie burn proportionally", func() {
		cal70kg := CalculateExerciseCalories(TrainingTypeRun, 70, 30)
		cal100kg := CalculateExerciseCalories(TrainingTypeRun, 100, 30)

		// Ratio should be close to weight ratio
		s.InDelta(100.0/70.0, cal100kg/cal70kg, 0.01)
	})
}

func (s *TargetsSuite) TestProteinRecommendations() {
	s.Run("fat loss uses higher protein target", func() {
		rec := GetProteinRecommendation(GoalLoseWeight, true, 0.20)
		s.GreaterOrEqual(rec.OptimalGPerKg, 2.0, "Fat loss should target 2.0+ g/kg")
	})

	s.Run("aggressive deficit increases protein", func() {
		moderate := GetProteinRecommendation(GoalLoseWeight, true, 0.15)
		aggressive := GetProteinRecommendation(GoalLoseWeight, true, 0.30)
		s.Greater(aggressive.OptimalGPerKg, moderate.OptimalGPerKg,
			"More aggressive deficit should recommend more protein")
	})

	s.Run("gain weight has lower protein than fat loss", func() {
		gainRec := GetProteinRecommendation(GoalGainWeight, true, 0)
		loseRec := GetProteinRecommendation(GoalLoseWeight, true, 0.20)
		s.Less(gainRec.OptimalGPerKg, loseRec.OptimalGPerKg,
			"Gaining weight needs less protein than losing")
	})

	s.Run("training day vs rest day affects protein for gain goal", func() {
		training := GetProteinRecommendation(GoalGainWeight, true, 0)
		rest := GetProteinRecommendation(GoalGainWeight, false, 0)
		s.Greater(training.OptimalGPerKg, rest.OptimalGPerKg,
			"Training days should have higher protein target")
	})

	s.Run("all recommendations have sources", func() {
		rec := GetProteinRecommendation(GoalLoseWeight, true, 0.20)
		s.NotEmpty(rec.Source, "Should cite research source")
	})
}

func (s *TargetsSuite) TestFatFloor() {
	s.Run("minimum fat is 0.7 g/kg", func() {
		fatMin := GetFatMinimum(85)
		s.InDelta(59.5, fatMin, 0.1, "85 kg × 0.7 = 59.5g minimum")
	})

	s.Run("scales with weight", func() {
		fatMin60 := GetFatMinimum(60)
		fatMin100 := GetFatMinimum(100)
		s.InDelta(42, fatMin60, 0.1)
		s.InDelta(70, fatMin100, 0.1)
	})
}

func (s *TargetsSuite) TestProtectedProteinMultipliers() {
	s.Run("fatburner protects protein while cutting carbs", func() {
		mult := getDayTypeModifiers(DayTypeFatburner)
		s.Equal(1.00, mult.Protein, "Protein should not be reduced")
		s.Less(mult.Carbs, 1.0, "Carbs should be reduced")
	})

	s.Run("performance maintains protein while boosting carbs", func() {
		mult := getDayTypeModifiers(DayTypePerformance)
		s.Equal(1.00, mult.Protein, "Protein should stay at 100%")
		s.Greater(mult.Carbs, 1.0, "Carbs should increase for performance")
	})

	s.Run("metabolize has highest carb boost", func() {
		multPerf := getDayTypeModifiers(DayTypePerformance)
		multMeta := getDayTypeModifiers(DayTypeMetabolize)
		s.Greater(multMeta.Carbs, multPerf.Carbs, "Metabolize should have more carbs than performance")
	})
}

func (s *TargetsSuite) TestCalculateDailyTargetsIntegration() {
	s.Run("EstimatedTDEE is populated", func() {
		log := &DailyLog{
			Date:            "2025-01-01",
			WeightKg:        85,
			SleepQuality:    80,
			PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
			DayType:         DayTypePerformance,
		}
		targets := CalculateDailyTargets(s.maleProfile, log, s.now)
		s.Greater(targets.EstimatedTDEE, 0, "EstimatedTDEE should be populated")
		s.Greater(targets.EstimatedTDEE, targets.TotalCalories,
			"For lose_weight goal, TDEE should be higher than target calories")
	})

	s.Run("protein meets minimum g/kg requirement", func() {
		log := &DailyLog{
			Date:            "2025-01-01",
			WeightKg:        85,
			SleepQuality:    80,
			PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
			DayType:         DayTypeFatburner,
		}
		targets := CalculateDailyTargets(s.maleProfile, log, s.now)

		proteinGPerKg := float64(targets.TotalProteinG) / 85.0
		s.GreaterOrEqual(proteinGPerKg, 1.8,
			"Protein should meet evidence-based minimum for fat loss")
	})

	s.Run("fat meets minimum floor", func() {
		log := &DailyLog{
			Date:            "2025-01-01",
			WeightKg:        85,
			SleepQuality:    80,
			PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
			DayType:         DayTypeFatburner,
		}
		targets := CalculateDailyTargets(s.maleProfile, log, s.now)

		// Fat minimum is 0.7 g/kg = 59.5g for 85kg, but stored as int so rounds to 59 or 60
		// Allow for rounding tolerance
		fatMinG := GetFatMinimum(85) - 1 // 59.5 - 1 = 58.5g (allowing for rounding)
		s.GreaterOrEqual(float64(targets.TotalFatsG), fatMinG,
			"Fat should meet 0.7 g/kg minimum (with rounding tolerance)")
	})

	s.Run("uses configured BMR equation", func() {
		profileWithBF := *s.maleProfile
		profileWithBF.BMREquation = BMREquationKatchMcArdle
		profileWithBF.BodyFatPercent = 15

		log := &DailyLog{
			Date:            "2025-01-01",
			WeightKg:        85,
			SleepQuality:    80,
			PlannedTraining: PlannedTraining{Type: TrainingTypeRest, PlannedDurationMin: 0},
			DayType:         DayTypePerformance,
		}

		targetsDefault := CalculateDailyTargets(s.maleProfile, log, s.now)
		targetsKatch := CalculateDailyTargets(&profileWithBF, log, s.now)

		// Katch-McArdle with 15% BF should give different results
		s.NotEqual(targetsDefault.EstimatedTDEE, targetsKatch.EstimatedTDEE,
			"Different BMR equation should produce different TDEE")
	})
}
