package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// EchoService handles business logic for session echo processing.
type EchoService struct {
	sessionStore   *store.TrainingSessionStore
	bodyIssueStore *store.BodyIssueStore
	dailyLogStore  *store.DailyLogStore
	ollamaService  *OllamaService
}

// NewEchoService creates a new EchoService.
func NewEchoService(
	ss *store.TrainingSessionStore,
	bis *store.BodyIssueStore,
	dls *store.DailyLogStore,
	os *OllamaService,
) *EchoService {
	return &EchoService{
		sessionStore:   ss,
		bodyIssueStore: bis,
		dailyLogStore:  dls,
		ollamaService:  os,
	}
}

// EchoProcessResult contains the results of processing an echo log.
type EchoProcessResult struct {
	Session           *domain.TrainingSession `json:"session"`
	EchoResult        *domain.EchoLogResult   `json:"echoResult,omitempty"`
	BodyIssuesCreated []domain.BodyPartIssue  `json:"bodyIssuesCreated,omitempty"`
}

// QuickSubmitSession creates a draft session for a daily log.
// The session will have is_draft=true and can be enriched later via ProcessEcho.
func (s *EchoService) QuickSubmitSession(ctx context.Context, date string, session domain.TrainingSession) (*domain.TrainingSession, error) {
	// Get the daily log for this date
	log, err := s.dailyLogStore.GetByDate(ctx, date)
	if err != nil {
		return nil, err
	}

	// Get existing sessions to determine next session order
	existingSessions, err := s.sessionStore.GetActualByLogID(ctx, log.ID)
	if err != nil {
		return nil, err
	}

	// Set session order to next available
	session.SessionOrder = len(existingSessions) + 1
	session.IsPlanned = false
	session.IsDraft = true

	// Create the draft session
	return s.sessionStore.CreateDraft(ctx, log.ID, session)
}

// ProcessEcho parses an echo log and updates the session with extracted data.
// Also creates body issues based on joint integrity deltas.
func (s *EchoService) ProcessEcho(ctx context.Context, sessionID int64, rawEcho string) (*EchoProcessResult, error) {
	// Fetch the session
	session, err := s.sessionStore.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	if !session.IsDraft {
		return nil, domain.ErrSessionNotDraft
	}

	// Build context for Ollama
	initialRPE := 5 // default
	if session.PerceivedIntensity != nil {
		initialRPE = *session.PerceivedIntensity
	}

	sessionCtx := domain.EchoSessionContext{
		TrainingType: session.Type,
		DurationMin:  session.DurationMin,
		InitialRPE:   initialRPE,
		Notes:        session.Notes,
	}

	// Parse echo via Ollama
	echoResult, err := s.ollamaService.ParseEchoLog(ctx, sessionCtx, rawEcho)
	if err != nil {
		// Log error but continue with raw echo storage
		echoResult = nil
	}

	// Build metadata
	metadata := domain.SessionExtraMetadata{
		EchoProcessed: echoResult != nil,
	}

	if echoResult != nil {
		metadata.Achievements = echoResult.Achievements
		metadata.RPEOffset = echoResult.PerceivedExertionOffset
		metadata.EchoModel = "llama3.2"
	}

	// Finalize session with echo data
	updatedSession, err := s.sessionStore.FinalizeWithEcho(ctx, sessionID, rawEcho, metadata)
	if err != nil {
		return nil, err
	}

	result := &EchoProcessResult{
		Session:    updatedSession,
		EchoResult: echoResult,
	}

	// Create body issues from joint integrity deltas if parsed successfully
	if echoResult != nil && len(echoResult.JointIntegrityDelta) > 0 {
		issues, err := s.createBodyIssuesFromDeltas(ctx, echoResult.JointIntegrityDelta, sessionID)
		if err == nil {
			result.BodyIssuesCreated = issues
		}
	}

	return result, nil
}

// createBodyIssuesFromDeltas converts joint integrity deltas to body issues.
func (s *EchoService) createBodyIssuesFromDeltas(ctx context.Context, deltas map[string]float64, sessionID int64) ([]domain.BodyPartIssue, error) {
	today := time.Now().Format("2006-01-02")
	var inputs []domain.BodyPartIssueInput

	for bodyAlias, delta := range deltas {
		// Get muscle groups for this alias
		muscleGroups := domain.GetMuscleGroupsForAlias(bodyAlias)
		if len(muscleGroups) == 0 {
			continue
		}

		// Determine symptom based on delta
		symptom := domain.DeltaToSymptom(delta)

		// Create an issue for each affected muscle group
		for _, muscle := range muscleGroups {
			inputs = append(inputs, domain.BodyPartIssueInput{
				Date:      today,
				BodyPart:  muscle,
				Symptom:   symptom,
				RawText:   "from echo log",
				SessionID: &sessionID,
			})
		}
	}

	if len(inputs) == 0 {
		return nil, nil
	}

	return s.bodyIssueStore.CreateBatch(ctx, inputs)
}

// FinalizeDraft marks a draft session as complete without echo processing.
func (s *EchoService) FinalizeDraft(ctx context.Context, sessionID int64) error {
	return s.sessionStore.FinalizeDraft(ctx, sessionID)
}

// GetSession retrieves a training session by ID.
func (s *EchoService) GetSession(ctx context.Context, sessionID int64) (*domain.TrainingSession, error) {
	return s.sessionStore.GetByID(ctx, sessionID)
}
