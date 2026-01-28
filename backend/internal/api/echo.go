package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"victus/internal/api/requests"
	"victus/internal/domain"
	"victus/internal/service"
)

// quickSubmitSessionHandler handles POST /api/logs/:date/sessions/quick.
// Creates a draft session that can be enriched later via echo.
func (s *Server) quickSubmitSessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	date := r.PathValue("date")
	if date == "" {
		http.Error(w, "date is required", http.StatusBadRequest)
		return
	}

	var req requests.QuickSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Parse training type
	trainingType, err := domain.ParseTrainingType(req.Type)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate duration
	if req.DurationMin < 0 || req.DurationMin > 480 {
		http.Error(w, "duration must be between 0 and 480 minutes", http.StatusBadRequest)
		return
	}

	// Build session
	session := domain.TrainingSession{
		Type:               trainingType,
		DurationMin:        req.DurationMin,
		PerceivedIntensity: req.PerceivedIntensity,
		Notes:              req.Notes,
	}

	// Create draft session
	created, err := s.echoService.QuickSubmitSession(r.Context(), date, session)
	if err != nil {
		if domain.IsValidationError(err) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requests.ToSessionResponse(created))
}

// submitEchoHandler handles POST /api/sessions/:id/echo.
// Parses natural language echo and updates session with extracted data.
func (s *Server) submitEchoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid session id", http.StatusBadRequest)
		return
	}

	var req requests.EchoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.RawEchoLog == "" {
		http.Error(w, "rawEchoLog is required", http.StatusBadRequest)
		return
	}

	// Process echo
	result, err := s.echoService.ProcessEcho(r.Context(), id, req.RawEchoLog)
	if err != nil {
		if domain.IsValidationError(err) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Build response
	resp := requests.EchoResponse{
		Session:           requests.ToSessionResponse(result.Session),
		EchoResult:        requests.ToEchoResultResponse(result.EchoResult),
		BodyIssuesCreated: requests.ToBodyIssueResponses(result.BodyIssuesCreated),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// finalizeSessionHandler handles POST /api/sessions/:id/finalize.
// Marks a draft session as complete without echo processing.
func (s *Server) finalizeSessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid session id", http.StatusBadRequest)
		return
	}

	if err := s.echoService.FinalizeDraft(r.Context(), id); err != nil {
		if domain.IsValidationError(err) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getSessionHandler handles GET /api/sessions/:id.
// Retrieves a single training session by ID.
func (s *Server) getSessionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid session id", http.StatusBadRequest)
		return
	}

	session, err := s.echoService.GetSession(r.Context(), id)
	if err != nil {
		if err == domain.ErrSessionNotFound {
			http.Error(w, "session not found", http.StatusNotFound)
			return
		}
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.ToSessionResponse(session))
}

// registerEchoRoutes registers echo-related routes.
// Called from NewServer to set up the echo endpoints.
func (s *Server) registerEchoRoutes() {
	s.mux.HandleFunc("/api/logs/{date}/sessions/quick", s.quickSubmitSessionHandler)
	s.mux.HandleFunc("/api/sessions/{id}/echo", s.submitEchoHandler)
	s.mux.HandleFunc("/api/sessions/{id}/finalize", s.finalizeSessionHandler)
	s.mux.HandleFunc("/api/sessions/{id}", s.getSessionHandler)
}

// setEchoService sets the echo service (called during server initialization).
func (s *Server) setEchoService(es *service.EchoService) {
	s.echoService = es
}
