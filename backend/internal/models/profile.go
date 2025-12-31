package models

import (
	"errors"
	"math"
	"time"
)

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

// MealRatios represents the distribution of daily macros across meals.
type MealRatios struct {
	Breakfast float64 `json:"breakfast"`
	Lunch     float64 `json:"lunch"`
	Dinner    float64 `json:"dinner"`
}

// PointsConfig holds the multipliers for converting grams to points.
type PointsConfig struct {
	CarbMultiplier    float64 `json:"carbMultiplier"`
	ProteinMultiplier float64 `json:"proteinMultiplier"`
	FatMultiplier     float64 `json:"fatMultiplier"`
}

// UserProfile represents the user's configuration for macro calculations.
type UserProfile struct {
	HeightCM             float64      `json:"height_cm"`
	BirthDate            time.Time    `json:"birthDate"`
	Sex                  Sex          `json:"sex"`
	Goal                 Goal         `json:"goal"`
	TargetWeightKg       float64      `json:"targetWeightKg"`
	TargetWeeklyChangeKg float64      `json:"targetWeeklyChangeKg"`
	CarbRatio            float64      `json:"carbRatio"`
	ProteinRatio         float64      `json:"proteinRatio"`
	FatRatio             float64      `json:"fatRatio"`
	MealRatios           MealRatios   `json:"mealRatios"`
	PointsConfig         PointsConfig `json:"pointsConfig"`
	FruitTargetG         float64      `json:"fruitTargetG"`
	VeggieTargetG        float64      `json:"veggieTargetG"`
	CreatedAt            time.Time    `json:"createdAt,omitempty"`
	UpdatedAt            time.Time    `json:"updatedAt,omitempty"`
}

// Validation errors
var (
	ErrInvalidHeight           = errors.New("height must be between 100 and 250 cm")
	ErrInvalidBirthDate        = errors.New("birth date must be in the past and user must be at least 13 years old")
	ErrInvalidSex              = errors.New("sex must be 'male' or 'female'")
	ErrInvalidGoal             = errors.New("goal must be 'lose_weight', 'maintain', or 'gain_weight'")
	ErrInvalidTargetWeight     = errors.New("target weight must be between 30 and 300 kg")
	ErrInvalidWeeklyChange     = errors.New("weekly change must be between -1.0 and 1.0 kg")
	ErrMacroRatiosNotSum100    = errors.New("carb, protein, and fat ratios must sum to 100%")
	ErrMealRatiosNotSum100     = errors.New("breakfast, lunch, and dinner ratios must sum to 100%")
	ErrInvalidRatio            = errors.New("ratios must be between 0 and 1")
	ErrInvalidFruitTarget      = errors.New("fruit target must be between 0 and 2000 g")
	ErrInvalidVeggieTarget     = errors.New("veggie target must be between 0 and 2000 g")
	ErrInvalidPointsMultiplier = errors.New("points multipliers must be positive")
)

// Validate checks all profile fields for validity.
// Returns nil if valid, or the first validation error encountered.
func (p *UserProfile) Validate() error {
	// Height validation
	if p.HeightCM < 100 || p.HeightCM > 250 {
		return ErrInvalidHeight
	}

	// Birth date validation (must be at least 13 years old)
	minAge := time.Now().AddDate(-13, 0, 0)
	if p.BirthDate.After(minAge) || p.BirthDate.After(time.Now()) {
		return ErrInvalidBirthDate
	}

	// Sex validation
	if p.Sex != SexMale && p.Sex != SexFemale {
		return ErrInvalidSex
	}

	// Goal validation
	if p.Goal != GoalLoseWeight && p.Goal != GoalMaintain && p.Goal != GoalGainWeight {
		return ErrInvalidGoal
	}

	// Target weight validation
	if p.TargetWeightKg < 30 || p.TargetWeightKg > 300 {
		return ErrInvalidTargetWeight
	}

	// Weekly change validation
	if p.TargetWeeklyChangeKg < -1.0 || p.TargetWeeklyChangeKg > 1.0 {
		return ErrInvalidWeeklyChange
	}

	// Macro ratio validation
	if p.CarbRatio < 0 || p.CarbRatio > 1 ||
		p.ProteinRatio < 0 || p.ProteinRatio > 1 ||
		p.FatRatio < 0 || p.FatRatio > 1 {
		return ErrInvalidRatio
	}
	if !floatEquals(p.CarbRatio+p.ProteinRatio+p.FatRatio, 1.0, 0.01) {
		return ErrMacroRatiosNotSum100
	}

	// Meal ratio validation
	if p.MealRatios.Breakfast < 0 || p.MealRatios.Breakfast > 1 ||
		p.MealRatios.Lunch < 0 || p.MealRatios.Lunch > 1 ||
		p.MealRatios.Dinner < 0 || p.MealRatios.Dinner > 1 {
		return ErrInvalidRatio
	}
	if !floatEquals(p.MealRatios.Breakfast+p.MealRatios.Lunch+p.MealRatios.Dinner, 1.0, 0.01) {
		return ErrMealRatiosNotSum100
	}

	// Points config validation
	if p.PointsConfig.CarbMultiplier <= 0 ||
		p.PointsConfig.ProteinMultiplier <= 0 ||
		p.PointsConfig.FatMultiplier <= 0 {
		return ErrInvalidPointsMultiplier
	}

	// Fruit/veggie target validation
	if p.FruitTargetG < 0 || p.FruitTargetG > 2000 {
		return ErrInvalidFruitTarget
	}
	if p.VeggieTargetG < 0 || p.VeggieTargetG > 2000 {
		return ErrInvalidVeggieTarget
	}

	return nil
}

// floatEquals compares two floats with tolerance
func floatEquals(a, b, tolerance float64) bool {
	return math.Abs(a-b) < tolerance
}

// SetDefaults applies default values to unset fields
func (p *UserProfile) SetDefaults() {
	if p.CarbRatio == 0 && p.ProteinRatio == 0 && p.FatRatio == 0 {
		p.CarbRatio = 0.45
		p.ProteinRatio = 0.30
		p.FatRatio = 0.25
	}

	if p.MealRatios.Breakfast == 0 && p.MealRatios.Lunch == 0 && p.MealRatios.Dinner == 0 {
		p.MealRatios.Breakfast = 0.30
		p.MealRatios.Lunch = 0.30
		p.MealRatios.Dinner = 0.40
	}

	if p.PointsConfig.CarbMultiplier == 0 {
		p.PointsConfig.CarbMultiplier = 1.15
	}
	if p.PointsConfig.ProteinMultiplier == 0 {
		p.PointsConfig.ProteinMultiplier = 4.35
	}
	if p.PointsConfig.FatMultiplier == 0 {
		p.PointsConfig.FatMultiplier = 3.5
	}

	if p.FruitTargetG == 0 {
		p.FruitTargetG = 600
	}
	if p.VeggieTargetG == 0 {
		p.VeggieTargetG = 500
	}
}
