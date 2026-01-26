package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Macro guardrails are safety-critical invariants; unit tests lock
// the threshold values and severity escalation that protect users from nutritional deficits.

type GuardrailsSuite struct {
	suite.Suite
}

func TestGuardrailsSuite(t *testing.T) {
	suite.Run(t, new(GuardrailsSuite))
}

func (s *GuardrailsSuite) TestProteinGuardrails() {
	s.Run("healthy protein passes", func() {
		// 80kg person with healthy protein: 160g (2.0g/kg)
		warnings := ValidateMacroGuardrails(80, 200, 160, 72, false)
		s.Empty(warnings)
	})

	s.Run("low protein triggers caution", func() {
		// 80kg person with low protein: 120g (1.5g/kg) - below 1.6g/kg floor
		warnings := ValidateMacroGuardrails(80, 200, 120, 72, false)
		s.Require().Len(warnings, 1)

		w := warnings[0]
		s.Equal(GuardrailCodeLowProtein, w.Code)
		s.Equal(GuardrailSeverityCaution, w.Severity)
		s.Equal(1.5, w.ActualGPKg)
	})

	s.Run("critical protein triggers critical severity", func() {
		// 80kg person with critical protein: 80g (1.0g/kg) - below 1.2g/kg critical
		warnings := ValidateMacroGuardrails(80, 200, 80, 72, false)
		s.Require().Len(warnings, 1)

		w := warnings[0]
		s.Equal(GuardrailCodeLowProtein, w.Code)
		s.Equal(GuardrailSeverityCritical, w.Severity)
	})
}

func (s *GuardrailsSuite) TestFatGuardrails() {
	s.Run("healthy fat passes", func() {
		// 80kg person with healthy fat: 72g (0.9g/kg)
		warnings := ValidateMacroGuardrails(80, 200, 160, 72, false)
		s.Empty(warnings)
	})

	s.Run("low fat triggers caution", func() {
		// 80kg person with low fat: 32g (0.4g/kg) - below 0.5g/kg floor
		warnings := ValidateMacroGuardrails(80, 200, 160, 32, false)
		s.Require().Len(warnings, 1)

		w := warnings[0]
		s.Equal(GuardrailCodeLowFat, w.Code)
		s.Equal(GuardrailSeverityCaution, w.Severity)
	})

	s.Run("critical fat triggers critical severity", func() {
		// 80kg person with critical fat: 16g (0.2g/kg) - below 0.3g/kg critical
		warnings := ValidateMacroGuardrails(80, 200, 160, 16, false)
		s.Require().Len(warnings, 1)

		w := warnings[0]
		s.Equal(GuardrailCodeLowFat, w.Code)
		s.Equal(GuardrailSeverityCritical, w.Severity)
	})
}

func (s *GuardrailsSuite) TestCarbGuardrails() {
	s.Run("low carbs on training day triggers warning", func() {
		// 80kg person on training day with only 80g carbs - below 100g floor
		warnings := ValidateMacroGuardrails(80, 80, 160, 72, true)
		s.Require().Len(warnings, 1)

		w := warnings[0]
		s.Equal(GuardrailCodeLowCarbTraining, w.Code)
	})

	s.Run("low carbs on rest day allowed", func() {
		// 80kg person on REST day with only 80g carbs - keto is valid
		warnings := ValidateMacroGuardrails(80, 80, 160, 72, false)
		s.Empty(warnings)
	})
}

func (s *GuardrailsSuite) TestMultipleWarnings() {
	s.Run("accumulates all violations", func() {
		// 80kg person with low protein, low fat, and low carbs on training day
		warnings := ValidateMacroGuardrails(80, 50, 100, 24, true)
		s.Require().Len(warnings, 3)

		// Check we have all three types
		codes := make(map[GuardrailCode]bool)
		for _, w := range warnings {
			codes[w.Code] = true
		}
		s.True(codes[GuardrailCodeLowProtein], "Missing LOW_PROTEIN warning")
		s.True(codes[GuardrailCodeLowFat], "Missing LOW_FAT warning")
		s.True(codes[GuardrailCodeLowCarbTraining], "Missing LOW_CARB_TRAINING warning")
	})
}

func (s *GuardrailsSuite) TestEdgeCases() {
	s.Run("zero weight returns nil", func() {
		// Edge case: zero weight should return nil (avoid division by zero)
		warnings := ValidateMacroGuardrails(0, 200, 160, 72, false)
		s.Nil(warnings)
	})
}

func (s *GuardrailsSuite) TestProteinZoneLookup() {
	s.Run("returns all five zones", func() {
		zones := GetProteinZones()
		s.Len(zones, 5)

		expectedNames := []string{"Critical", "Survival", "Athlete Baseline", "Optimal Growth", "Diminishing Returns"}
		for i, expected := range expectedNames {
			s.Equal(expected, zones[i].Name)
		}
	})

	s.Run("zones are contiguous", func() {
		zones := GetProteinZones()
		for i := 1; i < len(zones); i++ {
			s.Equal(zones[i-1].MaxGPerKg, zones[i].MinGPerKg,
				"Gap between zones %d and %d", i-1, i)
		}
	})

	s.Run("maps values to correct zones", func() {
		testCases := []struct {
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

		for _, tc := range testCases {
			zone := GetProteinZone(tc.gPerKg)
			s.Equal(tc.expected, zone.Name, "GetProteinZone(%f)", tc.gPerKg)
		}
	})
}

func (s *GuardrailsSuite) TestFatZoneLookup() {
	s.Run("returns all five zones", func() {
		zones := GetFatZones()
		s.Len(zones, 5)

		expectedNames := []string{"Critical", "Low", "Minimum", "Optimal", "High"}
		for i, expected := range expectedNames {
			s.Equal(expected, zones[i].Name)
		}
	})

	s.Run("zones are contiguous", func() {
		zones := GetFatZones()
		for i := 1; i < len(zones); i++ {
			s.Equal(zones[i-1].MaxGPerKg, zones[i].MinGPerKg,
				"Gap between zones %d and %d", i-1, i)
		}
	})

	s.Run("maps values to correct zones", func() {
		testCases := []struct {
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

		for _, tc := range testCases {
			zone := GetFatZone(tc.gPerKg)
			s.Equal(tc.expected, zone.Name, "GetFatZone(%f)", tc.gPerKg)
		}
	})
}
