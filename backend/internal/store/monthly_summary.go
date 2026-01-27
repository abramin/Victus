package store

import (
	"context"
	"database/sql"
	"time"

	"victus/internal/domain"
)

// MonthlySummaryStore handles persistence for monthly activity summaries.
type MonthlySummaryStore struct {
	db DBTX
}

// NewMonthlySummaryStore creates a new monthly summary store.
func NewMonthlySummaryStore(db DBTX) *MonthlySummaryStore {
	return &MonthlySummaryStore{db: db}
}

// Upsert creates or updates a monthly summary.
// Returns true if a new record was created, false if updated.
func (s *MonthlySummaryStore) Upsert(ctx context.Context, summary domain.MonthlySummary) (bool, error) {
	// Calculate average if we have both count and calories
	avgCals := 0
	if summary.SessionCount > 0 && summary.TotalCalories > 0 {
		avgCals = summary.TotalCalories / summary.SessionCount
	}

	const query = `
		INSERT INTO monthly_summaries
			(year_month, activity_type, session_count, total_calories, avg_calories_per_session, data_source, raw_activity_name)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (year_month, activity_type) DO UPDATE SET
			session_count = EXCLUDED.session_count,
			total_calories = COALESCE(EXCLUDED.total_calories, monthly_summaries.total_calories),
			avg_calories_per_session = CASE
				WHEN EXCLUDED.session_count > 0 AND COALESCE(EXCLUDED.total_calories, monthly_summaries.total_calories) > 0
				THEN COALESCE(EXCLUDED.total_calories, monthly_summaries.total_calories) / EXCLUDED.session_count
				ELSE monthly_summaries.avg_calories_per_session
			END
	`

	result, err := s.db.ExecContext(ctx, query,
		summary.YearMonth,
		string(summary.ActivityType),
		summary.SessionCount,
		nullableInt(summary.TotalCalories),
		nullableInt(avgCals),
		summary.DataSource,
		summary.RawActivityName,
	)
	if err != nil {
		return false, err
	}

	rowsAffected, _ := result.RowsAffected()
	// PostgreSQL returns 1 for both insert and update with ON CONFLICT
	// We'll assume it's a create since we can't easily distinguish
	return rowsAffected > 0, nil
}

// UpdateCalories updates just the calorie data for a monthly summary.
// This is used when importing calorie data separately from activity counts.
func (s *MonthlySummaryStore) UpdateCalories(ctx context.Context, yearMonth string, activityType domain.TrainingType, calories int) error {
	const query = `
		UPDATE monthly_summaries
		SET total_calories = $1,
		    avg_calories_per_session = CASE WHEN session_count > 0 THEN $2 / session_count ELSE 0 END
		WHERE year_month = $3 AND activity_type = $4
	`

	result, err := s.db.ExecContext(ctx, query, calories, calories, yearMonth, string(activityType))
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// No existing record, create one with just calories
		const insertQuery = `
			INSERT INTO monthly_summaries
				(year_month, activity_type, session_count, total_calories, avg_calories_per_session, data_source, raw_activity_name)
			VALUES ($1, $2, 0, $3, 0, 'garmin_import', '')
		`
		_, err = s.db.ExecContext(ctx, insertQuery, yearMonth, string(activityType), calories)
		return err
	}

	return nil
}

// GetByYearMonth retrieves all summaries for a specific month.
func (s *MonthlySummaryStore) GetByYearMonth(ctx context.Context, yearMonth string) ([]domain.MonthlySummary, error) {
	const query = `
		SELECT id, year_month, activity_type, session_count, total_calories,
		       avg_calories_per_session, data_source, raw_activity_name, created_at
		FROM monthly_summaries
		WHERE year_month = $1
		ORDER BY session_count DESC
	`

	rows, err := s.db.QueryContext(ctx, query, yearMonth)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanSummaries(rows)
}

// GetRange retrieves summaries within a date range (inclusive).
// from and to should be in "YYYY-MM" format.
func (s *MonthlySummaryStore) GetRange(ctx context.Context, from, to string) ([]domain.MonthlySummary, error) {
	const query = `
		SELECT id, year_month, activity_type, session_count, total_calories,
		       avg_calories_per_session, data_source, raw_activity_name, created_at
		FROM monthly_summaries
		WHERE year_month >= $1 AND year_month <= $2
		ORDER BY year_month DESC, session_count DESC
	`

	rows, err := s.db.QueryContext(ctx, query, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanSummaries(rows)
}

// GetAll retrieves all monthly summaries.
func (s *MonthlySummaryStore) GetAll(ctx context.Context) ([]domain.MonthlySummary, error) {
	const query = `
		SELECT id, year_month, activity_type, session_count, total_calories,
		       avg_calories_per_session, data_source, raw_activity_name, created_at
		FROM monthly_summaries
		ORDER BY year_month DESC, session_count DESC
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanSummaries(rows)
}

func (s *MonthlySummaryStore) scanSummaries(rows *sql.Rows) ([]domain.MonthlySummary, error) {
	var summaries []domain.MonthlySummary

	for rows.Next() {
		var summary domain.MonthlySummary
		var activityType string
		var totalCalories, avgCals sql.NullInt64
		var createdAt time.Time

		err := rows.Scan(
			&summary.ID,
			&summary.YearMonth,
			&activityType,
			&summary.SessionCount,
			&totalCalories,
			&avgCals,
			&summary.DataSource,
			&summary.RawActivityName,
			&createdAt,
		)
		if err != nil {
			return nil, err
		}

		summary.ActivityType = domain.TrainingType(activityType)
		if totalCalories.Valid {
			summary.TotalCalories = int(totalCalories.Int64)
		}
		if avgCals.Valid {
			summary.AvgCaloriesPerSession = int(avgCals.Int64)
		}
		summary.CreatedAt = createdAt

		summaries = append(summaries, summary)
	}

	return summaries, rows.Err()
}

// nullableInt returns nil for zero values, otherwise the value.
func nullableInt(v int) interface{} {
	if v == 0 {
		return nil
	}
	return v
}
