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

// WeeklyDayPattern defines the day type cycling pattern for a week.
// Days are numbered 1-7 where 1=Monday, 7=Sunday.
type WeeklyDayPattern struct {
	Day1 DayType // Monday
	Day2 DayType // Tuesday
	Day3 DayType // Wednesday
	Day4 DayType // Thursday
	Day5 DayType // Friday
	Day6 DayType // Saturday
	Day7 DayType // Sunday
}

// DefaultWeeklyPattern provides a standard high/low cycling pattern.
// Based on sample data: Days 1,4 = Performance, Days 2,3,5,6 = Fatburner, Day 7 = Metabolize.
var DefaultWeeklyPattern = WeeklyDayPattern{
	Day1: DayTypePerformance, // Monday - high
	Day2: DayTypeFatburner,   // Tuesday - low
	Day3: DayTypeFatburner,   // Wednesday - low
	Day4: DayTypePerformance, // Thursday - high
	Day5: DayTypeFatburner,   // Friday - low
	Day6: DayTypeFatburner,   // Saturday - low
	Day7: DayTypeMetabolize,  // Sunday - refeed
}

// GetDayType returns the day type for a given day number (1-7, Monday=1).
func (w WeeklyDayPattern) GetDayType(dayNum int) DayType {
	switch dayNum {
	case 1:
		return w.Day1
	case 2:
		return w.Day2
	case 3:
		return w.Day3
	case 4:
		return w.Day4
	case 5:
		return w.Day5
	case 6:
		return w.Day6
	case 7:
		return w.Day7
	default:
		return DayTypeFatburner // Default fallback
	}
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

// CNSStatus represents the Central Nervous System status based on HRV deviation.
type CNSStatus string

const (
	CNSStatusOptimized CNSStatus = "optimized" // > -10% deviation from baseline
	CNSStatusStrained  CNSStatus = "strained"  // -10% to -20% deviation
	CNSStatusDepleted  CNSStatus = "depleted"  // < -20% deviation (triggers override)
)

// ValidCNSStatuses contains all valid CNS status values.
var ValidCNSStatuses = map[CNSStatus]bool{
	CNSStatusOptimized: true,
	CNSStatusStrained:  true,
	CNSStatusDepleted:  true,
}

// FastingProtocol represents the intermittent fasting protocol.
type FastingProtocol string

const (
	FastingProtocolStandard FastingProtocol = "standard" // Normal 3-meal eating pattern
	FastingProtocol168      FastingProtocol = "16_8"     // 16:8 Leangains (skip breakfast)
	FastingProtocol204      FastingProtocol = "20_4"     // 20:4 Warrior (skip breakfast + lunch)
)

// ValidFastingProtocols contains all valid fasting protocol values.
var ValidFastingProtocols = map[FastingProtocol]bool{
	FastingProtocolStandard: true,
	FastingProtocol168:      true,
	FastingProtocol204:      true,
}

// ParseFastingProtocol safely converts a string to FastingProtocol with validation.
// Returns ErrInvalidFastingProtocol if the string is not a valid protocol.
// Empty string is allowed and returns empty FastingProtocol (defaults will apply).
func ParseFastingProtocol(s string) (FastingProtocol, error) {
	if s == "" {
		return "", nil
	}
	p := FastingProtocol(s)
	if !ValidFastingProtocols[p] {
		return "", ErrInvalidFastingProtocol
	}
	return p, nil
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
	ID                 int64                 // Database ID (0 for new sessions)
	SessionOrder       int                   // 1-based order within the day
	IsPlanned          bool                  // true for planned, false for actual
	IsDraft            bool                  // true for quick-submitted sessions pending echo enrichment
	Type               TrainingType          // Type of training activity
	DurationMin        int                   // Duration in minutes
	PerceivedIntensity *int                  // Optional RPE 1-10
	Notes              string                // Optional notes
	RawEchoLog         *string               // Raw natural language echo text from user
	ExtraMetadata      *SessionExtraMetadata // Parsed echo metadata (achievements, RPE offset, etc.)
}

// SessionExtraMetadata holds parsed data from an echo log.
// Stored as JSONB in the database.
type SessionExtraMetadata struct {
	Achievements  []string `json:"achievements,omitempty"`  // Specific PRs or accomplishments
	RPEOffset     int      `json:"rpe_offset,omitempty"`    // Adjustment to initial RPE (-3 to +3)
	EchoProcessed bool     `json:"echo_processed"`          // Whether echo was successfully parsed
	EchoModel     string   `json:"echo_model,omitempty"`    // LLM model used for parsing
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

// ScheduledSession represents a training session scheduled via the Workout Planner.
// Unlike TrainingSession which is tied to a DailyLog, ScheduledSession exists
// independently and is used to pre-populate training when the day arrives.
// This is part of the WorkoutSchedule aggregate (keyed by date).
type ScheduledSession struct {
	ID           int64
	Date         string       // YYYY-MM-DD format
	SessionOrder int          // 1-based order within the day
	TrainingType TrainingType // Type of training activity
	DurationMin  int          // Duration in minutes
	LoadScore    float64      // Planned load score (1-5)
	RPE          *int         // Optional planned RPE 1-10
	Notes        string       // Optional notes
}

// ScheduledSessionInput contains the fields to create a scheduled session.
type ScheduledSessionInput struct {
	TrainingType string  `json:"trainingType"`
	DurationMin  int     `json:"durationMin"`
	LoadScore    float64 `json:"loadScore"`
	RPE          *int    `json:"rpe,omitempty"`
	Notes        string  `json:"notes,omitempty"`
}

// NewScheduledSession creates a ScheduledSession from input with validation.
func NewScheduledSession(date string, order int, input ScheduledSessionInput) (*ScheduledSession, error) {
	trainingType, err := ParseTrainingType(input.TrainingType)
	if err != nil {
		return nil, err
	}

	if input.DurationMin < 0 || input.DurationMin > 480 {
		return nil, ErrInvalidTrainingDuration
	}

	if input.LoadScore == 0 {
		input.LoadScore = 3.0
	}
	if input.LoadScore < 1 || input.LoadScore > 5 {
		return nil, ErrInvalidProgramDayLoadScore
	}

	if input.RPE != nil && (*input.RPE < 1 || *input.RPE > 10) {
		return nil, ErrInvalidPerceivedIntensity
	}

	return &ScheduledSession{
		Date:         date,
		SessionOrder: order,
		TrainingType: trainingType,
		DurationMin:  input.DurationMin,
		LoadScore:    input.LoadScore,
		RPE:          input.RPE,
		Notes:        input.Notes,
	}, nil
}

// FoodCategory represents the primary macro category of a food.
type FoodCategory string

const (
	FoodCategoryHighCarb    FoodCategory = "high_carb"
	FoodCategoryHighProtein FoodCategory = "high_protein"
	FoodCategoryHighFat     FoodCategory = "high_fat"
	FoodCategoryVeg         FoodCategory = "veg"
	FoodCategoryFruit       FoodCategory = "fruit"
)

// ValidFoodCategories contains all valid food category values.
var ValidFoodCategories = map[FoodCategory]bool{
	FoodCategoryHighCarb:    true,
	FoodCategoryHighProtein: true,
	FoodCategoryHighFat:     true,
	FoodCategoryVeg:         true,
	FoodCategoryFruit:       true,
}

// FoodReference represents a food item in the reference table.
// Used for the Kitchen Cheat Sheet in the Cockpit Dashboard.
type FoodReference struct {
	ID              int64
	Category        FoodCategory
	FoodItem        string
	PlateMultiplier *float64 // Optional multiplier for plate portion
}

// FoodNutrition extends FoodReference with nutritional data for the Macro Tetris Solver.
// Contains complete per-100g macro information required for solver calculations.
type FoodNutrition struct {
	ID             int64
	Category       FoodCategory
	FoodItem       string
	ProteinGPer100 float64 // Protein grams per 100g
	CarbsGPer100   float64 // Carbs grams per 100g
	FatGPer100     float64 // Fat grams per 100g
	ServingUnit    string  // Display unit: "g", "large", "tbsp", "slice", etc.
	ServingSizeG   float64 // Standard serving size in grams
	IsPantryStaple bool    // Whether this is a common pantry staple
}

// MacroBudget represents remaining or target macros for the solver.
type MacroBudget struct {
	ProteinG     float64
	CarbsG       float64
	FatG         float64
	CaloriesKcal int
}

// SolverIngredient represents a food with a specific amount in a solution.
type SolverIngredient struct {
	Food    FoodNutrition
	AmountG float64 // Amount in grams
	Display string  // Human-readable display: "1 Large Egg" or "120g"
}

// SolverSolution represents a combination of foods that fills the macro budget.
type SolverSolution struct {
	Ingredients []SolverIngredient
	TotalMacros MacroBudget         // Actual macros provided by this solution
	MatchScore  float64             // 0-100 where 100 is perfect match
	RecipeName  string              // Generated or fallback name
	WhyText     string              // Explanation of why this combo works
	Refinement  *SemanticRefinement // AI-enhanced recipe presentation (nil if not refined)
}

// SolverRequest contains input parameters for the macro solver.
type SolverRequest struct {
	RemainingBudget  MacroBudget
	MaxIngredients   int             // Maximum ingredients per solution (default 3)
	TolerancePercent float64         // Acceptable deviation from target (default 0.10)
	PantryFoods      []FoodNutrition // Available foods to choose from
}

// SolverResponse contains the solver output.
type SolverResponse struct {
	Solutions []SolverSolution // 1-3 solutions ranked by match score
	Computed  bool             // True if solver ran successfully
}

// SemanticRefinement contains AI-enhanced recipe presentation from the Ollama semantic refiner.
// Used to transform raw solver output into tactical, edible recipes with preparation instructions.
type SemanticRefinement struct {
	MissionTitle      string  // Creative tactical name (e.g., "WHEY CHIA SLUDGE // MK-1")
	TacticalPrep      string  // Operational steps with specific mechanical instructions
	AbsurdityAlert    *string // Logistic alert WITH FIX (nil if no concerns)
	FlavorPatch       *string // Zero-calorie additives to improve palatability (nil if not needed)
	ContextualInsight string  // "Why this works" based on training context
	GeneratedByLLM    bool    // True if generated by Ollama, false if fallback
	Model             string  // Model used (e.g., "llama3.2")
}

// TrainingContextForSolver provides training context to the semantic refiner.
// Used to generate contextual insights about why a meal works for the day's training.
type TrainingContextForSolver struct {
	DayType         DayType           // performance, fatburner, or metabolize
	PlannedSessions []TrainingSession // Planned training sessions for the day
	MealTime        string            // "breakfast", "lunch", "dinner", or "snack"
}

// AbsurdityWarning represents a logistic alert for excessive ingredient amounts.
// Detected by pure domain logic before being styled by Ollama.
type AbsurdityWarning struct {
	Code        string // Alert code: "SINGLE_LARGE", "HIGH_FIBER", "HIGH_FAT", "HIGH_PROTEIN"
	Description string // Human-readable description of the concern
	Ingredient  string // Which ingredient triggered the warning (optional)
}
