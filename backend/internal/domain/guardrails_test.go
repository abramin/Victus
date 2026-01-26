package domain

import (
	"testing"
)

func TestValidateMacroGuardrails_AllPass(t *testing.T) {
	// 80kg person with healthy macros: 200g carbs, 160g protein (2.0g/kg), 72g fat (0.9g/kg)
	warnings := ValidateMacroGuardrails(80, 200, 160, 72, false)

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings for healthy macros, got %d: %+v", len(warnings), warnings)
	}
}

func TestValidateMacroGuardrails_LowProtein(t *testing.T) {
	// 80kg person with low protein: 120g protein (1.5g/kg) - below 1.6g/kg floor
	warnings := ValidateMacroGuardrails(80, 200, 120, 72, false)

	if len(warnings) != 1 {
		t.Fatalf("Expected 1 warning, got %d: %+v", len(warnings), warnings)
	}

	w := warnings[0]
	if w.Code != GuardrailCodeLowProtein {
		t.Errorf("Expected LOW_PROTEIN code, got %s", w.Code)
	}
	if w.Severity != GuardrailSeverityCaution {
		t.Errorf("Expected caution severity for 1.5g/kg, got %s", w.Severity)
	}
	if w.ActualGPKg != 1.5 {
		t.Errorf("Expected actualGPKg 1.5, got %f", w.ActualGPKg)
	}
}

func TestValidateMacroGuardrails_CriticalProtein(t *testing.T) {
	// 80kg person with critically low protein: 80g protein (1.0g/kg) - below 1.2g/kg critical
	warnings := ValidateMacroGuardrails(80, 200, 80, 72, false)

	if len(warnings) != 1 {
		t.Fatalf("Expected 1 warning, got %d: %+v", len(warnings), warnings)
	}

	w := warnings[0]
	if w.Code != GuardrailCodeLowProtein {
		t.Errorf("Expected LOW_PROTEIN code, got %s", w.Code)
	}
	if w.Severity != GuardrailSeverityCritical {
		t.Errorf("Expected critical severity for 1.0g/kg, got %s", w.Severity)
	}
}

func TestValidateMacroGuardrails_LowFat(t *testing.T) {
	// 80kg person with low fat: 32g fat (0.4g/kg) - below 0.5g/kg floor
	warnings := ValidateMacroGuardrails(80, 200, 160, 32, false)

	if len(warnings) != 1 {
		t.Fatalf("Expected 1 warning, got %d: %+v", len(warnings), warnings)
	}

	w := warnings[0]
	if w.Code != GuardrailCodeLowFat {
		t.Errorf("Expected LOW_FAT code, got %s", w.Code)
	}
	if w.Severity != GuardrailSeverityCaution {
		t.Errorf("Expected caution severity for 0.4g/kg, got %s", w.Severity)
	}
}

func TestValidateMacroGuardrails_CriticalFat(t *testing.T) {
	// 80kg person with critically low fat: 16g fat (0.2g/kg) - below 0.3g/kg critical
	warnings := ValidateMacroGuardrails(80, 200, 160, 16, false)

	if len(warnings) != 1 {
		t.Fatalf("Expected 1 warning, got %d: %+v", len(warnings), warnings)
	}

	w := warnings[0]
	if w.Code != GuardrailCodeLowFat {
		t.Errorf("Expected LOW_FAT code, got %s", w.Code)
	}
	if w.Severity != GuardrailSeverityCritical {
		t.Errorf("Expected critical severity for 0.2g/kg, got %s", w.Severity)
	}
}

func TestValidateMacroGuardrails_LowCarbTraining(t *testing.T) {
	// 80kg person on training day with only 80g carbs - below 100g floor
	warnings := ValidateMacroGuardrails(80, 80, 160, 72, true)

	if len(warnings) != 1 {
		t.Fatalf("Expected 1 warning, got %d: %+v", len(warnings), warnings)
	}

	w := warnings[0]
	if w.Code != GuardrailCodeLowCarbTraining {
		t.Errorf("Expected LOW_CARB_TRAINING code, got %s", w.Code)
	}
}

func TestValidateMacroGuardrails_LowCarbRest(t *testing.T) {
	// 80kg person on REST day with only 80g carbs - should be fine (keto is valid)
	warnings := ValidateMacroGuardrails(80, 80, 160, 72, false)

	if len(warnings) != 0 {
		t.Errorf("Expected no warnings for low carbs on rest day, got %d: %+v", len(warnings), warnings)
	}
}

func TestValidateMacroGuardrails_MultipleWarnings(t *testing.T) {
	// 80kg person with low protein, low fat, and low carbs on training day
	warnings := ValidateMacroGuardrails(80, 50, 100, 24, true)

	if len(warnings) != 3 {
		t.Fatalf("Expected 3 warnings, got %d: %+v", len(warnings), warnings)
	}

	// Check we have all three types
	codes := make(map[GuardrailCode]bool)
	for _, w := range warnings {
		codes[w.Code] = true
	}
	if !codes[GuardrailCodeLowProtein] {
		t.Error("Missing LOW_PROTEIN warning")
	}
	if !codes[GuardrailCodeLowFat] {
		t.Error("Missing LOW_FAT warning")
	}
	if !codes[GuardrailCodeLowCarbTraining] {
		t.Error("Missing LOW_CARB_TRAINING warning")
	}
}

func TestValidateMacroGuardrails_ZeroWeight(t *testing.T) {
	// Edge case: zero weight should return nil (avoid division by zero)
	warnings := ValidateMacroGuardrails(0, 200, 160, 72, false)

	if warnings != nil {
		t.Errorf("Expected nil for zero weight, got %+v", warnings)
	}
}

func TestGetProteinZones_ReturnsAllZones(t *testing.T) {
	zones := GetProteinZones()

	if len(zones) != 5 {
		t.Fatalf("Expected 5 protein zones, got %d", len(zones))
	}

	expectedNames := []string{"Critical", "Survival", "Athlete Baseline", "Optimal Growth", "Diminishing Returns"}
	for i, expected := range expectedNames {
		if zones[i].Name != expected {
			t.Errorf("Zone %d: expected name %q, got %q", i, expected, zones[i].Name)
		}
	}

	// Verify zones are contiguous
	for i := 1; i < len(zones); i++ {
		if zones[i].MinGPerKg != zones[i-1].MaxGPerKg {
			t.Errorf("Gap between zones %d and %d: %f != %f",
				i-1, i, zones[i-1].MaxGPerKg, zones[i].MinGPerKg)
		}
	}
}

func TestGetFatZones_ReturnsAllZones(t *testing.T) {
	zones := GetFatZones()

	if len(zones) != 5 {
		t.Fatalf("Expected 5 fat zones, got %d", len(zones))
	}

	expectedNames := []string{"Critical", "Low", "Minimum", "Optimal", "High"}
	for i, expected := range expectedNames {
		if zones[i].Name != expected {
			t.Errorf("Zone %d: expected name %q, got %q", i, expected, zones[i].Name)
		}
	}

	// Verify zones are contiguous
	for i := 1; i < len(zones); i++ {
		if zones[i].MinGPerKg != zones[i-1].MaxGPerKg {
			t.Errorf("Gap between zones %d and %d: %f != %f",
				i-1, i, zones[i-1].MaxGPerKg, zones[i].MinGPerKg)
		}
	}
}

func TestGetProteinZone(t *testing.T) {
	tests := []struct {
		gPerKg   float64
		expected string
	}{
		{0.5, "Critical"},
		{1.0, "Critical"},
		{1.19, "Critical"},
		{1.2, "Survival"},
		{1.5, "Survival"},
		{1.6, "Athlete Baseline"},
		{2.0, "Athlete Baseline"},
		{2.2, "Optimal Growth"},
		{2.8, "Optimal Growth"},
		{3.0, "Diminishing Returns"},
		{3.5, "Diminishing Returns"},
		{5.0, "Diminishing Returns"}, // Above all ranges
	}

	for _, tt := range tests {
		zone := GetProteinZone(tt.gPerKg)
		if zone.Name != tt.expected {
			t.Errorf("GetProteinZone(%f): expected %q, got %q", tt.gPerKg, tt.expected, zone.Name)
		}
	}
}

func TestGetFatZone(t *testing.T) {
	tests := []struct {
		gPerKg   float64
		expected string
	}{
		{0.1, "Critical"},
		{0.25, "Critical"},
		{0.3, "Low"},
		{0.4, "Low"},
		{0.5, "Minimum"},
		{0.6, "Minimum"},
		{0.7, "Optimal"},
		{1.0, "Optimal"},
		{1.2, "High"},
		{1.5, "High"},
		{3.0, "High"}, // Above all ranges
	}

	for _, tt := range tests {
		zone := GetFatZone(tt.gPerKg)
		if zone.Name != tt.expected {
			t.Errorf("GetFatZone(%f): expected %q, got %q", tt.gPerKg, tt.expected, zone.Name)
		}
	}
}
