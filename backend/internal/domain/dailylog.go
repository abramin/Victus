package domain

import (
	"regexp"
	"time"
)

// dateRegex matches YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// DailyLog represents a daily log entry.
type DailyLog struct {
	Date              string // YYYY-MM-DD format
	WeightKg          float64
	BodyFatPercent    *float64
	RestingHeartRate  *int
	SleepQuality      SleepQuality
	SleepHours        *float64
	PlannedTraining   PlannedTraining
	DayType           DayType
	CalculatedTargets DailyTargets
	EstimatedTDEE     int
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

// NewDailyLog creates a new DailyLog with the given required fields.
// It applies defaults and validates the log.
// Returns an error if validation fails.
func NewDailyLog(
	date string,
	weightKg float64,
	sleepQuality SleepQuality,
	training PlannedTraining,
	dayType DayType,
	now time.Time,
) (*DailyLog, error) {
	d := &DailyLog{
		Date:            date,
		WeightKg:        weightKg,
		SleepQuality:    sleepQuality,
		PlannedTraining: training,
		DayType:         dayType,
	}
	d.SetDefaultsAt(now)
	if err := d.Validate(); err != nil {
		return nil, err
	}
	return d, nil
}

// DailyLogBuilder provides a fluent API for building DailyLog with optional fields.
type DailyLogBuilder struct {
	log *DailyLog
}

// NewDailyLogBuilder creates a new builder with required fields.
func NewDailyLogBuilder(
	date string,
	weightKg float64,
	sleepQuality SleepQuality,
	training PlannedTraining,
	dayType DayType,
) *DailyLogBuilder {
	return &DailyLogBuilder{
		log: &DailyLog{
			Date:            date,
			WeightKg:        weightKg,
			SleepQuality:    sleepQuality,
			PlannedTraining: training,
			DayType:         dayType,
		},
	}
}

// WithBodyFat sets the optional body fat percentage.
func (b *DailyLogBuilder) WithBodyFat(percent float64) *DailyLogBuilder {
	b.log.BodyFatPercent = &percent
	return b
}

// WithSleepHours sets the optional sleep hours.
func (b *DailyLogBuilder) WithSleepHours(hours float64) *DailyLogBuilder {
	b.log.SleepHours = &hours
	return b
}

// WithRestingHeartRate sets the optional resting heart rate.
func (b *DailyLogBuilder) WithRestingHeartRate(bpm int) *DailyLogBuilder {
	b.log.RestingHeartRate = &bpm
	return b
}

// Build finalizes the DailyLog, applies defaults, and validates.
// Returns an error if validation fails.
func (b *DailyLogBuilder) Build(now time.Time) (*DailyLog, error) {
	b.log.SetDefaultsAt(now)
	if err := b.log.Validate(); err != nil {
		return nil, err
	}
	return b.log, nil
}

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

// SetDefaults applies default values to unset fields using current time.
func (d *DailyLog) SetDefaults() {
	d.SetDefaultsAt(time.Now())
}

// SetDefaultsAt applies default values to unset fields at a given point in time.
func (d *DailyLog) SetDefaultsAt(now time.Time) {
	// Default date to today if empty
	if d.Date == "" {
		d.Date = now.Format("2006-01-02")
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
