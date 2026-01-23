package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: ACR calculation rules are pure domain invariants; unit tests guard
// against regression without relying on feature flows.
type TrainingLoadSuite struct {
	suite.Suite
}

func TestTrainingLoadSuite(t *testing.T) {
	suite.Run(t, new(TrainingLoadSuite))
}

func (s *TrainingLoadSuite) intPtr(i int) *int {
	return &i
}

func (s *TrainingLoadSuite) TestSessionLoad() {
	s.Run("nil RPE uses default 5", func() {
		// HIIT has LoadScore=5
		// Formula: 5 * (60/60) * (5/3) = 5 * 1 * 1.667 = 8.333
		load := SessionLoad(TrainingTypeHIIT, 60, nil)
		s.InDelta(8.333, load, 0.01)
	})

	s.Run("explicit RPE 10 scales correctly", func() {
		// HIIT: 5 * (60/60) * (10/3) = 5 * 1 * 3.333 = 16.667
		load := SessionLoad(TrainingTypeHIIT, 60, s.intPtr(10))
		s.InDelta(16.667, load, 0.01)
	})

	s.Run("explicit RPE 3 gives factor of 1", func() {
		// Strength has LoadScore=5
		// 5 * (60/60) * (3/3) = 5 * 1 * 1 = 5
		load := SessionLoad(TrainingTypeStrength, 60, s.intPtr(3))
		s.InDelta(5.0, load, 0.01)
	})

	s.Run("zero duration returns zero", func() {
		load := SessionLoad(TrainingTypeHIIT, 0, s.intPtr(10))
		s.Equal(0.0, load)
	})

	s.Run("rest type returns zero regardless of duration", func() {
		// Rest has LoadScore=0
		load := SessionLoad(TrainingTypeRest, 60, s.intPtr(10))
		s.Equal(0.0, load)
	})

	s.Run("30 min session is half load of 60 min", func() {
		load60 := SessionLoad(TrainingTypeStrength, 60, s.intPtr(6))
		load30 := SessionLoad(TrainingTypeStrength, 30, s.intPtr(6))
		s.InDelta(load60/2, load30, 0.01)
	})

	s.Run("walking type with moderate RPE", func() {
		// Walking has LoadScore=1
		// 1 * (45/60) * (6/3) = 1 * 0.75 * 2 = 1.5
		load := SessionLoad(TrainingTypeWalking, 45, s.intPtr(6))
		s.InDelta(1.5, load, 0.01)
	})
}

func (s *TrainingLoadSuite) TestDailyLoad() {
	s.Run("uses actual sessions when present", func() {
		actual := []TrainingSession{
			{Type: TrainingTypeHIIT, DurationMin: 30, PerceivedIntensity: s.intPtr(8)},
		}
		planned := []TrainingSession{
			{Type: TrainingTypeWalking, DurationMin: 60, PerceivedIntensity: nil},
		}
		load := DailyLoad(actual, planned)
		// Should use actual: HIIT 30min RPE 8
		// 5 * (30/60) * (8/3) = 5 * 0.5 * 2.667 = 6.667
		s.InDelta(6.667, load, 0.01)
	})

	s.Run("falls back to planned when no actual", func() {
		actual := []TrainingSession{}
		planned := []TrainingSession{
			{Type: TrainingTypeStrength, DurationMin: 60, PerceivedIntensity: nil},
		}
		load := DailyLoad(actual, planned)
		// Should use planned: Strength 60min default RPE 5
		// 5 * (60/60) * (5/3) = 8.333
		s.InDelta(8.333, load, 0.01)
	})

	s.Run("sums multiple sessions", func() {
		actual := []TrainingSession{
			{Type: TrainingTypeStrength, DurationMin: 60, PerceivedIntensity: s.intPtr(6)},
			{Type: TrainingTypeWalking, DurationMin: 30, PerceivedIntensity: s.intPtr(3)},
		}
		load := DailyLoad(actual, nil)
		// Strength: 5 * 1 * 2 = 10
		// Walking: 1 * 0.5 * 1 = 0.5
		// Total: 10.5
		s.InDelta(10.5, load, 0.01)
	})

	s.Run("empty both returns zero", func() {
		load := DailyLoad(nil, nil)
		s.Equal(0.0, load)
	})
}

func (s *TrainingLoadSuite) TestCalculateAcuteLoad() {
	s.Run("empty returns zero", func() {
		load := CalculateAcuteLoad(nil)
		s.Equal(0.0, load)
	})

	s.Run("less than 7 days uses all available", func() {
		dataPoints := []DailyLoadDataPoint{
			{Date: "2025-01-01", DailyLoad: 10},
			{Date: "2025-01-02", DailyLoad: 20},
			{Date: "2025-01-03", DailyLoad: 30},
		}
		load := CalculateAcuteLoad(dataPoints)
		// Average: (10+20+30)/3 = 20
		s.InDelta(20.0, load, 0.01)
	})

	s.Run("exactly 7 days uses all", func() {
		dataPoints := make([]DailyLoadDataPoint, 7)
		for i := 0; i < 7; i++ {
			dataPoints[i] = DailyLoadDataPoint{DailyLoad: float64(i + 1) * 2}
		}
		load := CalculateAcuteLoad(dataPoints)
		// Sum: 2+4+6+8+10+12+14 = 56, Average: 56/7 = 8
		s.InDelta(8.0, load, 0.01)
	})

	s.Run("more than 7 days uses last 7", func() {
		dataPoints := []DailyLoadDataPoint{
			{Date: "2025-01-01", DailyLoad: 100}, // Should be excluded
			{Date: "2025-01-02", DailyLoad: 100}, // Should be excluded
			{Date: "2025-01-03", DailyLoad: 100}, // Should be excluded
			{Date: "2025-01-04", DailyLoad: 10},
			{Date: "2025-01-05", DailyLoad: 10},
			{Date: "2025-01-06", DailyLoad: 10},
			{Date: "2025-01-07", DailyLoad: 10},
			{Date: "2025-01-08", DailyLoad: 10},
			{Date: "2025-01-09", DailyLoad: 10},
			{Date: "2025-01-10", DailyLoad: 10},
		}
		load := CalculateAcuteLoad(dataPoints)
		// Last 7: all 10s, Average: 10
		s.InDelta(10.0, load, 0.01)
	})
}

func (s *TrainingLoadSuite) TestCalculateChronicLoad() {
	s.Run("less than 7 days returns zero", func() {
		dataPoints := []DailyLoadDataPoint{
			{Date: "2025-01-01", DailyLoad: 10},
			{Date: "2025-01-02", DailyLoad: 20},
			{Date: "2025-01-03", DailyLoad: 30},
		}
		load := CalculateChronicLoad(dataPoints)
		s.Equal(0.0, load)
	})

	s.Run("exactly 7 days calculates average", func() {
		dataPoints := make([]DailyLoadDataPoint, 7)
		for i := 0; i < 7; i++ {
			dataPoints[i] = DailyLoadDataPoint{DailyLoad: 10}
		}
		load := CalculateChronicLoad(dataPoints)
		s.InDelta(10.0, load, 0.01)
	})

	s.Run("7 to 28 days uses all", func() {
		dataPoints := make([]DailyLoadDataPoint, 14)
		for i := 0; i < 14; i++ {
			dataPoints[i] = DailyLoadDataPoint{DailyLoad: float64(i + 1)}
		}
		load := CalculateChronicLoad(dataPoints)
		// Sum: 1+2+...+14 = 105, Average: 105/14 = 7.5
		s.InDelta(7.5, load, 0.01)
	})

	s.Run("more than 28 days uses last 28", func() {
		dataPoints := make([]DailyLoadDataPoint, 35)
		for i := 0; i < 35; i++ {
			if i < 7 {
				dataPoints[i] = DailyLoadDataPoint{DailyLoad: 100} // Should be excluded
			} else {
				dataPoints[i] = DailyLoadDataPoint{DailyLoad: 5}
			}
		}
		load := CalculateChronicLoad(dataPoints)
		// Last 28 are all 5s, Average: 5
		s.InDelta(5.0, load, 0.01)
	})
}

func (s *TrainingLoadSuite) TestCalculateACR() {
	s.Run("chronic zero returns 1.0", func() {
		acr := CalculateACR(10.0, 0.0)
		s.Equal(1.0, acr)
	})

	s.Run("both zero returns 1.0", func() {
		acr := CalculateACR(0.0, 0.0)
		s.Equal(1.0, acr)
	})

	s.Run("equal loads returns 1.0", func() {
		acr := CalculateACR(10.0, 10.0)
		s.InDelta(1.0, acr, 0.01)
	})

	s.Run("acute higher than chronic shows increased load", func() {
		acr := CalculateACR(15.0, 10.0)
		s.InDelta(1.5, acr, 0.01)
	})

	s.Run("acute lower than chronic shows decreased load", func() {
		acr := CalculateACR(5.0, 10.0)
		s.InDelta(0.5, acr, 0.01)
	})
}

func (s *TrainingLoadSuite) TestCalculateTrainingLoadResult() {
	s.Run("calculates all metrics correctly", func() {
		dataPoints := make([]DailyLoadDataPoint, 14)
		for i := 0; i < 14; i++ {
			dataPoints[i] = DailyLoadDataPoint{
				Date:      "2025-01-" + string(rune('0'+i/10)) + string(rune('0'+i%10+1)),
				DailyLoad: 10.0,
			}
		}

		result := CalculateTrainingLoadResult(15.0, dataPoints)

		s.InDelta(15.0, result.DailyLoad, 0.01)
		s.InDelta(10.0, result.AcuteLoad, 0.01)  // Last 7 days avg
		s.InDelta(10.0, result.ChronicLoad, 0.01) // All 14 days avg (since all are 10)
		s.InDelta(1.0, result.ACR, 0.01)
	})

	s.Run("handles insufficient data gracefully", func() {
		dataPoints := []DailyLoadDataPoint{
			{Date: "2025-01-01", DailyLoad: 10},
		}

		result := CalculateTrainingLoadResult(10.0, dataPoints)

		s.InDelta(10.0, result.DailyLoad, 0.01)
		s.InDelta(10.0, result.AcuteLoad, 0.01)
		s.Equal(0.0, result.ChronicLoad) // Less than 7 days
		s.Equal(1.0, result.ACR)          // Defaults to 1 when chronic is 0
	})
}

// Acceptance criteria tests from Issue #9
// NOTE: User-visible behavior now also covered by training-load.feature scenarios.
// These domain tests are retained because they guard the pure calculation invariants
// that the feature scenarios depend on.
func (s *TrainingLoadSuite) TestAcceptanceCriteria() {
	s.Run("week of logs with no actual training uses planned sessions", func() {
		// Simulate 7 days where we only have planned sessions
		dataPoints := make([]DailyLoadDataPoint, 7)
		for i := 0; i < 7; i++ {
			planned := []TrainingSession{
				{Type: TrainingTypeStrength, DurationMin: 60, PerceivedIntensity: nil},
			}
			// DailyLoad should use planned since actual is empty
			dataPoints[i] = DailyLoadDataPoint{
				Date:      "2025-01-0" + string(rune('1'+i)),
				DailyLoad: DailyLoad(nil, planned),
			}
		}

		// All days should have the same load from planned sessions
		// Strength 60min RPE 5 (default): 5 * 1 * 1.667 = 8.333
		for _, dp := range dataPoints {
			s.InDelta(8.333, dp.DailyLoad, 0.01, "Planned sessions should be used when no actual")
		}

		acuteLoad := CalculateAcuteLoad(dataPoints)
		s.InDelta(8.333, acuteLoad, 0.01)
	})

	s.Run("chronicLoad equals 0 results in ACR of 1", func() {
		// Less than 7 days of data means chronic = 0
		dataPoints := []DailyLoadDataPoint{
			{Date: "2025-01-01", DailyLoad: 10},
			{Date: "2025-01-02", DailyLoad: 15},
		}

		chronicLoad := CalculateChronicLoad(dataPoints)
		s.Equal(0.0, chronicLoad, "Chronic load should be 0 with insufficient data")

		acr := CalculateACR(12.5, chronicLoad)
		s.Equal(1.0, acr, "ACR should default to 1 when chronic is 0")
	})
}
