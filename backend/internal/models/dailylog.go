// Package models re-exports domain types for backward compatibility.
// New code should import from victus/internal/domain directly.
package models

import "victus/internal/domain"

// Type aliases for backward compatibility
type TrainingType = domain.TrainingType
type DayType = domain.DayType
type SleepQuality = domain.SleepQuality
type PlannedTraining = domain.PlannedTraining
type MacroPoints = domain.MacroPoints
type MealTargets = domain.MealTargets
type DailyTargets = domain.DailyTargets
type DailyLog = domain.DailyLog
type DailyLogBuilder = domain.DailyLogBuilder

// Re-export TrainingType constants
const (
	TrainingTypeRest         = domain.TrainingTypeRest
	TrainingTypeQigong       = domain.TrainingTypeQigong
	TrainingTypeWalking      = domain.TrainingTypeWalking
	TrainingTypeGMB          = domain.TrainingTypeGMB
	TrainingTypeRun          = domain.TrainingTypeRun
	TrainingTypeRow          = domain.TrainingTypeRow
	TrainingTypeCycle        = domain.TrainingTypeCycle
	TrainingTypeHIIT         = domain.TrainingTypeHIIT
	TrainingTypeStrength     = domain.TrainingTypeStrength
	TrainingTypeCalisthenics = domain.TrainingTypeCalisthenics
	TrainingTypeMobility     = domain.TrainingTypeMobility
	TrainingTypeMixed        = domain.TrainingTypeMixed
)

// Re-export DayType constants
const (
	DayTypePerformance = domain.DayTypePerformance
	DayTypeFatburner   = domain.DayTypeFatburner
	DayTypeMetabolize  = domain.DayTypeMetabolize
)

// Re-export validation maps
var (
	ValidTrainingTypes = domain.ValidTrainingTypes
	ValidDayTypes      = domain.ValidDayTypes
)

// Re-export errors
var (
	ErrInvalidDate             = domain.ErrInvalidDate
	ErrInvalidWeight           = domain.ErrInvalidWeight
	ErrInvalidBodyFat          = domain.ErrInvalidBodyFat
	ErrInvalidHeartRate        = domain.ErrInvalidHeartRate
	ErrInvalidSleepQuality     = domain.ErrInvalidSleepQuality
	ErrInvalidSleepHours       = domain.ErrInvalidSleepHours
	ErrInvalidTrainingType     = domain.ErrInvalidTrainingType
	ErrInvalidTrainingDuration = domain.ErrInvalidTrainingDuration
	ErrInvalidDayType          = domain.ErrInvalidDayType
)

// Re-export constructors
var (
	NewDailyLog        = domain.NewDailyLog
	NewDailyLogBuilder = domain.NewDailyLogBuilder
)
