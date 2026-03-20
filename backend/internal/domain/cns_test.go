package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: CNS auto-regulation is a safety-critical system; unit tests lock
// the HRV threshold thresholds and training override logic without E2E dependencies.

type CNSSuite struct {
	suite.Suite
}

func TestCNSSuite(t *testing.T) {
	suite.Run(t, new(CNSSuite))
}

func (s *CNSSuite) baselineHistory() []int {
	// Average ~48
	return []int{45, 46, 47, 48, 49, 50, 51}
}

func cnsIntPtr(v int) *int {
	return &v
}

func (s *CNSSuite) TestStatusCalculationPreconditions() {
	s.Run("nil when no current HRV", func() {
		input := CNSInput{
			CurrentHRV: 0,
			HRVHistory: s.baselineHistory(),
		}
		result := CalculateCNSStatus(input)
		s.Nil(result)
	})

	s.Run("nil when insufficient history", func() {
		input := CNSInput{
			CurrentHRV: 50,
			HRVHistory: []int{45, 46}, // Only 2 points
		}
		result := CalculateCNSStatus(input)
		s.Nil(result)
	})

	s.Run("works with minimum history 3 points", func() {
		input := CNSInput{
			CurrentHRV: 50,
			HRVHistory: []int{45, 50, 55}, // avg = 50
		}
		result := CalculateCNSStatus(input)
		s.NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("filters zero values from history", func() {
		input := CNSInput{
			CurrentHRV: 50,
			HRVHistory: []int{0, 45, 0, 50, 55, 0}, // only 3 valid
		}
		result := CalculateCNSStatus(input)
		s.NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})
}

func (s *CNSSuite) TestStatusThresholds() {
	s.Run("depleted only when all 3 conditions are met", func() {
		input := CNSInput{
			CurrentHRV:       36,
			HRVHistory:       []int{50, 50, 50, 50, 50, 36, 36},
			CurrentRestingHR: cnsIntPtr(66),
			RestingHRHistory: []int{60, 60, 60, 60, 60, 60, 60},
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusDepleted, result.Status)
		s.NotNil(result.RestingHRChangePercent)
	})

	s.Run("optimized when HRV drop does not exceed 20%", func() {
		input := CNSInput{
			CurrentHRV:       41,
			HRVHistory:       s.baselineHistory(),
			CurrentRestingHR: cnsIntPtr(64),
			RestingHRHistory: []int{60, 60, 60, 60, 60, 60, 60},
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("optimized when low HRV is not sustained 3 consecutive days", func() {
		input := CNSInput{
			CurrentHRV:       36,
			HRVHistory:       []int{50, 50, 50, 50, 50, 50, 50},
			CurrentRestingHR: cnsIntPtr(66),
			RestingHRHistory: []int{60, 60, 60, 60, 60, 60, 60},
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("optimized when resting HR increase is outside 5-10%", func() {
		input := CNSInput{
			CurrentHRV:       36,
			HRVHistory:       []int{50, 50, 50, 50, 50, 36, 36},
			CurrentRestingHR: cnsIntPtr(70),
			RestingHRHistory: []int{60, 60, 60, 60, 60, 60, 60},
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("strained when HRV conditions met but RHR data missing", func() {
		input := CNSInput{
			CurrentHRV:       36,
			HRVHistory:       []int{50, 50, 50, 50, 50, 36, 36},
			CurrentRestingHR: nil,
			RestingHRHistory: []int{60, 60, 60, 60, 60, 60, 60},
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusStrained, result.Status)
	})
}

func (s *CNSSuite) TestTrainingOverridesByStatus() {
	s.Run("no override for optimized", func() {
		sessions := []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 60}}
		overrides := CalculateTrainingOverride(CNSStatusOptimized, sessions)
		s.Empty(overrides)
	})

	s.Run("no override for strained", func() {
		sessions := []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 60}}
		overrides := CalculateTrainingOverride(CNSStatusStrained, sessions)
		s.Empty(overrides)
	})

	s.Run("override strength to mobility when depleted", func() {
		sessions := []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 60}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Require().Len(overrides, 1)
		s.Equal(TrainingTypeMobility, overrides[0].RecommendedType)
	})

	s.Run("override HIIT to mobility when depleted", func() {
		sessions := []TrainingSession{{Type: TrainingTypeHIIT, DurationMin: 45}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Require().Len(overrides, 1)
		s.Equal(TrainingTypeMobility, overrides[0].RecommendedType)
	})

	s.Run("override run to walking when depleted", func() {
		sessions := []TrainingSession{{Type: TrainingTypeRun, DurationMin: 60}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Require().Len(overrides, 1)
		s.Equal(TrainingTypeWalking, overrides[0].RecommendedType)
	})

	s.Run("no override for rest when depleted", func() {
		sessions := []TrainingSession{{Type: TrainingTypeRest, DurationMin: 0}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Empty(overrides)
	})

	s.Run("no override for walking when depleted", func() {
		sessions := []TrainingSession{{Type: TrainingTypeWalking, DurationMin: 30}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Empty(overrides)
	})
}

func (s *CNSSuite) TestMultipleSessionOverrides() {
	s.Run("overrides multiple high-intensity sessions", func() {
		sessions := []TrainingSession{
			{Type: TrainingTypeStrength, DurationMin: 60},
			{Type: TrainingTypeRun, DurationMin: 30},
			{Type: TrainingTypeWalking, DurationMin: 20},
		}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)

		s.Require().Len(overrides, 2)
		s.Equal(TrainingTypeMobility, overrides[0].RecommendedType)
		s.Equal(TrainingTypeWalking, overrides[1].RecommendedType)
	})
}

func (s *CNSSuite) TestOverrideDurationCaps() {
	s.Run("mobility capped at MaxMobilityDuration", func() {
		sessions := []TrainingSession{{Type: TrainingTypeStrength, DurationMin: 90}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Require().Len(overrides, 1)
		s.Equal(MaxMobilityDuration, overrides[0].RecommendedDuration)
	})

	s.Run("walking capped at MaxWalkingDuration", func() {
		sessions := []TrainingSession{{Type: TrainingTypeRun, DurationMin: 120}}
		overrides := CalculateTrainingOverride(CNSStatusDepleted, sessions)
		s.Require().Len(overrides, 1)
		s.Equal(MaxWalkingDuration, overrides[0].RecommendedDuration)
	})
}

func (s *CNSSuite) TestReferenceRangeValidation() {
	s.Run("optimized when HRV above reference minimum", func() {
		refMin := 31
		refMax := 40
		input := CNSInput{
			CurrentHRV:   50,
			HRVHistory:   []int{48, 49, 50, 51, 52, 53, 54}, // avg ~51, above ref min
			ReferenceMin: &refMin,
			ReferenceMax: &refMax,
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
		s.False(result.BelowReference)
		s.Nil(result.ReferenceRatio)
	})

	s.Run("strained when HRV 7-day average below reference minimum", func() {
		refMin := 31
		refMax := 40
		input := CNSInput{
			CurrentHRV:   24,
			HRVHistory:   []int{24, 25, 26, 27, 26, 25, 24}, // avg ~25, below ref min of 31
			ReferenceMin: &refMin,
			ReferenceMax: &refMax,
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusStrained, result.Status)
		s.True(result.BelowReference)
		s.NotNil(result.ReferenceRatio)
		s.Less(*result.ReferenceRatio, 1.0) // ratio < 1 means below reference
		s.Contains(result.DepletionReason, "below reference")
	})

	s.Run("depleted status maintained when also below reference", func() {
		refMin := 31
		refMax := 40
		input := CNSInput{
			CurrentHRV:       20,
			HRVHistory:       []int{30, 30, 30, 30, 30, 20, 20}, // avg ~27, below ref min 31, drop >20% and low 3+ days
			CurrentRestingHR: cnsIntPtr(66),
			RestingHRHistory: []int{60, 60, 60, 60, 60, 60, 60}, // +10% RHR increase
			ReferenceMin:     &refMin,
			ReferenceMax:     &refMax,
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusDepleted, result.Status) // Should stay depleted, not downgrade
		s.True(result.BelowReference)
		s.Contains(result.DepletionReason, "also below reference")
	})

	s.Run("handles nil reference range gracefully", func() {
		input := CNSInput{
			CurrentHRV:   50,
			HRVHistory:   []int{45, 46, 47, 48, 49, 50, 51},
			ReferenceMin: nil,
			ReferenceMax: nil,
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
		s.False(result.BelowReference)
		s.Nil(result.ReferenceMin)
		s.Nil(result.ReferenceMax)
	})

	s.Run("reference ratio calculated correctly", func() {
		refMin := 50
		refMax := 60
		input := CNSInput{
			CurrentHRV:   25,
			HRVHistory:   []int{25, 25, 25, 25, 25, 25, 25}, // avg = 25
			ReferenceMin: &refMin,
			ReferenceMax: &refMax,
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.True(result.BelowReference)
		s.NotNil(result.ReferenceRatio)
		s.InDelta(0.5, *result.ReferenceRatio, 0.01) // 25/50 = 0.5
	})
}
