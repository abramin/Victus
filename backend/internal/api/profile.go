package api

import (
	"encoding/json"
	"errors"
	"net/http"

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
	// Read
	profile, err := s.profileStore.Get(r.Context())

	// Handle not found
	if errors.Is(err, store.ErrProfileNotFound) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(APIError{
			Error:   "not_found",
			Message: "No profile exists. Create one with PUT /api/profile",
		})
		return
	}

	// Handle other errors
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	// Write
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// upsertProfile handles PUT /api/profile
func (s *Server) upsertProfile(w http.ResponseWriter, r *http.Request) {
	// Read
	var profile models.UserProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "invalid_json",
			Message: "Could not parse request body as JSON",
		})
		return
	}

	// Compute: Apply defaults and validate
	profile.SetDefaults()

	if err := profile.Validate(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Error:   "validation_error",
			Message: err.Error(),
		})
		return
	}

	// Write
	if err := s.profileStore.Upsert(r.Context(), &profile); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	// Return saved profile
	saved, err := s.profileStore.Get(r.Context())
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(saved)
}

// deleteProfile handles DELETE /api/profile
func (s *Server) deleteProfile(w http.ResponseWriter, r *http.Request) {
	if err := s.profileStore.Delete(r.Context()); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
