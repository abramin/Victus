package requests

import "victus/internal/domain"

type WeightTrendPointResponse struct {
	Date     string  `json:"date"`
	WeightKg float64 `json:"weightKg"`
}

type WeightTrendSummaryResponse struct {
	WeeklyChangeKg float64 `json:"weeklyChangeKg"`
	RSquared       float64 `json:"rSquared"`
	StartWeightKg  float64 `json:"startWeightKg"`
	EndWeightKg    float64 `json:"endWeightKg"`
}

type WeightTrendResponse struct {
	Points []WeightTrendPointResponse  `json:"points"`
	Trend  *WeightTrendSummaryResponse `json:"trend,omitempty"`
}

func WeightTrendToResponse(points []domain.WeightSample, trend *domain.WeightTrend) WeightTrendResponse {
	respPoints := make([]WeightTrendPointResponse, len(points))
	for i, point := range points {
		respPoints[i] = WeightTrendPointResponse{
			Date:     point.Date,
			WeightKg: point.WeightKg,
		}
	}

	var trendResp *WeightTrendSummaryResponse
	if trend != nil {
		trendResp = &WeightTrendSummaryResponse{
			WeeklyChangeKg: trend.WeeklyChangeKg,
			RSquared:       trend.RSquared,
			StartWeightKg:  trend.StartWeightKg,
			EndWeightKg:    trend.EndWeightKg,
		}
	}

	return WeightTrendResponse{
		Points: respPoints,
		Trend:  trendResp,
	}
}
