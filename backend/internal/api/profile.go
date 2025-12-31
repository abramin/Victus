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

// writeError writes a JSON error response.
func writeError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIError{Error: code, Message: msg})
}

// APIError represents a JSON error response.
type APIError struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// getProfile handles GET /api/profile
func (s *Server) getProfile(w http.ResponseWriter, r *http.Request) {
	profile, err := s.profileService.Get(r.Context())

	if errors.Is(err, store.ErrProfileNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "No profile exists. Create one with PUT /api/profile")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.ProfileToResponse(profile))
}

// upsertProfile handles PUT /api/profile
func (s *Server) upsertProfile(w http.ResponseWriter, r *http.Request) {
	var req requests.CreateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	profile, err := requests.ProfileFromRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_date", "birthDate must be in YYYY-MM-DD format")
		return
	}

	saved, err := s.profileService.Upsert(r.Context(), profile, time.Now())
	if err != nil {
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(requests.ProfileToResponse(saved))
}

// deleteProfile handles DELETE /api/profile
func (s *Server) deleteProfile(w http.ResponseWriter, r *http.Request) {
	if err := s.profileService.Delete(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// isValidationError checks if the error is a domain validation error.
func isValidationError(err error) bool {
	return domain.IsValidationError(err)
}
