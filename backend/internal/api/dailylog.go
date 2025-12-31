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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "invalid_json",
			Message: "Could not parse request body as JSON",
		})
		return
	}

	log := requests.DailyLogFromRequest(req)
	now := time.Now()

	saved, err := s.dailyLogService.Create(r.Context(), log, now)
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(APIError{
				Error:   "profile_required",
				Message: "A user profile must be created before logging daily data",
			})
			return
		}
		if isValidationError(err) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(APIError{
				Error:   "validation_error",
				Message: err.Error(),
			})
			return
		}
		// Check for duplicate date (UNIQUE constraint violation)
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(APIError{
				Error:   "already_exists",
				Message: "A daily log already exists for this date",
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(APIError{
			Error:   "not_found",
			Message: "No log exists for today. Create one with POST /api/logs",
		})
		return
	}

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponse(log))
}

// deleteTodayLog handles DELETE /api/logs/today
func (s *Server) deleteTodayLog(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	if err := s.dailyLogService.DeleteToday(r.Context(), now); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
