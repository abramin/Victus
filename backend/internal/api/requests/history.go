package requests

import (
	"fmt"

	"victus/internal/domain"
)

type HistoryPointResponse struct {
	Date           string  `json:"date"`
	WeightKg       float64 `json:"weightKg"`
	EstimatedTDEE  int     `json:"estimatedTDEE"`
	TDEEConfidence float64 `json:"tdeeConfidence"`
	HasTraining    bool    `json:"hasTraining"`

	// Per-day training details for compliance tracking
	PlannedSessionCount int `json:"plannedSessionCount"`
	ActualSessionCount  int `json:"actualSessionCount"`
	PlannedDurationMin  int `json:"plannedDurationMin"`
	ActualDurationMin   int `json:"actualDurationMin"`

	// Annotated history: notes from training sessions
	Notes string `json:"notes,omitempty"`

	// Body composition for lean mass vs fat mass visualization
	BodyFatPercent *float64 `json:"bodyFatPercent,omitempty"`
	LeanMassKg     *float64 `json:"leanMassKg,omitempty"`
	FatMassKg      *float64 `json:"fatMassKg,omitempty"`
}

type HistoryTrainingSummaryResponse struct {
	Planned TrainingSummaryResponse `json:"planned"`
	Actual  TrainingSummaryResponse `json:"actual"`
}

type HistoryResponse struct {
	Points          []HistoryPointResponse         `json:"points"`
	Trend           *WeightTrendSummaryResponse    `json:"trend,omitempty"`
	TrainingSummary HistoryTrainingSummaryResponse `json:"trainingSummary"`
}

func HistoryToResponse(summary *domain.HistorySummary) HistoryResponse {
	if summary == nil {
		return HistoryResponse{
			Points: []HistoryPointResponse{},
			TrainingSummary: HistoryTrainingSummaryResponse{
				Planned: TrainingSummaryResponse{},
				Actual:  TrainingSummaryResponse{},
			},
		}
	}

	points := make([]HistoryPointResponse, len(summary.Points))
	for i, point := range summary.Points {
		resp := HistoryPointResponse{
			Date:                point.Date,
			WeightKg:            point.WeightKg,
			EstimatedTDEE:       point.EstimatedTDEE,
			TDEEConfidence:      point.TDEEConfidence,
			HasTraining:         point.HasTraining,
			PlannedSessionCount: point.PlannedSessionCount,
			ActualSessionCount:  point.ActualSessionCount,
			PlannedDurationMin:  point.PlannedDurationMin,
			ActualDurationMin:   point.ActualDurationMin,
			Notes:               point.Notes,
			BodyFatPercent:      point.BodyFatPercent,
		}
		// Calculate lean mass and fat mass if body fat is available
		if point.BodyFatPercent != nil {
			leanMass := point.WeightKg * (1 - *point.BodyFatPercent/100)
			fatMass := point.WeightKg * (*point.BodyFatPercent / 100)
			resp.LeanMassKg = &leanMass
			resp.FatMassKg = &fatMass
		}
		points[i] = resp
	}

	var trendResp *WeightTrendSummaryResponse
	if summary.Trend != nil {
		trendResp = &WeightTrendSummaryResponse{
			WeeklyChangeKg: summary.Trend.WeeklyChangeKg,
			RSquared:       summary.Trend.RSquared,
			StartWeightKg:  summary.Trend.StartWeightKg,
			EndWeightKg:    summary.Trend.EndWeightKg,
		}
	}

	return HistoryResponse{
		Points: points,
		Trend:  trendResp,
		TrainingSummary: HistoryTrainingSummaryResponse{
			Planned: trainingSummaryFromAggregate(summary.PlannedTraining),
			Actual:  trainingSummaryFromAggregate(summary.ActualTraining),
		},
	}
}

func trainingSummaryFromAggregate(agg domain.TrainingSummaryAggregate) TrainingSummaryResponse {
	summary := "No sessions"
	if agg.SessionCount == 1 {
		summary = fmt.Sprintf("1 session, %d min", agg.TotalDurationMin)
	} else if agg.SessionCount > 1 {
		summary = fmt.Sprintf("%d sessions, %d min total", agg.SessionCount, agg.TotalDurationMin)
	}

	return TrainingSummaryResponse{
		SessionCount:     agg.SessionCount,
		TotalDurationMin: agg.TotalDurationMin,
		TotalLoadScore:   agg.TotalLoadScore,
		Summary:          summary,
	}
}
