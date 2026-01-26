package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Flux calculations are numeric invariants; unit tests lock the
// EMA smoothing, swing constraints, and BMR floor behavior without E2E dependencies.

type FluxSuite struct {
	suite.Suite
}

func TestFluxSuite(t *testing.T) {
	suite.Run(t, new(FluxSuite))
}

func (s *FluxSuite) TestEMAWeightSmoothing() {
	s.Run("empty weights returns empty", func() {
		result := CalculateEMAWeight([]float64{}, 0.3)
		s.Empty(result)
	})

	s.Run("single weight unchanged", func() {
		result := CalculateEMAWeight([]float64{85.0}, 0.3)
		s.Require().Len(result, 1)
		s.Equal(85.0, result[0])
	})

	s.Run("constant weights unchanged", func() {
		result := CalculateEMAWeight([]float64{85.0, 85.0, 85.0, 85.0}, 0.3)
		s.Require().Len(result, 4)
		s.Equal(85.0, result[len(result)-1])
	})

	s.Run("decreasing weights smoothed", func() {
		// EMA smoothing: 0.3*87 + 0.7*88.79 = 88.533
		result := CalculateEMAWeight([]float64{90.0, 89.0, 88.0, 87.0}, 0.3)
		s.Require().Len(result, 4)
		s.InDelta(88.533, result[len(result)-1], 0.01)
	})

	s.Run("spike filtered by EMA", func() {
		// Spike at index 2 is dampened by EMA
		result := CalculateEMAWeight([]float64{85.0, 85.0, 88.0, 85.0, 85.0}, 0.3)
		s.Require().Len(result, 5)
		s.InDelta(85.441, result[len(result)-1], 0.01)
	})

	s.Run("invalid alpha defaults to 0.3", func() {
		// 0.3*90 + 0.7*85 = 86.5
		result := CalculateEMAWeight([]float64{85.0, 90.0}, -1)
		s.Require().Len(result, 2)
		s.InDelta(86.5, result[len(result)-1], 0.01)
	})
}

func (s *FluxSuite) TestSwingConstraints() {
	s.Run("within bounds not constrained", func() {
		gotTDEE, gotConstrained := ApplySwingConstraint(2200, 2150, 100)
		s.Equal(2200.0, gotTDEE)
		s.False(gotConstrained)
	})

	s.Run("exactly at upper bound not constrained", func() {
		gotTDEE, gotConstrained := ApplySwingConstraint(2250, 2150, 100)
		s.Equal(2250.0, gotTDEE)
		s.False(gotConstrained)
	})

	s.Run("exceeds upper bound constrained", func() {
		gotTDEE, gotConstrained := ApplySwingConstraint(2300, 2150, 100)
		s.Equal(2250.0, gotTDEE) // previousTDEE + maxSwing
		s.True(gotConstrained)
	})

	s.Run("exactly at lower bound not constrained", func() {
		gotTDEE, gotConstrained := ApplySwingConstraint(2050, 2150, 100)
		s.Equal(2050.0, gotTDEE)
		s.False(gotConstrained)
	})

	s.Run("exceeds lower bound constrained", func() {
		gotTDEE, gotConstrained := ApplySwingConstraint(1900, 2150, 100)
		s.Equal(2050.0, gotTDEE) // previousTDEE - maxSwing
		s.True(gotConstrained)
	})

	s.Run("no previous TDEE not constrained", func() {
		gotTDEE, gotConstrained := ApplySwingConstraint(2200, 0, 100)
		s.Equal(2200.0, gotTDEE)
		s.False(gotConstrained)
	})
}

func (s *FluxSuite) TestBMRFloor() {
	s.Run("TDEE above BMR no floor", func() {
		gotTDEE, gotApplied := ApplyBMRFloor(2200, 1600)
		s.Equal(2200.0, gotTDEE)
		s.False(gotApplied)
	})

	s.Run("TDEE equals BMR no floor", func() {
		gotTDEE, gotApplied := ApplyBMRFloor(1600, 1600)
		s.Equal(1600.0, gotTDEE)
		s.False(gotApplied)
	})

	s.Run("TDEE below BMR floor applied", func() {
		gotTDEE, gotApplied := ApplyBMRFloor(1400, 1600)
		s.Equal(1600.0, gotTDEE)
		s.True(gotApplied)
	})

	s.Run("no BMR no floor", func() {
		gotTDEE, gotApplied := ApplyBMRFloor(1400, 0)
		s.Equal(1400.0, gotTDEE)
		s.False(gotApplied)
	})
}

func (s *FluxSuite) TestAdherenceValidation() {
	s.Run("meets minimum", func() {
		s.True(ValidateAdherence(5, 7, 5))
	})

	s.Run("exceeds minimum", func() {
		s.True(ValidateAdherence(7, 7, 5))
	})

	s.Run("below minimum", func() {
		s.False(ValidateAdherence(4, 7, 5))
	})

	s.Run("zero logged", func() {
		s.False(ValidateAdherence(0, 7, 5))
	})

	s.Run("invalid window", func() {
		s.False(ValidateAdherence(5, 0, 5))
	})
}

func (s *FluxSuite) TestNotificationThreshold() {
	s.Run("below threshold positive", func() {
		s.False(ShouldTriggerNotification(30))
	})

	s.Run("below threshold negative", func() {
		s.False(ShouldTriggerNotification(-30))
	})

	s.Run("at threshold positive", func() {
		s.True(ShouldTriggerNotification(50))
	})

	s.Run("at threshold negative", func() {
		s.True(ShouldTriggerNotification(-50))
	})

	s.Run("above threshold positive", func() {
		s.True(ShouldTriggerNotification(100))
	})

	s.Run("above threshold negative", func() {
		s.True(ShouldTriggerNotification(-100))
	})

	s.Run("zero change", func() {
		s.False(ShouldTriggerNotification(0))
	})
}

func (s *FluxSuite) TestFluxCalculationIntegration() {
	s.Run("formula fallback when low adherence", func() {
		input := FluxInput{
			CurrentBMR:     1600,
			PreviousTDEE:   2100,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 2200, Confidence: 0.5, DataPointsUsed: 20},
			FormulaTDEE:    2000,
			AdherenceDays:  3, // Below 5-day minimum
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		s.False(result.AdherenceGatePassed)
		s.False(result.UsedAdaptive)
		s.Equal(2000, result.TDEE)
	})

	s.Run("adaptive used when adherence met", func() {
		input := FluxInput{
			CurrentBMR:     1600,
			PreviousTDEE:   2100,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 2150, Confidence: 0.6, DataPointsUsed: 30},
			FormulaTDEE:    2000,
			AdherenceDays:  6, // Meets 5-day minimum
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		s.True(result.AdherenceGatePassed)
		s.True(result.UsedAdaptive)
		s.Equal(2150, result.TDEE)
	})

	s.Run("swing constraint applied", func() {
		input := FluxInput{
			CurrentBMR:     1600,
			PreviousTDEE:   2000,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 2300, Confidence: 0.8, DataPointsUsed: 50}, // +300 change
			FormulaTDEE:    2050,
			AdherenceDays:  7,
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		s.True(result.WasSwingConstrained)
		s.Equal(2100, result.TDEE) // 2000 + 100
		s.Equal(100, result.DeltaKcal)
	})

	s.Run("BMR floor applied", func() {
		input := FluxInput{
			CurrentBMR:     1800,
			PreviousTDEE:   1850,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 1700, Confidence: 0.5, DataPointsUsed: 20}, // Below BMR
			FormulaTDEE:    1900,
			AdherenceDays:  6,
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		s.True(result.BMRFloorApplied)
		s.Equal(1800, result.TDEE)
	})

	s.Run("EMA weight smoothing", func() {
		input := FluxInput{
			CurrentBMR:   1600,
			PreviousTDEE: 0, // First calculation
			WeightHistory: []WeightDataPoint{
				{Date: "2025-01-20", WeightKg: 85.0},
				{Date: "2025-01-21", WeightKg: 85.2},
				{Date: "2025-01-22", WeightKg: 88.0}, // Spike (water retention)
				{Date: "2025-01-23", WeightKg: 85.1},
				{Date: "2025-01-24", WeightKg: 85.0},
			},
			AdaptiveResult: nil,
			FormulaTDEE:    2100,
			AdherenceDays:  5,
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		// EMA should smooth out the spike
		s.Greater(result.EMASmoothedWeight, 85.0)
		s.Less(result.EMASmoothedWeight, 86.5)
	})
}

func (s *FluxSuite) TestTrendDetermination() {
	s.Run("too few points returns stable", func() {
		trend, _ := DetermineTrend([]FluxChartPoint{{CalculatedTDEE: 2000}})
		s.Equal("stable", trend)
	})

	s.Run("stable trend", func() {
		points := []FluxChartPoint{
			{CalculatedTDEE: 2000},
			{CalculatedTDEE: 2010},
			{CalculatedTDEE: 1995},
			{CalculatedTDEE: 2005},
			{CalculatedTDEE: 2000},
		}
		trend, _ := DetermineTrend(points)
		s.Equal("stable", trend)
	})

	s.Run("upregulated trend", func() {
		// First week avg: ~2000, Last week avg: ~2150 = delta +150
		points := []FluxChartPoint{
			{CalculatedTDEE: 1980},
			{CalculatedTDEE: 1990},
			{CalculatedTDEE: 2000},
			{CalculatedTDEE: 2010},
			{CalculatedTDEE: 2020},
			{CalculatedTDEE: 2030},
			{CalculatedTDEE: 2040},
			// Second week - bigger jump
			{CalculatedTDEE: 2100},
			{CalculatedTDEE: 2120},
			{CalculatedTDEE: 2140},
			{CalculatedTDEE: 2160},
			{CalculatedTDEE: 2180},
			{CalculatedTDEE: 2200},
			{CalculatedTDEE: 2220},
		}
		trend, _ := DetermineTrend(points)
		s.Equal("upregulated", trend)
	})

	s.Run("downregulated trend", func() {
		// First week avg: ~2200, Last week avg: ~2050 = delta -150
		points := []FluxChartPoint{
			{CalculatedTDEE: 2180},
			{CalculatedTDEE: 2190},
			{CalculatedTDEE: 2200},
			{CalculatedTDEE: 2210},
			{CalculatedTDEE: 2220},
			{CalculatedTDEE: 2230},
			{CalculatedTDEE: 2240},
			// Second week - bigger drop
			{CalculatedTDEE: 2100},
			{CalculatedTDEE: 2080},
			{CalculatedTDEE: 2060},
			{CalculatedTDEE: 2040},
			{CalculatedTDEE: 2020},
			{CalculatedTDEE: 2000},
			{CalculatedTDEE: 1980},
		}
		trend, _ := DetermineTrend(points)
		s.Equal("downregulated", trend)
	})
}

func (s *FluxSuite) TestNotificationReasonGeneration() {
	s.Run("increase unconstrained", func() {
		reason := GenerateNotificationReason(75, false)
		s.Contains(reason, "Faster rate of loss")
	})

	s.Run("increase constrained", func() {
		reason := GenerateNotificationReason(150, true)
		s.Contains(reason, "limited to +100")
	})

	s.Run("decrease unconstrained", func() {
		reason := GenerateNotificationReason(-75, false)
		s.Contains(reason, "Slower rate of loss")
	})

	s.Run("decrease constrained", func() {
		reason := GenerateNotificationReason(-150, true)
		s.Contains(reason, "limited to -100")
	})
}
