package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"victus/internal/calc"
	"victus/internal/models"
	"victus/internal/store"
)

// CreateDailyLogRequest is the request body for POST /api/logs
type CreateDailyLogRequest struct {
	Date             string                  `json:"date,omitempty"`
	WeightKg         float64                 `json:"weightKg"`
	BodyFatPercent   *float64                `json:"bodyFatPercent,omitempty"`
	RestingHeartRate *int                    `json:"restingHeartRate,omitempty"`
	SleepQuality     int                     `json:"sleepQuality"`
	SleepHours       *float64                `json:"sleepHours,omitempty"`
	PlannedTraining  models.PlannedTraining  `json:"plannedTraining"`
}

// createDailyLog handles POST /api/logs
func (s *Server) createDailyLog(w http.ResponseWriter, r *http.Request) {
	// Read: Parse JSON request body
	var req CreateDailyLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "invalid_json",
			Message: "Could not parse request body as JSON",
		})
		return
	}

	// Read: Get user profile (required for calculations)
	profile, err := s.profileStore.Get(r.Context())
	if errors.Is(err, store.ErrProfileNotFound) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "profile_required",
			Message: "A user profile must be created before logging daily data",
		})
		return
	}
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	// Compute: Build DailyLog model
	log := &models.DailyLog{
		Date:             req.Date,
		WeightKg:         req.WeightKg,
		BodyFatPercent:   req.BodyFatPercent,
		RestingHeartRate: req.RestingHeartRate,
		SleepQuality:     models.SleepQuality(req.SleepQuality),
		SleepHours:       req.SleepHours,
		PlannedTraining:  req.PlannedTraining,
	}

	// Compute: Set defaults and validate
	log.SetDefaults()

	if err := log.Validate(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Compute: Calculate daily targets
	log.CalculatedTargets = calc.CalculateDailyTargets(profile, log)
	log.EstimatedTDEE = calc.CalculateEstimatedTDEE(
		profile,
		log.WeightKg,
		log.PlannedTraining.Type,
		log.PlannedTraining.PlannedDurationMin,
	)

	// Write: Save to database
	if err := s.dailyLogStore.Create(r.Context(), log); err != nil {
		// Check for duplicate date (UNIQUE constraint violation)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(APIError{
			Error:   "already_exists",
			Message: "A daily log already exists for this date",
		})
		return
	}

	// Read back the saved log to get timestamps
	saved, err := s.dailyLogStore.GetByDate(r.Context(), log.Date)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	// Write: Return created log
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(saved)
}

// getTodayLog handles GET /api/logs/today
func (s *Server) getTodayLog(w http.ResponseWriter, r *http.Request) {
	// Read: Get today's log
	log, err := s.dailyLogStore.GetToday(r.Context())

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

	// Write: Return log
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(log)
}

// deleteTodayLog handles DELETE /api/logs/today
func (s *Server) deleteTodayLog(w http.ResponseWriter, r *http.Request) {
	if err := s.dailyLogStore.DeleteToday(r.Context()); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
