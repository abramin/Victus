package store

import (
	"context"
	"errors"
	"time"

	"victus/internal/domain"
)

// ErrPlannerSessionNotFound is returned when no planner session exists for the given ID.
var ErrPlannerSessionNotFound = errors.New("planner session not found")

// PlannerSessionStore handles database operations for sessions from the workout planner.
// These are ad-hoc sessions scheduled for future dates, distinct from:
// - TrainingSession (bound to DailyLog)
// - ScheduledSession (from program installation)
type PlannerSessionStore struct {
	db DBTX
}

// NewPlannerSessionStore creates a new PlannerSessionStore.
func NewPlannerSessionStore(db DBTX) *PlannerSessionStore {
	return &PlannerSessionStore{db: db}
}

// GetByDate retrieves all planner sessions for a date (YYYY-MM-DD format).
// Returns an empty slice if no sessions exist for that date.
func (s *PlannerSessionStore) GetByDate(ctx context.Context, date string) ([]domain.PlannerSession, error) {
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

	var sessions []domain.PlannerSession
	for rows.Next() {
		var ps domain.PlannerSession
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

// ListByDateRange retrieves planner sessions for a date range (inclusive).
// Returns an empty slice if no sessions exist in the range.
func (s *PlannerSessionStore) ListByDateRange(ctx context.Context, startDate, endDate string) ([]domain.PlannerSession, error) {
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

	var sessions []domain.PlannerSession
	for rows.Next() {
		var ps domain.PlannerSession
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

// UpsertForDate replaces all planner sessions for a date with the provided sessions.
// This is atomic: deletes existing sessions and inserts new ones in a single transaction.
func (s *PlannerSessionStore) UpsertForDate(ctx context.Context, date string, sessions []domain.PlannerSession) error {
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

// DeleteByDate removes all planner sessions for the given date.
func (s *PlannerSessionStore) DeleteByDate(ctx context.Context, date string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM planned_sessions WHERE plan_date = $1", date)
	return err
}
