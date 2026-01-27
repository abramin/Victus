package api

import (
	"encoding/json"
	"net/http"

	"victus/internal/domain"
)

// BodyPartIssueResponse represents a body part issue in API responses.
type BodyPartIssueResponse struct {
	ID        int64  `json:"id"`
	Date      string `json:"date"`
	BodyPart  string `json:"bodyPart"`
	Symptom   string `json:"symptom"`
	Severity  int    `json:"severity"`
	RawText   string `json:"rawText"`
	SessionID *int64 `json:"sessionId,omitempty"`
	CreatedAt string `json:"createdAt"`
}

// CreateBodyIssueRequest represents a single body part issue to create.
type CreateBodyIssueRequest struct {
	BodyPart  string `json:"bodyPart"`
	Symptom   string `json:"symptom"`
	RawText   string `json:"rawText"`
	SessionID *int64 `json:"sessionId,omitempty"`
}

// CreateBodyIssuesRequest represents the request body for creating body part issues.
type CreateBodyIssuesRequest struct {
	Date   string                   `json:"date"`
	Issues []CreateBodyIssueRequest `json:"issues"`
}

// CreateBodyIssuesResponse represents the response after creating body part issues.
type CreateBodyIssuesResponse struct {
	Issues []BodyPartIssueResponse `json:"issues"`
	Count  int                     `json:"count"`
}

// MuscleFatigueModifierResponse represents a fatigue modifier from body issues.
type MuscleFatigueModifierResponse struct {
	Muscle      string  `json:"muscle"`
	DisplayName string  `json:"displayName"`
	Modifier    float64 `json:"modifier"`
	IssueCount  int     `json:"issueCount"`
}

// SemanticVocabularyResponse represents the semantic detection vocabulary.
type SemanticVocabularyResponse struct {
	BodyParts []string `json:"bodyParts"`
	Symptoms  []string `json:"symptoms"`
}

// createBodyIssues handles POST /api/body-issues
func (s *Server) createBodyIssues(w http.ResponseWriter, r *http.Request) {
	var req CreateBodyIssuesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON request body")
		return
	}

	// Validate date
	if req.Date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "Date is required")
		return
	}

	// Validate issues array
	if len(req.Issues) == 0 {
		writeError(w, http.StatusBadRequest, "empty_issues", "At least one issue is required")
		return
	}

	// Convert to domain inputs and validate
	inputs := make([]domain.BodyPartIssueInput, 0, len(req.Issues))
	for _, issue := range req.Issues {
		// Validate body part
		bodyPart, err := domain.ParseMuscleGroup(issue.BodyPart)
		if err != nil {
			// Try to map from alias
			muscles := domain.GetMuscleGroupsForAlias(issue.BodyPart)
			if len(muscles) == 0 {
				writeError(w, http.StatusBadRequest, "invalid_body_part", "Invalid body part: "+issue.BodyPart)
				return
			}
			// Create an issue for each mapped muscle
			for _, muscle := range muscles {
				inputs = append(inputs, domain.BodyPartIssueInput{
					Date:      req.Date,
					BodyPart:  muscle,
					Symptom:   issue.Symptom,
					RawText:   issue.RawText,
					SessionID: issue.SessionID,
				})
			}
		} else {
			inputs = append(inputs, domain.BodyPartIssueInput{
				Date:      req.Date,
				BodyPart:  bodyPart,
				Symptom:   issue.Symptom,
				RawText:   issue.RawText,
				SessionID: issue.SessionID,
			})
		}
	}

	// Create the issues
	issues, err := s.bodyIssueService.CreateIssues(r.Context(), inputs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to create body issues")
		return
	}

	// Convert to response
	response := CreateBodyIssuesResponse{
		Issues: make([]BodyPartIssueResponse, len(issues)),
		Count:  len(issues),
	}
	for i, issue := range issues {
		response.Issues[i] = toBodyPartIssueResponse(issue)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// getActiveBodyIssues handles GET /api/body-issues/active
func (s *Server) getActiveBodyIssues(w http.ResponseWriter, r *http.Request) {
	issues, err := s.bodyIssueService.GetActiveIssues(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to retrieve active body issues")
		return
	}

	response := make([]BodyPartIssueResponse, len(issues))
	for i, issue := range issues {
		response[i] = toBodyPartIssueResponse(issue)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getFatigueModifiers handles GET /api/body-issues/modifiers
func (s *Server) getFatigueModifiers(w http.ResponseWriter, r *http.Request) {
	modifiers, err := s.bodyIssueService.GetFatigueModifiersList(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to calculate fatigue modifiers")
		return
	}

	response := make([]MuscleFatigueModifierResponse, len(modifiers))
	for i, m := range modifiers {
		response[i] = MuscleFatigueModifierResponse{
			Muscle:      string(m.Muscle),
			DisplayName: m.DisplayName,
			Modifier:    m.Modifier,
			IssueCount:  m.IssueCount,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getSemanticVocabulary handles GET /api/body-issues/vocabulary
func (s *Server) getSemanticVocabulary(w http.ResponseWriter, r *http.Request) {
	vocab := s.bodyIssueService.GetVocabulary()

	response := SemanticVocabularyResponse{
		BodyParts: vocab.BodyParts,
		Symptoms:  vocab.Symptoms,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Response conversion function
func toBodyPartIssueResponse(issue domain.BodyPartIssue) BodyPartIssueResponse {
	return BodyPartIssueResponse{
		ID:        issue.ID,
		Date:      issue.Date,
		BodyPart:  string(issue.BodyPart),
		Symptom:   issue.Symptom,
		Severity:  int(issue.Severity),
		RawText:   issue.RawText,
		SessionID: issue.SessionID,
		CreatedAt: issue.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
