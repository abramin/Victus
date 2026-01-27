package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"victus/internal/api/requests"
	"victus/internal/domain"
	"victus/internal/store"
)

// createDailyLog handles POST /api/logs
func (s *Server) createDailyLog(w http.ResponseWriter, r *http.Request) {
	var req requests.CreateDailyLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	input, err := requests.DailyLogInputFromRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}
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
		writeInternalError(w, err, "createDailyLog")
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
		writeInternalError(w, err, "getTodayLog")
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

// getLogByDate handles GET /api/logs/{date}
func (s *Server) getLogByDate(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	log, trainingLoad, err := s.dailyLogService.GetLogWithTrainingLoad(r.Context(), date)
	if errors.Is(err, store.ErrDailyLogNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "No log exists for this date")
		return
	}
	if err != nil {
		writeInternalError(w, err, "getLogByDate")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
}

// getLogsRange handles GET /api/logs?start=YYYY-MM-DD&end=YYYY-MM-DD
func (s *Server) getLogsRange(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start")
	endDate := r.URL.Query().Get("end")
	if startDate == "" || endDate == "" {
		writeError(w, http.StatusBadRequest, "missing_range", "start and end parameters are required")
		return
	}

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

	points, err := s.dailyLogService.GetDailyTargetsRangeWithSessions(r.Context(), startDate, endDate)
	if err != nil {
		writeInternalError(w, err, "getLogsRange")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyTargetsRangeWithSessionsToResponse(points))
}

// deleteTodayLog handles DELETE /api/logs/today
func (s *Server) deleteTodayLog(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	if err := s.dailyLogService.DeleteToday(r.Context(), now); err != nil {
		writeInternalError(w, err, "deleteTodayLog")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// updateActiveCalories handles PATCH /api/logs/{date}/active-calories
func (s *Server) updateActiveCalories(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	var req requests.UpdateActiveCaloriesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	log, err := s.dailyLogService.UpdateActiveCaloriesBurned(r.Context(), date, req.ActiveCaloriesBurned)
	if err != nil {
		if !handleDailyLogError(w, err, "No log exists for this date") {
			writeInternalError(w, err, "updateActiveCalories")
		}
		return
	}

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), log.Date, log.ActualSessions, log.PlannedSessions)
	if err != nil {
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
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

	sessions, err := requests.ActualTrainingFromRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}
	log, err := s.dailyLogService.UpdateActualTraining(r.Context(), date, sessions)
	if err != nil {
		if !handleDailyLogError(w, err, "No log exists for this date") {
			writeInternalError(w, err, "updateActualTraining")
		}
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

// updateFastingOverride handles PATCH /api/logs/{date}/fasting-override
func (s *Server) updateFastingOverride(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	var req requests.UpdateFastingOverrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	log, err := s.dailyLogService.UpdateFastingOverride(r.Context(), date, req.FastingOverride)
	if err != nil {
		if !handleDailyLogError(w, err, "No log exists for this date") {
			writeInternalError(w, err, "updateFastingOverride")
		}
		return
	}

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), log.Date, log.ActualSessions, log.PlannedSessions)
	if err != nil {
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
}

// syncHealthData handles PATCH /api/logs/{date}/health-sync
// Upserts health metrics from HealthKit. Creates a minimal log if none exists.
func (s *Server) syncHealthData(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	var req requests.HealthSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	metrics := req.ToHealthKitMetrics()
	log, err := s.dailyLogService.UpsertHealthKitMetrics(r.Context(), date, metrics)
	if err != nil {
		if errors.Is(err, store.ErrWeightRequired) {
			writeError(w, http.StatusBadRequest, "weight_required", "Weight is required to create a new daily log")
			return
		}
		writeInternalError(w, err, "syncHealthData")
		return
	}

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), log.Date, log.ActualSessions, log.PlannedSessions)
	if err != nil {
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
}

// addConsumedMacros handles PATCH /api/logs/{date}/consumed-macros
// Adds consumed macros to the existing totals for a given date.
func (s *Server) addConsumedMacros(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date parameter is required")
		return
	}

	var req requests.AddConsumedMacrosRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	// Validate meal parameter if provided
	var mealName *domain.MealName
	if req.Meal != nil {
		mn := domain.MealName(*req.Meal)
		if !domain.ValidMealNames[mn] {
			writeError(w, http.StatusBadRequest, "invalid_meal", "Meal must be 'breakfast', 'lunch', or 'dinner'")
			return
		}
		mealName = &mn
	}

	macros := store.ConsumedMacros{
		Meal:     mealName,
		Calories: req.Calories,
		ProteinG: req.ProteinG,
		CarbsG:   req.CarbsG,
		FatG:     req.FatG,
	}

	log, err := s.dailyLogService.AddConsumedMacros(r.Context(), date, macros)
	if err != nil {
		if !handleDailyLogError(w, err, "No log exists for this date") {
			writeInternalError(w, err, "addConsumedMacros")
		}
		return
	}

	// Calculate training load metrics (ACR)
	trainingLoad, err := s.dailyLogService.GetTrainingLoadMetrics(r.Context(), log.Date, log.ActualSessions, log.PlannedSessions)
	if err != nil {
		trainingLoad = nil
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.DailyLogToResponseWithTrainingLoad(log, trainingLoad))
}
