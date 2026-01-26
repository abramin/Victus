// Package importer provides data import functionality for external fitness tracker exports.
package importer

import (
	"context"
	"io"
)

// FileType represents the detected type of an import file.
type FileType string

const (
	FileTypeGarminSleep            FileType = "garmin_sleep"            // Sueño*.csv - daily sleep with RHR, HRV
	FileTypeGarminWeight           FileType = "garmin_weight"           // Peso.csv - daily weight/body comp
	FileTypeGarminHRV              FileType = "garmin_hrv"              // Estado de VFC*.csv - daily HRV
	FileTypeGarminRHR              FileType = "garmin_rhr"              // Fecha Reposo Alta - daily RHR
	FileTypeGarminActivities       FileType = "garmin_activities"       // Actividades.csv - monthly counts
	FileTypeGarminActivityCalories FileType = "garmin_activity_calories" // Calorías de actividad - monthly calories
	FileTypeGarminRemainingCals    FileType = "garmin_remaining_cals"   // Calorías restantes - monthly totals (skip)
	FileTypeUnknown                FileType = "unknown"
)

// ImportResult contains the result of a single file import operation.
type ImportResult struct {
	FileType  FileType
	Processed int
	Imported  int
	Skipped   int
	Warnings  []string
	Errors    []string
}

// Importer defines the contract for data importers.
type Importer interface {
	// DetectFileType analyzes file content to determine the file type.
	DetectFileType(reader io.Reader) (FileType, error)

	// Import processes the file and imports data into the database.
	// The year parameter provides context for date parsing when dates don't include year.
	Import(ctx context.Context, fileType FileType, reader io.Reader, year int) (*ImportResult, error)
}
