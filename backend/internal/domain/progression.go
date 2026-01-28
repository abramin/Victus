package domain

// =============================================================================
// PROGRESSION PATTERN TYPES
// =============================================================================

// ProgressionType discriminates between strength-based and skill-based progression.
type ProgressionType string

const (
	ProgressionTypeStrength ProgressionType = "strength"
	ProgressionTypeSkill    ProgressionType = "skill"
)

// ValidProgressionTypes contains all valid progression type values.
var ValidProgressionTypes = map[ProgressionType]bool{
	ProgressionTypeStrength: true,
	ProgressionTypeSkill:    true,
}

// ParseProgressionType safely converts a string to ProgressionType with validation.
func ParseProgressionType(s string) (ProgressionType, error) {
	pt := ProgressionType(s)
	if !ValidProgressionTypes[pt] {
		return "", ErrInvalidProgressionType
	}
	return pt, nil
}

// ProgressionPattern is an optional configuration attached to a ProgramDay.
// When nil, the day behaves exactly as before (no auto-progression).
type ProgressionPattern struct {
	Type     ProgressionType `json:"type"`
	Strength *StrengthConfig `json:"strength,omitempty"`
	Skill    *SkillConfig    `json:"skill,omitempty"`
}

// StrengthConfig holds parameters for strength-based (e.g., 5x5) linear progression.
type StrengthConfig struct {
	BaseWeight       float64 `json:"baseWeight"`       // Starting weight in kg (> 0)
	IncrementUnit    float64 `json:"incrementUnit"`    // Weight added per successful session (0.5–20.0 kg)
	SuccessThreshold float64 `json:"successThreshold"` // Fraction of planned sets required to progress (0.5–1.0)
	DeloadFrequency  int     `json:"deloadFrequency"`  // Deload every N sessions (1–12)
}

// SkillConfig holds parameters for skill-based (GMB / Calimove) time-on-tension progression.
type SkillConfig struct {
	MinSeconds int     `json:"minSeconds"` // Minimum time-on-tension target in seconds (> 0)
	MaxSeconds int     `json:"maxSeconds"` // Maximum time-on-tension target in seconds (> MinSeconds)
	RPETarget  float64 `json:"rpeTarget"`  // Target RPE for the hold (1.0–10.0)
}

// =============================================================================
// PROGRESSION VALIDATION CONSTANTS
// =============================================================================

const (
	MinSuccessThreshold  = 0.5
	MaxSuccessThreshold  = 1.0
	MinIncrementUnit     = 0.5
	MaxIncrementUnit     = 20.0
	MinDeloadFrequency   = 1
	MaxDeloadFrequency   = 12
	MinRPETarget         = 1.0
	MaxRPETarget         = 10.0
	SkillWindowShiftSecs = 2 // seconds to shift the TM window on progression/regression
	DeloadWeightFactor   = 0.9
)

// =============================================================================
// PROGRESSION VALIDATION
// =============================================================================

// ValidateProgressionPattern checks that a pattern's fields are self-consistent.
func ValidateProgressionPattern(p *ProgressionPattern) error {
	if p == nil {
		return nil
	}

	switch p.Type {
	case ProgressionTypeStrength:
		if p.Strength == nil {
			return ErrProgressionTypeMismatch
		}
		if p.Skill != nil {
			return ErrProgressionTypeMismatch
		}
		return validateStrengthConfig(p.Strength)

	case ProgressionTypeSkill:
		if p.Skill == nil {
			return ErrProgressionTypeMismatch
		}
		if p.Strength != nil {
			return ErrProgressionTypeMismatch
		}
		return validateSkillConfig(p.Skill)

	default:
		return ErrInvalidProgressionType
	}
}

func validateStrengthConfig(c *StrengthConfig) error {
	if c.BaseWeight <= 0 {
		return ErrInvalidStrengthConfig
	}
	if c.IncrementUnit < MinIncrementUnit || c.IncrementUnit > MaxIncrementUnit {
		return ErrInvalidStrengthConfig
	}
	if c.SuccessThreshold < MinSuccessThreshold || c.SuccessThreshold > MaxSuccessThreshold {
		return ErrInvalidStrengthConfig
	}
	if c.DeloadFrequency < MinDeloadFrequency || c.DeloadFrequency > MaxDeloadFrequency {
		return ErrInvalidStrengthConfig
	}
	return nil
}

func validateSkillConfig(c *SkillConfig) error {
	if c.MinSeconds <= 0 {
		return ErrInvalidSkillConfig
	}
	if c.MaxSeconds <= c.MinSeconds {
		return ErrInvalidSkillConfig
	}
	if c.RPETarget < MinRPETarget || c.RPETarget > MaxRPETarget {
		return ErrInvalidSkillConfig
	}
	return nil
}

// =============================================================================
// SESSION ADHERENCE & TARGET OUTPUT
// =============================================================================

// SessionAdherence captures what actually happened in the previous session.
// Populated by the caller before invoking CalculateNextTargets.
type SessionAdherence struct {
	PlannedSets    int     // How many sets were scheduled (0 = deload sentinel for strength)
	CompletedSets  int     // How many sets were actually completed
	TimeHeldSec    int     // Total seconds of time-on-tension achieved (skill pattern)
	TargetTimeMin  int     // Min target that was in effect (skill pattern)
	TargetTimeMax  int     // Max target that was in effect (skill pattern)
	LastBaseWeight float64 // Base weight used in the previous session (strength pattern)
}

// TargetOutput is the result of progression calculation for the next session.
type TargetOutput struct {
	BaseWeight      float64 `json:"baseWeight"`      // Computed next base weight (strength)
	TargetTimeMin   int     `json:"targetTimeMin"`   // Computed min seconds (skill)
	TargetTimeMax   int     `json:"targetTimeMax"`   // Computed max seconds (skill)
	IsDeloadSession bool    `json:"isDeloadSession"` // True if this is a deload session
	Progression     string  `json:"progression"`     // Human-readable status
}

// =============================================================================
// CORE PROGRESSION LOGIC
// =============================================================================

// CalculateNextTargets computes the next session's targets based on a progression
// pattern and what happened in the last session. Pure: no context, no I/O.
// This function is stubbed (not wired to any endpoint) in Phase 1 and becomes
// callable once Phase 3 (Active Session UI) provides real adherence data.
func CalculateNextTargets(pattern ProgressionPattern, last SessionAdherence) TargetOutput {
	switch pattern.Type {
	case ProgressionTypeStrength:
		return calculateStrengthProgression(pattern.Strength, last)
	case ProgressionTypeSkill:
		return calculateSkillProgression(pattern.Skill, last)
	default:
		return TargetOutput{Progression: "Unknown pattern type"}
	}
}

func calculateStrengthProgression(cfg *StrengthConfig, last SessionAdherence) TargetOutput {
	if cfg == nil {
		return TargetOutput{Progression: "No strength config"}
	}

	// PlannedSets == 0 is the deload sentinel
	if last.PlannedSets == 0 {
		return TargetOutput{
			BaseWeight:      last.LastBaseWeight * DeloadWeightFactor,
			IsDeloadSession: true,
			Progression:     "Deload session",
		}
	}

	adherenceRatio := float64(last.CompletedSets) / float64(last.PlannedSets)

	if adherenceRatio >= cfg.SuccessThreshold {
		nextWeight := last.LastBaseWeight + cfg.IncrementUnit
		return TargetOutput{
			BaseWeight:  nextWeight,
			Progression: progressionLabel("+", cfg.IncrementUnit),
		}
	}

	return TargetOutput{
		BaseWeight:  last.LastBaseWeight,
		Progression: "Hold",
	}
}

func calculateSkillProgression(cfg *SkillConfig, last SessionAdherence) TargetOutput {
	if cfg == nil {
		return TargetOutput{Progression: "No skill config"}
	}

	minSec := last.TargetTimeMin
	maxSec := last.TargetTimeMax

	if last.TimeHeldSec >= last.TargetTimeMax {
		// Exceeded max target → advance window
		minSec += SkillWindowShiftSecs
		maxSec += SkillWindowShiftSecs
		return TargetOutput{
			TargetTimeMin: minSec,
			TargetTimeMax: maxSec,
			Progression:   "Window advanced",
		}
	}

	if last.TimeHeldSec < last.TargetTimeMin {
		// Fell short of min target → regress window (floor at 0)
		minSec -= SkillWindowShiftSecs
		maxSec -= SkillWindowShiftSecs
		if minSec < 0 {
			minSec = 0
		}
		if maxSec < minSec {
			maxSec = minSec + SkillWindowShiftSecs
		}
		return TargetOutput{
			TargetTimeMin: minSec,
			TargetTimeMax: maxSec,
			Progression:   "Window regressed",
		}
	}

	// Within range → hold
	return TargetOutput{
		TargetTimeMin: last.TargetTimeMin,
		TargetTimeMax: last.TargetTimeMax,
		Progression:   "Hold",
	}
}

func progressionLabel(direction string, amount float64) string {
	if amount == float64(int(amount)) {
		return "Progressed " + direction + itoa(int(amount)) + "kg"
	}
	return "Progressed " + direction + ftoa(amount) + "kg"
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	neg := i < 0
	if neg {
		i = -i
	}
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	if neg {
		s = "-" + s
	}
	return s
}

func ftoa(f float64) string {
	// Simple formatting for weights like 2.5, 5.0
	intPart := int(f)
	fracPart := int((f - float64(intPart)) * 10)
	if fracPart == 0 {
		return itoa(intPart) + ".0"
	}
	return itoa(intPart) + "." + itoa(fracPart)
}
