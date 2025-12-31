package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"victus/internal/api/requests"
	"victus/internal/store"
)

// createDailyLog handles POST /api/logs
func (s *Server) createDailyLog(w http.ResponseWriter, r *http.Request) {
	var req requests.CreateDailyLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	log := requests.DailyLogFromRequest(req)
	now := time.Now()

	saved, err := s.dailyLogService.Create(r.Context(), log, now)
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusBadRequest, "profile_required", "A user profile must be created before logging daily data")
			return
		}
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		// Check for duplicate date (UNIQUE constraint violation)
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			writeError(w, http.StatusConflict, "already_exists", "A daily log already exists for this date")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requests.DailyLogToResponse(saved))
}

// getTodayLog handles GET /api/logs/today
func (s *Server) getTodayLog(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	log, err := s.dailyLogService.GetToday(r.Context(), now)

	if errors.Is(err, store.ErrDailyLogNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "No log exists for today. Create one with POST /api/logs")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponse(log))
}

// deleteTodayLog handles DELETE /api/logs/today
func (s *Server) deleteTodayLog(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	if err := s.dailyLogService.DeleteToday(r.Context(), now); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
