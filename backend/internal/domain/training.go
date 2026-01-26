package domain

import "strconv"

// DailyLoadDataPoint represents a single day's training load for historical calculation.
type DailyLoadDataPoint struct {
	Date      string
	DailyLoad float64
}

// TrainingLoadResult contains ACR metrics for a given date.
type TrainingLoadResult struct {
	DailyLoad   float64 // Session loads summed for the day
	AcuteLoad   float64 // 7-day rolling average
	ChronicLoad float64 // 28-day rolling average
	ACR         float64 // Acute:Chronic ratio (1.0 default when chronic=0)
}

// ValidateTrainingSessions checks training session invariants for length and field ranges.
func ValidateTrainingSessions(sessions []TrainingSession) error {
	if len(sessions) > 10 {
		return ErrTooManySessions
	}

	for i, session := range sessions {
		if session.SessionOrder != i+1 {
			return ErrInvalidSessionOrder
		}
		if !ValidTrainingTypes[session.Type] {
			return ErrInvalidTrainingType
		}
		if session.DurationMin < 0 || session.DurationMin > 480 {
			return ErrInvalidTrainingDuration
		}
		if session.PerceivedIntensity != nil {
			if *session.PerceivedIntensity < 1 || *session.PerceivedIntensity > 10 {
				return ErrInvalidPerceivedIntensity
			}
		}
	}

	return nil
}

// TotalDurationMin returns the sum of all session durations in minutes.
func TotalDurationMin(sessions []TrainingSession) int {
	total := 0
	for _, s := range sessions {
		total += s.DurationMin
	}
	return total
}

// TotalLoadScore returns the sum of load scores across all sessions.
// Load is weighted by duration (normalized to 60 min).
func TotalLoadScore(sessions []TrainingSession) float64 {
	var total float64
	for _, s := range sessions {
		config := GetTrainingConfig(s.Type)
		// Weight load by duration (normalized to 60 min)
		durationFactor := float64(s.DurationMin) / 60.0
		total += config.LoadScore * durationFactor
	}
	return total
}

// SessionLoad calculates load for a single training session.
// Formula: loadScore × (durationMin/60) × (RPE/3)
// If RPE is nil, defaults to 5 (middle of 1-10 scale).
func SessionLoad(trainingType TrainingType, durationMin int, rpe *int) float64 {
	config := GetTrainingConfig(trainingType)
	durationFactor := float64(durationMin) / 60.0

	rpeValue := 5 // Default RPE when not specified
	if rpe != nil {
		rpeValue = *rpe
	}
	rpeFactor := float64(rpeValue) / 3.0

	return config.LoadScore * durationFactor * rpeFactor
}

// DailyLoad calculates total load for a day from sessions.
// Uses actual sessions if present, otherwise planned sessions.
func DailyLoad(actualSessions, plannedSessions []TrainingSession) float64 {
	sessions := actualSessions
	if len(sessions) == 0 {
		sessions = plannedSessions
	}

	var total float64
	for _, s := range sessions {
		total += SessionLoad(s.Type, s.DurationMin, s.PerceivedIntensity)
	}
	return total
}

// CalculateAcuteLoad computes 7-day rolling average load.
// Expects data points ordered by date (oldest first).
// Returns 0 if no data points.
func CalculateAcuteLoad(dataPoints []DailyLoadDataPoint) float64 {
	const acuteDays = 7
	if len(dataPoints) == 0 {
		return 0
	}

	// Take last 7 days (or all if fewer)
	start := len(dataPoints) - acuteDays
	if start < 0 {
		start = 0
	}
	recent := dataPoints[start:]

	var sum float64
	for _, dp := range recent {
		sum += dp.DailyLoad
	}
	return sum / float64(len(recent))
}

// CalculateChronicLoad computes 28-day rolling average load.
// Expects data points ordered by date (oldest first).
// Returns 0 if fewer than 7 data points (minimum for meaningful chronic).
func CalculateChronicLoad(dataPoints []DailyLoadDataPoint) float64 {
	const chronicDays = 28
	const minDaysForChronic = 7

	if len(dataPoints) < minDaysForChronic {
		return 0
	}

	// Take last 28 days (or all if fewer)
	start := len(dataPoints) - chronicDays
	if start < 0 {
		start = 0
	}
	subset := dataPoints[start:]

	var sum float64
	for _, dp := range subset {
		sum += dp.DailyLoad
	}
	return sum / float64(len(subset))
}

// CalculateACR computes Acute:Chronic Workload Ratio.
// Returns 1.0 when chronic load is 0 (prevents division by zero).
func CalculateACR(acuteLoad, chronicLoad float64) float64 {
	if chronicLoad == 0 {
		return 1.0
	}
	return acuteLoad / chronicLoad
}

// CalculateTrainingLoadResult computes all ACR metrics from historical data.
// dataPoints should be ordered by date (oldest first) and include up to 28 days.
// todayLoad is the calculated load for the current day.
func CalculateTrainingLoadResult(todayLoad float64, dataPoints []DailyLoadDataPoint) TrainingLoadResult {
	acuteLoad := CalculateAcuteLoad(dataPoints)
	chronicLoad := CalculateChronicLoad(dataPoints)
	acr := CalculateACR(acuteLoad, chronicLoad)

	return TrainingLoadResult{
		DailyLoad:   todayLoad,
		AcuteLoad:   acuteLoad,
		ChronicLoad: chronicLoad,
		ACR:         acr,
	}
}

// SessionSummary returns a human-readable summary of training sessions.
// Examples: "No sessions", "Rest day", "3 sessions, 110 min total"
func SessionSummary(sessions []TrainingSession) string {
	if len(sessions) == 0 {
		return "No sessions"
	}

	// Check if all sessions are rest
	allRest := true
	for _, s := range sessions {
		if s.Type != TrainingTypeRest {
			allRest = false
			break
		}
	}

	if allRest {
		return "Rest day"
	}

	totalMin := TotalDurationMin(sessions)
	if len(sessions) == 1 {
		return "1 session, " + strconv.Itoa(totalMin) + " min"
	}
	return strconv.Itoa(len(sessions)) + " sessions, " + strconv.Itoa(totalMin) + " min total"
}
