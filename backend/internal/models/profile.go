// Package models re-exports domain types for backward compatibility.
// New code should import from victus/internal/domain directly.
package models

import "victus/internal/domain"

// Type aliases for backward compatibility
type Sex = domain.Sex
type Goal = domain.Goal
type MealRatios = domain.MealRatios
type PointsConfig = domain.PointsConfig
type UserProfile = domain.UserProfile
type BMREquation = domain.BMREquation

// Re-export constants
const (
	SexMale   = domain.SexMale
	SexFemale = domain.SexFemale

	GoalLoseWeight = domain.GoalLoseWeight
	GoalMaintain   = domain.GoalMaintain
	GoalGainWeight = domain.GoalGainWeight

	BMREquationMifflinStJeor  = domain.BMREquationMifflinStJeor
	BMREquationKatchMcArdle   = domain.BMREquationKatchMcArdle
	BMREquationOxfordHenry    = domain.BMREquationOxfordHenry
	BMREquationHarrisBenedict = domain.BMREquationHarrisBenedict
)

// Re-export validation map
var ValidBMREquations = domain.ValidBMREquations

// Re-export errors
var (
	ErrInvalidHeight           = domain.ErrInvalidHeight
	ErrInvalidBirthDate        = domain.ErrInvalidBirthDate
	ErrInvalidSex              = domain.ErrInvalidSex
	ErrInvalidGoal             = domain.ErrInvalidGoal
	ErrInvalidTargetWeight     = domain.ErrInvalidTargetWeight
	ErrInvalidWeeklyChange     = domain.ErrInvalidWeeklyChange
	ErrMacroRatiosNotSum100    = domain.ErrMacroRatiosNotSum100
	ErrMealRatiosNotSum100     = domain.ErrMealRatiosNotSum100
	ErrInvalidRatio            = domain.ErrInvalidRatio
	ErrInvalidFruitTarget      = domain.ErrInvalidFruitTarget
	ErrInvalidVeggieTarget     = domain.ErrInvalidVeggieTarget
	ErrInvalidPointsMultiplier = domain.ErrInvalidPointsMultiplier
	ErrInvalidBMREquation      = domain.ErrInvalidBMREquation
	ErrInvalidBodyFatPercent   = domain.ErrInvalidBodyFatPercent
)

// Re-export constructor
var NewUserProfile = domain.NewUserProfile
