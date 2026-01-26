package domain

// =============================================================================
// CALORIC ADJUSTMENT CONSTANTS
// =============================================================================

const (
	// MaxDeficitPercent is the maximum percentage caloric deficit allowed (20%).
	// Beyond this, metabolic adaptation and muscle loss become significant concerns.
	MaxDeficitPercent = 0.20

	// MaxDeficitKcal is the maximum absolute caloric deficit in kcal/day (750 kcal).
	// Used to cap aggressive deficits for heavier individuals.
	MaxDeficitKcal = 750.0

	// MaxSurplusPercent is the maximum percentage caloric surplus for lean gains (10%).
	MaxSurplusPercent = 0.10

	// MaxSurplusKcal is the maximum absolute caloric surplus in kcal/day (500 kcal).
	MaxSurplusKcal = 500.0
)

// =============================================================================
// ACTIVITY & METABOLISM CONSTANTS
// =============================================================================

const (
	// NEATMultiplier is the sedentary activity factor for TDEE calculation.
	// Represents Non-Exercise Activity Thermogenesis for sedentary lifestyle.
	NEATMultiplier = 1.2

	// WaterLPerKg is the water intake target in liters per kg of body weight.
	WaterLPerKg = 0.04
)

// =============================================================================
// MACRONUTRIENT CONSTANTS
// =============================================================================

const (
	// FatMinimumGPerKg is the minimum fat intake in grams per kg of body weight.
	// Essential for hormone production and fatty acid absorption. (0.7 g/kg floor)
	FatMinimumGPerKg = 0.7

	// FatCaloriesPercent is the target percentage of remaining calories for fat.
	// After protein allocation, 35% of remaining calories go to fat.
	FatCaloriesPercent = 0.35

	// CaloriesPerGramCarb is the energy density of carbohydrates.
	CaloriesPerGramCarb = 4.0

	// CaloriesPerGramProtein is the energy density of protein.
	CaloriesPerGramProtein = 4.0

	// CaloriesPerGramFat is the energy density of fat.
	CaloriesPerGramFat = 9.0
)

// =============================================================================
// BIOLOGICAL GUARDRAIL CONSTANTS
// =============================================================================

const (
	// MinFatGPerKg is the absolute minimum fat intake for hormonal health.
	// Below this, testosterone/estrogen synthesis is impaired.
	// Research: Volek 1997, Hamalainen 1984.
	MinFatGPerKg = 0.5

	// MinProteinGPerKg is the minimum protein intake for muscle preservation.
	// Below this, muscle protein synthesis is insufficient to prevent loss.
	// Research: Morton 2018, Phillips 2016.
	MinProteinGPerKg = 1.6

	// MaxProteinGPerKg is the upper limit where additional protein provides
	// diminishing returns. Research: Morton 2018 meta-analysis.
	MaxProteinGPerKg = 3.3

	// DefaultProteinGPerKg is the recommended starting protein target.
	DefaultProteinGPerKg = 2.0

	// DefaultFatGPerKg is the recommended starting fat target.
	DefaultFatGPerKg = 0.8

	// MinCarbsGPerformance is the minimum carb intake for training days.
	// Below this on training days impairs glycogen replenishment.
	MinCarbsGPerformance = 100.0
)

// =============================================================================
// PRODUCE CALCULATION CONSTANTS
// =============================================================================

const (
	// FruitCarbsPercentWeight is carbs as percentage of fruit weight (10g carbs per 100g fruit).
	FruitCarbsPercentWeight = 0.10

	// VeggieCarbsPercentWeight is carbs as percentage of veggie weight (3g carbs per 100g veggies).
	VeggieCarbsPercentWeight = 0.03

	// FruitMaxCarbPercent is the maximum percentage of total carbs from fruit (30%).
	FruitMaxCarbPercent = 0.30

	// VeggieMaxCarbPercent is the maximum percentage of total carbs from vegetables (10%).
	VeggieMaxCarbPercent = 0.10

	// FatburnerFruitReduction is the fruit reduction multiplier on fatburner days (30% reduction).
	FatburnerFruitReduction = 0.70
)

// =============================================================================
// SUPPLEMENT CONTRIBUTION CONSTANTS
// =============================================================================

const (
	// MaltodextrinCarbPercent is carbs as percentage of maltodextrin weight (96%).
	MaltodextrinCarbPercent = 0.96

	// WheyProteinPercent is protein as percentage of whey powder weight (88%).
	WheyProteinPercent = 0.88

	// CollagenProteinPercent is protein as percentage of collagen peptides weight (90%).
	CollagenProteinPercent = 0.90
)
