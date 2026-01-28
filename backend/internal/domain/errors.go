package domain

import "errors"

// ValidationError represents a domain validation error.
// All validation errors wrap this type so they can be detected with IsValidationError.
type ValidationError struct {
	msg string
}

func (e *ValidationError) Error() string {
	return e.msg
}

// newValidationError creates a new validation error with the given message.
func newValidationError(msg string) error {
	return &ValidationError{msg: msg}
}

// IsValidationError returns true if the error is a domain validation error.
func IsValidationError(err error) bool {
	var ve *ValidationError
	return errors.As(err, &ve)
}

// Profile validation errors
var (
	ErrInvalidHeight                 = newValidationError("height must be between 100 and 250 cm")
	ErrInvalidBirthDate              = newValidationError("birth date must be in the past and user must be at least 13 years old")
	ErrInvalidSex                    = newValidationError("sex must be 'male' or 'female'")
	ErrInvalidGoal                   = newValidationError("goal must be 'lose_weight', 'maintain', or 'gain_weight'")
	ErrInvalidCurrentWeight          = newValidationError("current weight must be between 30 and 300 kg")
	ErrInvalidTargetWeight           = newValidationError("target weight must be between 30 and 300 kg")
	ErrInvalidTimeframeWeeks         = newValidationError("timeframe must be between 0 and 520 weeks (10 years)")
	ErrInvalidWeeklyChange           = newValidationError("weekly change must be between -2.0 and 2.0 kg")
	ErrMacroRatiosNotSum100          = newValidationError("carb, protein, and fat ratios must sum to 100%")
	ErrMealRatiosNotSum100           = newValidationError("breakfast, lunch, and dinner ratios must sum to 100%")
	ErrInvalidRatio                  = newValidationError("ratios must be between 0 and 1")
	ErrInvalidFruitTarget            = newValidationError("fruit target must be between 0 and 2000 g")
	ErrInvalidVeggieTarget           = newValidationError("veggie target must be between 0 and 2000 g")
	ErrInvalidPointsMultiplier       = newValidationError("points multipliers must be positive")
	ErrInvalidBMREquation            = newValidationError("invalid BMR equation")
	ErrInvalidBodyFatPercent         = newValidationError("body fat percent must be 0 or between 3 and 70%")
	ErrInvalidSupplement             = newValidationError("supplement amounts must be between 0 and 500 g")
	ErrInvalidTDEESource             = newValidationError("TDEE source must be 'formula', 'manual', or 'adaptive'")
	ErrInvalidManualTDEE             = newValidationError("manual TDEE must be between 800 and 10000 kcal when source is 'manual'")
	ErrInvalidRecalibrationTolerance = newValidationError("recalibration tolerance must be between 1 and 10%")
	ErrInvalidFastingProtocol        = newValidationError("fasting protocol must be 'standard', '16_8', or '20_4'")
	ErrInvalidEatingWindow           = newValidationError("eating window times must be in HH:MM format")
)

// DailyLog validation errors
var (
	ErrInvalidDate               = newValidationError("date must be in YYYY-MM-DD format")
	ErrInvalidWeight             = newValidationError("weight must be between 30 and 300 kg")
	ErrInvalidBodyFat            = newValidationError("body fat must be between 3 and 70%")
	ErrInvalidHeartRate          = newValidationError("resting heart rate must be between 30 and 200 bpm")
	ErrInvalidHRV                = newValidationError("HRV must be between 10 and 200 ms")
	ErrInvalidSleepQuality       = newValidationError("sleep quality must be between 1 and 100")
	ErrInvalidSleepHours         = newValidationError("sleep hours must be between 0 and 24")
	ErrInvalidTrainingType       = newValidationError("invalid training type")
	ErrInvalidTrainingDuration   = newValidationError("training duration must be between 0 and 480 minutes")
	ErrInvalidDayType            = newValidationError("invalid day type")
	ErrInvalidSessionOrder       = newValidationError("session order must be sequential starting at 1")
	ErrInvalidPerceivedIntensity = newValidationError("perceived intensity must be between 1 and 10")
	ErrTooManySessions           = newValidationError("maximum 10 training sessions allowed per day")
)

// NutritionPlan validation errors
var (
	ErrInvalidPlanStatus         = newValidationError("plan status must be 'active', 'completed', 'abandoned', or 'paused'")
	ErrInvalidPlanStartDate      = newValidationError("plan start date must be in YYYY-MM-DD format")
	ErrPlanStartDateTooOld       = newValidationError("plan start date cannot be more than 7 days in the past")
	ErrInvalidPlanStartWeight    = newValidationError("plan start weight must be between 30 and 300 kg")
	ErrInvalidPlanGoalWeight     = newValidationError("plan goal weight must be between 30 and 300 kg")
	ErrInvalidPlanDuration       = newValidationError("plan duration must be between 4 and 104 weeks")
	ErrPlanDeficitTooAggressive  = newValidationError("plan deficit exceeds safe limit of 750 kcal/day (~0.75 kg/week loss)")
	ErrPlanSurplusTooAggressive  = newValidationError("plan surplus exceeds safe limit of 500 kcal/day (~0.5 kg/week gain)")
	ErrActivePlanExists          = newValidationError("an active nutrition plan already exists")
	ErrPlanNotFound              = newValidationError("nutrition plan not found")
)

// Dual-Track Analysis errors
var (
	ErrPlanEnded              = newValidationError("plan has ended - current week exceeds plan duration")
	ErrPlanNotStarted         = newValidationError("plan has not started yet")
	ErrInsufficientWeightData = newValidationError("insufficient weight data for analysis - need at least 7 days of logs")
)

// Fatigue/Body Map errors
var (
	ErrInvalidMuscleGroup = newValidationError("invalid muscle group")
	ErrInvalidArchetype   = newValidationError("invalid workout archetype")
)

// Progression Pattern validation errors
var (
	ErrInvalidProgressionType  = newValidationError("progression type must be 'strength' or 'skill'")
	ErrInvalidStrengthConfig   = newValidationError("strength config: baseWeight > 0, incrementUnit in [0.5, 20.0], successThreshold in [0.5, 1.0], deloadFrequency in [1, 12]")
	ErrInvalidSkillConfig      = newValidationError("skill config: minSeconds > 0, maxSeconds > minSeconds, rpeTarget in [1.0, 10.0]")
	ErrProgressionTypeMismatch = newValidationError("progression type must match the provided config (strength or skill)")
)

// Training Program validation errors
var (
	ErrInvalidProgramDifficulty    = newValidationError("program difficulty must be 'beginner', 'intermediate', or 'advanced'")
	ErrInvalidProgramFocus         = newValidationError("program focus must be 'hypertrophy', 'strength', 'conditioning', or 'general'")
	ErrInvalidEquipmentType        = newValidationError("invalid equipment type")
	ErrInvalidProgramStatus        = newValidationError("program status must be 'template', 'draft', or 'published'")
	ErrInvalidInstallationStatus   = newValidationError("installation status must be 'active', 'completed', or 'abandoned'")
	ErrInvalidProgramName          = newValidationError("program name is required")
	ErrInvalidProgramDuration      = newValidationError("program duration must be between 1 and 52 weeks")
	ErrInvalidTrainingDaysPerWeek  = newValidationError("training days per week must be between 1 and 7")
	ErrInvalidWeekNumber           = newValidationError("week number must be at least 1")
	ErrInvalidVolumeScale          = newValidationError("volume scale must be between 0.3 and 2.0")
	ErrInvalidIntensityScale       = newValidationError("intensity scale must be between 0.3 and 2.0")
	ErrInvalidProgramDayNumber     = newValidationError("day number must be at least 1")
	ErrInvalidProgramDayLabel      = newValidationError("day label is required")
	ErrInvalidProgramDayDuration   = newValidationError("day duration must be between 15 and 180 minutes")
	ErrInvalidProgramDayLoadScore  = newValidationError("load score must be between 1 and 5")
	ErrInvalidInstallationStartDate = newValidationError("installation start date must be in YYYY-MM-DD format")
	ErrInstallationStartDateTooOld = newValidationError("installation start date cannot be more than 7 days in the past")
	ErrInvalidWeekDayMapping       = newValidationError("week day mapping must contain 1-7 values between 0 and 7")
	ErrProgramNotFound             = newValidationError("training program not found")
	ErrActiveInstallationExists    = newValidationError("an active program installation already exists")
	ErrInstallationNotFound        = newValidationError("program installation not found")

	// Session exercise (Block Constructor) validation errors
	ErrInvalidSessionPhase           = newValidationError("session phase must be 'prepare', 'practice', or 'push'")
	ErrInvalidSessionExerciseID      = newValidationError("session exercise ID is required")
	ErrInvalidSessionExerciseOrder   = newValidationError("session exercise order must be >= 1")
	ErrDuplicateSessionExerciseOrder = newValidationError("duplicate exercise order within the same phase")
	ErrTooManySessionExercises       = newValidationError("maximum 12 exercises per day session flow")
)

// Echo logging validation errors
var (
	ErrSessionNotDraft    = newValidationError("session is not in draft state")
	ErrSessionNotFound    = newValidationError("training session not found")
	ErrInvalidRPEOffset   = newValidationError("RPE offset must be between -3 and +3")
	ErrInvalidJointDelta  = newValidationError("joint integrity delta must be between -1.0 and +1.0")
	ErrEchoAlreadyApplied = newValidationError("echo has already been applied to this session")
)
