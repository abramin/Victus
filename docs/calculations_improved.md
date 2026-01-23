package domain

import (
	"math"
	"time"
)

// =============================================================================
// BMR EQUATION OPTIONS
// =============================================================================

// BMREquation represents available BMR calculation methods
type BMREquation string

const (
	BMREquationMifflinStJeor BMREquation = "mifflin_st_jeor" // Default, best for general population
	BMREquationKatchMcArdle  BMREquation = "katch_mcardle"   // Best if body fat % is known
	BMREquationOxfordHenry   BMREquation = "oxford_henry"    // Large sample, good accuracy
	BMREquationHarrisBenedict BMREquation = "harris_benedict" // Legacy, included for comparison
)

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
// Most accurate when body fat % is known
func calculateKatchMcArdle(weightKg, bodyFatPercent float64) float64 {
	leanBodyMass := weightKg * (1 - bodyFatPercent/100)
	return 370 + (21.6 * leanBodyMass)
}

// calculateOxfordHenry - from 2005 meta-analysis, age-stratified
// Better validated across populations than Mifflin-St Jeor
func calculateOxfordHenry(sex Sex, weightKg float64, age float64) float64 {
	if sex == SexMale {
		switch {
		case age < 30:
			return 14.4*weightKg + 313
		case age < 60:
			return 11.4*weightKg + 541
		default: // 60+
			return 11.4*weightKg + 541 // Same as 30-60 in original
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

// calculateHarrisBenedict - legacy equation, included for comparison
func calculateHarrisBenedict(sex Sex, weightKg, heightCm, age float64) float64 {
	if sex == SexMale {
		return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age)
	}
	return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age)
}

// =============================================================================
// MET-BASED EXERCISE CALCULATIONS (2024 Compendium)
// =============================================================================

// TrainingConfigMET uses MET values for weight-adjusted calorie calculations
type TrainingConfigMET struct {
	MET       float64 // Metabolic Equivalent of Task
	LoadScore float64 // For recovery/load tracking
}

// TrainingConfigsMET - based on 2024 Compendium of Physical Activities
// MET values are more accurate when multiplied by body weight
var TrainingConfigsMET = map[TrainingType]TrainingConfigMET{
	TrainingTypeRest:         {MET: 1.0, LoadScore: 0},      // Resting
	TrainingTypeQigong:       {MET: 2.5, LoadScore: 0.5},    // Tai chi, qigong (code 15552)
	TrainingTypeWalking:      {MET: 3.5, LoadScore: 1},      // Walking 3.0 mph (code 17170)
	TrainingTypeGMB:          {MET: 4.0, LoadScore: 3},      // Calisthenics, light (code 02020)
	TrainingTypeRun:          {MET: 9.8, LoadScore: 3},      // Running 6 mph (code 12050)
	TrainingTypeRow:          {MET: 7.0, LoadScore: 3},      // Rowing, moderate (code 15235)
	TrainingTypeCycle:        {MET: 6.8, LoadScore: 2},      // Cycling 12-14 mph (code 01040)
	TrainingTypeHIIT:         {MET: 12.8, LoadScore: 5},     // Circuit training, vigorous (code 02040)
	TrainingTypeStrength:     {MET: 5.0, LoadScore: 5},      // Weight training, vigorous (code 02054)
	TrainingTypeCalisthenics: {MET: 4.0, LoadScore: 3},      // Calisthenics, moderate (code 02020)
	TrainingTypeMobility:     {MET: 2.5, LoadScore: 0.5},    // Stretching, yoga (code 02101)
	TrainingTypeMixed:        {MET: 6.0, LoadScore: 4},      // General conditioning
}

// CalculateExerciseCalories computes calories burned using MET formula
// Formula: Calories = MET × weight(kg) × duration(hours)
func CalculateExerciseCalories(trainingType TrainingType, weightKg float64, durationMin int) float64 {
	config := TrainingConfigsMET[trainingType]
	durationHours := float64(durationMin) / 60.0
	
	// MET already includes resting metabolism, so we subtract 1 MET to get
	// the "extra" calories burned above rest (to avoid double-counting with BMR)
	netMET := config.MET - 1.0
	if netMET < 0 {
		netMET = 0
	}
	
	return netMET * weightKg * durationHours
}

// =============================================================================
// EVIDENCE-BASED MACRO CALCULATIONS
// =============================================================================

// ProteinTarget calculates protein needs in g/kg based on goal and context
// Based on meta-analyses: Morton 2018, Helms 2014, Phillips 2016
type ProteinRecommendation struct {
	MinGPerKg     float64 // Minimum recommended
	OptimalGPerKg float64 // Optimal target
	MaxGPerKg     float64 // Upper useful limit (diminishing returns beyond)
	Source        string  // Citation
}

// GetProteinRecommendation returns evidence-based protein targets
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
				Source:        "Morton 2018, Stronger by Science 2025",
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

// FatMinimum returns minimum fat intake for essential fatty acids and hormones
// Generally 0.5-1.0 g/kg, or 20-25% of calories minimum
func GetFatMinimum(weightKg float64) float64 {
	return weightKg * 0.7 // 0.7 g/kg is a reasonable floor
}

// =============================================================================
// IMPROVED DAILY TARGETS CALCULATION
// =============================================================================

// CalculateDailyTargetsImproved uses evidence-based algorithms
func CalculateDailyTargetsImproved(profile *UserProfile, log *DailyLog, now time.Time) DailyTargets {
	// 1. Calculate BMR using configured equation (default: Mifflin-St Jeor)
	bmrEquation := profile.BMREquation
	if bmrEquation == "" {
		bmrEquation = BMREquationMifflinStJeor
	}
	bmr := CalculateBMR(profile, log.WeightKg, now, bmrEquation)

	// 2. Calculate exercise calories using MET-based formula (weight-adjusted)
	exerciseCalories := CalculateExerciseCalories(
		log.PlannedTraining.Type,
		log.WeightKg,
		log.PlannedTraining.PlannedDurationMin,
	)

	// 3. Calculate NEAT (Non-Exercise Activity Thermogenesis)
	// Using sedentary multiplier for non-training activity
	neatMultiplier := 1.2 // Could be made configurable based on job/lifestyle
	
	// 4. Calculate estimated TDEE
	// TDEE = BMR × NEAT multiplier + Exercise Calories
	estimatedTDEE := bmr*neatMultiplier + exerciseCalories

	// 5. Apply goal-based calorie adjustment
	var targetCalories float64
	var deficitSeverity float64
	
	switch profile.Goal {
	case GoalLoseWeight:
		// Target 500-750 kcal deficit for ~0.5-0.75 kg/week loss
		// Or use percentage-based deficit if configured
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

	// 6. Calculate macros with protein-first approach
	isTrainingDay := log.PlannedTraining.Type != TrainingTypeRest
	proteinRec := GetProteinRecommendation(profile.Goal, isTrainingDay, deficitSeverity)
	
	// Use optimal protein target
	proteinG := log.WeightKg * proteinRec.OptimalGPerKg
	proteinCalories := proteinG * 4.0 // Using standard 4 kcal/g
	
	// Set fat floor
	fatMinG := GetFatMinimum(log.WeightKg)
	
	// Calculate fat based on remaining calories after protein
	remainingAfterProtein := targetCalories - proteinCalories
	
	// Allocate ~30-35% of remaining to fat (minimum fatMinG)
	fatCaloriesTarget := remainingAfterProtein * 0.35
	fatG := math.Max(fatCaloriesTarget/9.0, fatMinG)
	fatCalories := fatG * 9.0
	
	// Remaining goes to carbs
	carbCalories := targetCalories - proteinCalories - fatCalories
	if carbCalories < 0 {
		carbCalories = 0
	}
	carbG := carbCalories / 4.0

	// 7. Apply day type modifiers (but protect protein)
	dayType := log.DayType
	mult := getDayTypeModifiers(dayType, profile.Goal)
	
	// Protein stays at or above optimal - only adjust carbs and fats
	finalCarbsG := carbG * mult.Carbs
	finalProteinG := math.Max(proteinG*mult.Protein, log.WeightKg*proteinRec.MinGPerKg)
	finalFatsG := math.Max(fatG*mult.Fats, fatMinG)
	
	// 8. Recalculate total calories
	totalCalories := (finalCarbsG * 4.0) + (finalProteinG * 4.0) + (finalFatsG * 9.0)

	// 9. Calculate fruit/veggies
	fruitG := calculateFruit(finalCarbsG, profile.FruitTargetG, dayType)
	veggiesG := calculateVeggies(finalCarbsG, profile.VeggieTargetG)

	// 10. Convert to meal points
	meals := calculateMealPoints(
		finalCarbsG, finalProteinG, finalFatsG,
		float64(fruitG), float64(veggiesG),
		profile.MealRatios, profile.PointsConfig,
	)

	// 11. Water target
	waterL := math.Round(log.WeightKg*0.04*10) / 10

	return DailyTargets{
		TotalCarbsG:     int(math.Round(finalCarbsG)),
		TotalProteinG:   int(math.Round(finalProteinG)),
		TotalFatsG:      int(math.Round(finalFatsG)),
		TotalCalories:   int(math.Round(totalCalories)),
		EstimatedTDEE:   int(math.Round(estimatedTDEE)), // New field
		Meals:           meals,
		FruitG:          fruitG,
		VeggiesG:        veggiesG,
		WaterL:          waterL,
		DayType:         dayType,
	}
}

// getDayTypeModifiers returns adjusted multipliers that protect protein
func getDayTypeModifiers(dayType DayType, goal Goal) DayTypeMultipliers {
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

// =============================================================================
// ADAPTIVE TDEE TRACKING
// =============================================================================

// AdaptiveTDEE tracks real TDEE from weight and intake data
type AdaptiveTDEE struct {
	EstimatedTDEE float64   // Current estimate
	Confidence    float64   // 0-1, how confident we are
	DataPoints    int       // Number of data points used
	LastUpdated   time.Time
}

// WeightTrendPoint represents a daily data point for adaptive TDEE
type WeightTrendPoint struct {
	Date      time.Time
	WeightKg  float64
	IntakeKcal float64
}

// CalculateAdaptiveTDEE computes TDEE from historical weight and intake data
// Uses exponentially weighted moving average for weight trend
// Requires at least 14 days of data for reasonable accuracy
func CalculateAdaptiveTDEE(
	dataPoints []WeightTrendPoint,
	initialEstimate float64,
) AdaptiveTDEE {
	n := len(dataPoints)
	
	// Need minimum data for meaningful calculation
	if n < 7 {
		return AdaptiveTDEE{
			EstimatedTDEE: initialEstimate,
			Confidence:    0.1,
			DataPoints:    n,
			LastUpdated:   time.Now(),
		}
	}
	
	// Calculate exponentially smoothed weight trend
	alpha := 0.1 // Smoothing factor (lower = smoother)
	var smoothedWeights []float64
	smoothedWeights = append(smoothedWeights, dataPoints[0].WeightKg)
	
	for i := 1; i < n; i++ {
		smoothed := alpha*dataPoints[i].WeightKg + (1-alpha)*smoothedWeights[i-1]
		smoothedWeights = append(smoothedWeights, smoothed)
	}
	
	// Calculate weekly weight change from trend
	if n >= 7 {
		weeklyChange := smoothedWeights[n-1] - smoothedWeights[n-7]
		
		// Calculate average intake over the week
		var totalIntake float64
		for i := n - 7; i < n; i++ {
			totalIntake += dataPoints[i].IntakeKcal
		}
		avgIntake := totalIntake / 7.0
		
		// Energy density of weight change (~7700 kcal/kg for mixed tissue)
		// Negative change = deficit, positive = surplus
		energyDelta := weeklyChange * 7700 / 7.0 // Daily energy from weight change
		
		// TDEE = Intake + Energy stored (or - Energy lost)
		calculatedTDEE := avgIntake - energyDelta
		
		// Blend with initial estimate based on data quantity
		// More data = more weight on calculated value
		confidence := math.Min(float64(n)/28.0, 0.9) // Max 90% after 28 days
		blendedTDEE := confidence*calculatedTDEE + (1-confidence)*initialEstimate
		
		return AdaptiveTDEE{
			EstimatedTDEE: blendedTDEE,
			Confidence:    confidence,
			DataPoints:    n,
			LastUpdated:   time.Now(),
		}
	}
	
	return AdaptiveTDEE{
		EstimatedTDEE: initialEstimate,
		Confidence:    float64(n) / 14.0,
		DataPoints:    n,
		LastUpdated:   time.Now(),
	}
}

// =============================================================================
// HELPER: Estimate deficit severity for protein calculations
// =============================================================================

// EstimateDeficitSeverity calculates how aggressive the current deficit is
// Returns 0.0 for maintenance, up to ~0.4 for very aggressive cuts
func EstimateDeficitSeverity(targetCalories, estimatedTDEE float64) float64 {
	if estimatedTDEE <= 0 {
		return 0
	}
	deficit := estimatedTDEE - targetCalories
	if deficit <= 0 {
		return 0
	}
	return deficit / estimatedTDEE
}

// =============================================================================
// NEW FIELDS NEEDED IN UserProfile
// =============================================================================
/*
Add these fields to UserProfile struct:

	BMREquation     BMREquation // Which equation to use for BMR
	BodyFatPercent  float64     // For Katch-McArdle equation (0 if unknown)
	
Add this field to DailyTargets struct:

	EstimatedTDEE   int         // The estimated TDEE before goal adjustments
*/
