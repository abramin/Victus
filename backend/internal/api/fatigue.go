package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"victus/internal/domain"
)

// MuscleFatigueResponse represents a muscle's fatigue state in API responses.
type MuscleFatigueResponse struct {
	MuscleGroupID  int     `json:"muscleGroupId"`
	Muscle         string  `json:"muscle"`
	DisplayName    string  `json:"displayName"`
	FatiguePercent float64 `json:"fatiguePercent"`
	Status         string  `json:"status"`
	Color          string  `json:"color"`
	LastUpdated    string  `json:"lastUpdated,omitempty"`
}

// BodyStatusResponse represents the complete body fatigue state.
type BodyStatusResponse struct {
	Muscles      []MuscleFatigueResponse `json:"muscles"`
	OverallScore float64                 `json:"overallScore"`
	AsOfTime     string                  `json:"asOfTime"`
}

// FatigueInjectionResponse represents fatigue added to a muscle.
type FatigueInjectionResponse struct {
	Muscle          string  `json:"muscle"`
	DisplayName     string  `json:"displayName"`
	InjectedPercent float64 `json:"injectedPercent"`
	NewTotal        float64 `json:"newTotal"`
	Status          string  `json:"status"`
}

// SessionFatigueReportResponse represents the fatigue report after a workout.
type SessionFatigueReportResponse struct {
	SessionID  int64                      `json:"sessionId"`
	Archetype  string                     `json:"archetype"`
	TotalLoad  float64                    `json:"totalLoad"`
	Injections []FatigueInjectionResponse `json:"injections"`
	AppliedAt  string                     `json:"appliedAt"`
}

// ArchetypeResponse represents a workout archetype in API responses.
type ArchetypeResponse struct {
	ID           int                `json:"id"`
	Name         string             `json:"name"`
	DisplayName  string             `json:"displayName"`
	Coefficients map[string]float64 `json:"coefficients"`
}

// ApplyLoadRequest represents the request body for applying session load.
type ApplyLoadRequest struct {
	Archetype   string `json:"archetype"`
	DurationMin int    `json:"durationMin"`
	RPE         *int   `json:"rpe,omitempty"`
}

// getBodyStatus handles GET /api/body-status
func (s *Server) getBodyStatus(w http.ResponseWriter, r *http.Request) {
	status, err := s.fatigueService.GetBodyStatus(r.Context(), time.Now())
	if err != nil {
		writeInternalError(w, err, "getBodyStatus")
		return
	}

	response := toBodyStatusResponse(status)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getArchetypes handles GET /api/archetypes
func (s *Server) getArchetypes(w http.ResponseWriter, r *http.Request) {
	archetypes, err := s.fatigueService.GetAllArchetypes(r.Context())
	if err != nil {
		writeInternalError(w, err, "getArchetypes")
		return
	}

	response := make([]ArchetypeResponse, len(archetypes))
	for i, a := range archetypes {
		response[i] = toArchetypeResponse(a)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// applyFatigueByParams handles POST /api/fatigue/apply
// This is a simpler endpoint that applies fatigue without requiring a session ID.
func (s *Server) applyFatigueByParams(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req ApplyLoadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON request body")
		return
	}

	// Validate archetype
	archetype, err := domain.ParseArchetype(req.Archetype)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_archetype", "Invalid workout archetype")
		return
	}

	// Validate duration
	if req.DurationMin <= 0 || req.DurationMin > 480 {
		writeError(w, http.StatusBadRequest, "invalid_duration", "Duration must be between 1 and 480 minutes")
		return
	}

	// Validate RPE if provided
	if req.RPE != nil && (*req.RPE < 1 || *req.RPE > 10) {
		writeError(w, http.StatusBadRequest, "invalid_rpe", "RPE must be between 1 and 10")
		return
	}

	// Apply the load
	report, err := s.fatigueService.ApplyLoadByParams(r.Context(), archetype, req.DurationMin, req.RPE)
	if err != nil {
		writeInternalError(w, err, "applyFatigueByParams")
		return
	}

	response := toSessionFatigueReportResponse(report)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// applySessionLoad handles POST /api/sessions/{id}/apply-load
func (s *Server) applySessionLoad(w http.ResponseWriter, r *http.Request) {
	// Parse session ID from path
	sessionIDStr := r.PathValue("id")
	sessionID, err := strconv.ParseInt(sessionIDStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_session_id", "Session ID must be a valid integer")
		return
	}

	// Parse request body
	var req ApplyLoadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON request body")
		return
	}

	// Validate archetype
	archetype, err := domain.ParseArchetype(req.Archetype)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_archetype", "Invalid workout archetype")
		return
	}

	// Validate duration
	if req.DurationMin <= 0 || req.DurationMin > 480 {
		writeError(w, http.StatusBadRequest, "invalid_duration", "Duration must be between 1 and 480 minutes")
		return
	}

	// Validate RPE if provided
	if req.RPE != nil && (*req.RPE < 1 || *req.RPE > 10) {
		writeError(w, http.StatusBadRequest, "invalid_rpe", "RPE must be between 1 and 10")
		return
	}

	// Apply the load
	report, err := s.fatigueService.ApplySessionLoad(r.Context(), sessionID, archetype, req.DurationMin, req.RPE)
	if err != nil {
		writeInternalError(w, err, "applySessionLoad")
		return
	}

	response := toSessionFatigueReportResponse(report)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// Response conversion functions

func toBodyStatusResponse(status *domain.BodyStatus) BodyStatusResponse {
	muscles := make([]MuscleFatigueResponse, len(status.Muscles))
	for i, m := range status.Muscles {
		muscles[i] = MuscleFatigueResponse{
			MuscleGroupID:  m.MuscleGroupID,
			Muscle:         string(m.Muscle),
			DisplayName:    m.DisplayName,
			FatiguePercent: m.FatiguePercent,
			Status:         string(m.Status),
			Color:          m.Color,
			LastUpdated:    m.LastUpdated,
		}
	}

	return BodyStatusResponse{
		Muscles:      muscles,
		OverallScore: status.OverallScore,
		AsOfTime:     status.AsOfTime,
	}
}

func toArchetypeResponse(a domain.ArchetypeConfig) ArchetypeResponse {
	coefficients := make(map[string]float64)
	for k, v := range a.Coefficients {
		coefficients[string(k)] = v
	}

	return ArchetypeResponse{
		ID:           a.ID,
		Name:         string(a.Name),
		DisplayName:  a.DisplayName,
		Coefficients: coefficients,
	}
}

func toSessionFatigueReportResponse(report *domain.SessionFatigueReport) SessionFatigueReportResponse {
	injections := make([]FatigueInjectionResponse, len(report.Injections))
	for i, inj := range report.Injections {
		injections[i] = FatigueInjectionResponse{
			Muscle:          string(inj.Muscle),
			DisplayName:     inj.DisplayName,
			InjectedPercent: inj.InjectedPercent,
			NewTotal:        inj.NewTotal,
			Status:          string(inj.Status),
		}
	}

	return SessionFatigueReportResponse{
		SessionID:  report.SessionID,
		Archetype:  string(report.Archetype),
		TotalLoad:  report.TotalLoad,
		Injections: injections,
		AppliedAt:  report.AppliedAt,
	}
}
