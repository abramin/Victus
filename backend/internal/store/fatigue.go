package store

import (
	"context"
	"database/sql"
	"encoding/json"

	"victus/internal/domain"
)

// FatigueStore handles database operations for muscle fatigue and archetypes.
type FatigueStore struct {
	db *sql.DB
}

// NewFatigueStore creates a new FatigueStore.
func NewFatigueStore(db *sql.DB) *FatigueStore {
	return &FatigueStore{db: db}
}

// GetAllMuscleGroups retrieves all muscle group configurations.
func (s *FatigueStore) GetAllMuscleGroups(ctx context.Context) ([]domain.MuscleGroupConfig, error) {
	const query = `
		SELECT id, name, display_name, svg_path_id
		FROM muscle_groups
		ORDER BY id
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []domain.MuscleGroupConfig
	for rows.Next() {
		var g domain.MuscleGroupConfig
		if err := rows.Scan(&g.ID, &g.Name, &g.DisplayName, &g.SVGPathID); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}

	return groups, rows.Err()
}

// GetAllArchetypes retrieves all workout archetypes with their muscle coefficients.
func (s *FatigueStore) GetAllArchetypes(ctx context.Context) ([]domain.ArchetypeConfig, error) {
	const query = `
		SELECT id, name, display_name, muscle_coefficients
		FROM training_archetypes
		ORDER BY id
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var archetypes []domain.ArchetypeConfig
	for rows.Next() {
		var a domain.ArchetypeConfig
		var coefficientsJSON string

		if err := rows.Scan(&a.ID, &a.Name, &a.DisplayName, &coefficientsJSON); err != nil {
			return nil, err
		}

		// Parse JSON coefficients into map
		var rawCoeffs map[string]float64
		if err := json.Unmarshal([]byte(coefficientsJSON), &rawCoeffs); err != nil {
			return nil, err
		}

		a.Coefficients = make(map[domain.MuscleGroup]float64)
		for k, v := range rawCoeffs {
			a.Coefficients[domain.MuscleGroup(k)] = v
		}

		archetypes = append(archetypes, a)
	}

	return archetypes, rows.Err()
}

// GetArchetypeByName retrieves an archetype configuration by name.
func (s *FatigueStore) GetArchetypeByName(ctx context.Context, name domain.Archetype) (*domain.ArchetypeConfig, error) {
	const query = `
		SELECT id, name, display_name, muscle_coefficients
		FROM training_archetypes
		WHERE name = ?
	`

	var a domain.ArchetypeConfig
	var coefficientsJSON string

	err := s.db.QueryRowContext(ctx, query, name).Scan(&a.ID, &a.Name, &a.DisplayName, &coefficientsJSON)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrArchetypeNotFound
		}
		return nil, err
	}

	// Parse JSON coefficients into map
	var rawCoeffs map[string]float64
	if err := json.Unmarshal([]byte(coefficientsJSON), &rawCoeffs); err != nil {
		return nil, err
	}

	a.Coefficients = make(map[domain.MuscleGroup]float64)
	for k, v := range rawCoeffs {
		a.Coefficients[domain.MuscleGroup(k)] = v
	}

	return &a, nil
}

// MuscleFatigueRow represents raw fatigue data from the database.
type MuscleFatigueRow struct {
	MuscleGroupID  int
	MuscleName     string
	FatiguePercent float64
	LastUpdated    string
}

// GetAllMuscleFatigue retrieves current fatigue state for all muscles.
// Returns rows for muscles that have fatigue entries.
func (s *FatigueStore) GetAllMuscleFatigue(ctx context.Context) ([]MuscleFatigueRow, error) {
	const query = `
		SELECT mf.muscle_group_id, mg.name, mf.fatigue_percent, mf.last_updated
		FROM muscle_fatigue mf
		JOIN muscle_groups mg ON mf.muscle_group_id = mg.id
		ORDER BY mg.id
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []MuscleFatigueRow
	for rows.Next() {
		var r MuscleFatigueRow
		if err := rows.Scan(&r.MuscleGroupID, &r.MuscleName, &r.FatiguePercent, &r.LastUpdated); err != nil {
			return nil, err
		}
		results = append(results, r)
	}

	return results, rows.Err()
}

// GetMuscleFatigue retrieves fatigue state for a specific muscle.
func (s *FatigueStore) GetMuscleFatigue(ctx context.Context, muscleGroupID int) (*MuscleFatigueRow, error) {
	const query = `
		SELECT mf.muscle_group_id, mg.name, mf.fatigue_percent, mf.last_updated
		FROM muscle_fatigue mf
		JOIN muscle_groups mg ON mf.muscle_group_id = mg.id
		WHERE mf.muscle_group_id = ?
	`

	var r MuscleFatigueRow
	err := s.db.QueryRowContext(ctx, query, muscleGroupID).Scan(
		&r.MuscleGroupID, &r.MuscleName, &r.FatiguePercent, &r.LastUpdated,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No fatigue entry = fresh muscle
		}
		return nil, err
	}

	return &r, nil
}

// UpsertMuscleFatigue updates or inserts fatigue for a muscle.
func (s *FatigueStore) UpsertMuscleFatigue(ctx context.Context, muscleGroupID int, fatiguePercent float64) error {
	const query = `
		INSERT INTO muscle_fatigue (muscle_group_id, fatigue_percent, last_updated)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(muscle_group_id) DO UPDATE SET
			fatigue_percent = excluded.fatigue_percent,
			last_updated = excluded.last_updated
	`

	_, err := s.db.ExecContext(ctx, query, muscleGroupID, fatiguePercent)
	return err
}

// UpsertMuscleFatigueWithTx updates or inserts fatigue for a muscle within a transaction.
func (s *FatigueStore) UpsertMuscleFatigueWithTx(ctx context.Context, tx *sql.Tx, muscleGroupID int, fatiguePercent float64) error {
	const query = `
		INSERT INTO muscle_fatigue (muscle_group_id, fatigue_percent, last_updated)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(muscle_group_id) DO UPDATE SET
			fatigue_percent = excluded.fatigue_percent,
			last_updated = excluded.last_updated
	`

	_, err := tx.ExecContext(ctx, query, muscleGroupID, fatiguePercent)
	return err
}

// RecordFatigueEvent logs a fatigue injection event.
func (s *FatigueStore) RecordFatigueEvent(ctx context.Context, tx *sql.Tx, trainingSessionID int64, archetypeID int, totalLoad float64) error {
	const query = `
		INSERT INTO fatigue_events (training_session_id, archetype_id, total_load, applied_at)
		VALUES (?, ?, ?, datetime('now'))
	`

	_, err := tx.ExecContext(ctx, query, trainingSessionID, archetypeID, totalLoad)
	return err
}

// GetMuscleGroupIDByName retrieves the ID for a muscle group by name.
func (s *FatigueStore) GetMuscleGroupIDByName(ctx context.Context, name domain.MuscleGroup) (int, error) {
	const query = `SELECT id FROM muscle_groups WHERE name = ?`

	var id int
	err := s.db.QueryRowContext(ctx, query, name).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, ErrMuscleGroupNotFound
		}
		return 0, err
	}

	return id, nil
}

// WithTx executes fn within a transaction.
func (s *FatigueStore) WithTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

// Store-level sentinel errors
var (
	ErrArchetypeNotFound   = &StoreError{msg: "archetype not found"}
	ErrMuscleGroupNotFound = &StoreError{msg: "muscle group not found"}
)

// StoreError represents a store-level error.
type StoreError struct {
	msg string
}

func (e *StoreError) Error() string {
	return e.msg
}
