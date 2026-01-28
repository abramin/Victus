package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"victus/internal/api/requests"
	"victus/internal/store"
)

// getDayInsight handles GET /api/logs/{date}/insight
// Returns AI-generated or templated insight for the specified day
func (s *Server) getDayInsight(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	// Get insight from service
	insight, err := s.dailyLogService.GetDayInsight(r.Context(), date)
	if errors.Is(err, store.ErrDailyLogNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "No log exists for this date")
		return
	}
	if err != nil {
		writeInternalError(w, err, "getDayInsight")
		return
	}

	// Convert to response format
	response := requests.DayInsightResponse{
		Insight:   insight.Insight,
		Generated: insight.Generated,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getPhaseInsight handles GET /api/plans/{id}/phase-insight?week={weekNumber}
// Returns AI-generated insight for the current phase of a nutrition plan
func (s *Server) getPhaseInsight(w http.ResponseWriter, r *http.Request) {
	planIDStr := r.PathValue("id")
	if planIDStr == "" {
		writeError(w, http.StatusBadRequest, "missing_plan_id", "Plan ID is required")
		return
	}

	// Parse plan ID
	var planID int64
	if _, err := fmt.Sscanf(planIDStr, "%d", &planID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_plan_id", "Invalid plan ID format")
		return
	}

	// Get week number from query params (optional)
	weekNumberStr := r.URL.Query().Get("week")
	weekNumber := 0
	if weekNumberStr != "" {
		if _, err := fmt.Sscanf(weekNumberStr, "%d", &weekNumber); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_week", "Invalid week number format")
			return
		}
	}

	// Get insight from service
	insight, err := s.planService.GetPhaseInsight(r.Context(), planID, weekNumber)
	if errors.Is(err, store.ErrPlanNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "Plan not found")
		return
	}
	if err != nil {
		writeInternalError(w, err, "getPhaseInsight")
		return
	}

	// Convert to response format
	response := requests.PhaseInsightResponse{
		Insight:   insight.Insight,
		Phase:     insight.Phase,
		Generated: insight.Generated,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
