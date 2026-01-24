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

// trainingConfigs is the internal immutable map of training type configurations.
// Access via GetTrainingConfig() function to prevent mutation.
var trainingConfigs = map[TrainingType]TrainingConfig{
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

// GetTrainingConfig returns the configuration for a training type.
// Returns a zero-value TrainingConfig if the type is not found.
func GetTrainingConfig(t TrainingType) TrainingConfig {
	return trainingConfigs[t]
}

// GetAllTrainingConfigs returns a copy of all training configurations.
// The returned map is a copy, so modifications won't affect the internal state.
func GetAllTrainingConfigs() map[TrainingType]TrainingConfig {
	result := make(map[TrainingType]TrainingConfig, len(trainingConfigs))
	for k, v := range trainingConfigs {
		result[k] = v
	}
	return result
}

// calculateTargetCalories computes target calories and deficit severity based on goal.
// Returns target calories and deficit severity (0 for non-deficit goals).
func calculateTargetCalories(goal Goal, effectiveTDEE float64) (targetCalories float64, deficitSeverity float64) {
	switch goal {
	case GoalLoseWeight:
		// Target 500-750 kcal deficit for ~0.5-0.75 kg/week loss
		deficit := math.Min(effectiveTDEE*MaxDeficitPercent, MaxDeficitKcal)
		return effectiveTDEE - deficit, deficit / effectiveTDEE
	case GoalGainWeight:
		// Target 250-500 kcal surplus for lean gains
		surplus := math.Min(effectiveTDEE*MaxSurplusPercent, MaxSurplusKcal)
		return effectiveTDEE + surplus, 0
	default: // GoalMaintain
		return effectiveTDEE, 0
	}
}

// MacroAllocation contains the allocated macro grams after applying all adjustments.
type MacroAllocation struct {
	CarbsG   float64
	ProteinG float64
	FatsG    float64
}

// allocateMacros computes macro allocation using protein-first approach with day type modifiers.
// Enforces protein floor (MinGPerKg × weight) and fat floor (0.7 g/kg).
func allocateMacros(targetCalories, weightKg float64, goal Goal, isTrainingDay bool, deficitSeverity float64, dayType DayType) MacroAllocation {
	proteinRec := GetProteinRecommendation(goal, isTrainingDay, deficitSeverity)

	// Use optimal protein target
	proteinG := weightKg * proteinRec.OptimalGPerKg
	proteinCalories := proteinG * CaloriesPerGramProtein

	// Set fat floor (0.7 g/kg minimum for essential fatty acids)
	fatMinG := GetFatMinimum(weightKg)

	// Calculate fat based on remaining calories after protein
	remainingAfterProtein := targetCalories - proteinCalories

	// Allocate ~35% of remaining to fat (minimum fatMinG)
	fatCaloriesTarget := remainingAfterProtein * FatCaloriesPercent
	fatG := math.Max(fatCaloriesTarget/CaloriesPerGramFat, fatMinG)
	fatCalories := fatG * CaloriesPerGramFat

	// Remaining goes to carbs
	carbCalories := targetCalories - proteinCalories - fatCalories
	if carbCalories < 0 {
		carbCalories = 0
	}
	carbG := carbCalories / CaloriesPerGramCarb

	// Apply day type modifiers (protecting protein)
	mult := getDayTypeModifiers(dayType)

	// Protein stays at or above optimal - only adjust carbs and fats
	finalCarbsG := carbG * mult.Carbs
	finalProteinG := math.Max(proteinG*mult.Protein, weightKg*proteinRec.MinGPerKg)
	finalFatsG := math.Max(fatG*mult.Fats, fatMinG)

	return MacroAllocation{
		CarbsG:   finalCarbsG,
		ProteinG: finalProteinG,
		FatsG:    finalFatsG,
	}
}

// CalculateExerciseCalories computes calories burned using MET formula for a single session.
// Formula: Calories = (MET - 1) × weight(kg) × duration(hours)
// We subtract 1 from MET to get "extra" calories above resting (avoids double-counting with BMR).
func CalculateExerciseCalories(trainingType TrainingType, weightKg float64, durationMin int) float64 {
	config := GetTrainingConfig(trainingType)
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

	// 3. Calculate formula TDEE = BMR × NEAT multiplier + Exercise Calories
	formulaTDEE := bmr*NEATMultiplier + exerciseCalories
	if log.FormulaTDEE > 0 {
		formulaTDEE = float64(log.FormulaTDEE)
	}
	effectiveTDEE := float64(log.EstimatedTDEE)
	if effectiveTDEE <= 0 {
		effectiveTDEE = formulaTDEE
	}

	// 4. Apply goal-based calorie adjustment
	targetCalories, deficitSeverity := calculateTargetCalories(profile.Goal, effectiveTDEE)

	// 5. Allocate macros with protein-first approach, day type modifiers, and floors
	isTrainingDay := HasNonRestSession(log.PlannedSessions)
	dayType := log.DayType
	macros := allocateMacros(targetCalories, log.WeightKg, profile.Goal, isTrainingDay, deficitSeverity, dayType)

	// 6. Recalculate total calories from final macros
	totalCalories := (macros.CarbsG * CaloriesPerGramCarb) + (macros.ProteinG * CaloriesPerGramProtein) + (macros.FatsG * CaloriesPerGramFat)

	// 7. Calculate fruit/veggies targets
	fruitG := calculateFruit(macros.CarbsG, profile.FruitTargetG, dayType)
	veggiesG := calculateVeggies(macros.CarbsG, profile.VeggieTargetG)

	// 8. Convert to meal points
	meals := calculateMealPoints(
		macros.CarbsG, macros.ProteinG, macros.FatsG,
		float64(fruitG), float64(veggiesG),
		profile.MealRatios, profile.PointsConfig,
		dayType, profile.SupplementConfig,
	)

	// 9. Calculate water target (0.04 L per kg body weight)
	waterL := math.Round(log.WeightKg*WaterLPerKg*10) / 10

	return DailyTargets{
		TotalCarbsG:   int(math.Round(macros.CarbsG)),
		TotalProteinG: int(math.Round(macros.ProteinG)),
		TotalFatsG:    int(math.Round(macros.FatsG)),
		TotalCalories: int(math.Round(totalCalories)),
		EstimatedTDEE: int(math.Round(effectiveTDEE)),
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
	return weightKg * FatMinimumGPerKg
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
// Fatburner days reduce fruit by 30% before applying the carb cap.
func calculateFruit(carbsG, targetG float64, dayType DayType) int {
	maxFruit := (carbsG * FruitMaxCarbPercent) / FruitCarbsPercentWeight
	multiplier := 1.0
	if dayType == DayTypeFatburner {
		multiplier = FatburnerFruitReduction
	}
	adjustedTarget := targetG * multiplier
	result := math.Min(adjustedTarget, maxFruit)

	return roundToNearest5(result)
}

// calculateVeggies calculates veggie target respecting carb constraints.
// Max veggies: 10% of total carbs / 0.03 (veggies are ~3g carbs per 100g)
func calculateVeggies(carbsG, targetG float64) int {
	maxVeggies := (carbsG * VeggieMaxCarbPercent) / VeggieCarbsPercentWeight
	result := math.Min(targetG, maxVeggies)
	return roundToNearest5(result)
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
	// Fixed contribution assumptions from spreadsheet (see constants.go)

	// Calculate available carbs (subtract fixed contributions)
	fruitCarbs := fruitG * FruitCarbsPercentWeight
	veggieCarbs := veggiesG * VeggieCarbsPercentWeight
	availableCarbsG := carbsG - veggieCarbs - fruitCarbs

	// On performance days, also subtract maltodextrin carbs
	if dayType == DayTypePerformance {
		maltodextrinCarbs := supplements.MaltodextrinG * MaltodextrinCarbPercent
		availableCarbsG -= maltodextrinCarbs
	}

	if availableCarbsG < 0 {
		availableCarbsG = 0
	}

	// Calculate available protein (subtract fixed contributions)
	collagenProtein := supplements.CollagenG * CollagenProteinPercent
	availableProteinG := proteinG - collagenProtein

	// On performance days, also subtract whey protein
	if dayType == DayTypePerformance {
		wheyProtein := supplements.WheyG * WheyProteinPercent
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

// =============================================================================
// ADAPTIVE TDEE CALCULATION
// =============================================================================

// AdaptiveTDEEResult contains the result of adaptive TDEE calculation.
type AdaptiveTDEEResult struct {
	TDEE           float64    // Calculated adaptive TDEE
	Confidence     float64    // Confidence level 0-1 (based on data quality and quantity)
	DataPointsUsed int        // Number of valid data points used
	Source         TDEESource // Always TDEESourceAdaptive when calculated
}

// AdaptiveDataPoint represents a single day's data for adaptive TDEE calculation.
type AdaptiveDataPoint struct {
	Date           string
	WeightKg       float64
	TargetCalories int // Planned intake for the day (used as intake proxy)
	EstimatedTDEE  int // Effective TDEE used when targets were generated
	FormulaTDEE    int // Formula-based TDEE for transparency and fallback
}

// MinDataPointsForAdaptive is the minimum number of days needed for adaptive TDEE.
const MinDataPointsForAdaptive = 14

// MaxDataPointsForAdaptive is the maximum lookback period in days.
const MaxDataPointsForAdaptive = 56

const adherenceAdjustmentFactor = 0.5
const adherencePenaltyScaleKcal = 600.0
const adherencePenaltyMax = 0.2

func pointBaselineTDEE(point AdaptiveDataPoint) float64 {
	if point.EstimatedTDEE > 0 {
		return float64(point.EstimatedTDEE)
	}
	if point.FormulaTDEE > 0 {
		return float64(point.FormulaTDEE)
	}
	return 0
}

func adjustIntake(avgTarget, avgBaseline, observedDeficit float64) (float64, float64) {
	if avgTarget <= 0 || avgBaseline <= 0 {
		return avgTarget, 0
	}
	expectedDeficit := avgBaseline - avgTarget
	adjustment := expectedDeficit - observedDeficit
	adjustedIntake := avgTarget + adjustment*adherenceAdjustmentFactor
	if adjustedIntake < 0 {
		adjustedIntake = 0
	}
	return adjustedIntake, math.Abs(adjustment)
}

func adherencePenalty(avgAdjustment float64) float64 {
	if avgAdjustment <= 0 {
		return 0
	}
	penalty := (avgAdjustment / adherencePenaltyScaleKcal) * adherencePenaltyMax
	if penalty > adherencePenaltyMax {
		return adherencePenaltyMax
	}
	if penalty < 0 {
		return 0
	}
	return penalty
}

// calculateAdaptiveConfidence computes confidence level for adaptive TDEE calculation.
// Based on data point count, consistency of estimates (CV), and adherence error penalty.
func calculateAdaptiveConfidence(dataPointCount int, weeklyTDEEEstimates []float64, adaptiveTDEE float64, adherenceErrorSum float64, adherenceSamples int) float64 {
	// 1. Data point confidence (more = higher)
	dataPointConfidence := math.Min(float64(dataPointCount)/float64(MaxDataPointsForAdaptive), 1.0)

	// 2. Calculate variance in estimates for consistency confidence
	var sumSquaredDiff float64
	for _, tdee := range weeklyTDEEEstimates {
		diff := tdee - adaptiveTDEE
		sumSquaredDiff += diff * diff
	}
	variance := sumSquaredDiff / float64(len(weeklyTDEEEstimates))
	stdDev := math.Sqrt(variance)

	// Lower coefficient of variation = higher consistency confidence
	// CV > 0.15 (15%) reduces confidence
	cv := stdDev / adaptiveTDEE
	consistencyConfidence := math.Max(0, 1.0-(cv/0.15))

	// 3. Combined confidence (geometric mean of factors)
	confidence := math.Sqrt(dataPointConfidence * consistencyConfidence)

	// 4. Apply adherence penalty
	if adherenceSamples > 0 {
		avgAdherenceError := adherenceErrorSum / float64(adherenceSamples)
		confidence *= 1 - adherencePenalty(avgAdherenceError)
	}

	return math.Round(confidence*100) / 100 // Round to 2 decimal places
}

func parseDate(dateStr string) (time.Time, bool) {
	parsed, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, false
	}
	return parsed, true
}

func adaptiveSpanDays(dataPoints []AdaptiveDataPoint) (float64, bool) {
	if len(dataPoints) < 2 {
		return 0, false
	}
	start, ok := parseDate(dataPoints[0].Date)
	if !ok {
		return 0, false
	}
	end, ok := parseDate(dataPoints[len(dataPoints)-1].Date)
	if !ok {
		return 0, false
	}
	spanDays := end.Sub(start).Hours() / 24
	if spanDays <= 0 {
		return 0, false
	}
	return spanDays, true
}

func daysBetweenDates(startDate, endDate string) float64 {
	start, ok := parseDate(startDate)
	if !ok {
		return 0
	}
	end, ok := parseDate(endDate)
	if !ok {
		return 0
	}
	return end.Sub(start).Hours() / 24
}

// CalculateAdaptiveTDEE calculates TDEE from historical weight and calorie data.
// Uses target calories as an intake proxy with a light adherence adjustment.
//
// The algorithm:
//  1. Calculates weekly weight changes from the data points
//  2. Averages daily calorie intake for each week
//  3. Uses the relationship: TDEE = intake + (weekly_weight_change × 1100 kcal)
//     where 1100 = 7700 kcal per kg / 7 days
//  4. Weights recent weeks more heavily than older weeks
//
// Returns nil if insufficient data (less than MinDataPointsForAdaptive days).
func CalculateAdaptiveTDEE(dataPoints []AdaptiveDataPoint) *AdaptiveTDEEResult {
	if len(dataPoints) < 2 {
		return nil
	}

	// Limit to maximum lookback
	if len(dataPoints) > MaxDataPointsForAdaptive {
		dataPoints = dataPoints[len(dataPoints)-MaxDataPointsForAdaptive:]
	}

	spanDays, spanOK := adaptiveSpanDays(dataPoints)
	if len(dataPoints) < MinDataPointsForAdaptive && (!spanOK || spanDays < MinDataPointsForAdaptive) {
		return nil
	}

	if len(dataPoints) < MinDataPointsForAdaptive {
		return calculateSparseAdaptiveTDEE(dataPoints, spanDays)
	}

	// Group data into weeks for more stable calculations
	numWeeks := len(dataPoints) / 7
	if numWeeks < 2 {
		if spanOK && spanDays >= MinDataPointsForAdaptive {
			return calculateSparseAdaptiveTDEE(dataPoints, spanDays)
		}
		return nil
	}

	var weeklyTDEEEstimates []float64
	var weights []float64 // For weighted average - recent weeks count more
	var adherenceErrorSum float64
	var adherenceSamples int

	for week := 0; week < numWeeks-1; week++ {
		startIdx := week * 7
		endIdx := (week + 2) * 7 // Two-week window for weight change

		if endIdx > len(dataPoints) {
			endIdx = len(dataPoints)
		}

		// Calculate weight change over the two-week period
		startWeight := dataPoints[startIdx].WeightKg
		endWeight := dataPoints[endIdx-1].WeightKg
		weightChangeKg := startWeight - endWeight // Positive = weight loss

		// Calculate average daily intake for the first week
		var totalCalories float64
		var totalBaseline float64
		daysInWeek := 0
		baselineCount := 0
		for i := startIdx; i < startIdx+7 && i < len(dataPoints); i++ {
			totalCalories += float64(dataPoints[i].TargetCalories)
			daysInWeek++
			baseline := pointBaselineTDEE(dataPoints[i])
			if baseline > 0 {
				totalBaseline += baseline
				baselineCount++
			}
		}

		if daysInWeek == 0 {
			continue
		}

		avgDailyIntake := totalCalories / float64(daysInWeek)
		avgBaseline := 0.0
		if baselineCount > 0 {
			avgBaseline = totalBaseline / float64(baselineCount)
		}

		// Calculate TDEE from energy balance
		// Calories per kg of body weight change ≈ 7700 kcal
		daysBetween := daysBetweenDates(dataPoints[startIdx].Date, dataPoints[endIdx-1].Date)
		if daysBetween <= 0 {
			continue
		}
		dailyCalorieDeficit := (weightChangeKg / daysBetween) * 7700.0
		adjustedIntake, adjustmentAbs := adjustIntake(avgDailyIntake, avgBaseline, dailyCalorieDeficit)
		estimatedTDEE := adjustedIntake + dailyCalorieDeficit

		// Sanity check - TDEE should be reasonable (800-6000 range)
		if estimatedTDEE >= 800 && estimatedTDEE <= 6000 {
			weeklyTDEEEstimates = append(weeklyTDEEEstimates, estimatedTDEE)
			adherenceErrorSum += adjustmentAbs
			adherenceSamples++
			// More recent weeks get higher weight
			recencyWeight := float64(week+1) / float64(numWeeks)
			weights = append(weights, recencyWeight)
		}
	}

	if len(weeklyTDEEEstimates) == 0 {
		return nil
	}

	// Calculate weighted average TDEE
	var weightedSum float64
	var totalWeight float64
	for i, tdee := range weeklyTDEEEstimates {
		weightedSum += tdee * weights[i]
		totalWeight += weights[i]
	}
	adaptiveTDEE := weightedSum / totalWeight

	// Calculate confidence from data quality, consistency, and adherence
	confidence := calculateAdaptiveConfidence(len(dataPoints), weeklyTDEEEstimates, adaptiveTDEE, adherenceErrorSum, adherenceSamples)

	return &AdaptiveTDEEResult{
		TDEE:           math.Round(adaptiveTDEE),
		Confidence:     confidence,
		DataPointsUsed: len(dataPoints),
		Source:         TDEESourceAdaptive,
	}
}

func calculateSparseAdaptiveTDEE(dataPoints []AdaptiveDataPoint, spanDays float64) *AdaptiveTDEEResult {
	if len(dataPoints) < 2 || spanDays <= 0 {
		return nil
	}

	var totalCalories float64
	var totalBaseline float64
	baselineCount := 0
	for _, point := range dataPoints {
		totalCalories += float64(point.TargetCalories)
		baseline := pointBaselineTDEE(point)
		if baseline > 0 {
			totalBaseline += baseline
			baselineCount++
		}
	}
	if totalCalories <= 0 {
		return nil
	}

	avgDailyIntake := totalCalories / float64(len(dataPoints))
	avgBaseline := 0.0
	if baselineCount > 0 {
		avgBaseline = totalBaseline / float64(baselineCount)
	}

	startWeight := dataPoints[0].WeightKg
	endWeight := dataPoints[len(dataPoints)-1].WeightKg
	weightChangeKg := startWeight - endWeight
	dailyCalorieDeficit := (weightChangeKg / spanDays) * 7700.0
	adjustedIntake, adjustmentAbs := adjustIntake(avgDailyIntake, avgBaseline, dailyCalorieDeficit)
	estimatedTDEE := adjustedIntake + dailyCalorieDeficit

	if estimatedTDEE < 800 || estimatedTDEE > 6000 {
		return nil
	}

	confidence := 0.3
	confidence *= 1 - adherencePenalty(adjustmentAbs)
	confidence = math.Round(confidence*100) / 100

	return &AdaptiveTDEEResult{
		TDEE:           math.Round(estimatedTDEE),
		Confidence:     confidence,
		DataPointsUsed: len(dataPoints),
		Source:         TDEESourceAdaptive,
	}
}

// GetEffectiveTDEE returns the TDEE to use based on profile settings and available data.
// Priority:
// 1. Manual TDEE if source is "manual"
// 2. Adaptive TDEE if source is "adaptive" and we have enough data
// 3. Formula-based TDEE as fallback
func GetEffectiveTDEE(profile *UserProfile, formulaTDEE int, adaptiveResult *AdaptiveTDEEResult) (int, TDEESource, float64, int) {
	const fallbackConfidence = 0.3

	switch profile.TDEESource {
	case TDEESourceManual:
		if profile.ManualTDEE > 0 {
			return int(profile.ManualTDEE), TDEESourceManual, 0.8, 0
		}
		// Fall back to formula if manual not set
		return formulaTDEE, TDEESourceFormula, fallbackConfidence, 0

	case TDEESourceAdaptive:
		if adaptiveResult != nil && adaptiveResult.Confidence >= 0.3 {
			return int(adaptiveResult.TDEE), TDEESourceAdaptive, adaptiveResult.Confidence, adaptiveResult.DataPointsUsed
		}
		// Fall back to manual if set, else formula
		if profile.ManualTDEE > 0 {
			return int(profile.ManualTDEE), TDEESourceManual, fallbackConfidence, 0
		}
		return formulaTDEE, TDEESourceFormula, fallbackConfidence, 0

	default: // TDEESourceFormula
		return formulaTDEE, TDEESourceFormula, fallbackConfidence, 0
	}
}
