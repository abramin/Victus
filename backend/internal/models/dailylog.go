package models

import (
	"errors"
	"regexp"
	"time"
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

// SleepQuality represents sleep quality score (1-100).
type SleepQuality int

// PlannedTraining represents the training plan for the day.
type PlannedTraining struct {
	Type               TrainingType `json:"type"`
	PlannedDurationMin int          `json:"plannedDurationMin"`
}

// MacroPoints represents macro points for a meal.
type MacroPoints struct {
	Carbs   int `json:"carbs"`
	Protein int `json:"protein"`
	Fats    int `json:"fats"`
}

// MealTargets represents macro points for all meals.
type MealTargets struct {
	Breakfast MacroPoints `json:"breakfast"`
	Lunch     MacroPoints `json:"lunch"`
	Dinner    MacroPoints `json:"dinner"`
}

// DailyTargets represents the calculated macro targets for the day.
type DailyTargets struct {
	TotalCarbsG   int         `json:"totalCarbsG"`
	TotalProteinG int         `json:"totalProteinG"`
	TotalFatsG    int         `json:"totalFatsG"`
	TotalCalories int         `json:"totalCalories"`
	Meals         MealTargets `json:"meals"`
	FruitG        int         `json:"fruitG"`
	VeggiesG      int         `json:"veggiesG"`
	WaterL        float64     `json:"waterL"`
	DayType       DayType     `json:"dayType"`
}

// DailyLog represents a daily log entry.
type DailyLog struct {
	Date              string          `json:"date"` // YYYY-MM-DD format
	WeightKg          float64         `json:"weightKg"`
	BodyFatPercent    *float64        `json:"bodyFatPercent,omitempty"`
	RestingHeartRate  *int            `json:"restingHeartRate,omitempty"`
	SleepQuality      SleepQuality    `json:"sleepQuality"`
	SleepHours        *float64        `json:"sleepHours,omitempty"`
	PlannedTraining   PlannedTraining `json:"plannedTraining"`
	DayType           DayType         `json:"dayType"`
	CalculatedTargets DailyTargets    `json:"calculatedTargets,omitempty"`
	EstimatedTDEE     int             `json:"estimatedTDEE,omitempty"`
	CreatedAt         time.Time       `json:"createdAt,omitempty"`
	UpdatedAt         time.Time       `json:"updatedAt,omitempty"`
}

// Validation errors for DailyLog
var (
	ErrInvalidDate             = errors.New("date must be in YYYY-MM-DD format")
	ErrInvalidWeight           = errors.New("weight must be between 30 and 300 kg")
	ErrInvalidBodyFat          = errors.New("body fat must be between 3 and 70%")
	ErrInvalidHeartRate        = errors.New("resting heart rate must be between 30 and 200 bpm")
	ErrInvalidSleepQuality     = errors.New("sleep quality must be between 1 and 100")
	ErrInvalidSleepHours       = errors.New("sleep hours must be between 0 and 24")
	ErrInvalidTrainingType     = errors.New("invalid training type")
	ErrInvalidTrainingDuration = errors.New("training duration must be between 0 and 480 minutes")
	ErrInvalidDayType          = errors.New("invalid day type")
)

// dateRegex matches YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// Validate checks all DailyLog fields for validity.
// Returns nil if valid, or the first validation error encountered.
func (d *DailyLog) Validate() error {
	// Date format validation
	if !dateRegex.MatchString(d.Date) {
		return ErrInvalidDate
	}
	// Also validate the date is parseable
	if _, err := time.Parse("2006-01-02", d.Date); err != nil {
		return ErrInvalidDate
	}

	// Weight validation
	if d.WeightKg < 30 || d.WeightKg > 300 {
		return ErrInvalidWeight
	}

	// Body fat validation (optional)
	if d.BodyFatPercent != nil {
		if *d.BodyFatPercent < 3 || *d.BodyFatPercent > 70 {
			return ErrInvalidBodyFat
		}
	}

	// Resting heart rate validation (optional)
	if d.RestingHeartRate != nil {
		if *d.RestingHeartRate < 30 || *d.RestingHeartRate > 200 {
			return ErrInvalidHeartRate
		}
	}

	// Sleep quality validation
	if d.SleepQuality < 1 || d.SleepQuality > 100 {
		return ErrInvalidSleepQuality
	}

	// Sleep hours validation (optional)
	if d.SleepHours != nil {
		if *d.SleepHours < 0 || *d.SleepHours > 24 {
			return ErrInvalidSleepHours
		}
	}

	// Training type validation
	if !ValidTrainingTypes[d.PlannedTraining.Type] {
		return ErrInvalidTrainingType
	}

	// Training duration validation
	if d.PlannedTraining.PlannedDurationMin < 0 || d.PlannedTraining.PlannedDurationMin > 480 {
		return ErrInvalidTrainingDuration
	}

	// Day type validation
	if !ValidDayTypes[d.DayType] {
		return ErrInvalidDayType
	}

	return nil
}

// SetDefaults applies default values to unset fields.
func (d *DailyLog) SetDefaults() {
	// Default date to today if empty
	if d.Date == "" {
		d.Date = time.Now().Format("2006-01-02")
	}

	// Default sleep quality to 50 (middle) if 0
	if d.SleepQuality == 0 {
		d.SleepQuality = 50
	}

	// Default training type to rest if empty
	if d.PlannedTraining.Type == "" {
		d.PlannedTraining.Type = TrainingTypeRest
	}

	// If training type is rest, duration should be 0
	if d.PlannedTraining.Type == TrainingTypeRest {
		d.PlannedTraining.PlannedDurationMin = 0
	}

	// Default day type to fatburner if empty
	if d.DayType == "" {
		d.DayType = DayTypeFatburner
	}
}
