package domain

import "math"

// CNS Deviation thresholds based on sports science literature.
// HRV deviation from baseline indicates CNS fatigue/recovery state.
const (
	CNSOptimizedThreshold = -0.10 // > -10% = optimized
	CNSStrainedThreshold  = -0.20 // -10% to -20% = strained
	// Below -20% = depleted
)

// HRV baseline calculation window.
const HRVBaselineWindowDays = 7

// Minimum HRV history points required to calculate baseline.
const MinHRVHistoryPoints = 3

// CNSResult contains the HRV analysis result.
type CNSResult struct {
	CurrentHRV   int       `json:"currentHrv"`   // Today's HRV in ms
	BaselineHRV  float64   `json:"baselineHrv"`  // 7-day moving average
	DeviationPct float64   `json:"deviationPct"` // (current - baseline) / baseline
	Status       CNSStatus `json:"status"`       // optimized, strained, depleted
}

// CNSInput contains data for CNS calculation.
type CNSInput struct {
	CurrentHRV int   // Today's HRV in ms
	HRVHistory []int // Last N days of HRV values (oldest to newest, not including today)
}

// CalculateCNSStatus computes CNS status from HRV data.
// Returns nil if insufficient data (no current HRV or fewer than MinHRVHistoryPoints history).
func CalculateCNSStatus(input CNSInput) *CNSResult {
	if input.CurrentHRV <= 0 {
		return nil
	}

	// Filter valid HRV values from history
	validHistory := make([]int, 0, len(input.HRVHistory))
	for _, hrv := range input.HRVHistory {
		if hrv > 0 {
			validHistory = append(validHistory, hrv)
		}
	}

	// Need minimum history to calculate baseline
	if len(validHistory) < MinHRVHistoryPoints {
		return nil
	}

	// Calculate 7-day moving average baseline
	var sum float64
	for _, hrv := range validHistory {
		sum += float64(hrv)
	}
	baseline := sum / float64(len(validHistory))

	// Calculate deviation as percentage
	deviation := (float64(input.CurrentHRV) - baseline) / baseline

	// Determine status based on deviation
	status := CNSStatusOptimized
	if deviation < CNSStrainedThreshold {
		status = CNSStatusDepleted
	} else if deviation < CNSOptimizedThreshold {
		status = CNSStatusStrained
	}

	return &CNSResult{
		CurrentHRV:   input.CurrentHRV,
		BaselineHRV:  math.Round(baseline*10) / 10,   // Round to 1 decimal
		DeviationPct: math.Round(deviation*1000) / 1000, // Round to 3 decimals
		Status:       status,
	}
}

// TrainingOverride contains recommended training modifications when CNS is depleted.
type TrainingOverride struct {
	ShouldOverride      bool         `json:"shouldOverride"`
	RecommendedType     TrainingType `json:"recommendedType"`
	RecommendedDuration int          `json:"recommendedDurationMin"`
	OriginalType        TrainingType `json:"originalType"`
	OriginalDuration    int          `json:"originalDurationMin"`
	Reason              string       `json:"reason"`
}

// MaxMobilityDuration is the maximum duration for mobility when downgrading from high intensity.
const MaxMobilityDuration = 30

// MaxWalkingDuration is the maximum duration for walking when downgrading from moderate intensity.
const MaxWalkingDuration = 45

// CalculateTrainingOverride returns training adjustments for depleted CNS.
// Only returns overrides when CNS status is depleted.
// Returns nil if no adjustments needed.
func CalculateTrainingOverride(cnsStatus CNSStatus, plannedSessions []TrainingSession) []TrainingOverride {
	if cnsStatus != CNSStatusDepleted {
		return nil
	}

	var overrides []TrainingOverride
	for _, session := range plannedSessions {
		override := TrainingOverride{
			OriginalType:     session.Type,
			OriginalDuration: session.DurationMin,
		}

		// Downgrade intensity based on training type
		switch session.Type {
		case TrainingTypeStrength, TrainingTypeHIIT:
			// High intensity -> mobility or rest
			override.ShouldOverride = true
			override.RecommendedType = TrainingTypeMobility
			override.RecommendedDuration = min(session.DurationMin, MaxMobilityDuration)
			override.Reason = "CNS depleted: high-intensity training not recommended"

		case TrainingTypeCalisthenics, TrainingTypeRun, TrainingTypeRow, TrainingTypeCycle, TrainingTypeMixed:
			// Moderate intensity -> walking or qigong
			override.ShouldOverride = true
			override.RecommendedType = TrainingTypeWalking
			override.RecommendedDuration = min(session.DurationMin, MaxWalkingDuration)
			override.Reason = "CNS depleted: reduce to low-intensity activity"

		case TrainingTypeGMB:
			// GMB is moderate intensity -> qigong
			override.ShouldOverride = true
			override.RecommendedType = TrainingTypeQigong
			override.RecommendedDuration = min(session.DurationMin, MaxMobilityDuration)
			override.Reason = "CNS depleted: reduce to gentle movement"

		default:
			// Rest, Walking, Qigong, Mobility - low intensity, no change needed
			override.ShouldOverride = false
		}

		if override.ShouldOverride {
			overrides = append(overrides, override)
		}
	}

	return overrides
}
