package domain

import "time"

// GarminHRVRow represents a parsed row from Garmin HRV status CSV (Estado de VFC*.csv).
type GarminHRVRow struct {
	Date           string // Parsed to YYYY-MM-DD format
	HRVMs          *int   // Overnight HRV in milliseconds (nil if "--" or invalid)
	ReferenceRange string // Original reference range string (e.g., "29ms - 42ms")
	SevenDayAvg    *int   // 7-day rolling average in ms (nil if invalid)
}

// GarminSleepRow represents a parsed row from Garmin Sleep CSV (Sueño*.csv).
// This is the richest daily data source with RHR, HRV, sleep score, and duration.
type GarminSleepRow struct {
	Date             string   // ISO format YYYY-MM-DD
	SleepScore       *int     // 1-100 score (maps to sleep_quality)
	RestingHeartRate *int     // RHR in bpm
	BodyBattery      *int     // Garmin Body Battery score
	HRVMs            *int     // HRV status in milliseconds
	Quality          string   // "Excelente", "Bueno", "Aceptable", "Deficiente"
	DurationHours    *float64 // Sleep duration in hours (parsed from "7h 3min")
	SleepNeedHours   *float64 // Sleep need in hours
	Bedtime          string   // Time went to sleep (HH:MM)
	WakeTime         string   // Time woke up (HH:MM)
}

// GarminWeightRow represents a parsed row from Garmin Weight CSV (Peso.csv).
type GarminWeightRow struct {
	Date            string   // Parsed to YYYY-MM-DD format
	WeightKg        *float64 // Body weight in kg
	BodyFatPercent  *float64 // Body fat percentage
	BMI             *float64 // Body Mass Index
	MuscleMassKg    *float64 // Skeletal muscle mass in kg
	BoneMassKg      *float64 // Bone mass in kg
	BodyWaterPct    *float64 // Body water percentage
}

// GarminRHRRow represents a parsed row from Garmin RHR CSV (Fecha Reposo Alta).
type GarminRHRRow struct {
	Date   string // Parsed to YYYY-MM-DD format
	RHR    *int   // Resting heart rate in bpm
	MaxHR  *int   // Max heart rate in bpm
}

// GarminActivitySummary represents monthly activity aggregate data from Garmin.
type GarminActivitySummary struct {
	YearMonth       string       // Format: "2025-08"
	ActivityType    TrainingType // Mapped from Garmin activity type
	RawActivityName string       // Original Garmin name (e.g., "Gimnasio y equipo de fitness")
	SessionCount    int          // Number of sessions in the month
	TotalCalories   int          // Total calories burned (0 if not available)
}

// GarminImportResult contains the outcome of a Garmin data import operation.
type GarminImportResult struct {
	// Daily data imports
	SleepRecordsImported    int // Sleep records (includes RHR, HRV, sleep score)
	SleepRecordsSkipped     int
	WeightRecordsImported   int // Weight/body composition records
	WeightRecordsSkipped    int
	HRVRecordsImported      int // Standalone HRV records (Estado de VFC)
	HRVRecordsSkipped       int
	RHRRecordsImported      int // Standalone RHR records
	RHRRecordsSkipped       int

	// Monthly aggregate imports
	MonthlySummariesCreated int
	MonthlySummariesUpdated int

	// Feedback
	Warnings []string // Non-fatal issues encountered
	Errors   []string // Fatal errors for specific records
}

// MonthlySummary represents a stored monthly activity summary.
type MonthlySummary struct {
	ID                    int64
	YearMonth             string       // Format: "2025-08"
	ActivityType          TrainingType // Victus training type
	SessionCount          int          // Number of sessions
	TotalCalories         int          // Total kcal burned
	AvgCaloriesPerSession int          // Derived: total/count
	DataSource            string       // e.g., "garmin_import"
	RawActivityName       string       // Original source name
	CreatedAt             time.Time
}

// ComputeAvgCalories sets AvgCaloriesPerSession from TotalCalories and SessionCount.
func (s *MonthlySummary) ComputeAvgCalories() {
	if s.SessionCount > 0 && s.TotalCalories > 0 {
		s.AvgCaloriesPerSession = s.TotalCalories / s.SessionCount
	}
}

// GarminActivityMapping maps Garmin activity type names to Victus TrainingTypes.
// Supports both Spanish (Garmin Connect ES) and English names.
var GarminActivityMapping = map[string]TrainingType{
	// Spanish (Garmin Connect ES)
	"Carrera":                      TrainingTypeRun,
	"Ciclismo":                     TrainingTypeCycle,
	"Gimnasio y equipo de fitness": TrainingTypeStrength,
	"Caminar":                      TrainingTypeWalking,
	"Senderismo":                   TrainingTypeWalking,
	"Natación":                     TrainingTypeMixed,
	"Yoga":                         TrainingTypeMobility,
	"HIIT":                         TrainingTypeHIIT,
	"Remo":                         TrainingTypeRow,

	// English (Garmin Connect EN)
	"Running":           TrainingTypeRun,
	"Treadmill Running": TrainingTypeRun,
	"Trail Running":     TrainingTypeRun,
	"Cycling":           TrainingTypeCycle,
	"Indoor Cycling":    TrainingTypeCycle,
	"Strength Training": TrainingTypeStrength,
	"Walking":           TrainingTypeWalking,
	"Hiking":            TrainingTypeWalking,
	"Swimming":          TrainingTypeMixed,
	"Rowing":            TrainingTypeRow,
	"Indoor Rowing":     TrainingTypeRow,
	"Pilates":           TrainingTypeMobility,
	"Flexibility":       TrainingTypeMobility,
	"Interval Training": TrainingTypeHIIT,
}

// MapGarminActivityType converts a Garmin activity name to a Victus TrainingType.
// Returns TrainingTypeMixed as fallback for unknown activity types.
func MapGarminActivityType(garminType string) TrainingType {
	if t, ok := GarminActivityMapping[garminType]; ok {
		return t
	}
	return TrainingTypeMixed
}

// SpanishMonths maps Spanish month abbreviations to month numbers.
var SpanishMonths = map[string]int{
	"Ene": 1, "Feb": 2, "Mar": 3, "Abr": 4,
	"May": 5, "Jun": 6, "Jul": 7, "Ago": 8,
	"Sep": 9, "Oct": 10, "Nov": 11, "Dic": 12,
}

// EnglishMonths maps English month abbreviations to month numbers.
var EnglishMonths = map[string]int{
	"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
	"May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
	"Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
