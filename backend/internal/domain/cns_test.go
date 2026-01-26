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
	s.Run("optimized when above baseline", func() {
		input := CNSInput{
			CurrentHRV: 55,
			HRVHistory: s.baselineHistory(), // avg ~48
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("optimized when at baseline", func() {
		input := CNSInput{
			CurrentHRV: 48,
			HRVHistory: s.baselineHistory(), // avg = 48
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("optimized when 5% below baseline", func() {
		input := CNSInput{
			CurrentHRV: 46, // ~4% below 48
			HRVHistory: s.baselineHistory(),
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusOptimized, result.Status)
	})

	s.Run("strained when 15% below baseline", func() {
		input := CNSInput{
			CurrentHRV: 41, // ~15% below 48
			HRVHistory: s.baselineHistory(),
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusStrained, result.Status)
	})

	s.Run("depleted when 25% below baseline", func() {
		input := CNSInput{
			CurrentHRV: 36, // ~25% below 48
			HRVHistory: s.baselineHistory(),
		}
		result := CalculateCNSStatus(input)
		s.Require().NotNil(result)
		s.Equal(CNSStatusDepleted, result.Status)
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
