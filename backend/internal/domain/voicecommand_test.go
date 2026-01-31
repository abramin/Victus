package domain

import (
	"testing"
	"time"
)

func TestValidateVoiceCommandResult(t *testing.T) {
	tests := []struct {
		name    string
		result  *VoiceCommandResult
		wantErr bool
	}{
		{
			name:    "nil result",
			result:  nil,
			wantErr: true,
		},
		{
			name: "valid training with all fields",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity:    "Rowing",
					DurationMin: intPtr(20),
					AvgHR:       intPtr(145),
					RPE:         intPtr(7),
				},
				ParsedAt: time.Now(),
				RawInput: "Did 20 mins of rowing",
			},
			wantErr: false,
		},
		{
			name: "valid training with partial data (draft)",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity: "Rowing",
					// DurationMin is nil - draft mode
				},
				ParsedAt: time.Now(),
				RawInput: "Just did some rowing",
			},
			wantErr: false,
		},
		{
			name: "training missing activity",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity: "", // Empty - should fail
				},
				ParsedAt: time.Now(),
			},
			wantErr: true,
		},
		{
			name: "training with invalid RPE",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity: "Rowing",
					RPE:      intPtr(15), // Out of range
				},
				ParsedAt: time.Now(),
			},
			wantErr: true,
		},
		{
			name: "training with invalid HR",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity: "Rowing",
					AvgHR:    intPtr(300), // Out of range
				},
				ParsedAt: time.Now(),
			},
			wantErr: true,
		},
		{
			name: "valid nutrition",
			result: &VoiceCommandResult{
				Intent: VoiceIntentNutrition,
				Nutrition: &NutritionData{
					Items: []NutritionItem{
						{Food: "Greek yogurt", Quantity: floatPtr(100), Unit: stringPtr("g")},
						{Food: "eggs", Quantity: floatPtr(2), Unit: stringPtr("whole")},
					},
				},
				ParsedAt: time.Now(),
			},
			wantErr: false,
		},
		{
			name: "nutrition with missing food name",
			result: &VoiceCommandResult{
				Intent: VoiceIntentNutrition,
				Nutrition: &NutritionData{
					Items: []NutritionItem{
						{Food: "", Quantity: floatPtr(100)},
					},
				},
				ParsedAt: time.Now(),
			},
			wantErr: true,
		},
		{
			name: "nutrition with no items",
			result: &VoiceCommandResult{
				Intent:    VoiceIntentNutrition,
				Nutrition: &NutritionData{Items: []NutritionItem{}},
				ParsedAt:  time.Now(),
			},
			wantErr: true,
		},
		{
			name: "valid biometrics with value",
			result: &VoiceCommandResult{
				Intent: VoiceIntentBiometrics,
				Biometrics: &BiometricData{
					Metric: "Weight",
					Value:  floatPtr(82.5),
					Unit:   stringPtr("kg"),
				},
				ParsedAt: time.Now(),
			},
			wantErr: false,
		},
		{
			name: "valid biometrics with sensation (no value)",
			result: &VoiceCommandResult{
				Intent: VoiceIntentBiometrics,
				Biometrics: &BiometricData{
					Metric:    "Body Status",
					Sensation: stringPtr("left knee clicky"),
				},
				ParsedAt: time.Now(),
			},
			wantErr: false,
		},
		{
			name: "biometrics missing metric",
			result: &VoiceCommandResult{
				Intent: VoiceIntentBiometrics,
				Biometrics: &BiometricData{
					Metric: "",
					Value:  floatPtr(82.5),
				},
				ParsedAt: time.Now(),
			},
			wantErr: true,
		},
		{
			name: "invalid intent",
			result: &VoiceCommandResult{
				Intent:   VoiceCommandIntent("INVALID"),
				ParsedAt: time.Now(),
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateVoiceCommandResult(tt.result)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateVoiceCommandResult() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestIsDraftTrainingSession(t *testing.T) {
	tests := []struct {
		name   string
		result *VoiceCommandResult
		want   bool
	}{
		{
			name: "training with duration - not draft",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity:    "Rowing",
					DurationMin: intPtr(20),
				},
			},
			want: false,
		},
		{
			name: "training without duration - is draft",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity: "Rowing",
				},
			},
			want: true,
		},
		{
			name: "nutrition intent - never draft",
			result: &VoiceCommandResult{
				Intent: VoiceIntentNutrition,
				Nutrition: &NutritionData{
					Items: []NutritionItem{{Food: "test"}},
				},
			},
			want: false,
		},
		{
			name: "biometrics intent - never draft",
			result: &VoiceCommandResult{
				Intent: VoiceIntentBiometrics,
				Biometrics: &BiometricData{
					Metric: "Weight",
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.result.IsDraftTrainingSession()
			if got != tt.want {
				t.Errorf("IsDraftTrainingSession() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestExtractBodyMapUpdates(t *testing.T) {
	tests := []struct {
		name      string
		result    *VoiceCommandResult
		wantCount int
		wantParts []string
	}{
		{
			name: "training with knee sensation",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity:  "Running",
					Sensation: stringPtr("left knee clicky"),
				},
			},
			wantCount: 1,
			wantParts: []string{"knee"},
		},
		{
			name: "biometrics with shoulder sensation",
			result: &VoiceCommandResult{
				Intent: VoiceIntentBiometrics,
				Biometrics: &BiometricData{
					Metric:    "Body Status",
					Sensation: stringPtr("shoulders feeling tight"),
				},
			},
			wantCount: 1,
			wantParts: []string{"shoulders"},
		},
		{
			name: "training without sensation",
			result: &VoiceCommandResult{
				Intent: VoiceIntentTraining,
				Training: &TrainingVoiceData{
					Activity: "Rowing",
				},
			},
			wantCount: 0,
			wantParts: nil,
		},
		{
			name: "nutrition intent - no body map",
			result: &VoiceCommandResult{
				Intent: VoiceIntentNutrition,
				Nutrition: &NutritionData{
					Items: []NutritionItem{{Food: "test"}},
				},
			},
			wantCount: 0,
			wantParts: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			updates := tt.result.ExtractBodyMapUpdates()
			if len(updates) != tt.wantCount {
				t.Errorf("ExtractBodyMapUpdates() count = %d, want %d", len(updates), tt.wantCount)
			}
			for i, wantPart := range tt.wantParts {
				if i < len(updates) && updates[i].BodyPart != wantPart {
					t.Errorf("ExtractBodyMapUpdates()[%d].BodyPart = %s, want %s", i, updates[i].BodyPart, wantPart)
				}
			}
		})
	}
}

func TestToTrainingSession(t *testing.T) {
	tests := []struct {
		name         string
		data         *TrainingVoiceData
		wantType     TrainingType
		wantDraft    bool
		wantDuration int
	}{
		{
			name: "rowing with duration",
			data: &TrainingVoiceData{
				Activity:    "Rowing",
				DurationMin: intPtr(20),
			},
			wantType:     TrainingTypeRow,
			wantDraft:    false,
			wantDuration: 20,
		},
		{
			name: "rowing without duration (draft)",
			data: &TrainingVoiceData{
				Activity: "Just rowing",
			},
			wantType:     TrainingTypeRow,
			wantDraft:    true,
			wantDuration: 0,
		},
		{
			name: "running session",
			data: &TrainingVoiceData{
				Activity:    "Running",
				DurationMin: intPtr(30),
			},
			wantType:     TrainingTypeRun,
			wantDraft:    false,
			wantDuration: 30,
		},
		{
			name: "strength training",
			data: &TrainingVoiceData{
				Activity:    "Strength training",
				DurationMin: intPtr(45),
			},
			wantType:     TrainingTypeStrength,
			wantDraft:    false,
			wantDuration: 45,
		},
		{
			name: "unknown activity maps to mixed",
			data: &TrainingVoiceData{
				Activity:    "Some weird workout",
				DurationMin: intPtr(30),
			},
			wantType:     TrainingTypeMixed,
			wantDraft:    false,
			wantDuration: 30,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			session := tt.data.ToTrainingSession(1)
			if session.Type != tt.wantType {
				t.Errorf("ToTrainingSession().Type = %s, want %s", session.Type, tt.wantType)
			}
			if session.IsDraft != tt.wantDraft {
				t.Errorf("ToTrainingSession().IsDraft = %v, want %v", session.IsDraft, tt.wantDraft)
			}
			if session.DurationMin != tt.wantDuration {
				t.Errorf("ToTrainingSession().DurationMin = %d, want %d", session.DurationMin, tt.wantDuration)
			}
		})
	}
}

// Helper functions for creating pointers
func intPtr(i int) *int {
	return &i
}

func floatPtr(f float64) *float64 {
	return &f
}

func stringPtr(s string) *string {
	return &s
}
