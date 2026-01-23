package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Recovery score and adjustment multiplier rules are pure domain invariants;
// unit tests guard against regression without relying on feature flows.
type RecoverySuite struct {
	suite.Suite
}

func TestRecoverySuite(t *testing.T) {
	suite.Run(t, new(RecoverySuite))
}

func (s *RecoverySuite) TestRecoveryScore() {
	s.Run("optimal ACR and good sleep gives high score", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     3,  // Max rest points
			ACR:               1.0, // Optimal zone
			AvgSleepQualityL7: 80,  // Good sleep
		}
		result := CalculateRecoveryScore(input)

		s.InDelta(40.0, result.RestComponent, 0.01, "3 rest days should give max 40 points")
		s.InDelta(35.0, result.ACRComponent, 0.01, "Optimal ACR should give max 35 points")
		s.InDelta(20.0, result.SleepComponent, 0.01, "80% sleep should give 20 points")
		s.InDelta(95.0, result.Score, 0.01, "Total should be 95")
	})

	s.Run("no rest days reduces score", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               1.0,
			AvgSleepQualityL7: 80,
		}
		result := CalculateRecoveryScore(input)

		s.Equal(0.0, result.RestComponent, "0 rest days should give 0 points")
		s.InDelta(55.0, result.Score, 0.01, "Total should be 35+20=55")
	})

	s.Run("high ACR reduces score", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     2,
			ACR:               1.6, // Danger zone
			AvgSleepQualityL7: 70,
		}
		result := CalculateRecoveryScore(input)

		// Rest: 2/3 * 40 = 26.67
		// ACR: danger zone (1.6) gives ~66% (0.7 - 0.1*0.4 = 0.66) * 35 = 23.1
		// Sleep: 70/100 * 25 = 17.5
		s.InDelta(26.67, result.RestComponent, 0.1)
		s.Less(result.ACRComponent, 25.0, "Danger zone ACR should reduce points")
		s.InDelta(17.5, result.SleepComponent, 0.01)
	})

	s.Run("undertrained ACR reduces score", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     2,
			ACR:               0.6, // Undertrained
			AvgSleepQualityL7: 70,
		}
		result := CalculateRecoveryScore(input)

		// ACR 0.6 is in 0.5-0.8 range: 0.5 + (0.6-0.5)/0.3*0.5 = 0.5 + 0.167 = 0.667
		s.Less(result.ACRComponent, 35.0, "Undertrained ACR should reduce points")
		s.Greater(result.ACRComponent, 17.0, "Should still have significant points")
	})

	s.Run("poor sleep reduces score", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     3,
			ACR:               1.0,
			AvgSleepQualityL7: 30,
		}
		result := CalculateRecoveryScore(input)

		s.InDelta(7.5, result.SleepComponent, 0.01, "30% sleep should give 7.5 points")
	})

	s.Run("score is clamped to 0", func() {
		// Edge case: negative inputs (shouldn't happen but test boundary)
		input := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               5.0, // Extreme overtraining
			AvgSleepQualityL7: 0,
		}
		result := CalculateRecoveryScore(input)

		s.GreaterOrEqual(result.Score, 0.0, "Score should not be negative")
		s.LessOrEqual(result.Score, 100.0, "Score should not exceed 100")
	})

	s.Run("score is clamped to 100", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     10, // More than max
			ACR:               1.0,
			AvgSleepQualityL7: 150, // Invalid but test boundary
		}
		result := CalculateRecoveryScore(input)

		s.LessOrEqual(result.Score, 100.0, "Score should be clamped to 100")
	})

	s.Run("rest days above 3 still give max points", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     5,
			ACR:               1.0,
			AvgSleepQualityL7: 80,
		}
		result := CalculateRecoveryScore(input)

		s.InDelta(40.0, result.RestComponent, 0.01, "Rest above 3 should cap at 40")
	})
}

func (s *RecoverySuite) TestACRZones() {
	s.Run("ACR in optimal zone (0.8-1.3) gives full points", func() {
		for _, acr := range []float64{0.8, 1.0, 1.2, 1.3} {
			input := RecoveryScoreInput{
				RestDaysLast7:     0,
				ACR:               acr,
				AvgSleepQualityL7: 0,
			}
			result := CalculateRecoveryScore(input)
			s.InDelta(35.0, result.ACRComponent, 0.01, "ACR %.1f should give full 35 points", acr)
		}
	})

	s.Run("ACR below optimal (0.5-0.8) gives partial points", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               0.65, // Midpoint of 0.5-0.8 range
			AvgSleepQualityL7: 0,
		}
		result := CalculateRecoveryScore(input)

		// 0.65 -> 0.5 + (0.65-0.5)/0.3*0.5 = 0.5 + 0.25 = 0.75 -> 26.25 points
		s.InDelta(26.25, result.ACRComponent, 0.5)
	})

	s.Run("ACR in high zone (1.3-1.5) reduces points", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               1.4, // Midpoint of 1.3-1.5 range
			AvgSleepQualityL7: 0,
		}
		result := CalculateRecoveryScore(input)

		// 1.4 -> 1.0 - (1.4-1.3)/0.2*0.3 = 1.0 - 0.15 = 0.85 -> 29.75 points
		s.InDelta(29.75, result.ACRComponent, 0.5)
	})

	s.Run("ACR above 1.5 (danger zone) significantly reduces points", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               2.0,
			AvgSleepQualityL7: 0,
		}
		result := CalculateRecoveryScore(input)

		// 2.0 -> 0.7 - (2.0-1.5)*0.4 = 0.7 - 0.2 = 0.5 -> 17.5 points
		s.InDelta(17.5, result.ACRComponent, 0.5)
	})

	s.Run("very low ACR (<0.5) gives minimum points", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               0.3,
			AvgSleepQualityL7: 0,
		}
		result := CalculateRecoveryScore(input)

		// < 0.5 gives 0.3 ratio -> 10.5 points
		s.InDelta(10.5, result.ACRComponent, 0.01)
	})
}

func (s *RecoverySuite) TestAdjustmentMultipliers() {
	s.Run("all optimal conditions give no adjustment", func() {
		input := AdjustmentInput{
			ACR:               1.0,  // Optimal
			RecoveryScore:     70,   // Good
			TodaySleepQuality: 60,   // Moderate
			YesterdayMaxLoad:  3.0,  // Not high intensity
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.00, result.TrainingLoad)
		s.Equal(1.00, result.RecoveryScore)
		s.Equal(1.00, result.SleepQuality)
		s.Equal(1.00, result.YesterdayIntensity)
		s.Equal(1.00, result.Total)
	})

	s.Run("undertrained ACR reduces calories slightly", func() {
		input := AdjustmentInput{
			ACR:               0.6,
			RecoveryScore:     70,
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(0.98, result.TrainingLoad)
		s.Equal(0.98, result.Total)
	})

	s.Run("high ACR increases calories for recovery", func() {
		input := AdjustmentInput{
			ACR:               1.4,
			RecoveryScore:     70,
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.02, result.TrainingLoad)
		s.Equal(1.02, result.Total)
	})

	s.Run("danger zone ACR increases calories more", func() {
		input := AdjustmentInput{
			ACR:               1.6,
			RecoveryScore:     70,
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.05, result.TrainingLoad)
		s.Equal(1.05, result.Total)
	})

	s.Run("poor recovery increases calories", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     20, // Poor
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.05, result.RecoveryScore)
		s.Equal(1.05, result.Total)
	})

	s.Run("moderate recovery gives slight boost", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     45, // Moderate (30-60)
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.02, result.RecoveryScore)
		s.Equal(1.02, result.Total)
	})

	s.Run("excellent recovery reduces calories slightly", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     90, // Excellent (>80)
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(0.98, result.RecoveryScore)
		s.Equal(0.98, result.Total)
	})

	s.Run("poor sleep increases calories", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     70,
			TodaySleepQuality: 30, // Poor (<40)
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.03, result.SleepQuality)
		s.Equal(1.03, result.Total)
	})

	s.Run("good sleep reduces calories slightly", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     70,
			TodaySleepQuality: 80, // Good (>=70)
			YesterdayMaxLoad:  0,
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(0.98, result.SleepQuality)
		s.Equal(0.98, result.Total)
	})

	s.Run("yesterday high intensity increases calories", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     70,
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  5.0, // HIIT or Strength
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.02, result.YesterdayIntensity)
		s.Equal(1.02, result.Total)
	})

	s.Run("yesterday moderate intensity gives no adjustment", func() {
		input := AdjustmentInput{
			ACR:               1.0,
			RecoveryScore:     70,
			TodaySleepQuality: 60,
			YesterdayMaxLoad:  4.0, // Below threshold
		}
		result := CalculateAdjustmentMultipliers(input)

		s.Equal(1.00, result.YesterdayIntensity)
	})
}

func (s *RecoverySuite) TestTotalMultiplierCalculation() {
	s.Run("total is product of all multipliers", func() {
		input := AdjustmentInput{
			ACR:               1.4,  // 1.02
			RecoveryScore:     45,   // 1.02
			TodaySleepQuality: 30,   // 1.03
			YesterdayMaxLoad:  5.0,  // 1.02
		}
		result := CalculateAdjustmentMultipliers(input)

		// Product: 1.02 * 1.02 * 1.03 * 1.02 = 1.0924...
		expected := 1.02 * 1.02 * 1.03 * 1.02
		s.InDelta(expected, result.Total, 0.01, "Total should be product of components")
	})

	s.Run("total is rounded to 2 decimals", func() {
		input := AdjustmentInput{
			ACR:               1.4,
			RecoveryScore:     45,
			TodaySleepQuality: 30,
			YesterdayMaxLoad:  5.0,
		}
		result := CalculateAdjustmentMultipliers(input)

		// Verify it's exactly 2 decimal places
		s.Equal(1.09, result.Total, "Total should be rounded to 2 decimals")
	})

	s.Run("multiple reductions multiply correctly", func() {
		input := AdjustmentInput{
			ACR:               0.6,  // 0.98
			RecoveryScore:     90,   // 0.98
			TodaySleepQuality: 80,   // 0.98
			YesterdayMaxLoad:  0,    // 1.00
		}
		result := CalculateAdjustmentMultipliers(input)

		// Product: 0.98 * 0.98 * 0.98 * 1.00 = 0.9412...
		s.Equal(0.94, result.Total, "Multiple reductions should multiply")
	})
}

func (s *RecoverySuite) TestDeterminism() {
	s.Run("same inputs produce same outputs", func() {
		input := RecoveryScoreInput{
			RestDaysLast7:     2,
			ACR:               1.2,
			AvgSleepQualityL7: 65,
		}

		// Call multiple times
		result1 := CalculateRecoveryScore(input)
		result2 := CalculateRecoveryScore(input)
		result3 := CalculateRecoveryScore(input)

		s.Equal(result1.Score, result2.Score)
		s.Equal(result2.Score, result3.Score)
		s.Equal(result1.RestComponent, result2.RestComponent)
		s.Equal(result1.ACRComponent, result2.ACRComponent)
		s.Equal(result1.SleepComponent, result2.SleepComponent)
	})

	s.Run("adjustment multipliers are deterministic", func() {
		input := AdjustmentInput{
			ACR:               1.35,
			RecoveryScore:     55,
			TodaySleepQuality: 45,
			YesterdayMaxLoad:  4.5,
		}

		result1 := CalculateAdjustmentMultipliers(input)
		result2 := CalculateAdjustmentMultipliers(input)

		s.Equal(result1.Total, result2.Total)
		s.Equal(result1.TrainingLoad, result2.TrainingLoad)
		s.Equal(result1.RecoveryScore, result2.RecoveryScore)
		s.Equal(result1.SleepQuality, result2.SleepQuality)
		s.Equal(result1.YesterdayIntensity, result2.YesterdayIntensity)
	})
}

func (s *RecoverySuite) TestMaxSessionLoadScore() {
	s.Run("empty sessions returns zero", func() {
		maxLoad := MaxSessionLoadScore(nil)
		s.Equal(0.0, maxLoad)
	})

	s.Run("single session returns its load score", func() {
		sessions := []TrainingSession{
			{Type: TrainingTypeHIIT, DurationMin: 30},
		}
		maxLoad := MaxSessionLoadScore(sessions)
		s.Equal(5.0, maxLoad) // HIIT has LoadScore=5
	})

	s.Run("multiple sessions returns highest load score", func() {
		sessions := []TrainingSession{
			{Type: TrainingTypeWalking, DurationMin: 60},   // LoadScore=1
			{Type: TrainingTypeStrength, DurationMin: 45},  // LoadScore=5
			{Type: TrainingTypeQigong, DurationMin: 30},    // LoadScore=0.5
		}
		maxLoad := MaxSessionLoadScore(sessions)
		s.Equal(5.0, maxLoad)
	})

	s.Run("rest sessions have zero load score", func() {
		sessions := []TrainingSession{
			{Type: TrainingTypeRest, DurationMin: 480},
		}
		maxLoad := MaxSessionLoadScore(sessions)
		s.Equal(0.0, maxLoad)
	})
}

// Acceptance criteria tests from Issue #10
func (s *RecoverySuite) TestAcceptanceCriteria() {
	s.Run("recovery score is clamped to [0, 100]", func() {
		// Test lower bound
		lowInput := RecoveryScoreInput{
			RestDaysLast7:     0,
			ACR:               10.0, // Extreme
			AvgSleepQualityL7: 0,
		}
		lowResult := CalculateRecoveryScore(lowInput)
		s.GreaterOrEqual(lowResult.Score, 0.0)

		// Test upper bound
		highInput := RecoveryScoreInput{
			RestDaysLast7:     10,
			ACR:               1.0,
			AvgSleepQualityL7: 200,
		}
		highResult := CalculateRecoveryScore(highInput)
		s.LessOrEqual(highResult.Score, 100.0)
	})

	s.Run("given same inputs and history, recalculating targets is deterministic", func() {
		// Recovery score determinism
		recoveryInput := RecoveryScoreInput{
			RestDaysLast7:     2,
			ACR:               1.15,
			AvgSleepQualityL7: 72,
		}
		r1 := CalculateRecoveryScore(recoveryInput)
		r2 := CalculateRecoveryScore(recoveryInput)
		s.Equal(r1, r2, "Recovery score should be deterministic")

		// Adjustment multipliers determinism
		adjustInput := AdjustmentInput{
			ACR:               1.15,
			RecoveryScore:     r1.Score,
			TodaySleepQuality: 72,
			YesterdayMaxLoad:  5.0,
		}
		a1 := CalculateAdjustmentMultipliers(adjustInput)
		a2 := CalculateAdjustmentMultipliers(adjustInput)
		s.Equal(a1, a2, "Adjustment multipliers should be deterministic")
	})

	s.Run("component multipliers match total used in calculation", func() {
		input := AdjustmentInput{
			ACR:               1.4,
			RecoveryScore:     40,
			TodaySleepQuality: 35,
			YesterdayMaxLoad:  5.0,
		}
		result := CalculateAdjustmentMultipliers(input)

		// Verify total is the product (rounded)
		product := result.TrainingLoad * result.RecoveryScore * result.SleepQuality * result.YesterdayIntensity
		roundedProduct := float64(int(product*100+0.5)) / 100

		s.Equal(roundedProduct, result.Total, "Total should equal rounded product of components")
	})
}
