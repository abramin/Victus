package importer

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	"victus/internal/domain"
	"victus/internal/store"
)

// GarminImporter handles importing data from Garmin Connect CSV exports.
type GarminImporter struct {
	dailyLogStore       *store.DailyLogStore
	monthlySummaryStore *store.MonthlySummaryStore
}

// NewGarminImporter creates a new Garmin importer.
func NewGarminImporter(dls *store.DailyLogStore, mss *store.MonthlySummaryStore) *GarminImporter {
	return &GarminImporter{
		dailyLogStore:       dls,
		monthlySummaryStore: mss,
	}
}

// DetectFileType analyzes the file content to determine its type.
// It reads the first few lines and returns the detected type.
func (g *GarminImporter) DetectFileType(reader io.Reader) (FileType, error) {
	// Read into buffer so we can scan headers
	buf := new(bytes.Buffer)
	_, err := io.Copy(buf, reader)
	if err != nil {
		return FileTypeUnknown, fmt.Errorf("failed to read file: %w", err)
	}

	content := buf.String()
	// Strip UTF-8 BOM if present
	content = strings.TrimPrefix(content, "\ufeff")
	contentLower := strings.ToLower(content)

	// Check first line/cell for specific markers
	lines := strings.Split(content, "\n")
	if len(lines) == 0 {
		return FileTypeUnknown, nil
	}

	firstLine := strings.TrimSpace(lines[0])
	firstLineLower := strings.ToLower(firstLine)

	// Sleep file: has "Puntuación de sueño" or "Frecuencia cardiaca en reposo" in header
	if strings.Contains(firstLineLower, "puntuación de sueño") ||
		strings.Contains(firstLineLower, "frecuencia cardiaca en reposo") && strings.Contains(firstLineLower, "duración") {
		return FileTypeGarminSleep, nil
	}

	// Weight file: has "Peso" and "Grasa corporal" or "IMC"
	if strings.Contains(firstLineLower, "peso") && (strings.Contains(firstLineLower, "grasa corporal") || strings.Contains(firstLineLower, "imc")) {
		return FileTypeGarminWeight, nil
	}

	// HRV file: has "VFC durante la noche" or "Estado de VFC"
	if strings.Contains(firstLineLower, "vfc durante la noche") {
		return FileTypeGarminHRV, nil
	}

	// RHR file: has "Fecha" + "Reposo" + "Alta" (tab-separated)
	if strings.Contains(firstLineLower, "fecha") && strings.Contains(firstLineLower, "reposo") && strings.Contains(firstLineLower, "alta") {
		return FileTypeGarminRHR, nil
	}

	// Activity calories: first cell contains "Calorías de actividad"
	if strings.Contains(firstLineLower, "calorías de actividad") {
		return FileTypeGarminActivityCalories, nil
	}

	// Remaining calories: first cell contains "Calorías restantes"
	if strings.Contains(firstLineLower, "calorías restantes") {
		return FileTypeGarminRemainingCals, nil
	}

	// Activities: has "Tipo de actividad" in header and month-year format in data
	if strings.Contains(contentLower, "tipo de actividad") {
		return FileTypeGarminActivities, nil
	}

	return FileTypeUnknown, nil
}

// Import processes the file and imports data based on its type.
func (g *GarminImporter) Import(ctx context.Context, fileType FileType, reader io.Reader, year int) (*ImportResult, error) {
	switch fileType {
	case FileTypeGarminSleep:
		return g.importSleep(ctx, reader)
	case FileTypeGarminWeight:
		return g.importWeight(ctx, reader, year)
	case FileTypeGarminHRV:
		return g.importHRV(ctx, reader, year)
	case FileTypeGarminRHR:
		return g.importRHR(ctx, reader, year)
	case FileTypeGarminActivities:
		return g.importActivities(ctx, reader)
	case FileTypeGarminActivityCalories:
		return g.importActivityCalories(ctx, reader)
	case FileTypeGarminRemainingCals:
		// Skip this file type - not useful
		return &ImportResult{
			FileType: fileType,
			Warnings: []string{"Skipped: Calorías restantes file contains only monthly totals"},
		}, nil
	default:
		return nil, fmt.Errorf("unsupported file type: %s", fileType)
	}
}

// importSleep processes Garmin sleep CSV files (Sueño*.csv).
// Format: Date,Score,RHR,BodyBattery,SpO2,Breathing,HRV,Quality,Duration,Need,Bedtime,Wake
func (g *GarminImporter) importSleep(ctx context.Context, reader io.Reader) (*ImportResult, error) {
	result := &ImportResult{FileType: FileTypeGarminSleep}

	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1 // Allow variable field count

	// Read header
	headers, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	// Find column indices
	colMap := makeColumnMap(headers)

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("CSV read error: %v", err))
			continue
		}

		result.Processed++

		// Parse the row
		row, err := g.parseSleepRow(record, colMap)
		if err != nil {
			result.Skipped++
			result.Warnings = append(result.Warnings, fmt.Sprintf("Row %d: %v", result.Processed, err))
			continue
		}

		// Skip rows with no useful data
		if row.SleepScore == nil && row.RestingHeartRate == nil && row.HRVMs == nil && row.DurationHours == nil {
			result.Skipped++
			continue
		}

		// Update daily log with sleep data
		err = g.dailyLogStore.UpdateSleepData(ctx, row.Date, store.SleepData{
			SleepQuality:     row.SleepScore,
			SleepHours:       row.DurationHours,
			RestingHeartRate: row.RestingHeartRate,
			HRVMs:            row.HRVMs,
		})
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				result.Skipped++
				result.Warnings = append(result.Warnings, fmt.Sprintf("No daily log for %s - skipped", row.Date))
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to update %s: %v", row.Date, err))
			}
			continue
		}

		result.Imported++
	}

	return result, nil
}

// parseSleepRow parses a single row from sleep CSV.
func (g *GarminImporter) parseSleepRow(record []string, colMap map[string]int) (*domain.GarminSleepRow, error) {
	getValue := func(col string) string {
		if idx, ok := colMap[col]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	// Date is in first column, already in YYYY-MM-DD format
	date := getValue("date")
	if date == "" || date == "--" {
		return nil, fmt.Errorf("missing date")
	}

	return &domain.GarminSleepRow{
		Date:             date,
		SleepScore:       ParseInt(getValue("score")),
		RestingHeartRate: ParseInt(getValue("rhr")),
		BodyBattery:      ParseInt(getValue("battery")),
		HRVMs:            ParseInt(getValue("hrv")),
		Quality:          getValue("quality"),
		DurationHours:    ParseSleepDuration(getValue("duration")),
		SleepNeedHours:   ParseSleepDuration(getValue("need")),
		Bedtime:          getValue("bedtime"),
		WakeTime:         getValue("wake"),
	}, nil
}

// importWeight processes Garmin weight CSV files (Peso.csv).
// Format has alternating rows: date row, then data row.
func (g *GarminImporter) importWeight(ctx context.Context, reader io.Reader, year int) (*ImportResult, error) {
	result := &ImportResult{FileType: FileTypeGarminWeight}

	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Read header
	headers, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	colMap := makeColumnMap(headers)
	var currentDate string

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("CSV read error: %v", err))
			continue
		}

		// Check if this is a date row (starts with date like " 16 Ene 2026")
		firstCell := strings.TrimSpace(record[0])
		if isDateRow(firstCell) {
			// Parse date for next data row
			parsedDate, err := ParseSpanishDate(firstCell, year)
			if err != nil {
				result.Warnings = append(result.Warnings, fmt.Sprintf("Invalid date: %s", firstCell))
				currentDate = ""
				continue
			}
			currentDate = parsedDate
			continue
		}

		// This is a data row
		if currentDate == "" {
			continue
		}

		result.Processed++

		row, err := g.parseWeightRow(record, colMap, currentDate)
		if err != nil || row.WeightKg == nil {
			result.Skipped++
			continue
		}

		// Update daily log with weight data
		err = g.dailyLogStore.UpdateWeightData(ctx, row.Date, store.WeightData{
			WeightKg:       row.WeightKg,
			BodyFatPercent: row.BodyFatPercent,
		})
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				result.Skipped++
				result.Warnings = append(result.Warnings, fmt.Sprintf("No daily log for %s - skipped", row.Date))
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to update %s: %v", row.Date, err))
			}
			continue
		}

		result.Imported++
		currentDate = "" // Reset for next date row
	}

	return result, nil
}

// parseWeightRow parses a data row from weight CSV.
func (g *GarminImporter) parseWeightRow(record []string, colMap map[string]int, date string) (*domain.GarminWeightRow, error) {
	getValue := func(col string) string {
		if idx, ok := colMap[col]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	return &domain.GarminWeightRow{
		Date:           date,
		WeightKg:       ParseWeight(getValue("weight")),
		BodyFatPercent: ParsePercentage(getValue("bodyfat")),
		BMI:            ParseFloat(getValue("bmi")),
		MuscleMassKg:   ParseWeight(getValue("muscle")),
		BoneMassKg:     ParseWeight(getValue("bone")),
		BodyWaterPct:   ParsePercentage(getValue("water")),
	}, nil
}

// importHRV processes Garmin HRV status CSV files (Estado de VFC*.csv).
func (g *GarminImporter) importHRV(ctx context.Context, reader io.Reader, year int) (*ImportResult, error) {
	result := &ImportResult{FileType: FileTypeGarminHRV}

	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Read header
	_, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("CSV read error: %v", err))
			continue
		}

		if len(record) < 2 {
			continue
		}

		result.Processed++

		// Parse date (format: "2 Dic")
		date, err := ParseSpanishDate(record[0], year)
		if err != nil {
			result.Skipped++
			continue
		}

		// Parse HRV value (format: "33ms")
		hrvMs := ParseHRVValue(record[1])
		if hrvMs == nil {
			result.Skipped++
			continue
		}

		// Update daily log
		err = g.dailyLogStore.UpdateHRV(ctx, date, *hrvMs)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				result.Skipped++
				result.Warnings = append(result.Warnings, fmt.Sprintf("No daily log for %s - skipped", date))
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to update %s: %v", date, err))
			}
			continue
		}

		result.Imported++
	}

	return result, nil
}

// importRHR processes Garmin RHR CSV files (Fecha Reposo Alta).
// Format: Fecha,Reposo,Alta (Date,RHR,MaxHR)
func (g *GarminImporter) importRHR(ctx context.Context, reader io.Reader, year int) (*ImportResult, error) {
	result := &ImportResult{FileType: FileTypeGarminRHR}

	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Skip header
	_, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("CSV read error: %v", err))
			continue
		}

		if len(record) < 2 {
			continue
		}

		result.Processed++

		// Parse date (format: "26 Ene")
		date, err := ParseSpanishDate(record[0], year)
		if err != nil {
			result.Skipped++
			continue
		}

		// Parse RHR (now just a number like "63", or with "ppm" suffix)
		rhr := ParseHeartRate(record[1])
		if rhr == nil {
			result.Skipped++
			continue
		}

		// Update daily log
		err = g.dailyLogStore.UpdateRHR(ctx, date, *rhr)
		if err != nil {
			if strings.Contains(err.Error(), "not found") {
				result.Skipped++
				result.Warnings = append(result.Warnings, fmt.Sprintf("No daily log for %s - skipped", date))
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to update %s: %v", date, err))
			}
			continue
		}

		result.Imported++
	}

	return result, nil
}

// importActivities processes monthly activity count CSV (Actividades.csv).
func (g *GarminImporter) importActivities(ctx context.Context, reader io.Reader) (*ImportResult, error) {
	result := &ImportResult{FileType: FileTypeGarminActivities}

	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Skip header
	_, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read header: %w", err)
	}

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("CSV read error: %v", err))
			continue
		}

		if len(record) < 3 {
			continue
		}

		result.Processed++

		// Parse year-month (format: "Ago 2025")
		yearMonth, err := ParseSpanishYearMonth(record[0])
		if err != nil {
			result.Skipped++
			result.Warnings = append(result.Warnings, fmt.Sprintf("Invalid month: %s", record[0]))
			continue
		}

		// Map activity type
		rawActivityName := strings.TrimSpace(record[1])
		activityType := domain.MapGarminActivityType(rawActivityName)

		// Parse count
		count := ParseInt(record[2])
		if count == nil {
			result.Skipped++
			continue
		}

		// Upsert monthly summary
		summary := domain.MonthlySummary{
			YearMonth:       yearMonth,
			ActivityType:    activityType,
			SessionCount:    *count,
			DataSource:      "garmin_import",
			RawActivityName: rawActivityName,
		}
		summary.ComputeAvgCalories()

		created, err := g.monthlySummaryStore.Upsert(ctx, summary)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to save %s/%s: %v", yearMonth, activityType, err))
			continue
		}

		if created {
			result.Imported++
		} else {
			// Count updates separately if needed
			result.Imported++
		}
	}

	return result, nil
}

// importActivityCalories processes monthly activity calories CSV.
func (g *GarminImporter) importActivityCalories(ctx context.Context, reader io.Reader) (*ImportResult, error) {
	result := &ImportResult{FileType: FileTypeGarminActivityCalories}

	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Skip header (may have title in first row)
	for i := 0; i < 2; i++ {
		record, err := csvReader.Read()
		if err != nil {
			break
		}
		// Check if this is the actual header with "Tipo de actividad"
		if len(record) > 1 && strings.Contains(strings.ToLower(record[1]), "tipo de actividad") {
			break
		}
	}

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}

		if len(record) < 3 {
			continue
		}

		result.Processed++

		// Parse year-month
		yearMonth, err := ParseSpanishYearMonth(record[0])
		if err != nil {
			result.Skipped++
			continue
		}

		// Map activity type
		rawActivityName := strings.TrimSpace(record[1])
		activityType := domain.MapGarminActivityType(rawActivityName)

		// Parse calories
		calories := ParseInt(record[2])
		if calories == nil {
			result.Skipped++
			continue
		}

		// Update monthly summary with calories
		err = g.monthlySummaryStore.UpdateCalories(ctx, yearMonth, activityType, *calories)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to update calories for %s/%s: %v", yearMonth, activityType, err))
			continue
		}

		result.Imported++
	}

	return result, nil
}

// stripBOM removes the UTF-8 BOM from the beginning of a string if present.
func stripBOM(s string) string {
	if strings.HasPrefix(s, "\ufeff") {
		return strings.TrimPrefix(s, "\ufeff")
	}
	return s
}

// makeColumnMap creates a mapping of normalized column names to indices.
func makeColumnMap(headers []string) map[string]int {
	m := make(map[string]int)
	for i, h := range headers {
		h = strings.ToLower(strings.TrimSpace(stripBOM(h)))

		// Map Spanish/English column names to standard keys
		switch {
		// Date columns
		case strings.Contains(h, "fecha") || h == "date" || strings.HasPrefix(h, "puntuación de sueño"):
			if _, exists := m["date"]; !exists {
				m["date"] = i
			}

		// Sleep score
		case h == "puntuación" || h == "score":
			m["score"] = i

		// RHR
		case strings.Contains(h, "frecuencia cardiaca en reposo") || h == "rhr" || h == "resting heart rate":
			m["rhr"] = i

		// Body Battery
		case strings.Contains(h, "body battery"):
			m["battery"] = i

		// HRV
		case strings.Contains(h, "estado de vfc") || strings.Contains(h, "hrv"):
			m["hrv"] = i

		// Sleep quality
		case h == "calidad" || h == "quality":
			m["quality"] = i

		// Sleep duration
		case h == "duración" || h == "duration":
			m["duration"] = i

		// Sleep need
		case strings.Contains(h, "necesidad") || h == "sleep need":
			m["need"] = i

		// Bedtime
		case strings.Contains(h, "hora de dormir") || h == "bedtime":
			m["bedtime"] = i

		// Wake time
		case strings.Contains(h, "hora de despertarte") || h == "wake":
			m["wake"] = i

		// Weight
		case h == "peso" || h == "weight":
			m["weight"] = i

		// Body fat
		case strings.Contains(h, "grasa corporal") || strings.Contains(h, "body fat"):
			m["bodyfat"] = i

		// BMI
		case h == "imc" || h == "bmi":
			m["bmi"] = i

		// Muscle mass
		case strings.Contains(h, "masa muscular") || strings.Contains(h, "muscle mass"):
			m["muscle"] = i

		// Bone mass
		case strings.Contains(h, "masa ósea") || strings.Contains(h, "bone mass"):
			m["bone"] = i

		// Body water
		case strings.Contains(h, "agua corporal") || strings.Contains(h, "body water"):
			m["water"] = i

		// Time (for weight file)
		case h == "tiempo" || h == "time":
			m["time"] = i
		}
	}
	return m
}

// isDateRow checks if a string looks like a date row (e.g., " 16 Ene 2026").
func isDateRow(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" {
		return false
	}

	// Check if it starts with a number (day) followed by month
	parts := strings.Fields(s)
	if len(parts) < 2 {
		return false
	}

	// First part should be a number (day)
	_, err := ParseInt(parts[0]), error(nil)
	if ParseInt(parts[0]) == nil {
		return false
	}

	// Second part should be a month name
	month := parts[1]
	_, isSpanish := spanishMonths[month]
	_, isEnglish := englishMonths[month]

	return isSpanish || isEnglish || err == nil
}
