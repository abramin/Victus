package api

import (
	"encoding/json"
	"errors"
	"net/http"
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

	input := requests.DailyLogInputFromRequest(req)
	now := time.Now()

	saved, err := s.dailyLogService.Create(r.Context(), input, now)
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusBadRequest, "profile_required", "A user profile must be created before logging daily data")
			return
		}
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		if errors.Is(err, store.ErrDailyLogAlreadyExists) {
			writeError(w, http.StatusConflict, "already_exists", "A daily log already exists for this date")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), saved.Date, saved.ActualSessions, saved.PlannedSessions)
	if err != nil {
		// Log error but don't fail the request - training load is supplementary
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(saved, trainingLoad))
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

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), log.Date, log.ActualSessions, log.PlannedSessions)
	if err != nil {
		// Log error but don't fail the request - training load is supplementary
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
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

// updateActualTraining handles PATCH /api/logs/{date}/actual-training
func (s *Server) updateActualTraining(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	var req requests.UpdateActualTrainingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	sessions := requests.ActualTrainingFromRequest(req)
	log, err := s.dailyLogService.UpdateActualTraining(r.Context(), date, sessions)
	if err != nil {
		if errors.Is(err, store.ErrDailyLogNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "No log exists for this date")
			return
		}
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), log.Date, log.ActualSessions, log.PlannedSessions)
	if err != nil {
		// Log error but don't fail the request - training load is supplementary
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
}
