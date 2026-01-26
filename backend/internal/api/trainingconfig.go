package api

import (
	"encoding/json"
	"net/http"

	"victus/internal/domain"
)

// TrainingConfigResponse represents a training configuration in API responses.
type TrainingConfigResponse struct {
	Type      string  `json:"type"`
	MET       float64 `json:"met"`
	LoadScore float64 `json:"loadScore"`
}

// getTrainingConfigs handles GET /api/training-configs
func (s *Server) getTrainingConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := s.trainingConfigStore.GetAll(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to retrieve training configurations")
		return
	}

	response := make([]TrainingConfigResponse, len(configs))
	for i, cfg := range configs {
		response[i] = toTrainingConfigResponse(cfg)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func toTrainingConfigResponse(cfg domain.TrainingTypeConfig) TrainingConfigResponse {
	return TrainingConfigResponse{
		Type:      string(cfg.Type),
		MET:       cfg.MET,
		LoadScore: cfg.LoadScore,
	}
}
