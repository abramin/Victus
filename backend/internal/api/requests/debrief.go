package requests

import (
	"victus/internal/domain"
)

// WeeklyDebriefResponse is the API response for weekly debrief.
type WeeklyDebriefResponse struct {
	WeekStartDate   string                        `json:"weekStartDate"`
	WeekEndDate     string                        `json:"weekEndDate"`
	VitalityScore   VitalityScoreResponse         `json:"vitalityScore"`
	Narrative       NarrativeResponse             `json:"narrative"`
	Recommendations []RecommendationResponse      `json:"recommendations"`
	DailyBreakdown  []DebriefDayResponse          `json:"dailyBreakdown"`
	GeneratedAt     string                        `json:"generatedAt"`
}

// VitalityScoreResponse represents the weekly vitality score.
type VitalityScoreResponse struct {
	Overall           float64               `json:"overall"`
	MealAdherence     float64               `json:"mealAdherence"`
	TrainingAdherence float64               `json:"trainingAdherence"`
	WeightDelta       float64               `json:"weightDelta"`
	TrendWeight       float64               `json:"trendWeight"`
	MetabolicFlux     MetabolicFluxResponse `json:"metabolicFlux"`
}

// MetabolicFluxResponse represents the metabolic trend for the week.
type MetabolicFluxResponse struct {
	StartTDEE int    `json:"startTDEE"`
	EndTDEE   int    `json:"endTDEE"`
	DeltaKcal int    `json:"deltaKcal"`
	Trend     string `json:"trend"`
}

// NarrativeResponse represents the generated narrative.
type NarrativeResponse struct {
	Text           string `json:"text"`
	GeneratedByLLM bool   `json:"generatedByLlm"`
}

// RecommendationResponse represents a tactical recommendation.
type RecommendationResponse struct {
	Priority    int      `json:"priority"`
	Category    string   `json:"category"`
	Summary     string   `json:"summary"`
	Rationale   string   `json:"rationale"`
	ActionItems []string `json:"actionItems"`
}

// DebriefDayResponse represents a single day in the weekly breakdown.
type DebriefDayResponse struct {
	Date             string   `json:"date"`
	DayName          string   `json:"dayName"`
	DayType          string   `json:"dayType"`
	TargetCalories   int      `json:"targetCalories"`
	ConsumedCalories int      `json:"consumedCalories"`
	CalorieDelta     int      `json:"calorieDelta"`
	TargetProteinG   int      `json:"targetProteinG"`
	ConsumedProteinG int      `json:"consumedProteinG"`
	ProteinPercent   float64  `json:"proteinPercent"`
	PlannedSessions  int      `json:"plannedSessions"`
	ActualSessions   int      `json:"actualSessions"`
	TrainingLoad     float64  `json:"trainingLoad"`
	AvgRPE           *float64 `json:"avgRpe,omitempty"`
	HRVMs            *int     `json:"hrvMs,omitempty"`
	CNSStatus        *string  `json:"cnsStatus,omitempty"`
	SleepQuality     int      `json:"sleepQuality"`
	SleepHours       *float64 `json:"sleepHours,omitempty"`
	Notes            string   `json:"notes,omitempty"`
}

// WeeklyDebriefToResponse converts a domain WeeklyDebrief to the API response.
func WeeklyDebriefToResponse(debrief *domain.WeeklyDebrief) WeeklyDebriefResponse {
	if debrief == nil {
		return WeeklyDebriefResponse{
			Recommendations: []RecommendationResponse{},
			DailyBreakdown:  []DebriefDayResponse{},
		}
	}

	// Convert recommendations
	recommendations := make([]RecommendationResponse, len(debrief.Recommendations))
	for i, rec := range debrief.Recommendations {
		recommendations[i] = RecommendationResponse{
			Priority:    rec.Priority,
			Category:    rec.Category,
			Summary:     rec.Summary,
			Rationale:   rec.Rationale,
			ActionItems: rec.ActionItems,
		}
	}

	// Convert daily breakdown
	dailyBreakdown := make([]DebriefDayResponse, len(debrief.DailyBreakdown))
	for i, day := range debrief.DailyBreakdown {
		resp := DebriefDayResponse{
			Date:             day.Date,
			DayName:          day.DayName,
			DayType:          string(day.DayType),
			TargetCalories:   day.TargetCalories,
			ConsumedCalories: day.ConsumedCalories,
			CalorieDelta:     day.CalorieDelta,
			TargetProteinG:   day.TargetProteinG,
			ConsumedProteinG: day.ConsumedProteinG,
			ProteinPercent:   day.ProteinPercent,
			PlannedSessions:  day.PlannedSessions,
			ActualSessions:   day.ActualSessions,
			TrainingLoad:     day.TrainingLoad,
			AvgRPE:           day.AvgRPE,
			HRVMs:            day.HRVMs,
			SleepQuality:     day.SleepQuality,
			SleepHours:       day.SleepHours,
			Notes:            day.Notes,
		}
		if day.CNSStatus != nil {
			status := string(*day.CNSStatus)
			resp.CNSStatus = &status
		}
		dailyBreakdown[i] = resp
	}

	return WeeklyDebriefResponse{
		WeekStartDate: debrief.WeekStartDate,
		WeekEndDate:   debrief.WeekEndDate,
		VitalityScore: VitalityScoreResponse{
			Overall:           debrief.VitalityScore.Overall,
			MealAdherence:     debrief.VitalityScore.MealAdherence,
			TrainingAdherence: debrief.VitalityScore.TrainingAdherence,
			WeightDelta:       debrief.VitalityScore.WeightDelta,
			TrendWeight:       debrief.VitalityScore.TrendWeight,
			MetabolicFlux: MetabolicFluxResponse{
				StartTDEE: debrief.VitalityScore.MetabolicFlux.StartTDEE,
				EndTDEE:   debrief.VitalityScore.MetabolicFlux.EndTDEE,
				DeltaKcal: debrief.VitalityScore.MetabolicFlux.DeltaKcal,
				Trend:     debrief.VitalityScore.MetabolicFlux.Trend,
			},
		},
		Narrative: NarrativeResponse{
			Text:           debrief.Narrative.Text,
			GeneratedByLLM: debrief.Narrative.GeneratedByLLM,
		},
		Recommendations: recommendations,
		DailyBreakdown:  dailyBreakdown,
		GeneratedAt:     debrief.GeneratedAt,
	}
}
