package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"victus/internal/domain"
	"victus/internal/service"
)

// VoiceCommandHandler handles voice command parsing requests.
type VoiceCommandHandler struct {
	voiceService *service.VoiceCommandService
}

// NewVoiceCommandHandler creates a new voice command handler.
func NewVoiceCommandHandler(voiceService *service.VoiceCommandService) *VoiceCommandHandler {
	return &VoiceCommandHandler{voiceService: voiceService}
}

// ParseVoiceCommandRequest represents the input for voice command parsing.
type ParseVoiceCommandRequest struct {
	RawInput string `json:"raw_input"`
	Date     string `json:"date,omitempty"` // Optional date context for body issues
}

// ActionTaken describes what data was persisted.
type ActionTaken struct {
	Type    string `json:"type"`    // "training_logged", "nutrition_logged", "weight_updated", etc.
	Summary string `json:"summary"` // Human-readable summary
}

// ParseVoiceCommandResponse represents the output of voice command parsing.
type ParseVoiceCommandResponse struct {
	Success        bool                       `json:"success"`
	Result         *domain.VoiceCommandResult `json:"result,omitempty"`
	IsDraft        bool                       `json:"is_draft"`        // True if training with missing duration
	NeedsMoreInfo  bool                       `json:"needs_more_info"` // True if critical fields are missing
	BodyMapUpdates []domain.BodyMapUpdate     `json:"body_map_updates,omitempty"`
	ActionTaken    *ActionTaken               `json:"action_taken,omitempty"` // What was persisted
	Error          string                     `json:"error,omitempty"`
}

// ParseVoiceCommand handles POST /api/voice/parse
// Immediately returns "queued" status, then processes in background goroutine.
func (h *VoiceCommandHandler) ParseVoiceCommand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ParseVoiceCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ParseVoiceCommandResponse{
			Success: false,
			Error:   "Invalid request body",
		})
		return
	}

	if req.RawInput == "" {
		writeJSON(w, http.StatusBadRequest, ParseVoiceCommandResponse{
			Success: false,
			Error:   "raw_input is required",
		})
		return
	}

	// Default to today's date if not provided
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}

	log.Printf("[VOICE] Queued voice command: %q (date: %s)", req.RawInput, req.Date)

	// Fire off background processing (don't block the HTTP response)
	go h.voiceService.ProcessCommand(context.Background(), req.RawInput, req.Date)

	// Return immediately with queued status
	writeJSON(w, http.StatusAccepted, ParseVoiceCommandResponse{
		Success: true,
		ActionTaken: &ActionTaken{
			Type:    "queued",
			Summary: "Processing in background...",
		},
	})
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[VOICE] Failed to encode response: %v", err)
	}
}
