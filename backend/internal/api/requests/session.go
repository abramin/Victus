package requests

import "victus/internal/domain"

// QuickSessionRequest is the request body for POST /api/logs/:date/sessions/quick.
// Creates a draft session that can be enriched later via echo.
type QuickSessionRequest struct {
	Type               string `json:"type"`
	DurationMin        int    `json:"durationMin"`
	PerceivedIntensity *int   `json:"perceivedIntensity,omitempty"` // RPE 1-10
	Notes              string `json:"notes,omitempty"`
}

// EchoRequest is the request body for POST /api/sessions/:id/echo.
type EchoRequest struct {
	RawEchoLog string `json:"rawEchoLog"`
}

// SessionExtraMetadataResponse represents parsed echo metadata in API responses.
type SessionExtraMetadataResponse struct {
	Achievements  []string `json:"achievements,omitempty"`
	RPEOffset     int      `json:"rpeOffset,omitempty"`
	EchoProcessed bool     `json:"echoProcessed"`
	EchoModel     string   `json:"echoModel,omitempty"`
}

// SessionResponse represents a training session in API responses (with echo fields).
type SessionResponse struct {
	ID                 int64                         `json:"id"`
	SessionOrder       int                           `json:"sessionOrder"`
	IsPlanned          bool                          `json:"isPlanned"`
	IsDraft            bool                          `json:"isDraft"`
	Type               string                        `json:"type"`
	DurationMin        int                           `json:"durationMin"`
	PerceivedIntensity *int                          `json:"perceivedIntensity,omitempty"`
	Notes              string                        `json:"notes,omitempty"`
	RawEchoLog         *string                       `json:"rawEchoLog,omitempty"`
	ExtraMetadata      *SessionExtraMetadataResponse `json:"extraMetadata,omitempty"`
}

// EchoResultResponse represents the parsed echo result in API responses.
type EchoResultResponse struct {
	Achievements           []string           `json:"achievements"`
	JointIntegrityDelta    map[string]float64 `json:"jointIntegrityDelta"`
	PerceivedExertionOffset int               `json:"perceivedExertionOffset"`
}

// BodyIssueResponse represents a body issue in API responses.
type BodyIssueResponse struct {
	ID        int64  `json:"id"`
	Date      string `json:"date"`
	BodyPart  string `json:"bodyPart"`
	Symptom   string `json:"symptom"`
	Severity  int    `json:"severity"`
	RawText   string `json:"rawText"`
	SessionID *int64 `json:"sessionId,omitempty"`
}

// EchoResponse is the response for POST /api/sessions/:id/echo.
type EchoResponse struct {
	Session           SessionResponse      `json:"session"`
	EchoResult        *EchoResultResponse  `json:"echoResult,omitempty"`
	BodyIssuesCreated []BodyIssueResponse  `json:"bodyIssuesCreated,omitempty"`
}

// ToSessionResponse converts a domain TrainingSession to API response format.
func ToSessionResponse(s *domain.TrainingSession) SessionResponse {
	resp := SessionResponse{
		ID:                 s.ID,
		SessionOrder:       s.SessionOrder,
		IsPlanned:          s.IsPlanned,
		IsDraft:            s.IsDraft,
		Type:               string(s.Type),
		DurationMin:        s.DurationMin,
		PerceivedIntensity: s.PerceivedIntensity,
		Notes:              s.Notes,
		RawEchoLog:         s.RawEchoLog,
	}

	if s.ExtraMetadata != nil {
		resp.ExtraMetadata = &SessionExtraMetadataResponse{
			Achievements:  s.ExtraMetadata.Achievements,
			RPEOffset:     s.ExtraMetadata.RPEOffset,
			EchoProcessed: s.ExtraMetadata.EchoProcessed,
			EchoModel:     s.ExtraMetadata.EchoModel,
		}
	}

	return resp
}

// ToEchoResultResponse converts a domain EchoLogResult to API response format.
func ToEchoResultResponse(r *domain.EchoLogResult) *EchoResultResponse {
	if r == nil {
		return nil
	}
	return &EchoResultResponse{
		Achievements:           r.Achievements,
		JointIntegrityDelta:    r.JointIntegrityDelta,
		PerceivedExertionOffset: r.PerceivedExertionOffset,
	}
}

// ToBodyIssueResponse converts a domain BodyPartIssue to API response format.
func ToBodyIssueResponse(i domain.BodyPartIssue) BodyIssueResponse {
	return BodyIssueResponse{
		ID:        i.ID,
		Date:      i.Date,
		BodyPart:  string(i.BodyPart),
		Symptom:   i.Symptom,
		Severity:  int(i.Severity),
		RawText:   i.RawText,
		SessionID: i.SessionID,
	}
}

// ToBodyIssueResponses converts a slice of domain issues to response format.
func ToBodyIssueResponses(issues []domain.BodyPartIssue) []BodyIssueResponse {
	if len(issues) == 0 {
		return nil
	}
	result := make([]BodyIssueResponse, len(issues))
	for i, issue := range issues {
		result[i] = ToBodyIssueResponse(issue)
	}
	return result
}
