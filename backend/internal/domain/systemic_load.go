package domain

import "math"

// SystemicLoadState represents the combined neural/mechanical load balance state.
type SystemicLoadState string

const (
	SystemicLoadPrimeState        SystemicLoadState = "prime_state"        // Both < 50%
	SystemicLoadCerebralOverheat  SystemicLoadState = "cerebral_overheat"  // Neural > 70%, Mech < 50%
	SystemicLoadStructuralFailure SystemicLoadState = "structural_failure" // Neural < 50%, Mech > 70%
	SystemicLoadSystemCritical    SystemicLoadState = "system_critical"    // Both > 70%
	SystemicLoadElevated          SystemicLoadState = "elevated"           // One or both between 50-70%
)

// State thresholds.
const (
	SystemicLoadHighThreshold = 70.0
	SystemicLoadLowThreshold  = 50.0
)

// Neural load component weights (must sum to 1.0).
const (
	NeuralWeightHRV   = 0.50
	NeuralWeightSleep = 0.30
	NeuralWeightRHR   = 0.20
	// Fallback weights when HRV is unavailable.
	NeuralFallbackWeightSleep = 0.60
	NeuralFallbackWeightRHR   = 0.40
)

// Max tilt angle in degrees (positive = mechanical heavy, negative = neural heavy).
const MaxTiltDegrees = 45.0

// SystemicLoadInput contains all data needed for the systemic load calculation.
type SystemicLoadInput struct {
	NeuralBattery *NeuralBattery // HRV-derived CNS readiness (may be nil)
	SleepQuality  SleepQuality  // 1-100 (today's)
	RecoveryScore *RecoveryScore // Recovery score with RHR component (may be nil)
	BodyStatus    *BodyStatus    // Muscle fatigue state (may be nil)
}

// SystemicLoad contains the computed dual-axis load.
type SystemicLoad struct {
	NeuralLoadPct     float64           `json:"neuralLoadPct"`
	MechanicalLoadPct float64           `json:"mechanicalLoadPct"`
	State             SystemicLoadState `json:"state"`
	TiltDegrees       float64           `json:"tiltDegrees"`
	Imbalance         float64           `json:"imbalance"`
	StatusColor       string            `json:"statusColor"`
	StatusLabel       string            `json:"statusLabel"`
}

// SystemicPrescription contains the Ollama-generated or fallback tactical prescription.
type SystemicPrescription struct {
	StatusCode       SystemicLoadState `json:"statusCode"`
	Diagnosis        string            `json:"diagnosis"`
	PrescriptionName string            `json:"prescriptionName"`
	Rationale        string            `json:"rationale"`
	AllowedTags      []string          `json:"allowedTags"`
	DifficultyCap    int               `json:"difficultyCap"`
	GeneratedByLLM   bool              `json:"generatedByLlm"`
}

// CalculateNeuralLoad computes neural load as a 0-100 percentage (high = fatigued).
// Weighted composition: 50% HRV deviation, 30% sleep deficit, 20% RHR deviation.
// Falls back to 60/40 sleep/RHR when HRV data is unavailable.
func CalculateNeuralLoad(input SystemicLoadInput) float64 {
	// Sleep load: invert quality (high quality = low load)
	sleepLoad := 100.0 - clampFloat(float64(input.SleepQuality), 0, 100)

	// RHR load: derive from recovery score RHR component (0-15 pts, higher = better)
	var rhrLoad float64
	if input.RecoveryScore != nil {
		// Invert: max RHR component (15) = 0 load, 0 component = 100 load
		rhrLoad = (1.0 - input.RecoveryScore.RHRComponent/RHRComponentMax) * 100.0
	} else {
		rhrLoad = 50.0 // neutral default when unavailable
	}

	if input.NeuralBattery != nil {
		// HRV load: invert battery percentage (high battery = low neural load)
		hrvLoad := 100.0 - clampFloat(input.NeuralBattery.Percentage, 0, 100)
		return clampFloat(
			NeuralWeightHRV*hrvLoad+NeuralWeightSleep*sleepLoad+NeuralWeightRHR*rhrLoad,
			0, 100,
		)
	}

	// Fallback: no HRV data, redistribute weights
	return clampFloat(
		NeuralFallbackWeightSleep*sleepLoad+NeuralFallbackWeightRHR*rhrLoad,
		0, 100,
	)
}

// CalculateMechanicalLoad returns the overall muscle fatigue score (0-100).
func CalculateMechanicalLoad(bodyStatus *BodyStatus) float64 {
	if bodyStatus == nil {
		return 0
	}
	return clampFloat(bodyStatus.OverallScore, 0, 100)
}

// DetermineSystemicState classifies the dual-axis load into a discrete state.
func DetermineSystemicState(neuralPct, mechPct float64) SystemicLoadState {
	neuralHigh := neuralPct > SystemicLoadHighThreshold
	neuralLow := neuralPct < SystemicLoadLowThreshold
	mechHigh := mechPct > SystemicLoadHighThreshold
	mechLow := mechPct < SystemicLoadLowThreshold

	switch {
	case neuralHigh && mechHigh:
		return SystemicLoadSystemCritical
	case neuralHigh && mechLow:
		return SystemicLoadCerebralOverheat
	case neuralLow && mechHigh:
		return SystemicLoadStructuralFailure
	case neuralLow && mechLow:
		return SystemicLoadPrimeState
	default:
		return SystemicLoadElevated
	}
}

// CalculateSystemicLoad computes the full dual-axis load from input data.
func CalculateSystemicLoad(input SystemicLoadInput) SystemicLoad {
	neuralPct := math.Round(CalculateNeuralLoad(input)*10) / 10
	mechPct := math.Round(CalculateMechanicalLoad(input.BodyStatus)*10) / 10
	state := DetermineSystemicState(neuralPct, mechPct)

	// Tilt: positive = mechanical heavy (tilts right), negative = neural heavy (tilts left)
	tilt := (mechPct - neuralPct) / 100.0 * MaxTiltDegrees
	tilt = math.Round(tilt*10) / 10

	imbalance := math.Abs(neuralPct - mechPct)

	color, label := systemicStateVisuals(state)

	return SystemicLoad{
		NeuralLoadPct:     neuralPct,
		MechanicalLoadPct: mechPct,
		State:             state,
		TiltDegrees:       tilt,
		Imbalance:         math.Round(imbalance*10) / 10,
		StatusColor:       color,
		StatusLabel:       label,
	}
}

// GenerateFallbackPrescription returns a deterministic prescription based on state.
func GenerateFallbackPrescription(load SystemicLoad) SystemicPrescription {
	switch load.State {
	case SystemicLoadCerebralOverheat:
		return SystemicPrescription{
			StatusCode:       load.State,
			Diagnosis:        "Brain Fried, Body Fresh.",
			PrescriptionName: "Mindless Grind",
			Rationale:        "Flush blood, burn energy, zero CNS decision fatigue. Rhythmic, low-complexity movement only.",
			AllowedTags:      []string{"CaliMove", "Zone 2"},
			DifficultyCap:    5,
			GeneratedByLLM:   false,
		}
	case SystemicLoadStructuralFailure:
		return SystemicPrescription{
			StatusCode:       load.State,
			Diagnosis:        "Body Wrecked, Brain Sharp.",
			PrescriptionName: "Neural Ignition",
			Rationale:        "Spark the CNS without tearing more muscle fiber. High skill, low impact, reactive speed.",
			AllowedTags:      []string{"GMB", "skill"},
			DifficultyCap:    8,
			GeneratedByLLM:   false,
		}
	case SystemicLoadSystemCritical:
		return SystemicPrescription{
			StatusCode:       load.State,
			Diagnosis:        "Total System Failure Imminent.",
			PrescriptionName: "Full Reboot",
			Rationale:        "Parasympathetic activation only. Sleep, breathwork, gentle mobility.",
			AllowedTags:      []string{"mobility"},
			DifficultyCap:    3,
			GeneratedByLLM:   false,
		}
	case SystemicLoadElevated:
		return SystemicPrescription{
			StatusCode:       load.State,
			Diagnosis:        "Systems warm. Moderate output.",
			PrescriptionName: "Controlled Effort",
			Rationale:        "Load is manageable but elevated. Moderate intensity with focus on technique.",
			AllowedTags:      []string{"CaliMove", "GMB", "skill"},
			DifficultyCap:    7,
			GeneratedByLLM:   false,
		}
	default: // prime_state
		return SystemicPrescription{
			StatusCode:       load.State,
			Diagnosis:        "All Systems Nominal.",
			PrescriptionName: "Go For Kill",
			Rationale:        "Full clearance. Max effort, high complexity, high volume.",
			AllowedTags:      []string{"CaliMove", "GMB", "skill", "power", "Zone 2"},
			DifficultyCap:    10,
			GeneratedByLLM:   false,
		}
	}
}

func systemicStateVisuals(state SystemicLoadState) (color, label string) {
	switch state {
	case SystemicLoadPrimeState:
		return "#22c55e", "SYSTEM STABLE"
	case SystemicLoadCerebralOverheat:
		return "#f97316", "CEREBRAL OVERHEAT"
	case SystemicLoadStructuralFailure:
		return "#f97316", "STRUCTURAL FAILURE"
	case SystemicLoadSystemCritical:
		return "#ef4444", "SYSTEM CRITICAL"
	case SystemicLoadElevated:
		return "#eab308", "ELEVATED"
	default:
		return "#22c55e", "SYSTEM STABLE"
	}
}

func clampFloat(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
