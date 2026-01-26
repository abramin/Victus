package domain

// =============================================================================
// BIOLOGICAL GUARDRAILS
// =============================================================================
//
// This module provides safety validation for macro targets based on scientific
// evidence for hormonal health and muscle retention. These are WARNINGS, not
// errors - users can acknowledge and override them.

// GuardrailSeverity indicates the severity level of a guardrail warning.
type GuardrailSeverity string

const (
	// GuardrailSeverityCaution indicates below optimal but not dangerous.
	GuardrailSeverityCaution GuardrailSeverity = "caution"

	// GuardrailSeverityCritical indicates below safe minimum.
	GuardrailSeverityCritical GuardrailSeverity = "critical"
)

// GuardrailCode identifies the type of guardrail warning.
type GuardrailCode string

const (
	GuardrailCodeLowProtein     GuardrailCode = "LOW_PROTEIN"
	GuardrailCodeLowFat         GuardrailCode = "LOW_FAT"
	GuardrailCodeLowCarbTraining GuardrailCode = "LOW_CARB_TRAINING"
)

// GuardrailWarning represents a biological safety warning (advisory, not blocker).
type GuardrailWarning struct {
	Code       GuardrailCode     `json:"code"`
	Message    string            `json:"message"`
	ActualGPKg float64           `json:"actualGPerKg"`
	MinGPKg    float64           `json:"minGPerKg"`
	Severity   GuardrailSeverity `json:"severity"`
}

// MacroZone represents a quality zone for a macronutrient intake level.
type MacroZone struct {
	Name        string  `json:"name"`
	MinGPerKg   float64 `json:"minGPerKg"`
	MaxGPerKg   float64 `json:"maxGPerKg"`
	Color       string  `json:"color"`
	Description string  `json:"description"`
}

// ValidateMacroGuardrails checks macros against biological safety floors.
// Returns a slice of warnings (empty if all guardrails pass).
// This function does NOT return errors - these are advisories, not blockers.
func ValidateMacroGuardrails(weightKg, carbsG, proteinG, fatsG float64, isTraining bool) []GuardrailWarning {
	if weightKg <= 0 {
		return nil
	}

	var warnings []GuardrailWarning

	// 1. Protein guardrail
	proteinGPerKg := proteinG / weightKg
	if proteinGPerKg < MinProteinGPerKg {
		severity := GuardrailSeverityCaution
		message := "Protein below athlete baseline (1.6 g/kg). May impair muscle retention."
		if proteinGPerKg < 1.2 {
			severity = GuardrailSeverityCritical
			message = "Protein critically low (<1.2 g/kg). Muscle loss likely."
		}
		warnings = append(warnings, GuardrailWarning{
			Code:       GuardrailCodeLowProtein,
			Message:    message,
			ActualGPKg: proteinGPerKg,
			MinGPKg:    MinProteinGPerKg,
			Severity:   severity,
		})
	}

	// 2. Fat guardrail
	fatGPerKg := fatsG / weightKg
	if fatGPerKg < MinFatGPerKg {
		severity := GuardrailSeverityCaution
		message := "Fat below minimum for hormonal health (0.5 g/kg)."
		if fatGPerKg < 0.3 {
			severity = GuardrailSeverityCritical
			message = "Fat critically low (<0.3 g/kg). Hormone disruption likely."
		}
		warnings = append(warnings, GuardrailWarning{
			Code:       GuardrailCodeLowFat,
			Message:    message,
			ActualGPKg: fatGPerKg,
			MinGPKg:    MinFatGPerKg,
			Severity:   severity,
		})
	}

	// 3. Carb guardrail (training-dependent)
	if isTraining && carbsG < MinCarbsGPerformance {
		severity := GuardrailSeverityCaution
		message := "Carbs below 100g on a training day. May impair performance and recovery."
		warnings = append(warnings, GuardrailWarning{
			Code:       GuardrailCodeLowCarbTraining,
			Message:    message,
			ActualGPKg: carbsG / weightKg,
			MinGPKg:    MinCarbsGPerformance / weightKg,
			Severity:   severity,
		})
	}

	return warnings
}

// GetProteinZones returns the evidence-based protein quality zones for UI display.
func GetProteinZones() []MacroZone {
	return []MacroZone{
		{
			Name:        "Critical",
			MinGPerKg:   0,
			MaxGPerKg:   1.2,
			Color:       "red",
			Description: "Muscle loss likely",
		},
		{
			Name:        "Survival",
			MinGPerKg:   1.2,
			MaxGPerKg:   1.6,
			Color:       "orange",
			Description: "Minimum for maintenance",
		},
		{
			Name:        "Athlete Baseline",
			MinGPerKg:   1.6,
			MaxGPerKg:   2.2,
			Color:       "blue",
			Description: "Optimal for most athletes",
		},
		{
			Name:        "Optimal Growth",
			MinGPerKg:   2.2,
			MaxGPerKg:   3.0,
			Color:       "green",
			Description: "Maximum muscle synthesis",
		},
		{
			Name:        "Diminishing Returns",
			MinGPerKg:   3.0,
			MaxGPerKg:   4.0,
			Color:       "gray",
			Description: "Excess, limited benefit",
		},
	}
}

// GetFatZones returns the evidence-based fat quality zones for UI display.
func GetFatZones() []MacroZone {
	return []MacroZone{
		{
			Name:        "Critical",
			MinGPerKg:   0,
			MaxGPerKg:   0.3,
			Color:       "red",
			Description: "Hormone disruption likely",
		},
		{
			Name:        "Low",
			MinGPerKg:   0.3,
			MaxGPerKg:   0.5,
			Color:       "orange",
			Description: "Below safe minimum",
		},
		{
			Name:        "Minimum",
			MinGPerKg:   0.5,
			MaxGPerKg:   0.7,
			Color:       "yellow",
			Description: "Bare minimum for health",
		},
		{
			Name:        "Optimal",
			MinGPerKg:   0.7,
			MaxGPerKg:   1.2,
			Color:       "green",
			Description: "Supports hormone function",
		},
		{
			Name:        "High",
			MinGPerKg:   1.2,
			MaxGPerKg:   2.0,
			Color:       "gray",
			Description: "Keto/high-fat range",
		},
	}
}

// GetProteinZone returns the zone for a given protein intake in g/kg.
func GetProteinZone(gPerKg float64) MacroZone {
	zones := GetProteinZones()
	for _, zone := range zones {
		if gPerKg >= zone.MinGPerKg && gPerKg < zone.MaxGPerKg {
			return zone
		}
	}
	// Return last zone if above all ranges
	return zones[len(zones)-1]
}

// GetFatZone returns the zone for a given fat intake in g/kg.
func GetFatZone(gPerKg float64) MacroZone {
	zones := GetFatZones()
	for _, zone := range zones {
		if gPerKg >= zone.MinGPerKg && gPerKg < zone.MaxGPerKg {
			return zone
		}
	}
	// Return last zone if above all ranges
	return zones[len(zones)-1]
}
