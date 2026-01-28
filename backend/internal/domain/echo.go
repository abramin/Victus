package domain

import "fmt"

// EchoLogResult represents the parsed output from Ollama for a session echo.
// The echo allows users to provide post-workout reflection in natural language,
// which gets parsed into structured feedback about achievements, body status, and RPE adjustments.
type EchoLogResult struct {
	// Achievements lists specific PRs, milestones, or notable accomplishments.
	// Example: ["30s handstand", "10 pull-ups PR"]
	Achievements []string `json:"achievements"`

	// JointIntegrityDelta maps body parts to integrity changes (-1 to +1).
	// Positive values indicate improvement (feeling better, more mobile).
	// Negative values indicate degradation (sore, tight, painful).
	// Valid keys are body aliases from BodyAliasToMuscleGroup.
	JointIntegrityDelta map[string]float64 `json:"joint_integrity_delta"`

	// PerceivedExertionOffset adjusts the initial RPE (-3 to +3).
	// Positive means the session felt harder than initially logged.
	// Negative means the session felt easier.
	PerceivedExertionOffset int `json:"perceived_exertion_offset"`
}

// ValidateEchoResult ensures the Ollama output is within expected bounds.
func ValidateEchoResult(result EchoLogResult) error {
	// RPE offset: -3 to +3 reasonable range
	if result.PerceivedExertionOffset < -3 || result.PerceivedExertionOffset > 3 {
		return fmt.Errorf("%w: RPE offset %d out of range [-3, +3]", ErrInvalidRPEOffset, result.PerceivedExertionOffset)
	}

	// Joint deltas: -1 to +1
	for joint, delta := range result.JointIntegrityDelta {
		if delta < -1.0 || delta > 1.0 {
			return fmt.Errorf("%w: joint %s delta %.2f out of range [-1, +1]", ErrInvalidJointDelta, joint, delta)
		}
	}

	return nil
}

// EchoSessionContext provides context about the session being echoed.
// Used to help Ollama understand what kind of workout the user is reflecting on.
type EchoSessionContext struct {
	TrainingType TrainingType
	DurationMin  int
	InitialRPE   int
	Notes        string
}

// DeltaToSeverity maps a joint integrity delta to an IssueSeverity.
// Positive deltas (improvements) map to IssueSeverityHealing.
// Negative deltas map to standard severities based on magnitude.
func DeltaToSeverity(delta float64) IssueSeverity {
	if delta >= 0 {
		return IssueSeverityHealing
	}

	absDelta := -delta
	switch {
	case absDelta <= 0.3:
		return IssueSeverityMinor
	case absDelta <= 0.6:
		return IssueSeverityModerate
	default:
		return IssueSeveritySevere
	}
}

// DeltaToSymptom returns an appropriate symptom keyword based on the delta value.
func DeltaToSymptom(delta float64) string {
	if delta >= 0 {
		if delta >= 0.5 {
			return "recovered"
		}
		return "improved"
	}

	absDelta := -delta
	switch {
	case absDelta <= 0.3:
		return "tight"
	case absDelta <= 0.6:
		return "sore"
	default:
		return "painful"
	}
}
