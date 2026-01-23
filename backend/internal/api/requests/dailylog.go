package requests

import (
	"time"

	"victus/internal/domain"
)

// TrainingSessionRequest represents a single training session in API requests.
type TrainingSessionRequest struct {
	Type        string `json:"type"`
	DurationMin int    `json:"durationMin"`
	Notes       string `json:"notes,omitempty"`
}

// ActualTrainingSessionRequest represents an actual training session in API requests.
type ActualTrainingSessionRequest struct {
	Type               string `json:"type"`
	DurationMin        int    `json:"durationMin"`
	PerceivedIntensity *int   `json:"perceivedIntensity,omitempty"` // RPE 1-10
	Notes              string `json:"notes,omitempty"`
}

// UpdateActualTrainingRequest is the request body for PATCH /api/logs/:date/actual-training.
type UpdateActualTrainingRequest struct {
	ActualSessions []ActualTrainingSessionRequest `json:"actualSessions"`
}

// CreateDailyLogRequest is the request body for POST /api/logs.
type CreateDailyLogRequest struct {
	Date                    string                   `json:"date,omitempty"`
	WeightKg                float64                  `json:"weightKg"`
	BodyFatPercent          *float64                 `json:"bodyFatPercent,omitempty"`
	RestingHeartRate        *int                     `json:"restingHeartRate,omitempty"`
	SleepQuality            int                      `json:"sleepQuality"`
	SleepHours              *float64                 `json:"sleepHours,omitempty"`
	PlannedTrainingSessions []TrainingSessionRequest `json:"plannedTrainingSessions"`
	DayType                 string                   `json:"dayType,omitempty"`
}

// TrainingSessionResponse represents a training session in API responses.
type TrainingSessionResponse struct {
	SessionOrder int    `json:"sessionOrder"`
	Type         string `json:"type"`
	DurationMin  int    `json:"durationMin"`
	Notes        string `json:"notes,omitempty"`
}

// ActualTrainingSessionResponse represents an actual training session in API responses.
type ActualTrainingSessionResponse struct {
	SessionOrder       int    `json:"sessionOrder"`
	Type               string `json:"type"`
	DurationMin        int    `json:"durationMin"`
	PerceivedIntensity *int   `json:"perceivedIntensity,omitempty"`
	Notes              string `json:"notes,omitempty"`
}

// TrainingSummaryResponse provides aggregate info about training sessions.
type TrainingSummaryResponse struct {
	SessionCount     int     `json:"sessionCount"`
	TotalDurationMin int     `json:"totalDurationMin"`
	TotalLoadScore   float64 `json:"totalLoadScore"`
	Summary          string  `json:"summary"` // e.g., "3 sessions, 110 min total"
}

// MacroPointsResponse represents macro points for a meal.
type MacroPointsResponse struct {
	Carbs   int `json:"carbs"`
	Protein int `json:"protein"`
	Fats    int `json:"fats"`
}

// MealTargetsResponse represents macro points for all meals.
type MealTargetsResponse struct {
	Breakfast MacroPointsResponse `json:"breakfast"`
	Lunch     MacroPointsResponse `json:"lunch"`
	Dinner    MacroPointsResponse `json:"dinner"`
}

// DailyTargetsResponse represents calculated macro targets.
type DailyTargetsResponse struct {
	TotalCarbsG   int                 `json:"totalCarbsG"`
	TotalProteinG int                 `json:"totalProteinG"`
	TotalFatsG    int                 `json:"totalFatsG"`
	TotalCalories int                 `json:"totalCalories"`
	EstimatedTDEE int                 `json:"estimatedTDEE"` // Pre-adjustment TDEE
	Meals         MealTargetsResponse `json:"meals"`
	FruitG        int                 `json:"fruitG"`
	VeggiesG      int                 `json:"veggiesG"`
	WaterL        float64             `json:"waterL"`
	DayType       string              `json:"dayType"`
}

// DailyLogResponse is the response body for daily log endpoints.
type DailyLogResponse struct {
	Date                    string                          `json:"date"`
	WeightKg                float64                         `json:"weightKg"`
	BodyFatPercent          *float64                        `json:"bodyFatPercent,omitempty"`
	RestingHeartRate        *int                            `json:"restingHeartRate,omitempty"`
	SleepQuality            int                             `json:"sleepQuality"`
	SleepHours              *float64                        `json:"sleepHours,omitempty"`
	PlannedTrainingSessions []TrainingSessionResponse       `json:"plannedTrainingSessions"`
	ActualTrainingSessions  []ActualTrainingSessionResponse `json:"actualTrainingSessions,omitempty"`
	TrainingSummary         TrainingSummaryResponse         `json:"trainingSummary"`
	DayType                 string                          `json:"dayType"`
	CalculatedTargets       DailyTargetsResponse            `json:"calculatedTargets"`
	EstimatedTDEE           int                             `json:"estimatedTDEE"`
	CreatedAt               string                          `json:"createdAt,omitempty"`
	UpdatedAt               string                          `json:"updatedAt,omitempty"`
}

// ActualTrainingFromRequest converts an UpdateActualTrainingRequest to domain TrainingSessions.
func ActualTrainingFromRequest(req UpdateActualTrainingRequest) []domain.TrainingSession {
	sessions := make([]domain.TrainingSession, len(req.ActualSessions))
	for i, s := range req.ActualSessions {
		sessions[i] = domain.TrainingSession{
			SessionOrder:       i + 1,
			IsPlanned:          false,
			Type:               domain.TrainingType(s.Type),
			DurationMin:        s.DurationMin,
			PerceivedIntensity: s.PerceivedIntensity,
			Notes:              s.Notes,
		}
	}
	return sessions
}

// DailyLogInputFromRequest converts a CreateDailyLogRequest to a DailyLogInput.
func DailyLogInputFromRequest(req CreateDailyLogRequest) domain.DailyLogInput {
	sessions := make([]domain.TrainingSession, len(req.PlannedTrainingSessions))
	for i, s := range req.PlannedTrainingSessions {
		sessions[i] = domain.TrainingSession{
			SessionOrder: i + 1,
			IsPlanned:    true,
			Type:         domain.TrainingType(s.Type),
			DurationMin:  s.DurationMin,
			Notes:        s.Notes,
		}
	}

	return domain.DailyLogInput{
		Date:             req.Date,
		WeightKg:         req.WeightKg,
		BodyFatPercent:   req.BodyFatPercent,
		RestingHeartRate: req.RestingHeartRate,
		SleepQuality:     domain.SleepQuality(req.SleepQuality),
		SleepHours:       req.SleepHours,
		PlannedSessions:  sessions,
		DayType:          domain.DayType(req.DayType),
	}
}

// DailyLogToResponse converts a DailyLog model to a DailyLogResponse.
func DailyLogToResponse(d *domain.DailyLog) DailyLogResponse {
	// Convert planned sessions to response format
	plannedSessions := make([]TrainingSessionResponse, len(d.PlannedSessions))
	for i, s := range d.PlannedSessions {
		plannedSessions[i] = TrainingSessionResponse{
			SessionOrder: s.SessionOrder,
			Type:         string(s.Type),
			DurationMin:  s.DurationMin,
			Notes:        s.Notes,
		}
	}

	// Convert actual sessions to response format
	var actualSessions []ActualTrainingSessionResponse
	if len(d.ActualSessions) > 0 {
		actualSessions = make([]ActualTrainingSessionResponse, len(d.ActualSessions))
		for i, s := range d.ActualSessions {
			actualSessions[i] = ActualTrainingSessionResponse{
				SessionOrder:       s.SessionOrder,
				Type:               string(s.Type),
				DurationMin:        s.DurationMin,
				PerceivedIntensity: s.PerceivedIntensity,
				Notes:              s.Notes,
			}
		}
	}

	summarySessions := d.PlannedSessions
	if len(d.ActualSessions) > 0 {
		summarySessions = d.ActualSessions
	}

	resp := DailyLogResponse{
		Date:                    d.Date,
		WeightKg:                d.WeightKg,
		BodyFatPercent:          d.BodyFatPercent,
		RestingHeartRate:        d.RestingHeartRate,
		SleepQuality:            int(d.SleepQuality),
		SleepHours:              d.SleepHours,
		PlannedTrainingSessions: plannedSessions,
		ActualTrainingSessions:  actualSessions,
		TrainingSummary: TrainingSummaryResponse{
			SessionCount:     len(summarySessions),
			TotalDurationMin: domain.TotalDurationMin(summarySessions),
			TotalLoadScore:   domain.TotalLoadScore(summarySessions),
			Summary:          domain.SessionSummary(summarySessions),
		},
		DayType: string(d.DayType),
		CalculatedTargets: DailyTargetsResponse{
			TotalCarbsG:   d.CalculatedTargets.TotalCarbsG,
			TotalProteinG: d.CalculatedTargets.TotalProteinG,
			TotalFatsG:    d.CalculatedTargets.TotalFatsG,
			TotalCalories: d.CalculatedTargets.TotalCalories,
			EstimatedTDEE: d.CalculatedTargets.EstimatedTDEE,
			Meals: MealTargetsResponse{
				Breakfast: MacroPointsResponse{
					Carbs:   d.CalculatedTargets.Meals.Breakfast.Carbs,
					Protein: d.CalculatedTargets.Meals.Breakfast.Protein,
					Fats:    d.CalculatedTargets.Meals.Breakfast.Fats,
				},
				Lunch: MacroPointsResponse{
					Carbs:   d.CalculatedTargets.Meals.Lunch.Carbs,
					Protein: d.CalculatedTargets.Meals.Lunch.Protein,
					Fats:    d.CalculatedTargets.Meals.Lunch.Fats,
				},
				Dinner: MacroPointsResponse{
					Carbs:   d.CalculatedTargets.Meals.Dinner.Carbs,
					Protein: d.CalculatedTargets.Meals.Dinner.Protein,
					Fats:    d.CalculatedTargets.Meals.Dinner.Fats,
				},
			},
			FruitG:   d.CalculatedTargets.FruitG,
			VeggiesG: d.CalculatedTargets.VeggiesG,
			WaterL:   d.CalculatedTargets.WaterL,
			DayType:  string(d.CalculatedTargets.DayType),
		},
		EstimatedTDEE: d.EstimatedTDEE,
	}

	if !d.CreatedAt.IsZero() {
		resp.CreatedAt = d.CreatedAt.Format(time.RFC3339)
	}
	if !d.UpdatedAt.IsZero() {
		resp.UpdatedAt = d.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}
