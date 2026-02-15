package domain

import "time"

// MovementCategory represents the primary movement pattern.
type MovementCategory string

const (
	MovementCategoryLocomotion MovementCategory = "locomotion"
	MovementCategoryPush       MovementCategory = "push"
	MovementCategoryPull       MovementCategory = "pull"
	MovementCategoryLegs       MovementCategory = "legs"
	MovementCategoryCore       MovementCategory = "core"
	MovementCategorySkill      MovementCategory = "skill"
	MovementCategoryPower      MovementCategory = "power"
)

// ValidMovementCategories contains all valid movement category values.
var ValidMovementCategories = map[MovementCategory]bool{
	MovementCategoryLocomotion: true,
	MovementCategoryPush:       true,
	MovementCategoryPull:       true,
	MovementCategoryLegs:       true,
	MovementCategoryCore:       true,
	MovementCategorySkill:      true,
	MovementCategoryPower:      true,
}

// Movement represents an exercise in the Movement Taxonomy.
// Each movement has difficulty, joint stress metadata, and belongs to a progression chain.
type Movement struct {
	ID            string             `json:"id"`
	Name          string             `json:"name"`
	Category      MovementCategory   `json:"category"`
	Tags          []string           `json:"tags"`
	Difficulty    int                `json:"difficulty"`
	PrimaryLoad   string             `json:"primaryLoad"`
	JointStress   map[string]float64 `json:"jointStress"`
	ProgressionID string             `json:"progressionId"`
}

// UserMovementProgress tracks a user's progression for a specific movement.
type UserMovementProgress struct {
	MovementID         string     `json:"movementId"`
	UserDifficulty     int        `json:"userDifficulty"`
	SuccessfulSessions int        `json:"successfulSessions"`
	LastPerformedAt    *time.Time `json:"lastPerformedAt,omitempty"`
}

// ProgressionThreshold is the number of successful sessions before difficulty increments.
const ProgressionThreshold = 3

// MaxMovementDifficulty is the maximum difficulty level.
const MaxMovementDifficulty = 10

// MovementProgressionInput captures a session completion for progression calculation.
type MovementProgressionInput struct {
	CompletedReps  int  `json:"completedReps"`
	TargetReps     int  `json:"targetReps"`
	RPE            int  `json:"rpe"`
	HadFormIssue   bool `json:"hadFormIssue"`
}

// CalculateMovementProgression determines if a movement should progress in difficulty.
// Returns updated progress. Pure function — no I/O.
func CalculateMovementProgression(current UserMovementProgress, input MovementProgressionInput, now time.Time) UserMovementProgress {
	result := current

	// No progression if form correction was needed
	if input.HadFormIssue {
		return result
	}

	// No progression if RPE too high (grinding)
	if input.RPE > 8 {
		return result
	}

	// Count as successful if reps met target
	if input.TargetReps > 0 && input.CompletedReps >= input.TargetReps {
		result.SuccessfulSessions++
	}

	// Progress after threshold successful sessions
	if result.SuccessfulSessions >= ProgressionThreshold && result.UserDifficulty < MaxMovementDifficulty {
		result.UserDifficulty++
		result.SuccessfulSessions = 0
	}

	result.LastPerformedAt = &now
	return result
}

// NeuralBattery represents the UI-friendly CNS readiness output.
// Derived from CNSResult to provide intensity ceiling and display data.
type NeuralBattery struct {
	Percentage       float64   `json:"percentage"`
	Status           CNSStatus `json:"status"`
	Color            string    `json:"color"`
	IntensityCeiling int       `json:"intensityCeiling"`
	Recommendation   string    `json:"recommendation"`
}

// CalculateNeuralBattery converts a CNSResult into a NeuralBattery for the UI.
// Returns nil if no CNS data is available.
func CalculateNeuralBattery(cns *CNSResult) *NeuralBattery {
	if cns == nil {
		return nil
	}

	// Map deviation (-1.0 to +1.0) to percentage (0-100).
	// Deviation of 0 = 100%, deviation of -0.3 = 0%.
	pct := (cns.DeviationPct + 0.3) / 0.3 * 100
	if pct > 100 {
		pct = 100
	}
	if pct < 0 {
		pct = 0
	}

	nb := &NeuralBattery{
		Percentage: pct,
		Status:     cns.Status,
	}

	switch cns.Status {
	case CNSStatusOptimized:
		nb.Color = "#22c55e"
		nb.IntensityCeiling = 10
		nb.Recommendation = "CNS Primed. High-intensity power blocks enabled."
	case CNSStatusStrained:
		nb.Color = "#f97316"
		nb.IntensityCeiling = 7
		nb.Recommendation = "Nervous System Taxed. Capping difficulty at 7. Focus on Skill Flow."
	case CNSStatusDepleted:
		nb.Color = "#ef4444"
		nb.IntensityCeiling = 3
		nb.Recommendation = "Recovery Required. Suggesting Active Recovery/Mobility session."
	}

	return nb
}

// FilterMovementsByJointIntegrity removes movements that stress compromised joints.
// A movement is filtered out when any joint_stress > 0.6 AND that joint's integrity < 0.5.
// Also respects the intensity ceiling from the neural battery.
func FilterMovementsByJointIntegrity(movements []Movement, jointIntegrity map[string]float64, intensityCeiling int) []Movement {
	filtered := make([]Movement, 0, len(movements))
	for _, m := range movements {
		if m.Difficulty > intensityCeiling {
			continue
		}

		blocked := false
		for joint, stress := range m.JointStress {
			integrity, ok := jointIntegrity[joint]
			if ok && integrity < 0.5 && stress > 0.6 {
				blocked = true
				break
			}
		}
		if !blocked {
			filtered = append(filtered, m)
		}
	}
	return filtered
}

// FormCorrectionRequest is the input for Ollama form analysis.
type FormCorrectionRequest struct {
	MovementID   string `json:"movementId"`
	MovementName string `json:"movementName"`
	UserFeedback string `json:"userFeedback"`
}

// FormCorrectionResult is the output from Ollama form analysis.
type FormCorrectionResult struct {
	MechanicalError string  `json:"mechanicalError"`
	TacticalCue     string  `json:"tacticalCue"`
	Regression      *string `json:"regression,omitempty"`
}

// SeedMovements returns the initial movement taxonomy from the PRD.
func SeedMovements() []Movement {
	return []Movement{
		{ID: "gmb_bear", Name: "Bear Crawl", Category: MovementCategoryLocomotion, Tags: []string{"GMB"}, Difficulty: 3, PrimaryLoad: "Shoulder/Core", JointStress: map[string]float64{"wrist": 0.7, "shoulder": 0.4}, ProgressionID: "loco_01"},
		{ID: "gmb_monkey", Name: "Sideways Monkey", Category: MovementCategoryLocomotion, Tags: []string{"GMB"}, Difficulty: 4, PrimaryLoad: "Hip/Ankle", JointStress: map[string]float64{"wrist": 0.6, "ankle": 0.5}, ProgressionID: "loco_02"},
		{ID: "gmb_frogger", Name: "Frogger", Category: MovementCategoryLocomotion, Tags: []string{"GMB"}, Difficulty: 4, PrimaryLoad: "Wrist/Knee", JointStress: map[string]float64{"wrist": 0.8, "knee": 0.4}, ProgressionID: "loco_03"},
		{ID: "cali_pushup_knees", Name: "Knee Push-ups", Category: MovementCategoryPush, Tags: []string{"CaliMove"}, Difficulty: 2, PrimaryLoad: "Chest/Triceps", JointStress: map[string]float64{"wrist": 0.4, "elbow": 0.3}, ProgressionID: "push_horiz_01"},
		{ID: "cali_pushup_std", Name: "Standard Push-up", Category: MovementCategoryPush, Tags: []string{"CaliMove"}, Difficulty: 4, PrimaryLoad: "Chest/Triceps", JointStress: map[string]float64{"wrist": 0.6, "elbow": 0.4}, ProgressionID: "push_horiz_02"},
		{ID: "cali_dips_bench", Name: "Bench Dips", Category: MovementCategoryPush, Tags: []string{"CaliMove"}, Difficulty: 3, PrimaryLoad: "Triceps/Shoulder", JointStress: map[string]float64{"shoulder": 0.7, "elbow": 0.5}, ProgressionID: "push_vert_01"},
		{ID: "cali_dips_pbar", Name: "Parallel Bar Dips", Category: MovementCategoryPush, Tags: []string{"CaliMove"}, Difficulty: 6, PrimaryLoad: "Triceps/Chest", JointStress: map[string]float64{"shoulder": 0.8, "elbow": 0.6}, ProgressionID: "push_vert_02"},
		{ID: "cali_pullup_neg", Name: "Negative Pull-ups", Category: MovementCategoryPull, Tags: []string{"CaliMove"}, Difficulty: 4, PrimaryLoad: "Lats/Biceps", JointStress: map[string]float64{"elbow": 0.6, "shoulder": 0.4}, ProgressionID: "pull_vert_01"},
		{ID: "cali_pullup_std", Name: "Standard Pull-up", Category: MovementCategoryPull, Tags: []string{"CaliMove"}, Difficulty: 6, PrimaryLoad: "Lats/Biceps", JointStress: map[string]float64{"elbow": 0.5, "shoulder": 0.4}, ProgressionID: "pull_vert_02"},
		{ID: "cali_rows_inv", Name: "Inverted Rows", Category: MovementCategoryPull, Tags: []string{"CaliMove"}, Difficulty: 3, PrimaryLoad: "Upper Back", JointStress: map[string]float64{"elbow": 0.3, "shoulder": 0.2}, ProgressionID: "pull_horiz_01"},
		{ID: "cali_rows_arch", Name: "Archer Rows", Category: MovementCategoryPull, Tags: []string{"CaliMove"}, Difficulty: 7, PrimaryLoad: "Upper Back", JointStress: map[string]float64{"elbow": 0.7, "shoulder": 0.6}, ProgressionID: "pull_horiz_02"},
		{ID: "cali_squat_air", Name: "Air Squat", Category: MovementCategoryLegs, Tags: []string{"CaliMove"}, Difficulty: 2, PrimaryLoad: "Quads/Glutes", JointStress: map[string]float64{"knee": 0.3, "ankle": 0.2}, ProgressionID: "legs_01"},
		{ID: "cali_squat_pistol", Name: "Pistol Squat", Category: MovementCategoryLegs, Tags: []string{"CaliMove"}, Difficulty: 8, PrimaryLoad: "Quads/Glutes", JointStress: map[string]float64{"knee": 0.8, "ankle": 0.7}, ProgressionID: "legs_02"},
		{ID: "cali_lunge_std", Name: "Reverse Lunge", Category: MovementCategoryLegs, Tags: []string{"CaliMove"}, Difficulty: 3, PrimaryLoad: "Quads/Glutes", JointStress: map[string]float64{"knee": 0.4, "hip": 0.2}, ProgressionID: "legs_03"},
		{ID: "cali_plank_elbow", Name: "Elbow Plank", Category: MovementCategoryCore, Tags: []string{"CaliMove"}, Difficulty: 2, PrimaryLoad: "Core", JointStress: map[string]float64{"lower_back": 0.4}, ProgressionID: "core_01"},
		{ID: "cali_hollow_body", Name: "Hollow Body Hold", Category: MovementCategoryCore, Tags: []string{"CaliMove"}, Difficulty: 5, PrimaryLoad: "Core", JointStress: map[string]float64{"lower_back": 0.6}, ProgressionID: "core_02"},
		{ID: "cali_leg_raises", Name: "Hanging Leg Raises", Category: MovementCategoryCore, Tags: []string{"CaliMove"}, Difficulty: 7, PrimaryLoad: "Core/Hip Flexors", JointStress: map[string]float64{"shoulder": 0.5, "lower_back": 0.4}, ProgressionID: "core_03"},
		{ID: "cali_lsit_floor", Name: "Floor L-Sit", Category: MovementCategoryCore, Tags: []string{"CaliMove"}, Difficulty: 8, PrimaryLoad: "Core/Triceps", JointStress: map[string]float64{"wrist": 0.9, "elbow": 0.4}, ProgressionID: "core_04"},
		{ID: "cali_pike_press", Name: "Pike Push-up", Category: MovementCategoryPush, Tags: []string{"CaliMove"}, Difficulty: 6, PrimaryLoad: "Shoulders", JointStress: map[string]float64{"shoulder": 0.7, "wrist": 0.7}, ProgressionID: "push_ovh_01"},
		{ID: "cali_handstand_wall", Name: "Wall Handstand", Category: MovementCategorySkill, Tags: []string{"CaliMove"}, Difficulty: 7, PrimaryLoad: "Shoulders/Core", JointStress: map[string]float64{"wrist": 0.9, "shoulder": 0.6}, ProgressionID: "skill_01"},
	}
}
