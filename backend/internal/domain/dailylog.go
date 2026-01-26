package domain

import (
	"regexp"
	"time"
)

// dateRegex matches YYYY-MM-DD format
var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

// DailyLog represents a daily log entry.
type DailyLog struct {
	ID                int64  // Database ID
	Date              string // YYYY-MM-DD format
	WeightKg          float64
	BodyFatPercent    *float64
	RestingHeartRate  *int
	HRVMs             *int // Heart Rate Variability in milliseconds (rMSSD)
	SleepQuality      SleepQuality
	SleepHours        *float64
	PlannedSessions   []TrainingSession // Multiple training sessions per day
	ActualSessions    []TrainingSession // Actual training logged after completion
	DayType           DayType
	CalculatedTargets DailyTargets
	EstimatedTDEE     int
	FormulaTDEE       int
	TDEESourceUsed    TDEESource // Which TDEE source was used for this day's calculations
	TDEEConfidence        float64               // Confidence level 0-1 for adaptive TDEE (0 means not adaptive)
	DataPointsUsed        int                   // Number of data points used for adaptive calculation
	RecoveryScore         *RecoveryScore         // Recovery score breakdown (nil if not calculated)
	AdjustmentMultipliers *AdjustmentMultipliers // Adjustment multipliers breakdown (nil if not calculated)
	CNSResult             *CNSResult             // CNS status from HRV analysis (nil if HRV not provided)
	TrainingOverrides     []TrainingOverride     // Recommended training adjustments when CNS depleted
	ActiveCaloriesBurned  *int                   // User-entered active calories from wearable
	Steps                 *int                   // Daily step count from wearable
	BMRPrecisionMode      bool                   // True if Katch-McArdle was auto-selected using recent body fat
	BodyFatUsedDate       *string                // Date of body fat measurement used for precision BMR
	Notes                 string                 // Daily notes/observations for LLM pattern recognition
	FastingOverride       *FastingProtocol       // Override for fasting protocol (nil = use profile default)
	FastedItemsKcal       int                    // Calories logged during fasting window (for <50kcal exception)
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// DailyLogInput represents the inputs needed to create a daily log.
type DailyLogInput struct {
	Date             string
	WeightKg         float64
	BodyFatPercent   *float64
	RestingHeartRate *int
	HRVMs            *int // Heart Rate Variability in milliseconds (rMSSD)
	SleepQuality     SleepQuality
	SleepHours       *float64
	PlannedSessions  []TrainingSession
	DayType          DayType
	Notes            string
}

// NewDailyLogFromInput creates a DailyLog from the input using the builder.
func NewDailyLogFromInput(input DailyLogInput, now time.Time) (*DailyLog, error) {
	builder := NewDailyLogBuilder(
		input.Date,
		input.WeightKg,
		input.SleepQuality,
		input.PlannedSessions,
		input.DayType,
	)

	if input.BodyFatPercent != nil {
		builder.WithBodyFat(*input.BodyFatPercent)
	}
	if input.SleepHours != nil {
		builder.WithSleepHours(*input.SleepHours)
	}
	if input.RestingHeartRate != nil {
		builder.WithRestingHeartRate(*input.RestingHeartRate)
	}
	if input.HRVMs != nil {
		builder.WithHRV(*input.HRVMs)
	}
	if input.Notes != "" {
		builder.WithNotes(input.Notes)
	}

	return builder.Build(now)
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

// WithHRV sets the optional Heart Rate Variability in milliseconds.
func (b *DailyLogBuilder) WithHRV(ms int) *DailyLogBuilder {
	b.log.HRVMs = &ms
	return b
}

// WithNotes sets the optional daily notes.
func (b *DailyLogBuilder) WithNotes(notes string) *DailyLogBuilder {
	b.log.Notes = notes
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

	// HRV validation (optional)
	if d.HRVMs != nil {
		if *d.HRVMs < 10 || *d.HRVMs > 200 {
			return ErrInvalidHRV
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
	if err := ValidateTrainingSessions(d.PlannedSessions); err != nil {
		return err
	}
	if err := ValidateTrainingSessions(d.ActualSessions); err != nil {
		return err
	}

	// Day type validation
	if !ValidDayTypes[d.DayType] {
		return ErrInvalidDayType
	}

	return nil
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
