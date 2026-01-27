package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"victus/internal/domain"
)

// ErrPlannedDayTypeNotFound is returned when no planned day type exists for the given date.
var ErrPlannedDayTypeNotFound = errors.New("planned day type not found")

// PlannedDayTypeStore handles database operations for planned day types.
type PlannedDayTypeStore struct {
	db DBTX
}

// NewPlannedDayTypeStore creates a new PlannedDayTypeStore.
func NewPlannedDayTypeStore(db DBTX) *PlannedDayTypeStore {
	return &PlannedDayTypeStore{db: db}
}

// GetByDate retrieves a planned day type by date (YYYY-MM-DD format).
// Returns ErrPlannedDayTypeNotFound if no planned day type exists for that date.
func (s *PlannedDayTypeStore) GetByDate(ctx context.Context, date string) (*domain.PlannedDayType, error) {
	const query = `
		SELECT id, plan_date, day_type
		FROM planned_day_types
		WHERE plan_date = $1
	`

	var pdt domain.PlannedDayType
	err := s.db.QueryRowContext(ctx, query, date).Scan(
		&pdt.ID, &pdt.Date, &pdt.DayType,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPlannedDayTypeNotFound
	}
	if err != nil {
		return nil, err
	}

	return &pdt, nil
}

// ListByDateRange retrieves planned day types for a date range (inclusive).
// Returns an empty slice if no planned day types exist in the range.
func (s *PlannedDayTypeStore) ListByDateRange(ctx context.Context, startDate, endDate string) ([]domain.PlannedDayType, error) {
	const query = `
		SELECT id, plan_date, day_type
		FROM planned_day_types
		WHERE plan_date >= $1 AND plan_date <= $2
		ORDER BY plan_date ASC
	`

	rows, err := s.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.PlannedDayType
	for rows.Next() {
		var pdt domain.PlannedDayType
		if err := rows.Scan(&pdt.ID, &pdt.Date, &pdt.DayType); err != nil {
			return nil, err
		}
		result = append(result, pdt)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// Upsert inserts or updates a planned day type for the given date.
func (s *PlannedDayTypeStore) Upsert(ctx context.Context, pdt *domain.PlannedDayType) error {
	const query = `
		INSERT INTO planned_day_types (plan_date, day_type, updated_at)
		VALUES ($1, $2, $3)
		ON CONFLICT(plan_date) DO UPDATE SET
			day_type = excluded.day_type,
			updated_at = excluded.updated_at
	`

	_, err := s.db.ExecContext(ctx, query, pdt.Date, pdt.DayType, time.Now())
	return err
}

// DeleteByDate removes the planned day type for the given date.
func (s *PlannedDayTypeStore) DeleteByDate(ctx context.Context, date string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM planned_day_types WHERE plan_date = $1", date)
	return err
}
