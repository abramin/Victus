package domain

import "math"

// =============================================================================
// METABOLIC FLUX ENGINE
// =============================================================================
//
// The Flux Engine adds production-grade constraints to adaptive TDEE calculation:
// - EMA weight smoothing to filter outliers (sodium/water retention)
// - Adherence gating (≥5 days/week required for updates)
// - Swing constraint (±100 kcal/week max change)
// - BMR floor (TDEE cannot drop below BMR)
//
// This wraps the existing CalculateAdaptiveTDEE with safety constraints.

// FluxConfig holds production constraints for TDEE updates.
type FluxConfig struct {
	MinAdherenceDays    int     // Minimum days logged per week (default: 5)
	AdherenceWindowDays int     // Window to check adherence (default: 7)
	MaxWeeklySwingKcal  float64 // Maximum TDEE change per week (default: 100)
	EMAAlpha            float64 // EMA smoothing factor 0-1 (default: 0.3)
}

// DefaultFluxConfig returns production default constraints from PRD.
var DefaultFluxConfig = FluxConfig{
	MinAdherenceDays:    5,   // >80% adherence = 5/7 days
	AdherenceWindowDays: 7,   // Weekly window
	MaxWeeklySwingKcal:  100, // ±100 kcal/week
	EMAAlpha:            0.3, // Moderate smoothing
}

// FluxInput contains data needed for Flux calculation.
type FluxInput struct {
	// Current BMR from profile/formula (floor constraint)
	CurrentBMR float64

	// Previous TDEE (for swing constraint)
	PreviousTDEE float64

	// Weight history for EMA smoothing (oldest to newest)
	WeightHistory []WeightDataPoint

	// Adaptive calculation result (if available)
	AdaptiveResult *AdaptiveTDEEResult

	// Formula TDEE as fallback
	FormulaTDEE int

	// Adherence: days logged in last 7 days
	AdherenceDays int
}

// WeightDataPoint represents a single weight measurement.
type WeightDataPoint struct {
	Date     string
	WeightKg float64
}

// FluxResult contains the calculated TDEE and audit metadata.
type FluxResult struct {
	// Final TDEE after all constraints
	TDEE int

	// Pre-constraint values
	RawTDEE      float64 // TDEE before constraints
	PreviousTDEE int     // Previous day's TDEE

	// Change tracking
	DeltaKcal int // Change from previous (positive = increase)

	// Constraint flags
	WasSwingConstrained  bool // True if max swing was applied
	BMRFloorApplied      bool // True if TDEE was raised to BMR
	AdherenceGatePassed  bool // True if ≥5 days logged
	UsedAdaptive         bool // True if adaptive TDEE was used

	// Calculation metadata
	EMASmoothedWeight float64 // Weight after EMA smoothing
	Confidence        float64 // From adaptive calculation (0-1)
	DataPointsUsed    int     // From adaptive calculation

	// Source tracking
	Source TDEESource
}

// FluxTDEESource represents the source of a Flux TDEE calculation.
type FluxTDEESource string

const (
	FluxSourceAdaptive FluxTDEESource = "flux"    // Adaptive with constraints
	FluxSourceFormula  FluxTDEESource = "formula" // Fell back to formula
)

// NotificationThresholdKcal is the minimum delta to trigger a weekly notification.
const NotificationThresholdKcal = 50

// CalculateFlux computes TDEE with all production constraints applied.
// This is the main entry point for the Flux Engine.
func CalculateFlux(input FluxInput, config FluxConfig) FluxResult {
	result := FluxResult{
		PreviousTDEE: int(input.PreviousTDEE),
		Source:       TDEESourceFormula, // Default
	}

	// Step 1: Check adherence gate
	result.AdherenceGatePassed = input.AdherenceDays >= config.MinAdherenceDays

	// Step 2: Calculate EMA-smoothed weight if history available
	if len(input.WeightHistory) > 0 {
		weights := make([]float64, len(input.WeightHistory))
		for i, wp := range input.WeightHistory {
			weights[i] = wp.WeightKg
		}
		smoothedWeights := CalculateEMAWeight(weights, config.EMAAlpha)
		result.EMASmoothedWeight = smoothedWeights[len(smoothedWeights)-1]
	}

	// Step 3: Determine raw TDEE
	var rawTDEE float64
	if result.AdherenceGatePassed && input.AdaptiveResult != nil && input.AdaptiveResult.Confidence >= 0.3 {
		// Use adaptive TDEE
		rawTDEE = input.AdaptiveResult.TDEE
		result.Confidence = input.AdaptiveResult.Confidence
		result.DataPointsUsed = input.AdaptiveResult.DataPointsUsed
		result.UsedAdaptive = true
		result.Source = TDEESourceAdaptive
	} else {
		// Fall back to formula TDEE
		rawTDEE = float64(input.FormulaTDEE)
		result.Source = TDEESourceFormula
	}
	result.RawTDEE = rawTDEE

	// Step 4: Apply BMR floor constraint
	constrainedTDEE, bmrApplied := ApplyBMRFloor(rawTDEE, input.CurrentBMR)
	result.BMRFloorApplied = bmrApplied

	// Step 5: Apply swing constraint (only if we have a previous TDEE)
	if input.PreviousTDEE > 0 {
		constrainedTDEE, result.WasSwingConstrained = ApplySwingConstraint(
			constrainedTDEE,
			input.PreviousTDEE,
			config.MaxWeeklySwingKcal,
		)
	}

	// Step 6: Round to final value
	result.TDEE = int(math.Round(constrainedTDEE))
	result.DeltaKcal = result.TDEE - result.PreviousTDEE

	return result
}

// CalculateEMAWeight applies Exponential Moving Average smoothing to weight data.
// EMA gives more weight to recent values while filtering sudden spikes (water/sodium).
// Alpha controls smoothing: higher = more reactive, lower = more stable.
// Typical alpha: 0.2-0.4. PRD suggests 0.3.
func CalculateEMAWeight(weights []float64, alpha float64) []float64 {
	if len(weights) == 0 {
		return weights
	}
	if alpha <= 0 || alpha > 1 {
		alpha = 0.3 // Default
	}

	result := make([]float64, len(weights))
	result[0] = weights[0] // First value is itself

	for i := 1; i < len(weights); i++ {
		// EMA formula: EMA_t = alpha * value_t + (1-alpha) * EMA_(t-1)
		result[i] = alpha*weights[i] + (1-alpha)*result[i-1]
	}

	return result
}

// ApplySwingConstraint limits TDEE change to ±maxSwing per week.
// Returns the constrained TDEE and whether constraint was applied.
func ApplySwingConstraint(newTDEE, previousTDEE, maxSwing float64) (float64, bool) {
	if previousTDEE <= 0 {
		return newTDEE, false // No previous reference
	}

	delta := newTDEE - previousTDEE

	// Check if within bounds
	if delta >= -maxSwing && delta <= maxSwing {
		return newTDEE, false // No constraint needed
	}

	// Apply constraint
	if delta > maxSwing {
		return previousTDEE + maxSwing, true
	}
	return previousTDEE - maxSwing, true
}

// ApplyBMRFloor ensures TDEE does not drop below BMR.
// Returns the constrained TDEE and whether floor was applied.
func ApplyBMRFloor(tdee, bmr float64) (float64, bool) {
	if bmr <= 0 {
		return tdee, false // No BMR reference
	}

	if tdee < bmr {
		return bmr, true
	}
	return tdee, false
}

// ValidateAdherence checks if enough days were logged in the window.
// Returns true if adherence meets minimum threshold.
func ValidateAdherence(loggedDays, windowDays, minDays int) bool {
	if windowDays <= 0 {
		return false
	}
	return loggedDays >= minDays
}

// ShouldTriggerNotification determines if a TDEE change warrants user notification.
func ShouldTriggerNotification(deltaKcal int) bool {
	return abs(deltaKcal) >= NotificationThresholdKcal
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// MetabolicHistoryRecord represents a single Flux calculation for audit trail.
type MetabolicHistoryRecord struct {
	ID          int64
	DailyLogID  int64
	CalculatedAt string

	// TDEE Values
	CalculatedTDEE int
	PreviousTDEE   int
	DeltaKcal      int
	TDEESource     string // "flux", "formula", "manual"

	// Constraints Applied
	WasSwingConstrained bool
	BMRFloorApplied     bool
	AdherenceGatePassed bool

	// Calculation Metadata
	Confidence     float64
	DataPointsUsed int
	EMAWeightKg    float64
	BMRValue       float64

	// Notification
	NotificationPending    bool
	NotificationDismissedAt string
}

// FluxNotification represents a pending weekly strategy update.
type FluxNotification struct {
	ID           int64
	PreviousTDEE int
	NewTDEE      int
	DeltaKcal    int
	Reason       string
	CreatedAt    string
}

// GenerateNotificationReason creates a human-readable reason for the TDEE change.
func GenerateNotificationReason(deltaKcal int, wasConstrained bool) string {
	if deltaKcal > 0 {
		if wasConstrained {
			return "Faster rate of loss detected. Change limited to +100 kcal for safety."
		}
		return "Faster rate of loss detected."
	}
	if wasConstrained {
		return "Slower rate of loss detected. Change limited to -100 kcal for safety."
	}
	return "Slower rate of loss detected."
}

// FluxChartData contains data for the Metabolism Graph visualization.
type FluxChartData struct {
	Points      []FluxChartPoint
	LatestTDEE  int
	AverageTDEE int
	DeltaKcal   int
	Trend       string // "upregulated", "downregulated", "stable"
	InsightText string
}

// FluxChartPoint represents a single point on the Metabolism Graph.
type FluxChartPoint struct {
	Date           string
	CalculatedTDEE int
	AverageIntake  int
	Confidence     float64
	WasConstrained bool
}

// GenerateInsightText creates the insight message for the Metabolism Graph.
func GenerateInsightText(trend string, deltaKcal int, weeks int) string {
	absDelta := deltaKcal
	if absDelta < 0 {
		absDelta = -absDelta
	}

	switch trend {
	case "upregulated":
		return formatInsight("Your metabolism has upregulated by +%d kcal in the last %d weeks. You can eat more while maintaining weight.", absDelta, weeks)
	case "downregulated":
		return formatInsight("Your metabolism has downregulated by -%d kcal in the last %d weeks. Consider a diet break or refeed.", absDelta, weeks)
	default:
		return "Your metabolism is stable. Keep up the consistent logging!"
	}
}

func formatInsight(format string, a, b int) string {
	// Simple formatting without fmt to keep domain pure
	result := format
	// Replace first %d
	for i := 0; i < len(result)-1; i++ {
		if result[i] == '%' && result[i+1] == 'd' {
			result = result[:i] + intToString(a) + result[i+2:]
			break
		}
	}
	// Replace second %d
	for i := 0; i < len(result)-1; i++ {
		if result[i] == '%' && result[i+1] == 'd' {
			result = result[:i] + intToString(b) + result[i+2:]
			break
		}
	}
	return result
}

// DetermineTrend analyzes TDEE history to determine metabolic trend.
func DetermineTrend(points []FluxChartPoint) (string, int) {
	if len(points) < 2 {
		return "stable", 0
	}

	// Compare first week average to last week average
	firstWeekEnd := min(7, len(points))
	lastWeekStart := max(0, len(points)-7)

	var firstSum, lastSum int
	for i := 0; i < firstWeekEnd; i++ {
		firstSum += points[i].CalculatedTDEE
	}
	for i := lastWeekStart; i < len(points); i++ {
		lastSum += points[i].CalculatedTDEE
	}

	firstAvg := firstSum / firstWeekEnd
	lastAvg := lastSum / (len(points) - lastWeekStart)
	delta := lastAvg - firstAvg

	if delta > 50 {
		return "upregulated", delta
	}
	if delta < -50 {
		return "downregulated", delta
	}
	return "stable", delta
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
