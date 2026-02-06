package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

type SystemicLoadSuite struct {
	suite.Suite
}

func TestSystemicLoadSuite(t *testing.T) {
	suite.Run(t, new(SystemicLoadSuite))
}

// --- Neural Load Calculation ---

func (s *SystemicLoadSuite) TestNeuralLoad() {
	s.Run("full data - optimized HRV + good sleep", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 90, Status: CNSStatusOptimized},
			SleepQuality:  80,
			RecoveryScore: &RecoveryScore{RHRComponent: 15}, // max
		}
		load := CalculateNeuralLoad(input)
		// 0.50*(100-90) + 0.30*(100-80) + 0.20*(0) = 5 + 6 + 0 = 11
		s.InDelta(11.0, load, 0.5)
	})

	s.Run("full data - depleted HRV + bad sleep", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 20, Status: CNSStatusDepleted},
			SleepQuality:  30,
			RecoveryScore: &RecoveryScore{RHRComponent: 3},
		}
		load := CalculateNeuralLoad(input)
		// 0.50*(80) + 0.30*(70) + 0.20*(80) = 40 + 21 + 16 = 77
		s.InDelta(77.0, load, 1.0)
	})

	s.Run("no HRV data - falls back to sleep+RHR", func() {
		input := SystemicLoadInput{
			NeuralBattery: nil,
			SleepQuality:  50,
			RecoveryScore: &RecoveryScore{RHRComponent: 7.5},
		}
		load := CalculateNeuralLoad(input)
		// 0.60*(50) + 0.40*(50) = 30 + 20 = 50
		s.InDelta(50.0, load, 1.0)
	})

	s.Run("no HRV and no recovery score", func() {
		input := SystemicLoadInput{
			NeuralBattery: nil,
			SleepQuality:  40,
			RecoveryScore: nil,
		}
		load := CalculateNeuralLoad(input)
		// 0.60*(60) + 0.40*(50 neutral) = 36 + 20 = 56
		s.InDelta(56.0, load, 1.0)
	})

	s.Run("clamped to 0-100", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 100},
			SleepQuality:  100,
			RecoveryScore: &RecoveryScore{RHRComponent: 15},
		}
		load := CalculateNeuralLoad(input)
		s.GreaterOrEqual(load, 0.0)
		s.LessOrEqual(load, 100.0)
	})
}

// --- Mechanical Load ---

func (s *SystemicLoadSuite) TestMechanicalLoad() {
	s.Run("returns overall score", func() {
		bs := &BodyStatus{OverallScore: 65.3}
		s.Equal(65.3, CalculateMechanicalLoad(bs))
	})

	s.Run("nil body status returns 0", func() {
		s.Equal(0.0, CalculateMechanicalLoad(nil))
	})
}

// --- State Determination ---

func (s *SystemicLoadSuite) TestDetermineSystemicState() {
	s.Run("prime state - both low", func() {
		s.Equal(SystemicLoadPrimeState, DetermineSystemicState(30, 30))
	})

	s.Run("cerebral overheat - neural high, mech low", func() {
		s.Equal(SystemicLoadCerebralOverheat, DetermineSystemicState(80, 30))
	})

	s.Run("structural failure - neural low, mech high", func() {
		s.Equal(SystemicLoadStructuralFailure, DetermineSystemicState(30, 80))
	})

	s.Run("system critical - both high", func() {
		s.Equal(SystemicLoadSystemCritical, DetermineSystemicState(80, 80))
	})

	s.Run("elevated - one in middle zone", func() {
		s.Equal(SystemicLoadElevated, DetermineSystemicState(60, 30))
		s.Equal(SystemicLoadElevated, DetermineSystemicState(30, 60))
		s.Equal(SystemicLoadElevated, DetermineSystemicState(60, 60))
	})

	s.Run("boundary - exactly at thresholds", func() {
		// 50 is NOT < 50, so not "low"
		// 70 is NOT > 70, so not "high"
		s.Equal(SystemicLoadElevated, DetermineSystemicState(50, 50))
		s.Equal(SystemicLoadElevated, DetermineSystemicState(70, 70))

		// Just above/below thresholds
		s.Equal(SystemicLoadPrimeState, DetermineSystemicState(49.9, 49.9))
		s.Equal(SystemicLoadSystemCritical, DetermineSystemicState(70.1, 70.1))
	})
}

// --- Full Systemic Load ---

func (s *SystemicLoadSuite) TestCalculateSystemicLoad() {
	s.Run("balanced state - zero tilt", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 80},
			SleepQuality:  80,
			RecoveryScore: &RecoveryScore{RHRComponent: 15},
			BodyStatus:    &BodyStatus{OverallScore: 10},
		}
		load := CalculateSystemicLoad(input)
		s.Equal(SystemicLoadPrimeState, load.State)
		s.Equal("#22c55e", load.StatusColor)
	})

	s.Run("neural overload tilts left (negative)", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 10},
			SleepQuality:  20,
			RecoveryScore: &RecoveryScore{RHRComponent: 0},
			BodyStatus:    &BodyStatus{OverallScore: 20},
		}
		load := CalculateSystemicLoad(input)
		s.Less(load.TiltDegrees, 0.0) // negative = neural heavy
	})

	s.Run("mechanical overload tilts right (positive)", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 90},
			SleepQuality:  90,
			RecoveryScore: &RecoveryScore{RHRComponent: 15},
			BodyStatus:    &BodyStatus{OverallScore: 85},
		}
		load := CalculateSystemicLoad(input)
		s.Greater(load.TiltDegrees, 0.0) // positive = mechanical heavy
	})

	s.Run("tilt clamped within +/-45 degrees", func() {
		input := SystemicLoadInput{
			NeuralBattery: &NeuralBattery{Percentage: 0},
			SleepQuality:  1,
			RecoveryScore: &RecoveryScore{RHRComponent: 0},
			BodyStatus:    &BodyStatus{OverallScore: 0},
		}
		load := CalculateSystemicLoad(input)
		s.GreaterOrEqual(load.TiltDegrees, -MaxTiltDegrees)
		s.LessOrEqual(load.TiltDegrees, MaxTiltDegrees)
	})
}

// --- Fallback Prescription ---

func (s *SystemicLoadSuite) TestFallbackPrescription() {
	states := []struct {
		state SystemicLoadState
		name  string
		cap   int
	}{
		{SystemicLoadPrimeState, "Go For Kill", 10},
		{SystemicLoadCerebralOverheat, "Mindless Grind", 5},
		{SystemicLoadStructuralFailure, "Neural Ignition", 8},
		{SystemicLoadSystemCritical, "Full Reboot", 3},
		{SystemicLoadElevated, "Controlled Effort", 7},
	}

	for _, tc := range states {
		s.Run(string(tc.state), func() {
			rx := GenerateFallbackPrescription(SystemicLoad{State: tc.state})
			s.Equal(tc.state, rx.StatusCode)
			s.Equal(tc.name, rx.PrescriptionName)
			s.Equal(tc.cap, rx.DifficultyCap)
			s.False(rx.GeneratedByLLM)
			s.NotEmpty(rx.AllowedTags)
			s.NotEmpty(rx.Diagnosis)
			s.NotEmpty(rx.Rationale)
		})
	}
}
