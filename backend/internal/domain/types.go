package domain

// Sex represents biological sex for TDEE calculations.
type Sex string

const (
	SexMale   Sex = "male"
	SexFemale Sex = "female"
)

// ValidSexValues contains all valid sex values.
var ValidSexValues = map[Sex]bool{
	SexMale:   true,
	SexFemale: true,
}

// ParseSex safely converts a string to Sex with validation.
// Returns ErrInvalidSex if the string is not a valid sex value.
func ParseSex(s string) (Sex, error) {
	sex := Sex(s)
	if !ValidSexValues[sex] {
		return "", ErrInvalidSex
	}
	return sex, nil
}

// Goal represents the user's fitness goal.
type Goal string

const (
	GoalLoseWeight Goal = "lose_weight"
	GoalMaintain   Goal = "maintain"
	GoalGainWeight Goal = "gain_weight"
)

// ValidGoals contains all valid goal values.
var ValidGoals = map[Goal]bool{
	GoalLoseWeight: true,
	GoalMaintain:   true,
	GoalGainWeight: true,
}

// ParseGoal safely converts a string to Goal with validation.
// Returns ErrInvalidGoal if the string is not a valid goal.
func ParseGoal(s string) (Goal, error) {
	g := Goal(s)
	if !ValidGoals[g] {
		return "", ErrInvalidGoal
	}
	return g, nil
}

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

// ParseTrainingType safely converts a string to TrainingType with validation.
// Returns ErrInvalidTrainingType if the string is not a valid training type.
func ParseTrainingType(s string) (TrainingType, error) {
	t := TrainingType(s)
	if !ValidTrainingTypes[t] {
		return "", ErrInvalidTrainingType
	}
	return t, nil
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

// ParseDayType safely converts a string to DayType with validation.
// Returns ErrInvalidDayType if the string is not a valid day type.
func ParseDayType(s string) (DayType, error) {
	d := DayType(s)
	if !ValidDayTypes[d] {
		return "", ErrInvalidDayType
	}
	return d, nil
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

// ParseBMREquation safely converts a string to BMREquation with validation.
// Returns ErrInvalidBMREquation if the string is not a valid BMR equation.
// Empty string is allowed and returns empty BMREquation (defaults will apply).
func ParseBMREquation(s string) (BMREquation, error) {
	if s == "" {
		return "", nil
	}
	e := BMREquation(s)
	if !ValidBMREquations[e] {
		return "", ErrInvalidBMREquation
	}
	return e, nil
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

// ParseTDEESource safely converts a string to TDEESource with validation.
// Returns ErrInvalidTDEESource if the string is not a valid TDEE source.
// Empty string is allowed and returns empty TDEESource (defaults will apply).
func ParseTDEESource(s string) (TDEESource, error) {
	if s == "" {
		return "", nil
	}
	t := TDEESource(s)
	if !ValidTDEESources[t] {
		return "", ErrInvalidTDEESource
	}
	return t, nil
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
	EstimatedTDEE int // Effective TDEE used for target calculations
	Meals         MealTargets
	FruitG        int
	VeggiesG      int
	WaterL        float64
	DayType       DayType
}

// DailyTargetsPoint represents calculated targets for a specific date.
type DailyTargetsPoint struct {
	Date                 string
	Targets              DailyTargets
	ActiveCaloriesBurned *int // User-entered active calories from wearable
}

// DailyTargetsPointWithSessions extends DailyTargetsPoint with training session data.
// Used for calendar views that need to correlate nutrition with training.
type DailyTargetsPointWithSessions struct {
	DailyTargetsPoint
	PlannedSessions []TrainingSession
	ActualSessions  []TrainingSession
}

// PlannedDayType represents a pre-planned day type for a future date.
// Used for weekly microcycle planning in the Cockpit Dashboard.
type PlannedDayType struct {
	ID      int64
	Date    string  // YYYY-MM-DD format
	DayType DayType // performance, fatburner, or metabolize
}

// FoodCategory represents the primary macro category of a food.
type FoodCategory string

const (
	FoodCategoryHighCarb    FoodCategory = "high_carb"
	FoodCategoryHighProtein FoodCategory = "high_protein"
	FoodCategoryHighFat     FoodCategory = "high_fat"
)

// ValidFoodCategories contains all valid food category values.
var ValidFoodCategories = map[FoodCategory]bool{
	FoodCategoryHighCarb:    true,
	FoodCategoryHighProtein: true,
	FoodCategoryHighFat:     true,
}

// FoodReference represents a food item in the reference table.
// Used for the Kitchen Cheat Sheet in the Cockpit Dashboard.
type FoodReference struct {
	ID              int64
	Category        FoodCategory
	FoodItem        string
	PlateMultiplier *float64 // Optional multiplier for plate portion
}
