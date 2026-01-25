package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Regression math is pure and deterministic; these invariants are
// difficult to assert via feature tests due to shared test DB state.
type WeightTrendSuite struct {
	suite.Suite
}

func TestWeightTrendSuite(t *testing.T) {
	suite.Run(t, new(WeightTrendSuite))
}

func (s *WeightTrendSuite) TestInsufficientSamples() {
	s.Run("empty samples returns nil", func() {
		trend := CalculateWeightTrend([]WeightSample{})
		s.Nil(trend)
	})

	s.Run("single sample returns nil", func() {
		trend := CalculateWeightTrend([]WeightSample{{Date: "2025-01-01", WeightKg: 80}})
		s.Nil(trend)
	})
}

func (s *WeightTrendSuite) TestMinimumValidSamples() {
	s.Run("two samples calculates trend", func() {
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 80},
			{Date: "2025-01-08", WeightKg: 79}, // 1 week later, 1 kg lost
		})
		s.Require().NotNil(trend)

		s.InDelta(-1, trend.WeeklyChangeKg, 0.01)
		s.InDelta(1, trend.RSquared, 0.0001) // Perfect fit with 2 points
		s.InDelta(80, trend.StartWeightKg, 0.01)
		s.InDelta(79, trend.EndWeightKg, 0.01)
	})
}

func (s *WeightTrendSuite) TestLosingWeightTrend() {
	s.Run("calculates negative weekly change for weight loss", func() {
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 80},
			{Date: "2025-01-02", WeightKg: 79},
			{Date: "2025-01-03", WeightKg: 78},
			{Date: "2025-01-04", WeightKg: 77},
		})
		s.Require().NotNil(trend)

		s.InDelta(-7, trend.WeeklyChangeKg, 0.01) // 1 kg/day * 7 days
		s.InDelta(1, trend.RSquared, 0.0001)
		s.InDelta(80, trend.StartWeightKg, 0.01)
		s.InDelta(77, trend.EndWeightKg, 0.01)
	})
}

func (s *WeightTrendSuite) TestGainingWeightTrend() {
	s.Run("calculates positive weekly change for weight gain", func() {
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 70},
			{Date: "2025-01-02", WeightKg: 70.5},
			{Date: "2025-01-03", WeightKg: 71},
			{Date: "2025-01-04", WeightKg: 71.5},
		})
		s.Require().NotNil(trend)

		s.InDelta(3.5, trend.WeeklyChangeKg, 0.01) // 0.5 kg/day * 7 days
		s.InDelta(1, trend.RSquared, 0.0001)
		s.InDelta(70, trend.StartWeightKg, 0.01)
		s.InDelta(71.5, trend.EndWeightKg, 0.01)
	})
}

func (s *WeightTrendSuite) TestConstantWeight() {
	s.Run("constant weights produce zero slope and rSquared", func() {
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 82},
			{Date: "2025-01-02", WeightKg: 82},
			{Date: "2025-01-03", WeightKg: 82},
		})
		s.Require().NotNil(trend)

		s.InDelta(0, trend.WeeklyChangeKg, 0.0001)
		s.InDelta(0, trend.RSquared, 0.0001)
		s.InDelta(82, trend.StartWeightKg, 0.01)
		s.InDelta(82, trend.EndWeightKg, 0.01)
	})
}

func (s *WeightTrendSuite) TestNonConsecutiveDates() {
	s.Run("handles gaps in dates correctly", func() {
		// 2 weeks of data with gaps
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 80},
			{Date: "2025-01-05", WeightKg: 79}, // 4 days gap
			{Date: "2025-01-14", WeightKg: 78}, // 9 days gap
		})
		s.Require().NotNil(trend)

		// Slope is based on actual days, not index
		// 2 kg lost over 13 days = ~1.08 kg/week
		s.InDelta(-1.08, trend.WeeklyChangeKg, 0.1)
		s.Greater(trend.RSquared, 0.9) // Should be high for roughly linear data
	})
}

func (s *WeightTrendSuite) TestNoisyData() {
	s.Run("noisy data produces low R-squared", func() {
		// Weight fluctuates but trends downward
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 80},
			{Date: "2025-01-02", WeightKg: 81}, // Up
			{Date: "2025-01-03", WeightKg: 79}, // Down
			{Date: "2025-01-04", WeightKg: 80.5}, // Up
			{Date: "2025-01-05", WeightKg: 78}, // Down
			{Date: "2025-01-06", WeightKg: 79.5}, // Up
			{Date: "2025-01-07", WeightKg: 77}, // Down
		})
		s.Require().NotNil(trend)

		// Overall trend is downward
		s.Less(trend.WeeklyChangeKg, 0.0)
		// R-squared should be lower due to noise
		s.Less(trend.RSquared, 0.9)
		s.Greater(trend.RSquared, 0.0)
	})
}

func (s *WeightTrendSuite) TestInvalidDateFallback() {
	s.Run("falls back to index-based calculation with invalid dates", func() {
		// Invalid date format - should fall back to index-based
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "invalid", WeightKg: 80},
			{Date: "also-invalid", WeightKg: 79},
			{Date: "still-invalid", WeightKg: 78},
		})
		s.Require().NotNil(trend)

		// Index-based: slope is per-index, so weekly change = slope * 7
		// 1 kg per index * 7 = 7 kg/week (but negative since losing)
		s.InDelta(-7, trend.WeeklyChangeKg, 0.01)
	})
}

func (s *WeightTrendSuite) TestLongTermTrend() {
	s.Run("calculates accurate trend over 4 weeks", func() {
		// Losing 0.5 kg per week for 4 weeks
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 85.0},
			{Date: "2025-01-08", WeightKg: 84.5},
			{Date: "2025-01-15", WeightKg: 84.0},
			{Date: "2025-01-22", WeightKg: 83.5},
			{Date: "2025-01-29", WeightKg: 83.0},
		})
		s.Require().NotNil(trend)

		s.InDelta(-0.5, trend.WeeklyChangeKg, 0.01)
		s.InDelta(1, trend.RSquared, 0.0001) // Perfect linear data
		s.InDelta(85.0, trend.StartWeightKg, 0.01)
		s.InDelta(83.0, trend.EndWeightKg, 0.01)
	})
}
