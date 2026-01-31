package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"victus/internal/domain"
)

var ErrMovementNotFound = errors.New("movement not found")

// MovementStore handles database operations for the movement taxonomy.
type MovementStore struct {
	db DBTX
}

// NewMovementStore creates a new MovementStore.
func NewMovementStore(db DBTX) *MovementStore {
	return &MovementStore{db: db}
}

// GetAll returns all movements in the taxonomy.
func (s *MovementStore) GetAll(ctx context.Context) ([]domain.Movement, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, name, category, tags, difficulty, primary_load, joint_stress, progression_id
		FROM movements ORDER BY category, difficulty
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var movements []domain.Movement
	for rows.Next() {
		m, err := scanMovement(rows)
		if err != nil {
			return nil, err
		}
		movements = append(movements, m)
	}
	return movements, rows.Err()
}

// GetByID returns a single movement by ID.
func (s *MovementStore) GetByID(ctx context.Context, id string) (*domain.Movement, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, name, category, tags, difficulty, primary_load, joint_stress, progression_id
		FROM movements WHERE id = $1
	`, id)

	var m domain.Movement
	var tagsJSON, stressJSON []byte
	err := row.Scan(&m.ID, &m.Name, &m.Category, &tagsJSON, &m.Difficulty, &m.PrimaryLoad, &stressJSON, &m.ProgressionID)
	if err == sql.ErrNoRows {
		return nil, ErrMovementNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(tagsJSON, &m.Tags); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(stressJSON, &m.JointStress); err != nil {
		return nil, err
	}
	return &m, nil
}

// GetUserProgress returns the user's progression for a movement.
func (s *MovementStore) GetUserProgress(ctx context.Context, movementID string) (*domain.UserMovementProgress, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT movement_id, user_difficulty, successful_sessions, last_performed_at
		FROM user_movement_progress WHERE movement_id = $1
	`, movementID)

	var p domain.UserMovementProgress
	var lastPerformed sql.NullTime
	err := row.Scan(&p.MovementID, &p.UserDifficulty, &p.SuccessfulSessions, &lastPerformed)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if lastPerformed.Valid {
		p.LastPerformedAt = &lastPerformed.Time
	}
	return &p, nil
}

// UpsertUserProgress creates or updates the user's progression for a movement.
func (s *MovementStore) UpsertUserProgress(ctx context.Context, p domain.UserMovementProgress) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO user_movement_progress (movement_id, user_difficulty, successful_sessions, last_performed_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (movement_id) DO UPDATE SET
			user_difficulty = EXCLUDED.user_difficulty,
			successful_sessions = EXCLUDED.successful_sessions,
			last_performed_at = EXCLUDED.last_performed_at,
			updated_at = NOW()
	`, p.MovementID, p.UserDifficulty, p.SuccessfulSessions, p.LastPerformedAt)
	return err
}

type movementScanner interface {
	Scan(dest ...any) error
}

func scanMovement(rows movementScanner) (domain.Movement, error) {
	var m domain.Movement
	var tagsJSON, stressJSON []byte
	err := rows.Scan(&m.ID, &m.Name, &m.Category, &tagsJSON, &m.Difficulty, &m.PrimaryLoad, &stressJSON, &m.ProgressionID)
	if err != nil {
		return m, err
	}
	if err := json.Unmarshal(tagsJSON, &m.Tags); err != nil {
		return m, err
	}
	if err := json.Unmarshal(stressJSON, &m.JointStress); err != nil {
		return m, err
	}
	return m, nil
}

// GetAllUserProgress returns all user progression records.
func (s *MovementStore) GetAllUserProgress(ctx context.Context) (map[string]domain.UserMovementProgress, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT movement_id, user_difficulty, successful_sessions, last_performed_at
		FROM user_movement_progress
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]domain.UserMovementProgress)
	for rows.Next() {
		var p domain.UserMovementProgress
		var lastPerformed sql.NullTime
		if err := rows.Scan(&p.MovementID, &p.UserDifficulty, &p.SuccessfulSessions, &lastPerformed); err != nil {
			return nil, err
		}
		if lastPerformed.Valid {
			p.LastPerformedAt = &lastPerformed.Time
		}
		result[p.MovementID] = p
	}
	return result, rows.Err()
}

// ensure time import is used
var _ = time.Now
