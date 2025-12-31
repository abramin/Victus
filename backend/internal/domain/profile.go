package domain

import (
	"math"
	"time"
)

// UserProfile represents the user's configuration for macro calculations.
type UserProfile struct {
	HeightCM             float64
	BirthDate            time.Time
	Sex                  Sex
	Goal                 Goal
	TargetWeightKg       float64
	TargetWeeklyChangeKg float64
	CarbRatio            float64
	ProteinRatio         float64
	FatRatio             float64
	MealRatios           MealRatios
	PointsConfig         PointsConfig
	FruitTargetG         float64
	VeggieTargetG        float64
	BMREquation          BMREquation // Which BMR equation to use (default: mifflin_st_jeor)
	BodyFatPercent       float64     // For Katch-McArdle equation (0 if unknown)
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// NewUserProfile creates a new UserProfile with the given required fields.
// It applies defaults and validates the profile.
// Returns an error if validation fails.
func NewUserProfile(
	heightCM float64,
	birthDate time.Time,
	sex Sex,
	goal Goal,
	targetWeightKg float64,
	targetWeeklyChangeKg float64,
	now time.Time,
) (*UserProfile, error) {
	p := &UserProfile{
		HeightCM:             heightCM,
		BirthDate:            birthDate,
		Sex:                  sex,
		Goal:                 goal,
		TargetWeightKg:       targetWeightKg,
		TargetWeeklyChangeKg: targetWeeklyChangeKg,
	}
	p.SetDefaults()
	if err := p.ValidateAt(now); err != nil {
		return nil, err
	}
	return p, nil
}

// Validate checks all profile fields for validity using current time.
// Returns nil if valid, or the first validation error encountered.
func (p *UserProfile) Validate() error {
	return p.ValidateAt(time.Now())
}

// ValidateAt checks all profile fields for validity at a given point in time.
// Returns nil if valid, or the first validation error encountered.
func (p *UserProfile) ValidateAt(now time.Time) error {
	// Height validation
	if p.HeightCM < 100 || p.HeightCM > 250 {
		return ErrInvalidHeight
	}

	// Birth date validation (must be at least 13 years old)
	minAge := now.AddDate(-13, 0, 0)
	if p.BirthDate.After(minAge) || p.BirthDate.After(now) {
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

	// BMR equation validation (empty is allowed, defaults to mifflin_st_jeor)
	if p.BMREquation != "" && !ValidBMREquations[p.BMREquation] {
		return ErrInvalidBMREquation
	}

	// Body fat percent validation (0 means not provided, otherwise must be 3-70%)
	if p.BodyFatPercent != 0 && (p.BodyFatPercent < 3 || p.BodyFatPercent > 70) {
		return ErrInvalidBodyFatPercent
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

	if p.BMREquation == "" {
		p.BMREquation = BMREquationMifflinStJeor
	}
}
