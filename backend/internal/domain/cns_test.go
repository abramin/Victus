package domain

import (
	"testing"
)

func TestCalculateCNSStatus(t *testing.T) {
	tests := []struct {
		name       string
		input      CNSInput
		wantNil    bool
		wantStatus CNSStatus
	}{
		{
			name: "nil when no current HRV",
			input: CNSInput{
				CurrentHRV: 0,
				HRVHistory: []int{45, 46, 47, 48, 49, 50, 51},
			},
			wantNil: true,
		},
		{
			name: "nil when insufficient history",
			input: CNSInput{
				CurrentHRV: 50,
				HRVHistory: []int{45, 46}, // Only 2 points
			},
			wantNil: true,
		},
		{
			name: "optimized when above baseline",
			input: CNSInput{
				CurrentHRV: 55,
				HRVHistory: []int{45, 46, 47, 48, 49, 50, 51}, // avg ~48
			},
			wantStatus: CNSStatusOptimized,
		},
		{
			name: "optimized when at baseline",
			input: CNSInput{
				CurrentHRV: 48,
				HRVHistory: []int{45, 46, 47, 48, 49, 50, 51}, // avg = 48
			},
			wantStatus: CNSStatusOptimized,
		},
		{
			name: "optimized when 5% below baseline",
			input: CNSInput{
				CurrentHRV: 46, // ~4% below 48
				HRVHistory: []int{45, 46, 47, 48, 49, 50, 51},
			},
			wantStatus: CNSStatusOptimized,
		},
		{
			name: "strained when 15% below baseline",
			input: CNSInput{
				CurrentHRV: 41, // ~15% below 48
				HRVHistory: []int{45, 46, 47, 48, 49, 50, 51},
			},
			wantStatus: CNSStatusStrained,
		},
		{
			name: "depleted when 25% below baseline",
			input: CNSInput{
				CurrentHRV: 36, // ~25% below 48
				HRVHistory: []int{45, 46, 47, 48, 49, 50, 51},
			},
			wantStatus: CNSStatusDepleted,
		},
		{
			name: "works with minimum history (3 points)",
			input: CNSInput{
				CurrentHRV: 50,
				HRVHistory: []int{45, 50, 55}, // avg = 50
			},
			wantStatus: CNSStatusOptimized,
		},
		{
			name: "filters zero values from history",
			input: CNSInput{
				CurrentHRV: 50,
				HRVHistory: []int{0, 45, 0, 50, 55, 0}, // only 3 valid
			},
			wantStatus: CNSStatusOptimized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateCNSStatus(tt.input)
			if tt.wantNil {
				if result != nil {
					t.Errorf("expected nil, got %+v", result)
				}
				return
			}
			if result == nil {
				t.Fatal("expected non-nil result")
			}
			if result.Status != tt.wantStatus {
				t.Errorf("status = %v, want %v (deviation: %.2f%%)",
					result.Status, tt.wantStatus, result.DeviationPct*100)
			}
		})
	}
}

func TestCalculateTrainingOverride(t *testing.T) {
	tests := []struct {
		name          string
		status        CNSStatus
		sessions      []TrainingSession
		wantOverrides int
		wantTypes     []TrainingType
	}{
		{
			name:          "no override for optimized",
			status:        CNSStatusOptimized,
			sessions:      []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 60}},
			wantOverrides: 0,
		},
		{
			name:          "no override for strained",
			status:        CNSStatusStrained,
			sessions:      []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 60}},
			wantOverrides: 0,
		},
		{
			name:          "override strength to mobility when depleted",
			status:        CNSStatusDepleted,
			sessions:      []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 60}},
			wantOverrides: 1,
			wantTypes:     []TrainingType{TrainingTypeMobility},
		},
		{
			name:          "override HIIT to mobility when depleted",
			status:        CNSStatusDepleted,
			sessions:      []TrainingSession{{Type: TrainingTypeHIIT, DurationMin: 45}},
			wantOverrides: 1,
			wantTypes:     []TrainingType{TrainingTypeMobility},
		},
		{
			name:          "override run to walking when depleted",
			status:        CNSStatusDepleted,
			sessions:      []TrainingSession{{Type: TrainingTypeRun, DurationMin: 60}},
			wantOverrides: 1,
			wantTypes:     []TrainingType{TrainingTypeWalking},
		},
		{
			name:          "no override for rest when depleted",
			status:        CNSStatusDepleted,
			sessions:      []TrainingSession{{Type: TrainingTypeRest, DurationMin: 0}},
			wantOverrides: 0,
		},
		{
			name:          "no override for walking when depleted",
			status:        CNSStatusDepleted,
			sessions:      []TrainingSession{{Type: TrainingTypeWalking, DurationMin: 30}},
			wantOverrides: 0,
		},
		{
			name:   "multiple session overrides",
			status: CNSStatusDepleted,
			sessions: []TrainingSession{
				{Type: TrainingTypeStrength, DurationMin: 60},
				{Type: TrainingTypeRun, DurationMin: 30},
				{Type: TrainingTypeWalking, DurationMin: 20},
			},
			wantOverrides: 2,
			wantTypes:     []TrainingType{TrainingTypeMobility, TrainingTypeWalking},
		},
		{
			name:          "duration capped for mobility",
			status:        CNSStatusDepleted,
			sessions:      []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 90}},
			wantOverrides: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			overrides := CalculateTrainingOverride(tt.status, tt.sessions)
			if len(overrides) != tt.wantOverrides {
				t.Errorf("got %d overrides, want %d", len(overrides), tt.wantOverrides)
			}
			for i, wantType := range tt.wantTypes {
				if i < len(overrides) && overrides[i].RecommendedType != wantType {
					t.Errorf("override[%d].RecommendedType = %v, want %v",
						i, overrides[i].RecommendedType, wantType)
				}
			}
		})
	}
}

func TestTrainingOverrideDurationCaps(t *testing.T) {
	sessions := []TrainingSession{
		{Type: TrainingTypeStrength, DurationMin: 90},
		{Type: TrainingTypeRun, DurationMin: 120},
	}

	overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
	if len(overrides) != 2 {
		t.Fatalf("expected 2 overrides, got %d", len(overrides))
	}

	// Strength -> Mobility capped at 30 min
	if overrides[0].RecommendedDuration != MaxMobilityDuration {
		t.Errorf("mobility duration = %d, want %d", overrides[0].RecommendedDuration, MaxMobilityDuration)
	}

	// Run -> Walking capped at 45 min
	if overrides[1].RecommendedDuration != MaxWalkingDuration {
		t.Errorf("walking duration = %d, want %d", overrides[1].RecommendedDuration, MaxWalkingDuration)
	}
}
