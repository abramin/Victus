package api

import (
	"encoding/json"
	"net/http"
	"time"

	"victus/internal/api/requests"
)

// getHistorySummary handles GET /api/stats/history
func (s *Server) getHistorySummary(w http.ResponseWriter, r *http.Request) {
	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		rangeParam = "30d"
	}

	startDate, ok := parseWeightTrendRange(rangeParam, time.Now())
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_range", "Range must be one of 7d, 30d, 90d, all")
		return
	}

	endDate := time.Now().Format("2006-01-02")
	summary, err := s.dailyLogService.GetHistorySummary(r.Context(), startDate, endDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.HistoryToResponse(summary))
}
