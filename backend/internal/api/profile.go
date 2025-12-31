package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"victus/internal/api/requests"
	"victus/internal/models"
	"victus/internal/store"
)

// APIError represents a JSON error response.
type APIError struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// getProfile handles GET /api/profile
func (s *Server) getProfile(w http.ResponseWriter, r *http.Request) {
	profile, err := s.profileService.Get(r.Context())

	if errors.Is(err, store.ErrProfileNotFound) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(APIError{
			Error:   "not_found",
			Message: "No profile exists. Create one with PUT /api/profile",
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
	json.NewEncoder(w).Encode(requests.ProfileToResponse(profile))
}

// upsertProfile handles PUT /api/profile
func (s *Server) upsertProfile(w http.ResponseWriter, r *http.Request) {
	var req requests.CreateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "invalid_json",
			Message: "Could not parse request body as JSON",
		})
		return
	}

	profile, err := requests.ProfileFromRequest(req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "invalid_date",
			Message: "birthDate must be in YYYY-MM-DD format",
		})
		return
	}

	saved, err := s.profileService.Upsert(r.Context(), profile, time.Now())
	if err != nil {
		// Check for validation errors
		if isValidationError(err) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(APIError{
				Error:   "validation_error",
				Message: err.Error(),
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(requests.ProfileToResponse(saved))
}

// deleteProfile handles DELETE /api/profile
func (s *Server) deleteProfile(w http.ResponseWriter, r *http.Request) {
	if err := s.profileService.Delete(r.Context()); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// isValidationError checks if the error is a domain validation error.
func isValidationError(err error) bool {
	return errors.Is(err, models.ErrInvalidHeight) ||
		errors.Is(err, models.ErrInvalidBirthDate) ||
		errors.Is(err, models.ErrInvalidSex) ||
		errors.Is(err, models.ErrInvalidGoal) ||
		errors.Is(err, models.ErrInvalidTargetWeight) ||
		errors.Is(err, models.ErrInvalidWeeklyChange) ||
		errors.Is(err, models.ErrMacroRatiosNotSum100) ||
		errors.Is(err, models.ErrMealRatiosNotSum100) ||
		errors.Is(err, models.ErrInvalidRatio) ||
		errors.Is(err, models.ErrInvalidFruitTarget) ||
		errors.Is(err, models.ErrInvalidVeggieTarget) ||
		errors.Is(err, models.ErrInvalidPointsMultiplier) ||
		errors.Is(err, models.ErrInvalidDate) ||
		errors.Is(err, models.ErrInvalidWeight) ||
		errors.Is(err, models.ErrInvalidBodyFat) ||
		errors.Is(err, models.ErrInvalidHeartRate) ||
		errors.Is(err, models.ErrInvalidSleepQuality) ||
		errors.Is(err, models.ErrInvalidSleepHours) ||
		errors.Is(err, models.ErrInvalidTrainingType) ||
		errors.Is(err, models.ErrInvalidTrainingDuration) ||
		errors.Is(err, models.ErrInvalidDayType)
}
