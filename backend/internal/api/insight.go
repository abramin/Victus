package api

import (
	"encoding/json"
	"errors"
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
