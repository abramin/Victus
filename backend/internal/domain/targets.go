package domain

import (
	"math"
	"time"
)

// TrainingConfig defines properties for each training type using MET values.
// MET (Metabolic Equivalent of Task) provides weight-adjusted calorie calculations.
// Based on 2024 Compendium of Physical Activities.
type TrainingConfig struct {
	MET       float64 // Metabolic Equivalent of Task
	LoadScore float64 // For recovery/load tracking
}

// TrainingConfigs maps training types to their MET-based configuration.
var TrainingConfigs = map[TrainingType]TrainingConfig{
	TrainingTypeRest:         {MET: 1.0, LoadScore: 0},   // Resting
	TrainingTypeQigong:       {MET: 2.5, LoadScore: 0.5}, // Tai chi, qigong (code 15552)
	TrainingTypeWalking:      {MET: 3.5, LoadScore: 1},   // Walking 3.0 mph (code 17170)
	TrainingTypeGMB:          {MET: 4.0, LoadScore: 3},   // Calisthenics, light (code 02020)
	TrainingTypeRun:          {MET: 9.8, LoadScore: 3},   // Running 6 mph (code 12050)
	TrainingTypeRow:          {MET: 7.0, LoadScore: 3},   // Rowing, moderate (code 15235)
	TrainingTypeCycle:        {MET: 6.8, LoadScore: 2},   // Cycling 12-14 mph (code 01040)
	TrainingTypeHIIT:         {MET: 12.8, LoadScore: 5},  // Circuit training, vigorous (code 02040)
	TrainingTypeStrength:     {MET: 5.0, LoadScore: 5},   // Weight training, vigorous (code 02054)
	TrainingTypeCalisthenics: {MET: 4.0, LoadScore: 3},   // Calisthenics, moderate (code 02020)
	TrainingTypeMobility:     {MET: 2.5, LoadScore: 0.5}, // Stretching, yoga (code 02101)
	TrainingTypeMixed:        {MET: 6.0, LoadScore: 4},   // General conditioning
}

// CalculateExerciseCalories computes calories burned using MET formula for a single session.
// Formula: Calories = (MET - 1) × weight(kg) × duration(hours)
// We subtract 1 from MET to get "extra" calories above resting (avoids double-counting with BMR).
func CalculateExerciseCalories(trainingType TrainingType, weightKg float64, durationMin int) float64 {
	config := TrainingConfigs[trainingType]
	durationHours := float64(durationMin) / 60.0

	// MET includes resting metabolism, subtract 1 to get extra calories burned
	netMET := config.MET - 1.0
	if netMET < 0 {
		netMET = 0
	}

	return netMET * weightKg * durationHours
}

// CalculateTotalExerciseCalories computes total calories burned across all sessions.
func CalculateTotalExerciseCalories(sessions []TrainingSession, weightKg float64) float64 {
	var totalCalories float64
	for _, session := range sessions {
		totalCalories += CalculateExerciseCalories(session.Type, weightKg, session.DurationMin)
	}
	return totalCalories
}

// HasNonRestSession returns true if any session is not a rest session.
func HasNonRestSession(sessions []TrainingSession) bool {
	for _, s := range sessions {
		if s.Type != TrainingTypeRest {
			return true
		}
	}
	return false
}

// DayTypeMultipliers defines macro multipliers for each day type.
// Protein is always protected at 1.0 to preserve muscle mass during deficits.
type DayTypeMultipliers struct {
	Carbs   float64
	Protein float64
	Fats    float64
}

// CalculateDailyTargets computes daily macro targets based on profile and log.
// Uses evidence-based algorithms: MET-based exercise calories, protein-first macros,
// protected protein on day types, and fat floor enforcement.
func CalculateDailyTargets(profile *UserProfile, log *DailyLog, now time.Time) DailyTargets {
	// 1. Calculate BMR using configured equation (default: Mifflin-St Jeor)
	bmrEquation := profile.BMREquation
	if bmrEquation == "" {
		bmrEquation = BMREquationMifflinStJeor
	}
	bmr := CalculateBMR(profile, log.WeightKg, now, bmrEquation)

	// 2. Calculate exercise calories using MET-based formula (weight-adjusted)
	// Sum calories across all planned sessions
	exerciseCalories := CalculateTotalExerciseCalories(log.PlannedSessions, log.WeightKg)

	// 3. Calculate TDEE = BMR × NEAT multiplier + Exercise Calories
	neatMultiplier := 1.2 // Sedentary activity factor
	estimatedTDEE := bmr*neatMultiplier + exerciseCalories

	// 4. Apply goal-based calorie adjustment
	var targetCalories float64
	var deficitSeverity float64

	switch profile.Goal {
	case GoalLoseWeight:
		// Target 500-750 kcal deficit for ~0.5-0.75 kg/week loss
		deficit := math.Min(estimatedTDEE*0.20, 750) // Max 20% or 750 kcal
		targetCalories = estimatedTDEE - deficit
		deficitSeverity = deficit / estimatedTDEE
	case GoalGainWeight:
		// Target 250-500 kcal surplus for lean gains
		surplus := math.Min(estimatedTDEE*0.10, 500) // Max 10% or 500 kcal
		targetCalories = estimatedTDEE + surplus
	default: // GoalMaintain
		targetCalories = estimatedTDEE
	}

	// 5. Calculate macros with protein-first approach
	// A day is a training day if any session is not rest
	isTrainingDay := HasNonRestSession(log.PlannedSessions)
	proteinRec := GetProteinRecommendation(profile.Goal, isTrainingDay, deficitSeverity)

	// Use optimal protein target
	proteinG := log.WeightKg * proteinRec.OptimalGPerKg
	proteinCalories := proteinG * 4.0 // Standard 4 kcal/g

	// 6. Set fat floor (0.7 g/kg minimum for essential fatty acids)
	fatMinG := GetFatMinimum(log.WeightKg)

	// Calculate fat based on remaining calories after protein
	remainingAfterProtein := targetCalories - proteinCalories

	// Allocate ~35% of remaining to fat (minimum fatMinG)
	fatCaloriesTarget := remainingAfterProtein * 0.35
	fatG := math.Max(fatCaloriesTarget/9.0, fatMinG)
	fatCalories := fatG * 9.0

	// 7. Remaining goes to carbs
	carbCalories := targetCalories - proteinCalories - fatCalories
	if carbCalories < 0 {
		carbCalories = 0
	}
	carbG := carbCalories / 4.0

	// 8. Apply day type modifiers (protecting protein)
	dayType := log.DayType
	mult := getDayTypeModifiers(dayType)

	// Protein stays at or above optimal - only adjust carbs and fats
	finalCarbsG := carbG * mult.Carbs
	finalProteinG := math.Max(proteinG*mult.Protein, log.WeightKg*proteinRec.MinGPerKg)
	finalFatsG := math.Max(fatG*mult.Fats, fatMinG)

	// 9. Recalculate total calories from final macros
	totalCalories := (finalCarbsG * 4.0) + (finalProteinG * 4.0) + (finalFatsG * 9.0)

	// 10. Calculate fruit/veggies targets
	fruitG := calculateFruit(finalCarbsG, profile.FruitTargetG, dayType)
	veggiesG := calculateVeggies(finalCarbsG, profile.VeggieTargetG)

	// 11. Convert to meal points
	meals := calculateMealPoints(
		finalCarbsG, finalProteinG, finalFatsG,
		float64(fruitG), float64(veggiesG),
		profile.MealRatios, profile.PointsConfig,
		dayType, profile.SupplementConfig,
	)

	// 12. Calculate water target (0.04 L per kg body weight)
	waterL := math.Round(log.WeightKg*0.04*10) / 10

	return DailyTargets{
		TotalCarbsG:   int(math.Round(finalCarbsG)),
		TotalProteinG: int(math.Round(finalProteinG)),
		TotalFatsG:    int(math.Round(finalFatsG)),
		TotalCalories: int(math.Round(totalCalories)),
		EstimatedTDEE: int(math.Round(estimatedTDEE)),
		Meals:         meals,
		FruitG:        fruitG,
		VeggiesG:      veggiesG,
		WaterL:        waterL,
		DayType:       dayType,
	}
}

// CalculateEstimatedTDEE returns the estimated TDEE for the day using MET-based exercise calories.
// Sums exercise calories across all planned sessions.
func CalculateEstimatedTDEE(profile *UserProfile, weightKg float64, sessions []TrainingSession, now time.Time) int {
	// Use configured BMR equation (default: Mifflin-St Jeor)
	bmrEquation := profile.BMREquation
	if bmrEquation == "" {
		bmrEquation = BMREquationMifflinStJeor
	}
	bmr := CalculateBMR(profile, weightKg, now, bmrEquation)
	exerciseCalories := CalculateTotalExerciseCalories(sessions, weightKg)
	tdee := bmr*1.2 + exerciseCalories
	return int(math.Round(tdee))
}

// =============================================================================
// BMR CALCULATION FUNCTIONS
// =============================================================================

// CalculateBMR calculates BMR using the specified equation.
// Returns BMR in kcal/day.
func CalculateBMR(profile *UserProfile, weightKg float64, now time.Time, equation BMREquation) float64 {
	age := calculateAge(profile.BirthDate, now)

	switch equation {
	case BMREquationKatchMcArdle:
		// Requires body fat percentage - falls back to Mifflin if not available
		if profile.BodyFatPercent > 0 {
			return calculateKatchMcArdle(weightKg, profile.BodyFatPercent)
		}
		return calculateMifflinStJeor(profile, weightKg, now)

	case BMREquationOxfordHenry:
		return calculateOxfordHenry(profile.Sex, weightKg, float64(age))

	case BMREquationHarrisBenedict:
		return calculateHarrisBenedict(profile.Sex, weightKg, profile.HeightCM, float64(age))

	default: // BMREquationMifflinStJeor
		return calculateMifflinStJeor(profile, weightKg, now)
	}
}

// calculateKatchMcArdle: BMR = 370 + (21.6 × LBM in kg)
// Most accurate when body fat % is known.
func calculateKatchMcArdle(weightKg, bodyFatPercent float64) float64 {
	leanBodyMass := weightKg * (1 - bodyFatPercent/100)
	return 370 + (21.6 * leanBodyMass)
}

// calculateOxfordHenry - from 2005 meta-analysis, age-stratified.
// Better validated across populations than Mifflin-St Jeor.
func calculateOxfordHenry(sex Sex, weightKg float64, age float64) float64 {
	if sex == SexMale {
		switch {
		case age < 30:
			return 14.4*weightKg + 313
		case age < 60:
			return 11.4*weightKg + 541
		default: // 60+
			return 11.4*weightKg + 541
		}
	}
	// Female
	switch {
	case age < 30:
		return 10.4*weightKg + 615
	case age < 60:
		return 8.18*weightKg + 502
	default: // 60+
		return 8.52*weightKg + 421
	}
}

// calculateHarrisBenedict - legacy equation, included for comparison.
func calculateHarrisBenedict(sex Sex, weightKg, heightCm, age float64) float64 {
	if sex == SexMale {
		return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age)
	}
	return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age)
}

// =============================================================================
// EVIDENCE-BASED PROTEIN RECOMMENDATIONS
// =============================================================================

// ProteinRecommendation contains evidence-based protein targets.
type ProteinRecommendation struct {
	MinGPerKg     float64 // Minimum recommended
	OptimalGPerKg float64 // Optimal target
	MaxGPerKg     float64 // Upper useful limit (diminishing returns beyond)
	Source        string  // Citation
}

// GetProteinRecommendation returns evidence-based protein targets.
// Based on meta-analyses: Morton 2018, Helms 2014, Phillips 2016.
func GetProteinRecommendation(goal Goal, isTrainingDay bool, deficitSeverity float64) ProteinRecommendation {
	switch goal {
	case GoalLoseWeight:
		// Higher protein during deficit preserves lean mass
		// Helms 2014: 2.3-3.1 g/kg FFM for lean athletes
		// Longland 2016: 2.4 g/kg during 40% deficit
		if deficitSeverity > 0.25 { // Aggressive cut (>25% deficit)
			return ProteinRecommendation{
				MinGPerKg:     2.0,
				OptimalGPerKg: 2.4,
				MaxGPerKg:     3.0,
				Source:        "Helms 2014, Longland 2016",
			}
		}
		// Moderate deficit
		return ProteinRecommendation{
			MinGPerKg:     1.8,
			OptimalGPerKg: 2.2,
			MaxGPerKg:     2.6,
			Source:        "Phillips 2016",
		}

	case GoalGainWeight:
		// Morton 2018: ~1.6 g/kg breakpoint, up to 2.2 for trained
		if isTrainingDay {
			return ProteinRecommendation{
				MinGPerKg:     1.6,
				OptimalGPerKg: 2.0,
				MaxGPerKg:     2.2,
				Source:        "Morton 2018",
			}
		}
		return ProteinRecommendation{
			MinGPerKg:     1.4,
			OptimalGPerKg: 1.8,
			MaxGPerKg:     2.0,
			Source:        "Morton 2018",
		}

	default: // GoalMaintain
		if isTrainingDay {
			return ProteinRecommendation{
				MinGPerKg:     1.4,
				OptimalGPerKg: 1.8,
				MaxGPerKg:     2.0,
				Source:        "ISSN Position Stand",
			}
		}
		return ProteinRecommendation{
			MinGPerKg:     1.2,
			OptimalGPerKg: 1.6,
			MaxGPerKg:     1.8,
			Source:        "ISSN Position Stand",
		}
	}
}

// GetFatMinimum returns minimum fat intake for essential fatty acids and hormones.
// Generally 0.5-1.0 g/kg; we use 0.7 g/kg as a reasonable floor.
func GetFatMinimum(weightKg float64) float64 {
	return weightKg * 0.7
}

// =============================================================================
// PROTECTED PROTEIN DAY TYPE MULTIPLIERS
// =============================================================================

// getDayTypeModifiers returns adjusted multipliers that protect protein.
// Key insight: During deficit, protein should stay constant or increase to preserve muscle.
// We reduce carbs instead of protein on low-calorie days.
func getDayTypeModifiers(dayType DayType) DayTypeMultipliers {
	switch dayType {
	case DayTypeFatburner:
		// Low carb day - reduce carbs significantly, maintain protein
		return DayTypeMultipliers{
			Carbs:   0.60, // 40% carb reduction
			Protein: 1.00, // Maintain protein
			Fats:    0.85, // Slight fat reduction
		}
	case DayTypePerformance:
		// High training day - increase carbs for performance
		return DayTypeMultipliers{
			Carbs:   1.30, // 30% more carbs
			Protein: 1.00, // Maintain protein
			Fats:    1.00, // Maintain fats
		}
	case DayTypeMetabolize:
		// Refeed/high day
		return DayTypeMultipliers{
			Carbs:   1.50, // 50% more carbs
			Protein: 1.00, // Maintain protein
			Fats:    1.10, // Slight fat increase
		}
	default:
		return DayTypeMultipliers{
			Carbs:   1.0,
			Protein: 1.0,
			Fats:    1.0,
		}
	}
}

// calculateMifflinStJeor calculates BMR using the Mifflin-St Jeor equation.
// Male: (10 × weight) + (6.25 × height) - (5 × age) + 5
// Female: (10 × weight) + (6.25 × height) - (5 × age) - 161
func calculateMifflinStJeor(profile *UserProfile, weightKg float64, now time.Time) float64 {
	age := calculateAge(profile.BirthDate, now)
	base := (10 * weightKg) + (6.25 * profile.HeightCM) - (5 * float64(age))

	if profile.Sex == SexMale {
		return base + 5
	}
	return base - 161
}

// calculateAge returns age in years from birth date.
func calculateAge(birthDate time.Time, now time.Time) int {
	age := now.Year() - birthDate.Year()

	// Adjust if birthday hasn't occurred yet this year
	if now.YearDay() < birthDate.YearDay() {
		age--
	}
	return age
}

// calculateFruit calculates fruit target respecting carb constraints.
// Max fruit: 30% of total carbs / 0.10 (fruit is ~10g carbs per 100g)
// Fatburner days reduce fruit by 30%
func calculateFruit(carbsG, targetG float64, dayType DayType) int {
	maxFruit := (carbsG * 0.30) / 0.10 // 30% of carbs, 10g carbs per 100g fruit
	result := math.Min(targetG, maxFruit)

	if dayType == DayTypeFatburner {
		result *= 0.70 // Reduce by 30% on fatburner days
	}

	return int(math.Round(result))
}

// calculateVeggies calculates veggie target respecting carb constraints.
// Max veggies: 10% of total carbs / 0.03 (veggies are ~3g carbs per 100g)
func calculateVeggies(carbsG, targetG float64) int {
	maxVeggies := (carbsG * 0.10) / 0.03 // 10% of carbs, 3g carbs per 100g veggies
	result := math.Min(targetG, maxVeggies)
	return int(math.Round(result))
}

// calculateMealPoints converts macro grams to meal points using profile config.
// The calculation varies by day type for supplement contributions:
// - Performance days: subtract maltodextrin (carbs) and whey (protein)
// - All days: subtract fruit/veggie carbs and collagen (protein)
func calculateMealPoints(
	carbsG, proteinG, fatsG float64,
	fruitG, veggiesG float64,
	mealRatios MealRatios,
	pointsConfig PointsConfig,
	dayType DayType,
	supplements SupplementConfig,
) MealTargets {
	// Fixed contribution assumptions from spreadsheet:
	// - Fruit: 10% carbs by weight
	// - Vegetables: 3% carbs by weight
	// - Maltodextrin: 96% carbs by weight (performance days only)
	// - Collagen: 90% protein by weight
	// - Whey: 88% protein by weight (performance days only)

	// Calculate available carbs (subtract fixed contributions)
	fruitCarbs := fruitG * 0.10
	veggieCarbs := veggiesG * 0.03
	availableCarbsG := carbsG - veggieCarbs - fruitCarbs

	// On performance days, also subtract maltodextrin carbs
	if dayType == DayTypePerformance {
		maltodextrinCarbs := supplements.MaltodextrinG * 0.96
		availableCarbsG -= maltodextrinCarbs
	}

	if availableCarbsG < 0 {
		availableCarbsG = 0
	}

	// Calculate available protein (subtract fixed contributions)
	collagenProtein := supplements.CollagenG * 0.90
	availableProteinG := proteinG - collagenProtein

	// On performance days, also subtract whey protein
	if dayType == DayTypePerformance {
		wheyProtein := supplements.WheyG * 0.88
		availableProteinG -= wheyProtein
	}

	if availableProteinG < 0 {
		availableProteinG = 0
	}

	// Convert grams to points using multipliers
	// Formula: points = availableGrams * multiplier * mealRatio
	// (rounded to nearest 5 using MROUND)

	// Distribute across meals according to ratios
	return MealTargets{
		Breakfast: MacroPoints{
			Carbs:   roundToNearest5(availableCarbsG * pointsConfig.CarbMultiplier * mealRatios.Breakfast),
			Protein: roundToNearest5(availableProteinG * pointsConfig.ProteinMultiplier * mealRatios.Breakfast),
			Fats:    roundToNearest5(fatsG * pointsConfig.FatMultiplier * mealRatios.Breakfast),
		},
		Lunch: MacroPoints{
			Carbs:   roundToNearest5(availableCarbsG * pointsConfig.CarbMultiplier * mealRatios.Lunch),
			Protein: roundToNearest5(availableProteinG * pointsConfig.ProteinMultiplier * mealRatios.Lunch),
			Fats:    roundToNearest5(fatsG * pointsConfig.FatMultiplier * mealRatios.Lunch),
		},
		Dinner: MacroPoints{
			Carbs:   roundToNearest5(availableCarbsG * pointsConfig.CarbMultiplier * mealRatios.Dinner),
			Protein: roundToNearest5(availableProteinG * pointsConfig.ProteinMultiplier * mealRatios.Dinner),
			Fats:    roundToNearest5(fatsG * pointsConfig.FatMultiplier * mealRatios.Dinner),
		},
	}
}

// roundToNearest5 rounds a float to the nearest multiple of 5.
func roundToNearest5(n float64) int {
	return int(math.Round(n/5) * 5)
}
