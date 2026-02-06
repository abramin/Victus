package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"victus/internal/store"
)

// getSystemicLoad handles GET /api/systemic-load
// Query param ?prescription=true includes Ollama-generated tactical prescription.
func (s *Server) getSystemicLoad(w http.ResponseWriter, r *http.Request) {
	withPrescription := r.URL.Query().Get("prescription") == "true"

	if withPrescription {
		resp, err := s.systemicLoadService.GetSystemicLoadWithPrescription(r.Context())
		if err != nil {
			if errors.Is(err, store.ErrDailyLogNotFound) {
				writeError(w, http.StatusNotFound, "no_log", "No daily log exists for today")
				return
			}
			writeInternalError(w, err, "getSystemicLoadWithPrescription")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	load, err := s.systemicLoadService.GetSystemicLoad(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrDailyLogNotFound) {
			writeError(w, http.StatusNotFound, "no_log", "No daily log exists for today")
			return
		}
		writeInternalError(w, err, "getSystemicLoad")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(load)
}
