package store

import (
	"context"
	"errors"
	"time"

	"victus/internal/domain"
)

// ErrPlannedSessionNotFound is returned when no planned session exists for the given ID.
var ErrPlannedSessionNotFound = errors.New("planned session not found")

// PlannedSessionStore handles database operations for planned sessions from the workout planner.
type PlannedSessionStore struct {
	db DBTX
}

// NewPlannedSessionStore creates a new PlannedSessionStore.
func NewPlannedSessionStore(db DBTX) *PlannedSessionStore {
	return &PlannedSessionStore{db: db}
}

// GetByDate retrieves all planned sessions for a date (YYYY-MM-DD format).
// Returns an empty slice if no sessions exist for that date.
func (s *PlannedSessionStore) GetByDate(ctx context.Context, date string) ([]domain.PlannedSession, error) {
	const query = `
		SELECT id, plan_date, session_order, training_type, duration_min, load_score, rpe, notes
		FROM planned_sessions
		WHERE plan_date = $1
		ORDER BY session_order ASC
	`

	rows, err := s.db.QueryContext(ctx, query, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.PlannedSession
	for rows.Next() {
		var ps domain.PlannedSession
		if err := rows.Scan(
			&ps.ID, &ps.Date, &ps.SessionOrder, &ps.TrainingType,
			&ps.DurationMin, &ps.LoadScore, &ps.RPE, &ps.Notes,
		); err != nil {
			return nil, err
		}
		sessions = append(sessions, ps)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return sessions, nil
}

// ListByDateRange retrieves planned sessions for a date range (inclusive).
// Returns an empty slice if no sessions exist in the range.
func (s *PlannedSessionStore) ListByDateRange(ctx context.Context, startDate, endDate string) ([]domain.PlannedSession, error) {
	const query = `
		SELECT id, plan_date, session_order, training_type, duration_min, load_score, rpe, notes
		FROM planned_sessions
		WHERE plan_date >= $1 AND plan_date <= $2
		ORDER BY plan_date ASC, session_order ASC
	`

	rows, err := s.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.PlannedSession
	for rows.Next() {
		var ps domain.PlannedSession
		if err := rows.Scan(
			&ps.ID, &ps.Date, &ps.SessionOrder, &ps.TrainingType,
			&ps.DurationMin, &ps.LoadScore, &ps.RPE, &ps.Notes,
		); err != nil {
			return nil, err
		}
		sessions = append(sessions, ps)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return sessions, nil
}

// UpsertForDate replaces all planned sessions for a date with the provided sessions.
// This is atomic: deletes existing sessions and inserts new ones in a single transaction.
func (s *PlannedSessionStore) UpsertForDate(ctx context.Context, date string, sessions []domain.PlannedSession) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete existing sessions for this date
	if _, err := tx.ExecContext(ctx, "DELETE FROM planned_sessions WHERE plan_date = $1", date); err != nil {
		return err
	}

	// Insert new sessions
	const insertQuery = `
		INSERT INTO planned_sessions (plan_date, session_order, training_type, duration_min, load_score, rpe, notes, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	now := time.Now()
	for i, ps := range sessions {
		order := i + 1 // 1-based order
		if _, err := tx.ExecContext(ctx, insertQuery,
			date, order, ps.TrainingType, ps.DurationMin, ps.LoadScore, ps.RPE, ps.Notes, now,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// DeleteByDate removes all planned sessions for the given date.
func (s *PlannedSessionStore) DeleteByDate(ctx context.Context, date string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM planned_sessions WHERE plan_date = $1", date)
	return err
}
