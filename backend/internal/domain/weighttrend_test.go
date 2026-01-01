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

func (s *WeightTrendSuite) TestWeightTrendAnalysis() {
	s.Run("returns nil with fewer than two samples", func() {
		trend := CalculateWeightTrend([]WeightSample{{Date: "2025-01-01", WeightKg: 80}})
		s.Nil(trend)
	})

	s.Run("calculates a linear regression trend", func() {
		trend := CalculateWeightTrend([]WeightSample{
			{Date: "2025-01-01", WeightKg: 80},
			{Date: "2025-01-02", WeightKg: 79},
			{Date: "2025-01-03", WeightKg: 78},
			{Date: "2025-01-04", WeightKg: 77},
		})
		s.Require().NotNil(trend)

		s.InDelta(-7, trend.WeeklyChangeKg, 0.01)
		s.InDelta(1, trend.RSquared, 0.0001)
		s.InDelta(80, trend.StartWeightKg, 0.01)
		s.InDelta(77, trend.EndWeightKg, 0.01)
	})

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
