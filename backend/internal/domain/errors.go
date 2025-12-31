package domain

import "errors"

// Profile validation errors
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

// DailyLog validation errors
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
