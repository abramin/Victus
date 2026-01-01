package domain

import "fmt"

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
		config := TrainingConfigs[s.Type]
		// Weight load by duration (normalized to 60 min)
		durationFactor := float64(s.DurationMin) / 60.0
		total += config.LoadScore * durationFactor
	}
	return total
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
		return fmt.Sprintf("1 session, %d min", totalMin)
	}
	return fmt.Sprintf("%d sessions, %d min total", len(sessions), totalMin)
}
