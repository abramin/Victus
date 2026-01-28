package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"victus/internal/domain"
)

// ErrMetabolicHistoryNotFound is returned when no metabolic history record exists.
var ErrMetabolicHistoryNotFound = errors.New("metabolic history not found")

// MetabolicStore handles database operations for metabolic history records.
type MetabolicStore struct {
	db DBTX
}

// NewMetabolicStore creates a new MetabolicStore.
func NewMetabolicStore(db DBTX) *MetabolicStore {
	return &MetabolicStore{db: db}
}

// Create inserts a new metabolic history record.
func (s *MetabolicStore) Create(ctx context.Context, record *domain.MetabolicHistoryRecord) (int64, error) {
	const query = `
		INSERT INTO metabolic_history (
			daily_log_id, calculated_tdee, previous_tdee, delta_kcal, tdee_source,
			was_swing_constrained, bmr_floor_applied, adherence_gate_passed,
			confidence, data_points_used, ema_weight_kg, bmr_value,
			notification_pending
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`

	var id int64
	err := s.db.QueryRowContext(ctx, query,
		record.DailyLogID,
		record.CalculatedTDEE,
		record.PreviousTDEE,
		record.DeltaKcal,
		record.TDEESource,
		record.WasSwingConstrained,
		record.BMRFloorApplied,
		record.AdherenceGatePassed,
		record.Confidence,
		record.DataPointsUsed,
		record.EMAWeightKg,
		record.BMRValue,
		record.NotificationPending,
	).Scan(&id)
	if err != nil {
		return 0, err
	}

	return id, nil
}

// CreateWithTx inserts a new metabolic history record within a transaction.
func (s *MetabolicStore) CreateWithTx(ctx context.Context, tx *sql.Tx, record *domain.MetabolicHistoryRecord) (int64, error) {
	const query = `
		INSERT INTO metabolic_history (
			daily_log_id, calculated_tdee, previous_tdee, delta_kcal, tdee_source,
			was_swing_constrained, bmr_floor_applied, adherence_gate_passed,
			confidence, data_points_used, ema_weight_kg, bmr_value,
			notification_pending
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`

	var id int64
	err := tx.QueryRowContext(ctx, query,
		record.DailyLogID,
		record.CalculatedTDEE,
		record.PreviousTDEE,
		record.DeltaKcal,
		record.TDEESource,
		record.WasSwingConstrained,
		record.BMRFloorApplied,
		record.AdherenceGatePassed,
		record.Confidence,
		record.DataPointsUsed,
		record.EMAWeightKg,
		record.BMRValue,
		record.NotificationPending,
	).Scan(&id)
	if err != nil {
		return 0, err
	}

	return id, nil
}

// GetLatest returns the most recent metabolic history record.
func (s *MetabolicStore) GetLatest(ctx context.Context) (*domain.MetabolicHistoryRecord, error) {
	const query = `
		SELECT
			id, daily_log_id, calculated_at,
			calculated_tdee, previous_tdee, delta_kcal, tdee_source,
			was_swing_constrained, bmr_floor_applied, adherence_gate_passed,
			confidence, data_points_used, ema_weight_kg, bmr_value,
			notification_pending, notification_dismissed_at
		FROM metabolic_history
		ORDER BY calculated_at DESC
		LIMIT 1
	`

	record, err := s.scanRecord(s.db.QueryRowContext(ctx, query))
	if err != nil {
		return nil, err
	}
	return record, nil
}

// GetByDailyLogID returns the metabolic history record for a specific daily log.
func (s *MetabolicStore) GetByDailyLogID(ctx context.Context, dailyLogID int64) (*domain.MetabolicHistoryRecord, error) {
	const query = `
		SELECT
			id, daily_log_id, calculated_at,
			calculated_tdee, previous_tdee, delta_kcal, tdee_source,
			was_swing_constrained, bmr_floor_applied, adherence_gate_passed,
			confidence, data_points_used, ema_weight_kg, bmr_value,
			notification_pending, notification_dismissed_at
		FROM metabolic_history
		WHERE daily_log_id = $1
	`

	record, err := s.scanRecord(s.db.QueryRowContext(ctx, query, dailyLogID))
	if err != nil {
		return nil, err
	}
	return record, nil
}

// GetPendingNotification returns the pending notification if one exists.
func (s *MetabolicStore) GetPendingNotification(ctx context.Context) (*domain.FluxNotification, error) {
	const query = `
		SELECT id, calculated_tdee, previous_tdee, delta_kcal, calculated_at
		FROM metabolic_history
		WHERE notification_pending = true
		ORDER BY calculated_at DESC
		LIMIT 1
	`

	var notification domain.FluxNotification
	err := s.db.QueryRowContext(ctx, query).Scan(
		&notification.ID,
		&notification.NewTDEE,
		&notification.PreviousTDEE,
		&notification.DeltaKcal,
		&notification.CreatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil // No pending notification
	}
	if err != nil {
		return nil, err
	}

	// Generate reason based on delta
	notification.Reason = domain.GenerateNotificationReason(notification.DeltaKcal, false)

	return &notification, nil
}

// DismissNotification marks a notification as dismissed.
func (s *MetabolicStore) DismissNotification(ctx context.Context, id int64) error {
	const query = `
		UPDATE metabolic_history
		SET notification_pending = false, notification_dismissed_at = $1
		WHERE id = $2
	`

	result, err := s.db.ExecContext(ctx, query, time.Now(), id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrMetabolicHistoryNotFound
	}

	return nil
}

// ListForChart returns metabolic history data for visualization.
func (s *MetabolicStore) ListForChart(ctx context.Context, weeks int) ([]domain.FluxChartPoint, error) {
	const query = `
		SELECT
			mh.calculated_at,
			mh.calculated_tdee,
			COALESCE(dl.total_calories, 0) as average_intake,
			mh.confidence,
			mh.was_swing_constrained
		FROM metabolic_history mh
		JOIN daily_logs dl ON dl.id = mh.daily_log_id
		WHERE mh.calculated_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
		ORDER BY mh.calculated_at ASC
	`

	days := weeks * 7
	rows, err := s.db.QueryContext(ctx, query, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []domain.FluxChartPoint
	for rows.Next() {
		var point domain.FluxChartPoint
		if err := rows.Scan(
			&point.Date,
			&point.CalculatedTDEE,
			&point.AverageIntake,
			&point.Confidence,
			&point.WasConstrained,
		); err != nil {
			return nil, err
		}
		points = append(points, point)
	}

	return points, rows.Err()
}

// GetPreviousTDEE returns the most recent TDEE for swing constraint calculations.
func (s *MetabolicStore) GetPreviousTDEE(ctx context.Context) (int, error) {
	const query = `
		SELECT calculated_tdee
		FROM metabolic_history
		ORDER BY calculated_at DESC
		LIMIT 1
	`

	var tdee int
	err := s.db.QueryRowContext(ctx, query).Scan(&tdee)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil // No previous TDEE
	}
	if err != nil {
		return 0, err
	}
	return tdee, nil
}

// CountRecentLogs counts the number of daily logs in the last N days.
// Used for adherence validation.
func (s *MetabolicStore) CountRecentLogs(ctx context.Context, days int) (int, error) {
	const query = `
		SELECT COUNT(*)
		FROM daily_logs
		WHERE log_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
		AND total_calories > 0
	`

	var count int
	err := s.db.QueryRowContext(ctx, query, days).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// ListRecentWeights returns weight data for EMA calculation.
func (s *MetabolicStore) ListRecentWeights(ctx context.Context, days int) ([]domain.WeightDataPoint, error) {
	const query = `
		SELECT log_date, weight_kg
		FROM daily_logs
		WHERE log_date >= CURRENT_DATE - $1 * INTERVAL '1 day'
		ORDER BY log_date ASC
	`

	rows, err := s.db.QueryContext(ctx, query, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var weights []domain.WeightDataPoint
	for rows.Next() {
		var w domain.WeightDataPoint
		if err := rows.Scan(&w.Date, &w.WeightKg); err != nil {
			return nil, err
		}
		weights = append(weights, w)
	}

	return weights, rows.Err()
}

// scanRecord is a helper to scan a metabolic history row into a domain struct.
func (s *MetabolicStore) scanRecord(row *sql.Row) (*domain.MetabolicHistoryRecord, error) {
	var record domain.MetabolicHistoryRecord
	var previousTDEE sql.NullInt64
	var deltaKcal sql.NullInt64
	var emaWeightKg sql.NullFloat64
	var dismissedAt sql.NullString

	err := row.Scan(
		&record.ID,
		&record.DailyLogID,
		&record.CalculatedAt,
		&record.CalculatedTDEE,
		&previousTDEE,
		&deltaKcal,
		&record.TDEESource,
		&record.WasSwingConstrained,
		&record.BMRFloorApplied,
		&record.AdherenceGatePassed,
		&record.Confidence,
		&record.DataPointsUsed,
		&emaWeightKg,
		&record.BMRValue,
		&record.NotificationPending,
		&dismissedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrMetabolicHistoryNotFound
	}
	if err != nil {
		return nil, err
	}

	if previousTDEE.Valid {
		record.PreviousTDEE = int(previousTDEE.Int64)
	}
	if deltaKcal.Valid {
		record.DeltaKcal = int(deltaKcal.Int64)
	}
	if emaWeightKg.Valid {
		record.EMAWeightKg = emaWeightKg.Float64
	}
	if dismissedAt.Valid {
		record.NotificationDismissedAt = dismissedAt.String
	}

	return &record, nil
}
