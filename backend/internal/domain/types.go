package domain

// Sex represents biological sex for TDEE calculations.
type Sex string

const (
	SexMale   Sex = "male"
	SexFemale Sex = "female"
)

// Goal represents the user's fitness goal.
type Goal string

const (
	GoalLoseWeight Goal = "lose_weight"
	GoalMaintain   Goal = "maintain"
	GoalGainWeight Goal = "gain_weight"
)

// TrainingType represents the type of training activity.
type TrainingType string

const (
	TrainingTypeRest         TrainingType = "rest"
	TrainingTypeQigong       TrainingType = "qigong"
	TrainingTypeWalking      TrainingType = "walking"
	TrainingTypeGMB          TrainingType = "gmb"
	TrainingTypeRun          TrainingType = "run"
	TrainingTypeRow          TrainingType = "row"
	TrainingTypeCycle        TrainingType = "cycle"
	TrainingTypeHIIT         TrainingType = "hiit"
	TrainingTypeStrength     TrainingType = "strength"
	TrainingTypeCalisthenics TrainingType = "calisthenics"
	TrainingTypeMobility     TrainingType = "mobility"
	TrainingTypeMixed        TrainingType = "mixed"
)

// ValidTrainingTypes contains all valid training type values.
var ValidTrainingTypes = map[TrainingType]bool{
	TrainingTypeRest:         true,
	TrainingTypeQigong:       true,
	TrainingTypeWalking:      true,
	TrainingTypeGMB:          true,
	TrainingTypeRun:          true,
	TrainingTypeRow:          true,
	TrainingTypeCycle:        true,
	TrainingTypeHIIT:         true,
	TrainingTypeStrength:     true,
	TrainingTypeCalisthenics: true,
	TrainingTypeMobility:     true,
	TrainingTypeMixed:        true,
}

// DayType represents the macro strategy for the day.
type DayType string

const (
	DayTypePerformance DayType = "performance"
	DayTypeFatburner   DayType = "fatburner"
	DayTypeMetabolize  DayType = "metabolize"
)

// ValidDayTypes contains all valid day type values.
var ValidDayTypes = map[DayType]bool{
	DayTypePerformance: true,
	DayTypeFatburner:   true,
	DayTypeMetabolize:  true,
}

// BMREquation represents available BMR calculation methods.
type BMREquation string

const (
	BMREquationMifflinStJeor  BMREquation = "mifflin_st_jeor" // Default, best for general population
	BMREquationKatchMcArdle   BMREquation = "katch_mcardle"   // Best if body fat % is known
	BMREquationOxfordHenry    BMREquation = "oxford_henry"    // Large sample, good accuracy
	BMREquationHarrisBenedict BMREquation = "harris_benedict" // Legacy, included for comparison
)

// ValidBMREquations contains all valid BMR equation values.
var ValidBMREquations = map[BMREquation]bool{
	BMREquationMifflinStJeor:  true,
	BMREquationKatchMcArdle:   true,
	BMREquationOxfordHenry:    true,
	BMREquationHarrisBenedict: true,
}

// TDEESource represents the source of TDEE estimation.
type TDEESource string

const (
	TDEESourceFormula  TDEESource = "formula"  // Use BMR × activity factor
	TDEESourceManual   TDEESource = "manual"   // User-provided from wearables
	TDEESourceAdaptive TDEESource = "adaptive" // Calculated from weight/intake history
)

// ValidTDEESources contains all valid TDEE source values.
var ValidTDEESources = map[TDEESource]bool{
	TDEESourceFormula:  true,
	TDEESourceManual:   true,
	TDEESourceAdaptive: true,
}

// SleepQuality represents sleep quality score (1-100).
type SleepQuality int

// MealRatios represents the distribution of daily macros across meals.
type MealRatios struct {
	Breakfast float64
	Lunch     float64
	Dinner    float64
}

// PointsConfig holds the multipliers for converting grams to points.
type PointsConfig struct {
	CarbMultiplier    float64
	ProteinMultiplier float64
	FatMultiplier     float64
}

// SupplementConfig holds the daily supplement intake for points calculation.
// Fixed contribution assumptions from the spreadsheet:
// - Maltodextrin: 96% carbs (intra-workout)
// - Whey: 88% protein
// - Collagen: 90% protein
type SupplementConfig struct {
	MaltodextrinG float64 // Intra-workout carb supplement (grams)
	WheyG         float64 // Whey protein powder (grams)
	CollagenG     float64 // Collagen peptides (grams)
}

// PlannedTraining represents the training plan for the day.
// Deprecated: Use TrainingSession slice instead for multi-session support.
type PlannedTraining struct {
	Type               TrainingType
	PlannedDurationMin int
}

// TrainingSession represents a single training session within a day.
// A day can have multiple sessions (e.g., morning Qigong + afternoon strength).
type TrainingSession struct {
	ID                 int64        // Database ID (0 for new sessions)
	SessionOrder       int          // 1-based order within the day
	IsPlanned          bool         // true for planned, false for actual
	Type               TrainingType // Type of training activity
	DurationMin        int          // Duration in minutes
	PerceivedIntensity *int         // Optional RPE 1-10
	Notes              string       // Optional notes
}

// TrainingTypeConfig represents the database-stored configuration for a training type.
// MET (Metabolic Equivalent of Task) values are from the 2024 Compendium of Physical Activities.
// Used for load calculations and TDEE refinement.
type TrainingTypeConfig struct {
	Type      TrainingType
	MET       float64 // Metabolic Equivalent of Task for calorie calculations
	LoadScore float64
}

// MacroPoints represents macro points for a meal.
type MacroPoints struct {
	Carbs   int
	Protein int
	Fats    int
}

// MealTargets represents macro points for all meals.
type MealTargets struct {
	Breakfast MacroPoints
	Lunch     MacroPoints
	Dinner    MacroPoints
}

// DailyTargets represents the calculated macro targets for the day.
type DailyTargets struct {
	TotalCarbsG   int
	TotalProteinG int
	TotalFatsG    int
	TotalCalories int
	EstimatedTDEE int // Pre-adjustment TDEE for adaptive tracking
	Meals         MealTargets
	FruitG        int
	VeggiesG      int
	WaterL        float64
	DayType       DayType
}
