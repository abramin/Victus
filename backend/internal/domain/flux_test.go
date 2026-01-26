package domain

import (
	"testing"
)

func TestCalculateEMAWeight(t *testing.T) {
	tests := []struct {
		name     string
		weights  []float64
		alpha    float64
		wantLast float64
	}{
		{
			name:     "empty weights",
			weights:  []float64{},
			alpha:    0.3,
			wantLast: 0, // Returns empty slice
		},
		{
			name:     "single weight",
			weights:  []float64{85.0},
			alpha:    0.3,
			wantLast: 85.0,
		},
		{
			name:     "constant weights",
			weights:  []float64{85.0, 85.0, 85.0, 85.0},
			alpha:    0.3,
			wantLast: 85.0,
		},
		{
			name:     "decreasing weights smoothed",
			weights:  []float64{90.0, 89.0, 88.0, 87.0},
			alpha:    0.3,
			wantLast: 88.533, // EMA smoothing: 0.3*87 + 0.7*88.79 = 88.533
		},
		{
			name:     "spike filtered by EMA",
			weights:  []float64{85.0, 85.0, 88.0, 85.0, 85.0}, // Spike at index 2
			alpha:    0.3,
			wantLast: 85.441, // Spike is dampened by EMA
		},
		{
			name:     "invalid alpha defaults to 0.3",
			weights:  []float64{85.0, 90.0},
			alpha:    -1,
			wantLast: 86.5, // 0.3*90 + 0.7*85
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateEMAWeight(tt.weights, tt.alpha)
			if len(tt.weights) == 0 {
				if len(result) != 0 {
					t.Errorf("expected empty result, got %d elements", len(result))
				}
				return
			}
			got := result[len(result)-1]
			if diff := got - tt.wantLast; diff > 0.01 || diff < -0.01 {
				t.Errorf("got %v, want %v (diff: %v)", got, tt.wantLast, diff)
			}
		})
	}
}

func TestApplySwingConstraint(t *testing.T) {
	tests := []struct {
		name            string
		newTDEE         float64
		previousTDEE    float64
		maxSwing        float64
		wantTDEE        float64
		wantConstrained bool
	}{
		{
			name:            "within bounds - no constraint",
			newTDEE:         2200,
			previousTDEE:    2150,
			maxSwing:        100,
			wantTDEE:        2200,
			wantConstrained: false,
		},
		{
			name:            "exactly at upper bound",
			newTDEE:         2250,
			previousTDEE:    2150,
			maxSwing:        100,
			wantTDEE:        2250,
			wantConstrained: false,
		},
		{
			name:            "exceeds upper bound - constrained",
			newTDEE:         2300,
			previousTDEE:    2150,
			maxSwing:        100,
			wantTDEE:        2250, // previousTDEE + maxSwing
			wantConstrained: true,
		},
		{
			name:            "exactly at lower bound",
			newTDEE:         2050,
			previousTDEE:    2150,
			maxSwing:        100,
			wantTDEE:        2050,
			wantConstrained: false,
		},
		{
			name:            "exceeds lower bound - constrained",
			newTDEE:         1900,
			previousTDEE:    2150,
			maxSwing:        100,
			wantTDEE:        2050, // previousTDEE - maxSwing
			wantConstrained: true,
		},
		{
			name:            "no previous TDEE - no constraint",
			newTDEE:         2200,
			previousTDEE:    0,
			maxSwing:        100,
			wantTDEE:        2200,
			wantConstrained: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotTDEE, gotConstrained := ApplySwingConstraint(tt.newTDEE, tt.previousTDEE, tt.maxSwing)
			if gotTDEE != tt.wantTDEE {
				t.Errorf("TDEE: got %v, want %v", gotTDEE, tt.wantTDEE)
			}
			if gotConstrained != tt.wantConstrained {
				t.Errorf("constrained: got %v, want %v", gotConstrained, tt.wantConstrained)
			}
		})
	}
}

func TestApplyBMRFloor(t *testing.T) {
	tests := []struct {
		name        string
		tdee        float64
		bmr         float64
		wantTDEE    float64
		wantApplied bool
	}{
		{
			name:        "TDEE above BMR - no floor",
			tdee:        2200,
			bmr:         1600,
			wantTDEE:    2200,
			wantApplied: false,
		},
		{
			name:        "TDEE equals BMR - no floor",
			tdee:        1600,
			bmr:         1600,
			wantTDEE:    1600,
			wantApplied: false,
		},
		{
			name:        "TDEE below BMR - floor applied",
			tdee:        1400,
			bmr:         1600,
			wantTDEE:    1600,
			wantApplied: true,
		},
		{
			name:        "no BMR - no floor",
			tdee:        1400,
			bmr:         0,
			wantTDEE:    1400,
			wantApplied: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotTDEE, gotApplied := ApplyBMRFloor(tt.tdee, tt.bmr)
			if gotTDEE != tt.wantTDEE {
				t.Errorf("TDEE: got %v, want %v", gotTDEE, tt.wantTDEE)
			}
			if gotApplied != tt.wantApplied {
				t.Errorf("applied: got %v, want %v", gotApplied, tt.wantApplied)
			}
		})
	}
}

func TestValidateAdherence(t *testing.T) {
	tests := []struct {
		name       string
		loggedDays int
		windowDays int
		minDays    int
		want       bool
	}{
		{
			name:       "meets minimum",
			loggedDays: 5,
			windowDays: 7,
			minDays:    5,
			want:       true,
		},
		{
			name:       "exceeds minimum",
			loggedDays: 7,
			windowDays: 7,
			minDays:    5,
			want:       true,
		},
		{
			name:       "below minimum",
			loggedDays: 4,
			windowDays: 7,
			minDays:    5,
			want:       false,
		},
		{
			name:       "zero logged",
			loggedDays: 0,
			windowDays: 7,
			minDays:    5,
			want:       false,
		},
		{
			name:       "invalid window",
			loggedDays: 5,
			windowDays: 0,
			minDays:    5,
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidateAdherence(tt.loggedDays, tt.windowDays, tt.minDays)
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestShouldTriggerNotification(t *testing.T) {
	tests := []struct {
		name      string
		deltaKcal int
		want      bool
	}{
		{
			name:      "below threshold positive",
			deltaKcal: 30,
			want:      false,
		},
		{
			name:      "below threshold negative",
			deltaKcal: -30,
			want:      false,
		},
		{
			name:      "at threshold positive",
			deltaKcal: 50,
			want:      true,
		},
		{
			name:      "at threshold negative",
			deltaKcal: -50,
			want:      true,
		},
		{
			name:      "above threshold positive",
			deltaKcal: 100,
			want:      true,
		},
		{
			name:      "above threshold negative",
			deltaKcal: -100,
			want:      true,
		},
		{
			name:      "zero change",
			deltaKcal: 0,
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ShouldTriggerNotification(tt.deltaKcal)
			if got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculateFlux_Integration(t *testing.T) {
	t.Run("formula fallback when low adherence", func(t *testing.T) {
		input := FluxInput{
			CurrentBMR:     1600,
			PreviousTDEE:   2100,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 2200, Confidence: 0.5, DataPointsUsed: 20},
			FormulaTDEE:    2000,
			AdherenceDays:  3, // Below 5-day minimum
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		// Should fall back to formula TDEE due to low adherence
		if result.AdherenceGatePassed {
			t.Error("expected adherence gate to fail")
		}
		if result.UsedAdaptive {
			t.Error("expected formula fallback, not adaptive")
		}
		if result.TDEE != 2000 {
			t.Errorf("got TDEE %d, want 2000 (formula)", result.TDEE)
		}
	})

	t.Run("adaptive used when adherence met", func(t *testing.T) {
		input := FluxInput{
			CurrentBMR:     1600,
			PreviousTDEE:   2100,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 2150, Confidence: 0.6, DataPointsUsed: 30},
			FormulaTDEE:    2000,
			AdherenceDays:  6, // Meets 5-day minimum
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		if !result.AdherenceGatePassed {
			t.Error("expected adherence gate to pass")
		}
		if !result.UsedAdaptive {
			t.Error("expected adaptive TDEE to be used")
		}
		// Should be 2150 (adaptive), not constrained since delta is 50 (<100)
		if result.TDEE != 2150 {
			t.Errorf("got TDEE %d, want 2150 (adaptive)", result.TDEE)
		}
	})

	t.Run("swing constraint applied", func(t *testing.T) {
		input := FluxInput{
			CurrentBMR:     1600,
			PreviousTDEE:   2000,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 2300, Confidence: 0.8, DataPointsUsed: 50}, // +300 change
			FormulaTDEE:    2050,
			AdherenceDays:  7,
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		if !result.WasSwingConstrained {
			t.Error("expected swing constraint to be applied")
		}
		// Should be capped at 2000 + 100 = 2100
		if result.TDEE != 2100 {
			t.Errorf("got TDEE %d, want 2100 (swing constrained)", result.TDEE)
		}
		if result.DeltaKcal != 100 {
			t.Errorf("got delta %d, want 100", result.DeltaKcal)
		}
	})

	t.Run("BMR floor applied", func(t *testing.T) {
		input := FluxInput{
			CurrentBMR:     1800,
			PreviousTDEE:   1850,
			WeightHistory:  []WeightDataPoint{},
			AdaptiveResult: &AdaptiveTDEEResult{TDEE: 1700, Confidence: 0.5, DataPointsUsed: 20}, // Below BMR
			FormulaTDEE:    1900,
			AdherenceDays:  6,
		}

		result := CalculateFlux(input, DefaultFluxConfig)

		if !result.BMRFloorApplied {
			t.Error("expected BMR floor to be applied")
		}
		// Should be raised to BMR floor of 1800
		if result.TDEE != 1800 {
			t.Errorf("got TDEE %d, want 1800 (BMR floor)", result.TDEE)
		}
	})

	t.Run("EMA weight smoothing", func(t *testing.T) {
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
		if result.EMASmoothedWeight < 85.0 || result.EMASmoothedWeight > 86.5 {
			t.Errorf("EMA weight %v not in expected range [85.0, 86.5]", result.EMASmoothedWeight)
		}
	})
}

func TestDetermineTrend(t *testing.T) {
	tests := []struct {
		name      string
		points    []FluxChartPoint
		wantTrend string
	}{
		{
			name:      "too few points",
			points:    []FluxChartPoint{{CalculatedTDEE: 2000}},
			wantTrend: "stable",
		},
		{
			name: "stable trend",
			points: []FluxChartPoint{
				{CalculatedTDEE: 2000},
				{CalculatedTDEE: 2010},
				{CalculatedTDEE: 1995},
				{CalculatedTDEE: 2005},
				{CalculatedTDEE: 2000},
			},
			wantTrend: "stable",
		},
		{
			name: "upregulated trend",
			points: []FluxChartPoint{
				// First week avg: ~2000, Last week avg: ~2150 = delta +150
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
			},
			wantTrend: "upregulated",
		},
		{
			name: "downregulated trend",
			points: []FluxChartPoint{
				// First week avg: ~2200, Last week avg: ~2050 = delta -150
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
			},
			wantTrend: "downregulated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotTrend, _ := DetermineTrend(tt.points)
			if gotTrend != tt.wantTrend {
				t.Errorf("got %v, want %v", gotTrend, tt.wantTrend)
			}
		})
	}
}

func TestGenerateNotificationReason(t *testing.T) {
	tests := []struct {
		name           string
		deltaKcal      int
		wasConstrained bool
		wantContains   string
	}{
		{
			name:           "increase unconstrained",
			deltaKcal:      75,
			wasConstrained: false,
			wantContains:   "Faster rate of loss",
		},
		{
			name:           "increase constrained",
			deltaKcal:      150,
			wasConstrained: true,
			wantContains:   "limited to +100",
		},
		{
			name:           "decrease unconstrained",
			deltaKcal:      -75,
			wasConstrained: false,
			wantContains:   "Slower rate of loss",
		},
		{
			name:           "decrease constrained",
			deltaKcal:      -150,
			wasConstrained: true,
			wantContains:   "limited to -100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GenerateNotificationReason(tt.deltaKcal, tt.wasConstrained)
			if !containsString(got, tt.wantContains) {
				t.Errorf("got %q, want to contain %q", got, tt.wantContains)
			}
		})
	}
}

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && contains(s, substr))
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
