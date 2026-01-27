package service

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"victus/internal/domain"
	"victus/internal/importer"
	"victus/internal/store"
)

// ImportService orchestrates data imports from external sources.
type ImportService struct {
	garminImporter *importer.GarminImporter
}

// NewImportService creates a new import service.
func NewImportService(dailyLogStore *store.DailyLogStore, monthlySummaryStore *store.MonthlySummaryStore) *ImportService {
	return &ImportService{
		garminImporter: importer.NewGarminImporter(dailyLogStore, monthlySummaryStore),
	}
}

// ProcessGarminUpload handles a Garmin export file upload (CSV or ZIP).
// If a ZIP is provided, it processes all CSV files within it.
// The year parameter is used for date parsing when dates don't include a year.
func (s *ImportService) ProcessGarminUpload(ctx context.Context, filename string, data []byte, year int) (*domain.GarminImportResult, error) {
	// Default to current year if not specified
	if year == 0 {
		year = time.Now().Year()
	}

	// Check if it's a ZIP file
	if strings.HasSuffix(strings.ToLower(filename), ".zip") {
		return s.processZip(ctx, data, year)
	}

	// Single CSV file
	return s.processCSV(ctx, filename, data, year)
}

// processZip extracts and processes all CSV files from a ZIP archive.
func (s *ImportService) processZip(ctx context.Context, data []byte, year int) (*domain.GarminImportResult, error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("failed to open ZIP: %w", err)
	}

	result := &domain.GarminImportResult{}

	for _, file := range reader.File {
		// Skip directories and non-CSV files
		if file.FileInfo().IsDir() {
			continue
		}

		ext := strings.ToLower(filepath.Ext(file.Name))
		if ext != ".csv" {
			continue
		}

		// Open the file within the ZIP
		rc, err := file.Open()
		if err != nil {
			result.Warnings = append(result.Warnings, fmt.Sprintf("Failed to open %s: %v", file.Name, err))
			continue
		}

		// Read file contents
		fileData, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			result.Warnings = append(result.Warnings, fmt.Sprintf("Failed to read %s: %v", file.Name, err))
			continue
		}

		// Process this CSV
		fileResult, err := s.processCSV(ctx, file.Name, fileData, year)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to process %s: %v", file.Name, err))
			continue
		}

		// Merge results
		s.mergeResults(result, fileResult)
	}

	return result, nil
}

// processCSV processes a single CSV file.
func (s *ImportService) processCSV(ctx context.Context, filename string, data []byte, year int) (*domain.GarminImportResult, error) {
	// Detect file type
	fileType, err := s.garminImporter.DetectFileType(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to detect file type: %w", err)
	}

	if fileType == importer.FileTypeUnknown {
		return &domain.GarminImportResult{
			Warnings: []string{fmt.Sprintf("Unknown file format: %s", filename)},
		}, nil
	}

	// Import the file
	importResult, err := s.garminImporter.Import(ctx, fileType, bytes.NewReader(data), year)
	if err != nil {
		return nil, fmt.Errorf("import failed: %w", err)
	}

	// Convert importer.ImportResult to domain.GarminImportResult
	result := &domain.GarminImportResult{
		Warnings: importResult.Warnings,
		Errors:   importResult.Errors,
	}

	// Map results based on file type
	switch fileType {
	case importer.FileTypeGarminSleep:
		result.SleepRecordsImported = importResult.Imported
		result.SleepRecordsSkipped = importResult.Skipped
	case importer.FileTypeGarminWeight:
		result.WeightRecordsImported = importResult.Imported
		result.WeightRecordsSkipped = importResult.Skipped
	case importer.FileTypeGarminHRV:
		result.HRVRecordsImported = importResult.Imported
		result.HRVRecordsSkipped = importResult.Skipped
	case importer.FileTypeGarminRHR:
		result.RHRRecordsImported = importResult.Imported
		result.RHRRecordsSkipped = importResult.Skipped
	case importer.FileTypeGarminActivities, importer.FileTypeGarminActivityCalories:
		result.MonthlySummariesCreated = importResult.Imported
	}

	return result, nil
}

// mergeResults combines results from multiple file imports.
func (s *ImportService) mergeResults(dst, src *domain.GarminImportResult) {
	dst.SleepRecordsImported += src.SleepRecordsImported
	dst.SleepRecordsSkipped += src.SleepRecordsSkipped
	dst.WeightRecordsImported += src.WeightRecordsImported
	dst.WeightRecordsSkipped += src.WeightRecordsSkipped
	dst.HRVRecordsImported += src.HRVRecordsImported
	dst.HRVRecordsSkipped += src.HRVRecordsSkipped
	dst.RHRRecordsImported += src.RHRRecordsImported
	dst.RHRRecordsSkipped += src.RHRRecordsSkipped
	dst.MonthlySummariesCreated += src.MonthlySummariesCreated
	dst.MonthlySummariesUpdated += src.MonthlySummariesUpdated
	dst.Warnings = append(dst.Warnings, src.Warnings...)
	dst.Errors = append(dst.Errors, src.Errors...)
}
