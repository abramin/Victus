package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"victus/internal/api/requests"
	"victus/internal/store"
)

// getWeeklyDebrief handles GET /api/debrief/weekly
// Returns the debrief for the most recent completed week (last Sunday).
func (s *Server) getWeeklyDebrief(w http.ResponseWriter, r *http.Request) {
	debrief, err := s.weeklyDebriefService.GenerateWeeklyDebrief(r.Context(), time.Time{})
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusNotFound, "profile_not_found", "Create a profile first")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.WeeklyDebriefToResponse(debrief))
}

// getWeeklyDebriefByDate handles GET /api/debrief/weekly/{date}
// Returns the debrief for the week containing the specified date.
func (s *Server) getWeeklyDebriefByDate(w http.ResponseWriter, r *http.Request) {
	dateStr := r.PathValue("date")
	if dateStr == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	// Parse the date
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_date", "Date must be in YYYY-MM-DD format")
		return
	}

	debrief, err := s.weeklyDebriefService.GenerateWeeklyDebrief(r.Context(), date)
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusNotFound, "profile_not_found", "Create a profile first")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.WeeklyDebriefToResponse(debrief))
}

// getCurrentWeekDebrief handles GET /api/debrief/current
// Returns an in-progress debrief for the current incomplete week.
func (s *Server) getCurrentWeekDebrief(w http.ResponseWriter, r *http.Request) {
	debrief, err := s.weeklyDebriefService.GetCurrentWeekInProgress(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusNotFound, "profile_not_found", "Create a profile first")
			return
		}
		if errors.Is(err, store.ErrInsufficientData) {
			writeError(w, http.StatusNotFound, "insufficient_data", "No data available for current week yet")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.WeeklyDebriefToResponse(debrief))
}
