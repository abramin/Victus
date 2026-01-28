package store

import (
	"context"
	"database/sql"
	"encoding/json"

	"victus/internal/domain"
)

// TrainingSessionStore handles database operations for training sessions.
type TrainingSessionStore struct {
	db DBTX
}

// NewTrainingSessionStore creates a new TrainingSessionStore.
func NewTrainingSessionStore(db DBTX) *TrainingSessionStore {
	return &TrainingSessionStore{db: db}
}

// CreateForLog inserts all sessions for a daily log.
func (s *TrainingSessionStore) CreateForLog(ctx context.Context, logID int64, sessions []domain.TrainingSession) error {
	return s.createForLog(ctx, s.db, logID, sessions)
}

// CreateForLogWithTx inserts all sessions for a daily log within an existing transaction.
func (s *TrainingSessionStore) CreateForLogWithTx(ctx context.Context, tx *sql.Tx, logID int64, sessions []domain.TrainingSession) error {
	return s.createForLog(ctx, tx, logID, sessions)
}

func (s *TrainingSessionStore) createForLog(ctx context.Context, execer sqlExecer, logID int64, sessions []domain.TrainingSession) error {
	const query = `
		INSERT INTO training_sessions (
			daily_log_id, session_order, is_planned, training_type,
			duration_min, perceived_intensity, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	for _, session := range sessions {
		var intensity interface{}
		if session.PerceivedIntensity != nil {
			intensity = *session.PerceivedIntensity
		}

		var notes interface{}
		if session.Notes != "" {
			notes = session.Notes
		}

		_, err := execer.ExecContext(ctx, query,
			logID,
			session.SessionOrder,
			session.IsPlanned,
			session.Type,
			session.DurationMin,
			intensity,
			notes,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// GetByLogID retrieves all sessions for a daily log, ordered by session_order.
func (s *TrainingSessionStore) GetByLogID(ctx context.Context, logID int64) ([]domain.TrainingSession, error) {
	const query = `
		SELECT id, session_order, is_planned, training_type,
		       duration_min, perceived_intensity, notes
		FROM training_sessions
		WHERE daily_log_id = $1
		ORDER BY session_order
	`

	rows, err := s.db.QueryContext(ctx, query, logID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.TrainingSession
	for rows.Next() {
		var session domain.TrainingSession
		var intensity sql.NullInt64
		var notes sql.NullString

		err := rows.Scan(
			&session.ID,
			&session.SessionOrder,
			&session.IsPlanned,
			&session.Type,
			&session.DurationMin,
			&intensity,
			&notes,
		)
		if err != nil {
			return nil, err
		}

		if intensity.Valid {
			i := int(intensity.Int64)
			session.PerceivedIntensity = &i
		}
		if notes.Valid {
			session.Notes = notes.String
		}

		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

// DeleteByLogID removes all sessions for a daily log.
func (s *TrainingSessionStore) DeleteByLogID(ctx context.Context, logID int64) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM training_sessions WHERE daily_log_id = $1", logID)
	return err
}

// GetPlannedByLogID retrieves only planned sessions for a daily log.
func (s *TrainingSessionStore) GetPlannedByLogID(ctx context.Context, logID int64) ([]domain.TrainingSession, error) {
	return s.getSessionsByLogIDAndType(ctx, logID, true)
}

// GetActualByLogID retrieves only actual sessions for a daily log.
func (s *TrainingSessionStore) GetActualByLogID(ctx context.Context, logID int64) ([]domain.TrainingSession, error) {
	return s.getSessionsByLogIDAndType(ctx, logID, false)
}

// getSessionsByLogIDAndType retrieves sessions filtered by is_planned flag.
func (s *TrainingSessionStore) getSessionsByLogIDAndType(ctx context.Context, logID int64, isPlanned bool) ([]domain.TrainingSession, error) {
	const query = `
		SELECT id, session_order, is_planned, training_type,
		       duration_min, perceived_intensity, notes
		FROM training_sessions
		WHERE daily_log_id = $1 AND is_planned = $2
		ORDER BY session_order
	`

	rows, err := s.db.QueryContext(ctx, query, logID, isPlanned)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.TrainingSession
	for rows.Next() {
		var session domain.TrainingSession
		var intensity sql.NullInt64
		var notes sql.NullString

		err := rows.Scan(
			&session.ID,
			&session.SessionOrder,
			&session.IsPlanned,
			&session.Type,
			&session.DurationMin,
			&intensity,
			&notes,
		)
		if err != nil {
			return nil, err
		}

		if intensity.Valid {
			i := int(intensity.Int64)
			session.PerceivedIntensity = &i
		}
		if notes.Valid {
			session.Notes = notes.String
		}

		sessions = append(sessions, session)
	}

	return sessions, rows.Err()
}

// DeleteActualByLogID removes only actual sessions for a daily log.
func (s *TrainingSessionStore) DeleteActualByLogID(ctx context.Context, logID int64) error {
	return s.deleteActualByLogID(ctx, s.db, logID)
}

// DeleteActualByLogIDWithTx removes only actual sessions for a daily log within a transaction.
func (s *TrainingSessionStore) DeleteActualByLogIDWithTx(ctx context.Context, tx *sql.Tx, logID int64) error {
	return s.deleteActualByLogID(ctx, tx, logID)
}

func (s *TrainingSessionStore) deleteActualByLogID(ctx context.Context, execer sqlExecer, logID int64) error {
	_, err := execer.ExecContext(ctx, "DELETE FROM training_sessions WHERE daily_log_id = $1 AND is_planned = false", logID)
	return err
}

// SessionsByDate represents training sessions grouped by date for ACR calculation.
type SessionsByDate struct {
	Date            string
	PlannedSessions []domain.TrainingSession
	ActualSessions  []domain.TrainingSession
}

// GetSessionsForDateRange retrieves all training sessions within a date range for ACR calculation.
// Returns sessions grouped by date, ordered by date (oldest first).
// endDate is inclusive.
func (s *TrainingSessionStore) GetSessionsForDateRange(ctx context.Context, startDate, endDate string) ([]SessionsByDate, error) {
	const query = `
		SELECT
			dl.log_date,
			ts.session_order,
			ts.is_planned,
			ts.training_type,
			ts.duration_min,
			ts.perceived_intensity,
			ts.notes
		FROM daily_logs dl
		LEFT JOIN training_sessions ts ON dl.id = ts.daily_log_id
		WHERE dl.log_date >= $1 AND dl.log_date <= $2
		ORDER BY dl.log_date ASC, ts.is_planned DESC, ts.session_order ASC
	`

	rows, err := s.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Group sessions by date
	byDate := make(map[string]*SessionsByDate)
	var orderedDates []string

	for rows.Next() {
		var (
			date         string
			sessionOrder sql.NullInt64
			isPlanned    sql.NullBool
			trainingType sql.NullString
			durationMin  sql.NullInt64
			intensity    sql.NullInt64
			notes        sql.NullString
		)

		if err := rows.Scan(&date, &sessionOrder, &isPlanned, &trainingType,
			&durationMin, &intensity, &notes); err != nil {
			return nil, err
		}

		// Initialize date entry if needed
		if _, exists := byDate[date]; !exists {
			byDate[date] = &SessionsByDate{Date: date}
			orderedDates = append(orderedDates, date)
		}

		// Skip if no session data (LEFT JOIN with no sessions)
		if !sessionOrder.Valid {
			continue
		}

		session := domain.TrainingSession{
			SessionOrder: int(sessionOrder.Int64),
			IsPlanned:    isPlanned.Bool,
			Type:         domain.TrainingType(trainingType.String),
			DurationMin:  int(durationMin.Int64),
		}

		if intensity.Valid {
			i := int(intensity.Int64)
			session.PerceivedIntensity = &i
		}
		if notes.Valid {
			session.Notes = notes.String
		}

		if session.IsPlanned {
			byDate[date].PlannedSessions = append(byDate[date].PlannedSessions, session)
		} else {
			byDate[date].ActualSessions = append(byDate[date].ActualSessions, session)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Convert to ordered slice
	result := make([]SessionsByDate, len(orderedDates))
	for i, date := range orderedDates {
		result[i] = *byDate[date]
	}

	return result, nil
}

// GetByID retrieves a single training session by its ID.
func (s *TrainingSessionStore) GetByID(ctx context.Context, id int64) (*domain.TrainingSession, error) {
	const query = `
		SELECT id, session_order, is_planned, is_draft, training_type,
		       duration_min, perceived_intensity, notes, raw_echo_log, extra_metadata
		FROM training_sessions
		WHERE id = $1
	`

	var session domain.TrainingSession
	var intensity sql.NullInt64
	var notes sql.NullString
	var isDraft sql.NullBool
	var rawEchoLog sql.NullString
	var extraMetadata sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&session.ID,
		&session.SessionOrder,
		&session.IsPlanned,
		&isDraft,
		&session.Type,
		&session.DurationMin,
		&intensity,
		&notes,
		&rawEchoLog,
		&extraMetadata,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrSessionNotFound
	}
	if err != nil {
		return nil, err
	}

	if intensity.Valid {
		i := int(intensity.Int64)
		session.PerceivedIntensity = &i
	}
	if notes.Valid {
		session.Notes = notes.String
	}
	if isDraft.Valid {
		session.IsDraft = isDraft.Bool
	}
	if rawEchoLog.Valid {
		session.RawEchoLog = &rawEchoLog.String
	}
	if extraMetadata.Valid {
		var meta domain.SessionExtraMetadata
		if err := json.Unmarshal([]byte(extraMetadata.String), &meta); err == nil {
			session.ExtraMetadata = &meta
		}
	}

	return &session, nil
}

// CreateDraft creates a new draft session for a daily log.
// Draft sessions have is_draft=true and are pending echo enrichment.
func (s *TrainingSessionStore) CreateDraft(ctx context.Context, logID int64, session domain.TrainingSession) (*domain.TrainingSession, error) {
	const query = `
		INSERT INTO training_sessions (
			daily_log_id, session_order, is_planned, is_draft, training_type,
			duration_min, perceived_intensity, notes
		) VALUES ($1, $2, $3, true, $4, $5, $6, $7)
		RETURNING id
	`

	var intensity interface{}
	if session.PerceivedIntensity != nil {
		intensity = *session.PerceivedIntensity
	}

	var notes interface{}
	if session.Notes != "" {
		notes = session.Notes
	}

	var id int64
	err := s.db.QueryRowContext(ctx, query,
		logID,
		session.SessionOrder,
		session.IsPlanned,
		session.Type,
		session.DurationMin,
		intensity,
		notes,
	).Scan(&id)
	if err != nil {
		return nil, err
	}

	session.ID = id
	session.IsDraft = true
	return &session, nil
}

// FinalizeWithEcho updates a draft session with echo data and marks it as finalized.
func (s *TrainingSessionStore) FinalizeWithEcho(ctx context.Context, id int64, rawEcho string, metadata domain.SessionExtraMetadata) (*domain.TrainingSession, error) {
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, err
	}

	const query = `
		UPDATE training_sessions
		SET is_draft = false, raw_echo_log = $2, extra_metadata = $3
		WHERE id = $1 AND is_draft = true
		RETURNING id, session_order, is_planned, is_draft, training_type,
		          duration_min, perceived_intensity, notes, raw_echo_log, extra_metadata
	`

	var session domain.TrainingSession
	var intensity sql.NullInt64
	var notes sql.NullString
	var isDraft sql.NullBool
	var rawEchoLog sql.NullString
	var extraMetadataStr sql.NullString

	err = s.db.QueryRowContext(ctx, query, id, rawEcho, string(metadataJSON)).Scan(
		&session.ID,
		&session.SessionOrder,
		&session.IsPlanned,
		&isDraft,
		&session.Type,
		&session.DurationMin,
		&intensity,
		&notes,
		&rawEchoLog,
		&extraMetadataStr,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrSessionNotDraft
	}
	if err != nil {
		return nil, err
	}

	if intensity.Valid {
		i := int(intensity.Int64)
		session.PerceivedIntensity = &i
	}
	if notes.Valid {
		session.Notes = notes.String
	}
	if isDraft.Valid {
		session.IsDraft = isDraft.Bool
	}
	if rawEchoLog.Valid {
		session.RawEchoLog = &rawEchoLog.String
	}
	session.ExtraMetadata = &metadata

	return &session, nil
}

// FinalizeDraft marks a draft session as complete without echo processing.
func (s *TrainingSessionStore) FinalizeDraft(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx,
		"UPDATE training_sessions SET is_draft = false WHERE id = $1 AND is_draft = true",
		id,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return domain.ErrSessionNotDraft
	}

	return nil
}
