package domain

import "math"

// CNS Deviation thresholds based on sports science literature.
// HRV deviation from baseline indicates CNS fatigue/recovery state.

// HRV Status Detection Criteria (all must be met for "depleted"):
// 1. HRV drops >20% below 7-day average
// 2. Stays low (>20% below baseline) for 3+ consecutive days
// 3. Resting HR increases 5–10% from baseline
const (
	HRVDropThreshold      = -0.20 // >20% drop = potential fatigue signal
	MinConsecutiveLowDays = 3     // Must stay low for at least 3 days
	RestingHRIncreaseMin  = 0.05  // Minimum 5% RHR increase
	RestingHRIncreaseMax  = 0.10  // Maximum 10% RHR increase (above is concerning)
	HRVBaselineWindowDays = 7     // Days for HRV baseline calculation
	RestingHRWindowDays   = 7     // Days for RHR baseline calculation
	MinHRVHistoryPoints   = 3     // Minimum HRV values for baseline
	MinRestingHRPoints    = 3     // Minimum RHR values for baseline
)

// CNSResult contains the HRV analysis result.
type CNSResult struct {
	CurrentHRV             int       `json:"currentHrv"`             // Today's HRV in ms
	BaselineHRV            float64   `json:"baselineHrv"`            // 7-day moving average
	DeviationPct           float64   `json:"deviationPct"`           // (current - baseline) / baseline
	CurrentRestingHR       *int      `json:"currentRestingHr"`       // Today's resting HR (may be nil)
	BaselineRestingHR      *float64  `json:"baselineRestingHr"`      // 7-day average RHR (may be nil)
	RestingHRChangePercent *float64  `json:"restingHrChangePercent"` // RHR change from baseline
	Status                 CNSStatus `json:"status"`                 // optimized, strained, depleted
	DepletionReason        string    `json:"depletionReason"`        // Why status is depleted (diagnostic)
	ReferenceMin           *int      `json:"referenceMin"`           // Garmin reference range minimum (may be nil)
	ReferenceMax           *int      `json:"referenceMax"`           // Garmin reference range maximum (may be nil)
	BelowReference         bool      `json:"belowReference"`         // True if 7-day average is below reference minimum
	ReferenceRatio         *float64  `json:"referenceRatio"`         // 7-day average / reference min (may be nil)
}

// CNSInput contains data for CNS calculation.
type CNSInput struct {
	CurrentHRV       int   // Today's HRV in ms
	HRVHistory       []int // Last N days of HRV values (oldest to newest, not including today)
	CurrentRestingHR *int  // Today's resting HR (optional, nil if not available)
	RestingHRHistory []int // Last N days of RHR values (oldest to newest, not including today)
	ReferenceMin     *int  // Garmin HRV reference range minimum (optional, nil if not available)
	ReferenceMax     *int  // Garmin HRV reference range maximum (optional, nil if not available)
}

// CalculateCNSStatus computes CNS status from HRV data and optional RHR validation.
// Returns nil if insufficient data (no current HRV or fewer than MinHRVHistoryPoints history).
//
// Depleted status requires ALL THREE conditions:
// 1. HRV drops >20% below baseline
// 2. Stays low for 3+ consecutive days
// 3. Resting HR increases 5-10% from baseline
func CalculateCNSStatus(input CNSInput) *CNSResult {
	if input.CurrentHRV <= 0 {
		return nil
	}

	// Filter valid HRV values from history
	validHRVHistory := make([]int, 0, len(input.HRVHistory))
	for _, hrv := range input.HRVHistory {
		if hrv > 0 {
			validHRVHistory = append(validHRVHistory, hrv)
		}
	}

	// Need minimum history to calculate baseline
	if len(validHRVHistory) < MinHRVHistoryPoints {
		return nil
	}

	// Calculate 7-day moving average baseline for HRV
	var hrvSum float64
	for _, hrv := range validHRVHistory {
		hrvSum += float64(hrv)
	}
	hrvBaseline := hrvSum / float64(len(validHRVHistory))

	// Calculate HRV deviation as percentage
	hrvDeviation := (float64(input.CurrentHRV) - hrvBaseline) / hrvBaseline

	// Check if HRV drops >20% below baseline
	isHRVDropped := hrvDeviation < HRVDropThreshold

	// Check if HRV stays low for 3+ consecutive days
	consecutiveLowDays := countConsecutiveLowDays(validHRVHistory, input.CurrentHRV, hrvBaseline)
	isHRVLowConsecutive := consecutiveLowDays >= MinConsecutiveLowDays

	// Calculate resting HR metrics (optional, for enhanced detection)
	var restingHRChangePercent *float64
	var rhrBaseline *float64
	isRestingHRIncreased := false

	validRHRHistory := make([]int, 0, len(input.RestingHRHistory))
	for _, rhr := range input.RestingHRHistory {
		if rhr > 0 {
			validRHRHistory = append(validRHRHistory, rhr)
		}
	}

	// If we have sufficient RHR history and current RHR
	if input.CurrentRestingHR != nil && len(validRHRHistory) >= MinRestingHRPoints {
		var rhrSum float64
		for _, rhr := range validRHRHistory {
			rhrSum += float64(rhr)
		}
		baseline := rhrSum / float64(len(validRHRHistory))
		rhrBaseline = &baseline

		// Calculate RHR change percentage
		rhrChange := (float64(*input.CurrentRestingHR) - baseline) / baseline
		restingHRChangePercent = &rhrChange

		// Check if RHR increased 5-10%
		isRestingHRIncreased = rhrChange >= RestingHRIncreaseMin && rhrChange <= RestingHRIncreaseMax
	}

	// Determine status based on personal baseline deviation
	status := CNSStatusOptimized
	depletionReason := ""

	// All three conditions must be met for depleted status (personal baseline check)
	if isHRVDropped && isHRVLowConsecutive {
		if input.CurrentRestingHR != nil && rhrBaseline != nil && isRestingHRIncreased {
			// All conditions met - CNS is depleted
			status = CNSStatusDepleted
			depletionReason = "HRV dropped >20%, stayed low 3+ days, RHR increased 5-10%"
		} else if input.CurrentRestingHR == nil || rhrBaseline == nil {
			// HRV conditions met but missing RHR data - use strained as precaution
			status = CNSStatusStrained
			depletionReason = "HRV dropped >20% and stayed low 3+ days (RHR data unavailable for confirmation)"
		}
		// If RHR doesn't meet criteria, don't flag as depleted
	}

	// Check reference range (if available)
	belowReference := false
	var referenceRatio *float64

	if input.ReferenceMin != nil && *input.ReferenceMin > 0 {
		// Compare 7-day average against reference minimum
		if hrvBaseline < float64(*input.ReferenceMin) {
			belowReference = true
			ratio := hrvBaseline / float64(*input.ReferenceMin)
			referenceRatio = &ratio

			// If currently optimized but below reference, upgrade to strained
			if status == CNSStatusOptimized {
				status = CNSStatusStrained
				depletionReason = "7-day HRV average below reference range minimum"
			} else {
				// Already strained/depleted from baseline check, append reference violation
				depletionReason += " (also below reference range)"
			}
		}
	}

	return &CNSResult{
		CurrentHRV:             input.CurrentHRV,
		BaselineHRV:            math.Round(hrvBaseline*10) / 10,
		DeviationPct:           math.Round(hrvDeviation*1000) / 1000,
		CurrentRestingHR:       input.CurrentRestingHR,
		BaselineRestingHR:      rhrBaseline,
		RestingHRChangePercent: restingHRChangePercent,
		Status:                 status,
		DepletionReason:        depletionReason,
		ReferenceMin:           input.ReferenceMin,
		ReferenceMax:           input.ReferenceMax,
		BelowReference:         belowReference,
		ReferenceRatio:         referenceRatio,
	}
}

// countConsecutiveLowDays counts how many consecutive days (including today) HRV stayed >20% below baseline.
// Current HRV (today) is included if it's low. Then we count backwards through history.
func countConsecutiveLowDays(hrvHistory []int, currentHRV int, baseline float64) int {
	count := 0

	// Check today (currentHRV)
	if float64(currentHRV) < baseline*(1+HRVDropThreshold) {
		count = 1
	} else {
		// Today is not low - no consecutive low period
		return 0
	}

	// Count backwards through history (historia is oldest to newest)
	for i := len(hrvHistory) - 1; i >= 0 && count < MinConsecutiveLowDays; i-- {
		if float64(hrvHistory[i]) < baseline*(1+HRVDropThreshold) {
			count++
		} else {
			// Streak broken
			break
		}
	}

	return count
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
