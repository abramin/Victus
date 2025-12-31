package requests

import (
	"time"

	"victus/internal/models"
)

// PlannedTrainingRequest represents training plan in API requests.
type PlannedTrainingRequest struct {
	Type               string `json:"type"`
	PlannedDurationMin int    `json:"plannedDurationMin"`
}

// CreateDailyLogRequest is the request body for POST /api/logs.
type CreateDailyLogRequest struct {
	Date             string                 `json:"date,omitempty"`
	WeightKg         float64                `json:"weightKg"`
	BodyFatPercent   *float64               `json:"bodyFatPercent,omitempty"`
	RestingHeartRate *int                   `json:"restingHeartRate,omitempty"`
	SleepQuality     int                    `json:"sleepQuality"`
	SleepHours       *float64               `json:"sleepHours,omitempty"`
	PlannedTraining  PlannedTrainingRequest `json:"plannedTraining"`
	DayType          string                 `json:"dayType,omitempty"`
}

// PlannedTrainingResponse represents training plan in API responses.
type PlannedTrainingResponse struct {
	Type               string `json:"type"`
	PlannedDurationMin int    `json:"plannedDurationMin"`
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
	Meals         MealTargetsResponse `json:"meals"`
	FruitG        int                 `json:"fruitG"`
	VeggiesG      int                 `json:"veggiesG"`
	WaterL        float64             `json:"waterL"`
	DayType       string              `json:"dayType"`
}

// DailyLogResponse is the response body for daily log endpoints.
type DailyLogResponse struct {
	Date              string                  `json:"date"`
	WeightKg          float64                 `json:"weightKg"`
	BodyFatPercent    *float64                `json:"bodyFatPercent,omitempty"`
	RestingHeartRate  *int                    `json:"restingHeartRate,omitempty"`
	SleepQuality      int                     `json:"sleepQuality"`
	SleepHours        *float64                `json:"sleepHours,omitempty"`
	PlannedTraining   PlannedTrainingResponse `json:"plannedTraining"`
	DayType           string                  `json:"dayType"`
	CalculatedTargets DailyTargetsResponse    `json:"calculatedTargets"`
	EstimatedTDEE     int                     `json:"estimatedTDEE"`
	CreatedAt         string                  `json:"createdAt,omitempty"`
	UpdatedAt         string                  `json:"updatedAt,omitempty"`
}

// DailyLogFromRequest converts a CreateDailyLogRequest to a DailyLog model.
func DailyLogFromRequest(req CreateDailyLogRequest) *models.DailyLog {
	return &models.DailyLog{
		Date:             req.Date,
		WeightKg:         req.WeightKg,
		BodyFatPercent:   req.BodyFatPercent,
		RestingHeartRate: req.RestingHeartRate,
		SleepQuality:     models.SleepQuality(req.SleepQuality),
		SleepHours:       req.SleepHours,
		PlannedTraining: models.PlannedTraining{
			Type:               models.TrainingType(req.PlannedTraining.Type),
			PlannedDurationMin: req.PlannedTraining.PlannedDurationMin,
		},
		DayType: models.DayType(req.DayType),
	}
}

// DailyLogToResponse converts a DailyLog model to a DailyLogResponse.
func DailyLogToResponse(d *models.DailyLog) DailyLogResponse {
	resp := DailyLogResponse{
		Date:             d.Date,
		WeightKg:         d.WeightKg,
		BodyFatPercent:   d.BodyFatPercent,
		RestingHeartRate: d.RestingHeartRate,
		SleepQuality:     int(d.SleepQuality),
		SleepHours:       d.SleepHours,
		PlannedTraining: PlannedTrainingResponse{
			Type:               string(d.PlannedTraining.Type),
			PlannedDurationMin: d.PlannedTraining.PlannedDurationMin,
		},
		DayType: string(d.DayType),
		CalculatedTargets: DailyTargetsResponse{
			TotalCarbsG:   d.CalculatedTargets.TotalCarbsG,
			TotalProteinG: d.CalculatedTargets.TotalProteinG,
			TotalFatsG:    d.CalculatedTargets.TotalFatsG,
			TotalCalories: d.CalculatedTargets.TotalCalories,
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
