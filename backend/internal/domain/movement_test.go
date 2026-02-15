package domain

import (
	"testing"
	"time"
)

func TestCalculateNeuralBattery_Nil(t *testing.T) {
	if got := CalculateNeuralBattery(nil); got != nil {
		t.Fatal("expected nil for nil CNS input")
	}
}

func TestCalculateNeuralBattery_Optimized(t *testing.T) {
	cns := &CNSResult{
		CurrentHRV:   60,
		BaselineHRV:  58.0,
		DeviationPct: 0.034,
		Status:       CNSStatusOptimized,
	}
	nb := CalculateNeuralBattery(cns)
	if nb == nil {
		t.Fatal("expected non-nil battery")
	}
	if nb.IntensityCeiling != 10 {
		t.Errorf("ceiling = %d, want 10", nb.IntensityCeiling)
	}
	if nb.Color != "#22c55e" {
		t.Errorf("color = %s, want green", nb.Color)
	}
	if nb.Percentage <= 80 {
		t.Errorf("percentage = %.1f, want > 80 for optimized", nb.Percentage)
	}
}

func TestCalculateNeuralBattery_Strained(t *testing.T) {
	cns := &CNSResult{
		DeviationPct: -0.15,
		Status:       CNSStatusStrained,
	}
	nb := CalculateNeuralBattery(cns)
	if nb.IntensityCeiling != 7 {
		t.Errorf("ceiling = %d, want 7", nb.IntensityCeiling)
	}
	if nb.Color != "#f97316" {
		t.Errorf("color = %s, want amber", nb.Color)
	}
}

func TestCalculateNeuralBattery_Depleted(t *testing.T) {
	cns := &CNSResult{
		DeviationPct: -0.25,
		Status:       CNSStatusDepleted,
	}
	nb := CalculateNeuralBattery(cns)
	if nb.IntensityCeiling != 3 {
		t.Errorf("ceiling = %d, want 3", nb.IntensityCeiling)
	}
	if nb.Color != "#ef4444" {
		t.Errorf("color = %s, want red", nb.Color)
	}
}

func TestFilterMovementsByJointIntegrity(t *testing.T) {
	movements := []Movement{
		{ID: "safe", Difficulty: 3, JointStress: map[string]float64{"wrist": 0.3}},
		{ID: "blocked_joint", Difficulty: 3, JointStress: map[string]float64{"wrist": 0.8}},
		{ID: "blocked_ceiling", Difficulty: 9, JointStress: map[string]float64{}},
	}
	jointIntegrity := map[string]float64{"wrist": 0.3} // compromised

	filtered := FilterMovementsByJointIntegrity(movements, jointIntegrity, 7)

	if len(filtered) != 1 {
		t.Fatalf("got %d movements, want 1", len(filtered))
	}
	if filtered[0].ID != "safe" {
		t.Errorf("got %s, want safe", filtered[0].ID)
	}
}

func TestCalculateMovementProgression_NoProgress(t *testing.T) {
	now := time.Now()
	current := UserMovementProgress{MovementID: "test", UserDifficulty: 3, SuccessfulSessions: 0}

	// Form issue blocks progression
	result := CalculateMovementProgression(current, MovementProgressionInput{
		CompletedReps: 10, TargetReps: 10, RPE: 6, HadFormIssue: true,
	}, now)
	if result.SuccessfulSessions != 0 {
		t.Errorf("sessions = %d, want 0 (form issue)", result.SuccessfulSessions)
	}

	// High RPE blocks progression
	result = CalculateMovementProgression(current, MovementProgressionInput{
		CompletedReps: 10, TargetReps: 10, RPE: 9, HadFormIssue: false,
	}, now)
	if result.SuccessfulSessions != 0 {
		t.Errorf("sessions = %d, want 0 (high RPE)", result.SuccessfulSessions)
	}
}

func TestCalculateMovementProgression_Increments(t *testing.T) {
	now := time.Now()
	current := UserMovementProgress{MovementID: "test", UserDifficulty: 3, SuccessfulSessions: 2}
	input := MovementProgressionInput{CompletedReps: 10, TargetReps: 10, RPE: 6}

	result := CalculateMovementProgression(current, input, now)
	if result.UserDifficulty != 4 {
		t.Errorf("difficulty = %d, want 4", result.UserDifficulty)
	}
	if result.SuccessfulSessions != 0 {
		t.Errorf("sessions = %d, want 0 (reset after progression)", result.SuccessfulSessions)
	}
}

func TestCalculateMovementProgression_MaxDifficulty(t *testing.T) {
	now := time.Now()
	current := UserMovementProgress{MovementID: "test", UserDifficulty: 10, SuccessfulSessions: 2}
	input := MovementProgressionInput{CompletedReps: 10, TargetReps: 10, RPE: 6}

	result := CalculateMovementProgression(current, input, now)
	if result.UserDifficulty != 10 {
		t.Errorf("difficulty = %d, want 10 (max)", result.UserDifficulty)
	}
}

func TestSeedMovements_Count(t *testing.T) {
	seeds := SeedMovements()
	if len(seeds) != 20 {
		t.Errorf("seed count = %d, want 20", len(seeds))
	}

	// Verify all have valid categories
	for _, m := range seeds {
		if !ValidMovementCategories[m.Category] {
			t.Errorf("invalid category %s for %s", m.Category, m.ID)
		}
		if m.Difficulty < 1 || m.Difficulty > 10 {
			t.Errorf("invalid difficulty %d for %s", m.Difficulty, m.ID)
		}
	}
}
