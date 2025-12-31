package domain

import (
	"math"
	"time"
)

// TrainingConfig defines properties for each training type.
type TrainingConfig struct {
	CalPerMin float64
	LoadScore float64
}

// TrainingConfigs maps training types to their configuration.
var TrainingConfigs = map[TrainingType]TrainingConfig{
	TrainingTypeRest:         {CalPerMin: 0, LoadScore: 0},
	TrainingTypeQigong:       {CalPerMin: 2, LoadScore: 0.5},
	TrainingTypeWalking:      {CalPerMin: 4, LoadScore: 1},
	TrainingTypeGMB:          {CalPerMin: 5, LoadScore: 3},
	TrainingTypeRun:          {CalPerMin: 8, LoadScore: 3},
	TrainingTypeRow:          {CalPerMin: 8, LoadScore: 3},
	TrainingTypeCycle:        {CalPerMin: 6, LoadScore: 2},
	TrainingTypeHIIT:         {CalPerMin: 12, LoadScore: 5},
	TrainingTypeStrength:     {CalPerMin: 7, LoadScore: 5},
	TrainingTypeCalisthenics: {CalPerMin: 5, LoadScore: 3},
	TrainingTypeMobility:     {CalPerMin: 2, LoadScore: 0.5},
	TrainingTypeMixed:        {CalPerMin: 6, LoadScore: 4},
}

// DayTypeMultipliers defines macro multipliers for each day type by goal.
type DayTypeMultipliers struct {
	Carbs   float64
	Protein float64
	Fats    float64
}

// Multipliers maps day types and goals to their macro multipliers.
var Multipliers = map[DayType]map[Goal]DayTypeMultipliers{
	DayTypeFatburner: {
		GoalLoseWeight: {Carbs: 0.80, Protein: 0.80, Fats: 0.80},
		GoalGainWeight: {Carbs: 0.656, Protein: 0.656, Fats: 0.656},
		GoalMaintain:   {Carbs: 0.72, Protein: 0.72, Fats: 0.72},
	},
	DayTypePerformance: {
		GoalLoseWeight: {Carbs: 1.15, Protein: 1.15, Fats: 1.15},
		GoalGainWeight: {Carbs: 1.116, Protein: 1.116, Fats: 1.116},
		GoalMaintain:   {Carbs: 1.13, Protein: 1.13, Fats: 1.13},
	},
	DayTypeMetabolize: {
		GoalLoseWeight: {Carbs: 1.2, Protein: 1.2, Fats: 1.2},
		GoalGainWeight: {Carbs: 1.357, Protein: 1.357, Fats: 1.357},
		GoalMaintain:   {Carbs: 1.28, Protein: 1.28, Fats: 1.28},
	},
}

// CalculateDailyTargets computes daily macro targets based on profile and log.
func CalculateDailyTargets(profile *UserProfile, log *DailyLog, now time.Time) DailyTargets {
	// 1. Calculate base BMR using Mifflin-St Jeor
	bmr := calculateMifflinStJeor(profile, log.WeightKg, now)

	// 2. Get training configuration
	trainingConfig := TrainingConfigs[log.PlannedTraining.Type]
	trainingCalories := trainingConfig.CalPerMin * float64(log.PlannedTraining.PlannedDurationMin)

	// 3. Use day type from log (user-selected)
	dayType := log.DayType

	// 4. Calculate TDEE with sedentary activity factor (1.2) + training
	activityFactor := 1.2
	tdee := bmr*activityFactor + trainingCalories

	// 5. Calculate base macros from TDEE using profile ratios
	// Carbs: 4.1 kcal/g; /Protein: 4.3 kcal/g, Fats: 9.3 kcal/g
	baseCarbsG := (tdee * profile.CarbRatio) / 4.1
	baseProteinG := (tdee * profile.ProteinRatio) / 4.3
	baseFatsG := (tdee * profile.FatRatio) / 9.3

	// 6. Apply day type multipliers based on goal
	mult := Multipliers[dayType][profile.Goal]
	finalCarbsG := baseCarbsG * mult.Carbs
	finalProteinG := baseProteinG * mult.Protein
	finalFatsG := baseFatsG * mult.Fats

	// 7. Recalculate total calories from adjusted macros
	totalCalories := (finalCarbsG * 4.1) + (finalProteinG * 4.3) + (finalFatsG * 9.3)

	// 8. Calculate fruit/veggies targets
	fruitG := calculateFruit(finalCarbsG, profile.FruitTargetG, dayType)
	veggiesG := calculateVeggies(finalCarbsG, profile.VeggieTargetG)

	// 9. Convert to meal points
	meals := calculateMealPoints(
		finalCarbsG, finalProteinG, finalFatsG,
		float64(fruitG), float64(veggiesG),
		profile.MealRatios, profile.PointsConfig,
	)

	// 10. Calculate water target (0.04 L per kg body weight)
	waterL := math.Round(log.WeightKg*0.04*10) / 10

	return DailyTargets{
		TotalCarbsG:   int(math.Round(finalCarbsG)),
		TotalProteinG: int(math.Round(finalProteinG)),
		TotalFatsG:    int(math.Round(finalFatsG)),
		TotalCalories: int(math.Round(totalCalories)),
		Meals:         meals,
		FruitG:        fruitG,
		VeggiesG:      veggiesG,
		WaterL:        waterL,
		DayType:       dayType,
	}
}

// CalculateEstimatedTDEE returns the estimated TDEE for the day.
func CalculateEstimatedTDEE(profile *UserProfile, weightKg float64, trainingType TrainingType, durationMin int, now time.Time) int {
	bmr := calculateMifflinStJeor(profile, weightKg, now)
	trainingConfig := TrainingConfigs[trainingType]
	trainingCalories := trainingConfig.CalPerMin * float64(durationMin)
	tdee := bmr*1.2 + trainingCalories
	return int(math.Round(tdee))
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
func calculateMealPoints(
	carbsG, proteinG, fatsG float64,
	fruitG, veggiesG float64,
	mealRatios MealRatios,
	pointsConfig PointsConfig,
) MealTargets {
	// Subtract fruit/veggie carbs from total carbs
	// Fruit: ~10g carbs per 100g, Veggies: ~3g carbs per 100g
	fruitCarbs := fruitG * 0.10
	veggieCarbs := veggiesG * 0.03
	adjustedCarbsG := carbsG - fruitCarbs - veggieCarbs

	if adjustedCarbsG < 0 {
		adjustedCarbsG = 0
	}

	// Convert grams to points
	carbPoints := adjustedCarbsG / pointsConfig.CarbMultiplier
	proteinPoints := proteinG / pointsConfig.ProteinMultiplier
	fatPoints := fatsG / pointsConfig.FatMultiplier

	// Distribute across meals according to ratios
	return MealTargets{
		Breakfast: MacroPoints{
			Carbs:   roundToNearest5(carbPoints * mealRatios.Breakfast),
			Protein: roundToNearest5(proteinPoints * mealRatios.Breakfast),
			Fats:    roundToNearest5(fatPoints * mealRatios.Breakfast),
		},
		Lunch: MacroPoints{
			Carbs:   roundToNearest5(carbPoints * mealRatios.Lunch),
			Protein: roundToNearest5(proteinPoints * mealRatios.Lunch),
			Fats:    roundToNearest5(fatPoints * mealRatios.Lunch),
		},
		Dinner: MacroPoints{
			Carbs:   roundToNearest5(carbPoints * mealRatios.Dinner),
			Protein: roundToNearest5(proteinPoints * mealRatios.Dinner),
			Fats:    roundToNearest5(fatPoints * mealRatios.Dinner),
		},
	}
}

// roundToNearest5 rounds a float to the nearest multiple of 5.
func roundToNearest5(n float64) int {
	return int(math.Round(n/5) * 5)
}
