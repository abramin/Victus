package api

import (
	"encoding/json"
	"net/http"
	"time"

	"victus/internal/api/requests"
)

// getCalendarSummary handles GET /api/calendar/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns lightweight calendar visualization data with normalized load/calorie values
func (s *Server) getCalendarSummary(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start")
	endDate := r.URL.Query().Get("end")
	if startDate == "" || endDate == "" {
		writeError(w, http.StatusBadRequest, "missing_range", "start and end parameters are required")
		return
	}

	// Validate date formats
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_start_date", "start must be in YYYY-MM-DD format")
		return
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_end_date", "end must be in YYYY-MM-DD format")
		return
	}
	if end.Before(start) {
		writeError(w, http.StatusBadRequest, "invalid_range", "end must be on or after start")
		return
	}

	// Get calendar summary from service
	summary, err := s.dailyLogService.GetCalendarSummary(r.Context(), startDate, endDate)
	if err != nil {
		writeInternalError(w, err, "getCalendarSummary")
		return
	}

	// Convert to response format
	var days []requests.CalendarSummaryPoint
	for _, d := range summary.Days {
		days = append(days, requests.CalendarSummaryPoint{
			Date:                d.Date,
			DayType:             d.DayType,
			LoadNormalized:      d.LoadNormalized,
			CaloriesNormalized:  d.CaloriesNormalized,
			LoadRaw:             d.LoadRaw,
			CaloriesRaw:         d.CaloriesRaw,
			HeatmapIntensity:    d.HeatmapIntensity,
			HasTraining:         d.HasTraining,
			PrimaryTrainingType: d.PrimaryTrainingType,
			SessionsCount:       d.SessionsCount,
			AvgRpe:              d.AvgRpe,
		})
	}

	response := requests.CalendarSummaryResponse{
		Days: days,
		Normalization: requests.NormalizationMetadata{
			MaxCalories: summary.Normalization.MaxCalories,
			MaxLoad:     summary.Normalization.MaxLoad,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
