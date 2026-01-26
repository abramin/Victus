package importer

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// spanishMonths maps Spanish month abbreviations to month numbers.
var spanishMonths = map[string]int{
	"Ene": 1, "Feb": 2, "Mar": 3, "Abr": 4,
	"May": 5, "Jun": 6, "Jul": 7, "Ago": 8,
	"Sep": 9, "Oct": 10, "Nov": 11, "Dic": 12,
}

// englishMonths maps English month abbreviations to month numbers.
var englishMonths = map[string]int{
	"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,
	"May": 5, "Jun": 6, "Jul": 7, "Aug": 8,
	"Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

// ParseSpanishDate parses dates like "2 Dic" or "16 Ene 2026" to YYYY-MM-DD format.
// If year is not in the string, the provided defaultYear is used.
func ParseSpanishDate(dateStr string, defaultYear int) (string, error) {
	dateStr = strings.TrimSpace(dateStr)
	if dateStr == "" || dateStr == "--" {
		return "", fmt.Errorf("empty or missing date")
	}

	parts := strings.Fields(dateStr)
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid date format: %s", dateStr)
	}

	// Parse day
	day, err := strconv.Atoi(parts[0])
	if err != nil {
		return "", fmt.Errorf("invalid day in date %s: %w", dateStr, err)
	}

	// Parse month (Spanish or English)
	monthStr := parts[1]
	month, ok := spanishMonths[monthStr]
	if !ok {
		month, ok = englishMonths[monthStr]
		if !ok {
			return "", fmt.Errorf("unknown month: %s", monthStr)
		}
	}

	// Parse year if present, otherwise use default
	year := defaultYear
	if len(parts) >= 3 {
		y, err := strconv.Atoi(parts[2])
		if err == nil {
			year = y
		}
	}

	return fmt.Sprintf("%d-%02d-%02d", year, month, day), nil
}

// ParseSpanishYearMonth parses "Ago 2025" to "2025-08" format.
func ParseSpanishYearMonth(s string) (string, error) {
	s = strings.TrimSpace(s)
	parts := strings.Fields(s)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid year-month format: %s", s)
	}

	monthStr := parts[0]
	month, ok := spanishMonths[monthStr]
	if !ok {
		month, ok = englishMonths[monthStr]
		if !ok {
			return "", fmt.Errorf("unknown month: %s", monthStr)
		}
	}

	year, err := strconv.Atoi(parts[1])
	if err != nil {
		return "", fmt.Errorf("invalid year in %s: %w", s, err)
	}

	return fmt.Sprintf("%d-%02d", year, month), nil
}

// ParseHRVValue parses values like "33ms" to integer, handling "--" as nil.
func ParseHRVValue(s string) *int {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}
	// Strip "ms" suffix
	s = strings.TrimSuffix(s, "ms")
	s = strings.TrimSpace(s)

	val, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &val
}

// ParseHeartRate parses values like "63 ppm" or "63" to integer.
func ParseHeartRate(s string) *int {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}
	// Strip "ppm" or "bpm" suffix
	s = strings.TrimSuffix(s, "ppm")
	s = strings.TrimSuffix(s, "bpm")
	s = strings.TrimSpace(s)

	val, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &val
}

// ParseWeight parses values like "89.4 kg" to float64.
func ParseWeight(s string) *float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}
	// Strip "kg" suffix
	s = strings.TrimSuffix(s, "kg")
	s = strings.TrimSpace(s)
	// Handle comma as decimal separator
	s = strings.ReplaceAll(s, ",", ".")

	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &val
}

// ParsePercentage parses values like "27.1 %" or "27.1%" to float64.
func ParsePercentage(s string) *float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}
	// Strip "%" suffix
	s = strings.TrimSuffix(s, "%")
	s = strings.TrimSpace(s)
	// Handle comma as decimal separator
	s = strings.ReplaceAll(s, ",", ".")

	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &val
}

// durationRegex matches patterns like "7h 3min", "8h", "45min"
var durationRegex = regexp.MustCompile(`(?:(\d+)h)?\s*(?:(\d+)min)?`)

// ParseSleepDuration parses values like "7h 3min" to hours as float64.
func ParseSleepDuration(s string) *float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}

	matches := durationRegex.FindStringSubmatch(s)
	if matches == nil {
		return nil
	}

	var hours float64
	if matches[1] != "" {
		h, _ := strconv.Atoi(matches[1])
		hours = float64(h)
	}
	if matches[2] != "" {
		m, _ := strconv.Atoi(matches[2])
		hours += float64(m) / 60.0
	}

	if hours == 0 {
		return nil
	}
	return &hours
}

// ParseInt parses a string to int, returning nil for empty or invalid values.
func ParseInt(s string) *int {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}

	val, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &val
}

// ParseFloat parses a string to float64, handling comma decimal separators.
func ParseFloat(s string) *float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "--" {
		return nil
	}
	// Handle comma as decimal separator
	s = strings.ReplaceAll(s, ",", ".")

	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &val
}
