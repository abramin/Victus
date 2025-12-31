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
	BMREquationMifflinStJeor  BMREquation = "mifflin_st_jeor"  // Default, best for general population
	BMREquationKatchMcArdle   BMREquation = "katch_mcardle"    // Best if body fat % is known
	BMREquationOxfordHenry    BMREquation = "oxford_henry"     // Large sample, good accuracy
	BMREquationHarrisBenedict BMREquation = "harris_benedict"  // Legacy, included for comparison
)

// ValidBMREquations contains all valid BMR equation values.
var ValidBMREquations = map[BMREquation]bool{
	BMREquationMifflinStJeor:  true,
	BMREquationKatchMcArdle:   true,
	BMREquationOxfordHenry:    true,
	BMREquationHarrisBenedict: true,
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

// PlannedTraining represents the training plan for the day.
type PlannedTraining struct {
	Type               TrainingType
	PlannedDurationMin int
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
