package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"victus/internal/api/requests"
	"victus/internal/domain"
	"victus/internal/store"
)

// isDebugMode returns true if DEBUG_MODE environment variable is set to "true" or "1".
func isDebugMode() bool {
	val := os.Getenv("DEBUG_MODE")
	return val == "true" || val == "1"
}

// writeError writes a JSON error response. 404 not_found errors are not
// logged because they represent expected application states (e.g. no log
// for today before check-in); the access-log middleware already records them.
func writeError(w http.ResponseWriter, status int, code, msg string) {
	if !(status == http.StatusNotFound && code == "not_found") {
		if msg != "" {
			log.Printf("ERROR %d %s: %s", status, code, msg)
		} else {
			log.Printf("ERROR %d %s", status, code)
		}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(APIError{Error: code, Message: msg})
}

// writeInternalError writes an internal server error, with detailed message in debug mode.
func writeInternalError(w http.ResponseWriter, err error, context string) {
	if isDebugMode() {
		msg := err.Error()
		if context != "" {
			msg = context + ": " + msg
		}
		log.Printf("ERROR 500 internal_error: %s", msg)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error", Message: msg})
	} else {
		// In production, log the full error but don't expose it to client
		if context != "" {
			log.Printf("ERROR 500 internal_error [%s]: %v", context, err)
		} else {
			log.Printf("ERROR 500 internal_error: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(APIError{Error: "internal_error"})
	}
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
		writeInternalError(w, err, "getProfile")
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
		// Check if it's a domain validation error (invalid enum values)
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		// Otherwise it's a date parsing error
		writeError(w, http.StatusBadRequest, "invalid_date", "birthDate must be in YYYY-MM-DD format")
		return
	}

	saved, err := s.profileService.Upsert(r.Context(), profile, time.Now())
	if err != nil {
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeInternalError(w, err, "upsertProfile")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(requests.ProfileToResponse(saved))
}

// deleteProfile handles DELETE /api/profile
func (s *Server) deleteProfile(w http.ResponseWriter, r *http.Request) {
	if err := s.profileService.Delete(r.Context()); err != nil {
		writeInternalError(w, err, "deleteProfile")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// isValidationError checks if the error is a domain validation error.
func isValidationError(err error) bool {
	return domain.IsValidationError(err)
}

// handleDailyLogError handles common daily log service errors.
// Returns true if the error was handled, false if it should fall through to internal error.
func handleDailyLogError(w http.ResponseWriter, err error, notFoundMsg string) bool {
	if errors.Is(err, store.ErrDailyLogNotFound) {
		writeError(w, http.StatusNotFound, "not_found", notFoundMsg)
		return true
	}
	if isValidationError(err) {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return true
	}
	return false
}
