package api

import (
	"encoding/json"
	"net/http"

	"victus/internal/domain"
)

func (s *Server) analyzeFormCorrection(w http.ResponseWriter, r *http.Request) {
	var req domain.FormCorrectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.MovementName == "" || req.UserFeedback == "" {
		http.Error(w, "movementName and userFeedback are required", http.StatusBadRequest)
		return
	}

	result := s.ollamaService.GenerateFormCorrection(r.Context(), req)
	if result == nil {
		http.Error(w, "form analysis unavailable", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
