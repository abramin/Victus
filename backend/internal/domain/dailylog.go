package domain

import (
	"regexp"
	"time"
)

// dateRegex matches YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// DailyLog represents a daily log entry.
type DailyLog struct {
	ID                int64 // Database ID
	Date              string // YYYY-MM-DD format
	WeightKg          float64
	BodyFatPercent    *float64
	RestingHeartRate  *int
	SleepQuality      SleepQuality
	SleepHours        *float64
	PlannedSessions   []TrainingSession // Multiple training sessions per day
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
	sessions []TrainingSession,
	dayType DayType,
	now time.Time,
) (*DailyLog, error) {
	d := &DailyLog{
		Date:            date,
		WeightKg:        weightKg,
		SleepQuality:    sleepQuality,
		PlannedSessions: sessions,
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
	sessions []TrainingSession,
	dayType DayType,
) *DailyLogBuilder {
	return &DailyLogBuilder{
		log: &DailyLog{
			Date:            date,
			WeightKg:        weightKg,
			SleepQuality:    sleepQuality,
			PlannedSessions: sessions,
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

	// Training sessions validation
	if len(d.PlannedSessions) > 10 {
		return ErrTooManySessions
	}

	for i, session := range d.PlannedSessions {
		// Validate session order is sequential starting at 1
		if session.SessionOrder != i+1 {
			return ErrInvalidSessionOrder
		}

		// Validate training type
		if !ValidTrainingTypes[session.Type] {
			return ErrInvalidTrainingType
		}

		// Validate duration
		if session.DurationMin < 0 || session.DurationMin > 480 {
			return ErrInvalidTrainingDuration
		}

		// Validate perceived intensity if provided
		if session.PerceivedIntensity != nil {
			if *session.PerceivedIntensity < 1 || *session.PerceivedIntensity > 10 {
				return ErrInvalidPerceivedIntensity
			}
		}
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

	// Default to a single rest session if no sessions provided
	if len(d.PlannedSessions) == 0 {
		d.PlannedSessions = []TrainingSession{{
			SessionOrder: 1,
			IsPlanned:    true,
			Type:         TrainingTypeRest,
			DurationMin:  0,
		}}
	}

	// For each session, set IsPlanned to true and ensure rest sessions have 0 duration
	for i := range d.PlannedSessions {
		d.PlannedSessions[i].IsPlanned = true
		if d.PlannedSessions[i].Type == TrainingTypeRest {
			d.PlannedSessions[i].DurationMin = 0
		}
	}

	// Default day type to fatburner if empty
	if d.DayType == "" {
		d.DayType = DayTypeFatburner
	}
}
