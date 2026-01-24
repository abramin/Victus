package requests

import (
	"time"

	"victus/internal/domain"
)

// CreatePlanRequest is the request body for POST /api/plans.
type CreatePlanRequest struct {
	StartDate     string  `json:"startDate"`     // YYYY-MM-DD format
	StartWeightKg float64 `json:"startWeightKg"` // Starting weight in kg
	GoalWeightKg  float64 `json:"goalWeightKg"`  // Target weight in kg
	DurationWeeks int     `json:"durationWeeks"` // Duration in weeks (4-104)
}

// WeeklyTargetResponse represents a single week's targets in API responses.
type WeeklyTargetResponse struct {
	WeekNumber        int      `json:"weekNumber"`
	StartDate         string   `json:"startDate"`
	EndDate           string   `json:"endDate"`
	ProjectedWeightKg float64  `json:"projectedWeightKg"`
	ProjectedTDEE     int      `json:"projectedTDEE"`
	TargetIntakeKcal  int      `json:"targetIntakeKcal"`
	TargetCarbsG      int      `json:"targetCarbsG"`
	TargetProteinG    int      `json:"targetProteinG"`
	TargetFatsG       int      `json:"targetFatsG"`
	ActualWeightKg    *float64 `json:"actualWeightKg,omitempty"`
	ActualIntakeKcal  *int     `json:"actualIntakeKcal,omitempty"`
	DaysLogged        int      `json:"daysLogged"`
}

// PlanResponse is the response body for plan endpoints.
type PlanResponse struct {
	ID                       int64                  `json:"id"`
	StartDate                string                 `json:"startDate"`
	StartWeightKg            float64                `json:"startWeightKg"`
	GoalWeightKg             float64                `json:"goalWeightKg"`
	DurationWeeks            int                    `json:"durationWeeks"`
	RequiredWeeklyChangeKg   float64                `json:"requiredWeeklyChangeKg"`
	RequiredDailyDeficitKcal float64                `json:"requiredDailyDeficitKcal"`
	Status                   string                 `json:"status"`
	CurrentWeek              int                    `json:"currentWeek"` // 0 if not started, >duration if ended
	WeeklyTargets            []WeeklyTargetResponse `json:"weeklyTargets"`
	CreatedAt                string                 `json:"createdAt,omitempty"`
	UpdatedAt                string                 `json:"updatedAt,omitempty"`
}

// PlanSummaryResponse is a condensed plan response for list endpoints.
type PlanSummaryResponse struct {
	ID                     int64   `json:"id"`
	StartDate              string  `json:"startDate"`
	StartWeightKg          float64 `json:"startWeightKg"`
	GoalWeightKg           float64 `json:"goalWeightKg"`
	DurationWeeks          int     `json:"durationWeeks"`
	RequiredWeeklyChangeKg float64 `json:"requiredWeeklyChangeKg"`
	Status                 string  `json:"status"`
	CurrentWeek            int     `json:"currentWeek"`
}

// PlanInputFromRequest converts a CreatePlanRequest to a NutritionPlanInput.
func PlanInputFromRequest(req CreatePlanRequest) domain.NutritionPlanInput {
	return domain.NutritionPlanInput{
		StartDate:     req.StartDate,
		StartWeightKg: req.StartWeightKg,
		GoalWeightKg:  req.GoalWeightKg,
		DurationWeeks: req.DurationWeeks,
	}
}

// PlanToResponse converts a NutritionPlan to a PlanResponse.
func PlanToResponse(p *domain.NutritionPlan, now time.Time) PlanResponse {
	resp := PlanResponse{
		ID:                       p.ID,
		StartDate:                p.StartDate.Format("2006-01-02"),
		StartWeightKg:            p.StartWeightKg,
		GoalWeightKg:             p.GoalWeightKg,
		DurationWeeks:            p.DurationWeeks,
		RequiredWeeklyChangeKg:   p.RequiredWeeklyChangeKg,
		RequiredDailyDeficitKcal: p.RequiredDailyDeficitKcal,
		Status:                   string(p.Status),
		CurrentWeek:              p.GetCurrentWeek(now),
		WeeklyTargets:            make([]WeeklyTargetResponse, len(p.WeeklyTargets)),
	}

	for i, target := range p.WeeklyTargets {
		resp.WeeklyTargets[i] = WeeklyTargetResponse{
			WeekNumber:        target.WeekNumber,
			StartDate:         target.StartDate.Format("2006-01-02"),
			EndDate:           target.EndDate.Format("2006-01-02"),
			ProjectedWeightKg: target.ProjectedWeightKg,
			ProjectedTDEE:     target.ProjectedTDEE,
			TargetIntakeKcal:  target.TargetIntakeKcal,
			TargetCarbsG:      target.TargetCarbsG,
			TargetProteinG:    target.TargetProteinG,
			TargetFatsG:       target.TargetFatsG,
			ActualWeightKg:    target.ActualWeightKg,
			ActualIntakeKcal:  target.ActualIntakeKcal,
			DaysLogged:        target.DaysLogged,
		}
	}

	if !p.CreatedAt.IsZero() {
		resp.CreatedAt = p.CreatedAt.Format(time.RFC3339)
	}
	if !p.UpdatedAt.IsZero() {
		resp.UpdatedAt = p.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}

// PlanToSummaryResponse converts a NutritionPlan to a PlanSummaryResponse.
func PlanToSummaryResponse(p *domain.NutritionPlan, now time.Time) PlanSummaryResponse {
	return PlanSummaryResponse{
		ID:                     p.ID,
		StartDate:              p.StartDate.Format("2006-01-02"),
		StartWeightKg:          p.StartWeightKg,
		GoalWeightKg:           p.GoalWeightKg,
		DurationWeeks:          p.DurationWeeks,
		RequiredWeeklyChangeKg: p.RequiredWeeklyChangeKg,
		Status:                 string(p.Status),
		CurrentWeek:            p.GetCurrentWeek(now),
	}
}

// RecalibratePlanRequest is the request body for POST /api/plans/{id}/recalibrate.
type RecalibratePlanRequest struct {
	Type string `json:"type"` // increase_deficit, extend_timeline, revise_goal, keep_current
}

// RecalibrationInputFromRequest converts a RecalibratePlanRequest to a domain type.
func RecalibrationInputFromRequest(req RecalibratePlanRequest) domain.RecalibrationOptionType {
	return domain.RecalibrationOptionType(req.Type)
}
