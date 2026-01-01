package api

import (
	"encoding/json"
	"net/http"
	"time"

	"victus/internal/api/requests"
)

func (s *Server) getWeightTrend(w http.ResponseWriter, r *http.Request) {
	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		rangeParam = "30d"
	}

	startDate, ok := parseWeightTrendRange(rangeParam, time.Now())
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_range", "Range must be one of 7d, 30d, 90d, all")
		return
	}

	points, trend, err := s.dailyLogService.GetWeightTrend(r.Context(), startDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.WeightTrendToResponse(points, trend))
}

func parseWeightTrendRange(rangeParam string, now time.Time) (string, bool) {
	switch rangeParam {
	case "7d":
		return now.AddDate(0, 0, -6).Format("2006-01-02"), true
	case "30d":
		return now.AddDate(0, 0, -29).Format("2006-01-02"), true
	case "90d":
		return now.AddDate(0, 0, -89).Format("2006-01-02"), true
	case "all":
		return "", true
	default:
		return "", false
	}
}
