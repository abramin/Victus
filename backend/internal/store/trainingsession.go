package store

import (
	"context"
	"database/sql"

	"victus/internal/domain"
)

// TrainingSessionStore handles database operations for training sessions.
type TrainingSessionStore struct {
	db *sql.DB
}

// NewTrainingSessionStore creates a new TrainingSessionStore.
func NewTrainingSessionStore(db *sql.DB) *TrainingSessionStore {
	return &TrainingSessionStore{db: db}
}

// CreateForLog inserts all sessions for a daily log.
func (s *TrainingSessionStore) CreateForLog(ctx context.Context, logID int64, sessions []domain.TrainingSession) error {
	const query = `
		INSERT INTO training_sessions (
			daily_log_id, session_order, is_planned, training_type,
			duration_min, perceived_intensity, notes
		) VALUES (?, ?, ?, ?, ?, ?, ?)
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

		_, err := s.db.ExecContext(ctx, query,
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
		WHERE daily_log_id = ?
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
	_, err := s.db.ExecContext(ctx, "DELETE FROM training_sessions WHERE daily_log_id = ?", logID)
	return err
}
