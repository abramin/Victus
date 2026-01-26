package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"victus/internal/domain"
)

// ErrDailyLogNotFound is returned when no daily log exists for the given date.
var ErrDailyLogNotFound = errors.New("daily log not found")

// ErrDailyLogAlreadyExists is returned when a daily log already exists for the date.
var ErrDailyLogAlreadyExists = errors.New("daily log already exists")

// ErrInsufficientData is returned when there is not enough data to perform the operation.
var ErrInsufficientData = errors.New("insufficient data")

// DailyLogStore handles database operations for daily logs.
type DailyLogStore struct {
	db *sql.DB
}

// NewDailyLogStore creates a new DailyLogStore.
func NewDailyLogStore(db *sql.DB) *DailyLogStore {
	return &DailyLogStore{db: db}
}

// WithTx executes fn within a transaction.
func (s *DailyLogStore) WithTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return nil
}

// GetByDate retrieves a daily log by date (YYYY-MM-DD format).
// Returns ErrDailyLogNotFound if no log exists for that date.
// Note: PlannedSessions is NOT populated by this method. Use the service layer
// which combines this with TrainingSessionStore.GetByLogID.
func (s *DailyLogStore) GetByDate(ctx context.Context, date string) (*domain.DailyLog, error) {
	const query = `
		SELECT
			id, log_date, weight_kg, body_fat_percent, resting_heart_rate, hrv_ms,
			sleep_quality, sleep_hours,
			COALESCE(total_carbs_g, 0), COALESCE(total_protein_g, 0), COALESCE(total_fats_g, 0), COALESCE(total_calories, 0),
			COALESCE(breakfast_carb_points, 0), COALESCE(breakfast_protein_points, 0), COALESCE(breakfast_fat_points, 0),
			COALESCE(lunch_carb_points, 0), COALESCE(lunch_protein_points, 0), COALESCE(lunch_fat_points, 0),
			COALESCE(dinner_carb_points, 0), COALESCE(dinner_protein_points, 0), COALESCE(dinner_fat_points, 0),
			COALESCE(fruit_g, 0), COALESCE(veggies_g, 0), COALESCE(water_l, 0), COALESCE(day_type, 'fatburner'),
			COALESCE(estimated_tdee, 0), COALESCE(formula_tdee, 0),
			COALESCE(tdee_source_used, 'formula'), COALESCE(tdee_confidence, 0), COALESCE(data_points_used, 0),
			active_calories_burned, steps, COALESCE(notes, ''),
			fasting_override, COALESCE(fasted_items_kcal, 0),
			COALESCE(consumed_calories, 0), COALESCE(consumed_protein_g, 0),
			COALESCE(consumed_carbs_g, 0), COALESCE(consumed_fat_g, 0),
			COALESCE(breakfast_consumed_kcal, 0), COALESCE(breakfast_consumed_protein_g, 0),
			COALESCE(breakfast_consumed_carbs_g, 0), COALESCE(breakfast_consumed_fat_g, 0),
			COALESCE(lunch_consumed_kcal, 0), COALESCE(lunch_consumed_protein_g, 0),
			COALESCE(lunch_consumed_carbs_g, 0), COALESCE(lunch_consumed_fat_g, 0),
			COALESCE(dinner_consumed_kcal, 0), COALESCE(dinner_consumed_protein_g, 0),
			COALESCE(dinner_consumed_carbs_g, 0), COALESCE(dinner_consumed_fat_g, 0),
			created_at, updated_at
		FROM daily_logs
		WHERE log_date = ?
	`

	var (
		log                  domain.DailyLog
		bodyFatPercent       sql.NullFloat64
		heartRate            sql.NullInt64
		hrvMs                sql.NullInt64
		sleepHours           sql.NullFloat64
		activeCaloriesBurned sql.NullInt64
		steps                sql.NullInt64
		fastingOverride      sql.NullString
		createdAt            string
		updatedAt            string
	)

	err := s.db.QueryRowContext(ctx, query, date).Scan(
		&log.ID, &log.Date, &log.WeightKg, &bodyFatPercent, &heartRate, &hrvMs,
		&log.SleepQuality, &sleepHours,
		&log.CalculatedTargets.TotalCarbsG, &log.CalculatedTargets.TotalProteinG,
		&log.CalculatedTargets.TotalFatsG, &log.CalculatedTargets.TotalCalories,
		&log.CalculatedTargets.Meals.Breakfast.Carbs, &log.CalculatedTargets.Meals.Breakfast.Protein,
		&log.CalculatedTargets.Meals.Breakfast.Fats,
		&log.CalculatedTargets.Meals.Lunch.Carbs, &log.CalculatedTargets.Meals.Lunch.Protein,
		&log.CalculatedTargets.Meals.Lunch.Fats,
		&log.CalculatedTargets.Meals.Dinner.Carbs, &log.CalculatedTargets.Meals.Dinner.Protein,
		&log.CalculatedTargets.Meals.Dinner.Fats,
		&log.CalculatedTargets.FruitG, &log.CalculatedTargets.VeggiesG,
		&log.CalculatedTargets.WaterL, &log.CalculatedTargets.DayType,
		&log.EstimatedTDEE, &log.FormulaTDEE,
		&log.TDEESourceUsed, &log.TDEEConfidence, &log.DataPointsUsed,
		&activeCaloriesBurned, &steps, &log.Notes,
		&fastingOverride, &log.FastedItemsKcal,
		&log.ConsumedCalories, &log.ConsumedProteinG,
		&log.ConsumedCarbsG, &log.ConsumedFatG,
		&log.MealConsumed.Breakfast.Calories, &log.MealConsumed.Breakfast.ProteinG,
		&log.MealConsumed.Breakfast.CarbsG, &log.MealConsumed.Breakfast.FatG,
		&log.MealConsumed.Lunch.Calories, &log.MealConsumed.Lunch.ProteinG,
		&log.MealConsumed.Lunch.CarbsG, &log.MealConsumed.Lunch.FatG,
		&log.MealConsumed.Dinner.Calories, &log.MealConsumed.Dinner.ProteinG,
		&log.MealConsumed.Dinner.CarbsG, &log.MealConsumed.Dinner.FatG,
		&createdAt, &updatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrDailyLogNotFound
	}
	if err != nil {
		return nil, err
	}

	// Handle nullable fields
	if bodyFatPercent.Valid {
		log.BodyFatPercent = &bodyFatPercent.Float64
	}
	if heartRate.Valid {
		hr := int(heartRate.Int64)
		log.RestingHeartRate = &hr
	}
	if hrvMs.Valid {
		hrv := int(hrvMs.Int64)
		log.HRVMs = &hrv
	}
	if sleepHours.Valid {
		log.SleepHours = &sleepHours.Float64
	}
	if activeCaloriesBurned.Valid {
		acb := int(activeCaloriesBurned.Int64)
		log.ActiveCaloriesBurned = &acb
	}
	if steps.Valid {
		s := int(steps.Int64)
		log.Steps = &s
	}
	if fastingOverride.Valid {
		fp := domain.FastingProtocol(fastingOverride.String)
		log.FastingOverride = &fp
	}

	// Parse timestamps
	log.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	log.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

	// Set log.DayType from calculated targets (they should match)
	log.DayType = log.CalculatedTargets.DayType
	log.CalculatedTargets.EstimatedTDEE = log.EstimatedTDEE

	return &log, nil
}

// GetIDByDate returns the log ID for a given date.
// Returns ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogStore) GetIDByDate(ctx context.Context, date string) (int64, error) {
	var id int64
	err := s.db.QueryRowContext(ctx, "SELECT id FROM daily_logs WHERE log_date = ?", date).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrDailyLogNotFound
	}
	return id, err
}

// Create inserts a new daily log and returns the inserted ID.
// Returns an error if a log already exists for that date.
// Note: Training sessions are stored separately via TrainingSessionStore.
func (s *DailyLogStore) Create(ctx context.Context, log *domain.DailyLog) (int64, error) {
	return s.create(ctx, s.db, log)
}

// CreateWithTx inserts a new daily log within an existing transaction.
func (s *DailyLogStore) CreateWithTx(ctx context.Context, tx *sql.Tx, log *domain.DailyLog) (int64, error) {
	return s.create(ctx, tx, log)
}

func (s *DailyLogStore) create(ctx context.Context, execer sqlExecer, log *domain.DailyLog) (int64, error) {
	const query = `
		INSERT INTO daily_logs (
			log_date, weight_kg, body_fat_percent, resting_heart_rate, hrv_ms,
			sleep_quality, sleep_hours,
			planned_training_type, planned_duration_min,
			total_carbs_g, total_protein_g, total_fats_g, total_calories,
			breakfast_carb_points, breakfast_protein_points, breakfast_fat_points,
			lunch_carb_points, lunch_protein_points, lunch_fat_points,
			dinner_carb_points, dinner_protein_points, dinner_fat_points,
			fruit_g, veggies_g, water_l, day_type, estimated_tdee, formula_tdee,
			tdee_source_used, tdee_confidence, data_points_used, notes,
			created_at, updated_at
		) VALUES (
			?, ?, ?, ?, ?,
			?, ?,
			'rest', 0,
			?, ?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?, ?, ?, ?,
			?, ?, ?, ?,
			datetime('now'), datetime('now')
		)
	`

	// Handle nullable fields
	var bodyFatPercent, sleepHours interface{}
	var heartRate, hrvMs interface{}

	if log.BodyFatPercent != nil {
		bodyFatPercent = *log.BodyFatPercent
	}
	if log.RestingHeartRate != nil {
		heartRate = *log.RestingHeartRate
	}
	if log.HRVMs != nil {
		hrvMs = *log.HRVMs
	}
	if log.SleepHours != nil {
		sleepHours = *log.SleepHours
	}

	result, err := execer.ExecContext(ctx, query,
		log.Date, log.WeightKg, bodyFatPercent, heartRate, hrvMs,
		log.SleepQuality, sleepHours,
		// planned_training_type and planned_duration_min use default values ('rest', 0)
		// Training sessions are stored in the training_sessions table
		log.CalculatedTargets.TotalCarbsG, log.CalculatedTargets.TotalProteinG,
		log.CalculatedTargets.TotalFatsG, log.CalculatedTargets.TotalCalories,
		log.CalculatedTargets.Meals.Breakfast.Carbs, log.CalculatedTargets.Meals.Breakfast.Protein,
		log.CalculatedTargets.Meals.Breakfast.Fats,
		log.CalculatedTargets.Meals.Lunch.Carbs, log.CalculatedTargets.Meals.Lunch.Protein,
		log.CalculatedTargets.Meals.Lunch.Fats,
		log.CalculatedTargets.Meals.Dinner.Carbs, log.CalculatedTargets.Meals.Dinner.Protein,
		log.CalculatedTargets.Meals.Dinner.Fats,
		log.CalculatedTargets.FruitG, log.CalculatedTargets.VeggiesG,
		log.CalculatedTargets.WaterL, log.DayType,
		log.EstimatedTDEE, log.FormulaTDEE,
		log.TDEESourceUsed, log.TDEEConfidence, log.DataPointsUsed, log.Notes,
	)
	if err != nil {
		if isUniqueConstraint(err) {
			return 0, ErrDailyLogAlreadyExists
		}
		return 0, err
	}

	return result.LastInsertId()
}

// DeleteByDate removes the daily log for the given date.
func (s *DailyLogStore) DeleteByDate(ctx context.Context, date string) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM daily_logs WHERE log_date = ?", date)
	return err
}

// ListWeights returns weight samples ordered by date.
// If startDate is empty, all samples are returned.
func (s *DailyLogStore) ListWeights(ctx context.Context, startDate string) ([]domain.WeightSample, error) {
	query := "SELECT log_date, weight_kg FROM daily_logs"
	var args []interface{}
	if startDate != "" {
		query += " WHERE log_date >= ?"
		args = append(args, startDate)
	}
	query += " ORDER BY log_date ASC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var samples []domain.WeightSample
	for rows.Next() {
		var sample domain.WeightSample
		if err := rows.Scan(&sample.Date, &sample.WeightKg); err != nil {
			return nil, err
		}
		samples = append(samples, sample)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return samples, nil
}

// ListHistoryPoints returns history points ordered by date.
// If startDate is empty, all samples are returned.
func (s *DailyLogStore) ListHistoryPoints(ctx context.Context, startDate string) ([]domain.HistoryPoint, error) {
	query := `
		SELECT log_date, weight_kg, COALESCE(estimated_tdee, 0), COALESCE(tdee_confidence, 0),
			body_fat_percent, resting_heart_rate, sleep_hours
		FROM daily_logs
	`
	var args []interface{}
	if startDate != "" {
		query += " WHERE log_date >= ?"
		args = append(args, startDate)
	}
	query += " ORDER BY log_date ASC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []domain.HistoryPoint
	for rows.Next() {
		var point domain.HistoryPoint
		var bodyFatPercent sql.NullFloat64
		var restingHeartRate sql.NullInt64
		var sleepHours sql.NullFloat64
		if err := rows.Scan(
			&point.Date,
			&point.WeightKg,
			&point.EstimatedTDEE,
			&point.TDEEConfidence,
			&bodyFatPercent,
			&restingHeartRate,
			&sleepHours,
		); err != nil {
			return nil, err
		}
		if bodyFatPercent.Valid {
			point.BodyFatPercent = &bodyFatPercent.Float64
		}
		if restingHeartRate.Valid {
			rhr := int(restingHeartRate.Int64)
			point.RestingHeartRate = &rhr
		}
		if sleepHours.Valid {
			point.SleepHours = &sleepHours.Float64
		}
		points = append(points, point)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return points, nil
}

// ListDailyTargets returns calculated targets for logs in a date range, ordered by date.
func (s *DailyLogStore) ListDailyTargets(ctx context.Context, startDate, endDate string) ([]domain.DailyTargetsPoint, error) {
	const query = `
		SELECT
			log_date,
			COALESCE(total_carbs_g, 0), COALESCE(total_protein_g, 0), COALESCE(total_fats_g, 0), COALESCE(total_calories, 0),
			COALESCE(breakfast_carb_points, 0), COALESCE(breakfast_protein_points, 0), COALESCE(breakfast_fat_points, 0),
			COALESCE(lunch_carb_points, 0), COALESCE(lunch_protein_points, 0), COALESCE(lunch_fat_points, 0),
			COALESCE(dinner_carb_points, 0), COALESCE(dinner_protein_points, 0), COALESCE(dinner_fat_points, 0),
			COALESCE(fruit_g, 0), COALESCE(veggies_g, 0), COALESCE(water_l, 0), COALESCE(day_type, 'fatburner'),
			COALESCE(estimated_tdee, 0),
			active_calories_burned
		FROM daily_logs
		WHERE log_date >= ? AND log_date <= ?
		ORDER BY log_date ASC
	`

	rows, err := s.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []domain.DailyTargetsPoint
	for rows.Next() {
		var point domain.DailyTargetsPoint
		var activeCaloriesBurned sql.NullInt64
		if err := rows.Scan(
			&point.Date,
			&point.Targets.TotalCarbsG, &point.Targets.TotalProteinG,
			&point.Targets.TotalFatsG, &point.Targets.TotalCalories,
			&point.Targets.Meals.Breakfast.Carbs, &point.Targets.Meals.Breakfast.Protein,
			&point.Targets.Meals.Breakfast.Fats,
			&point.Targets.Meals.Lunch.Carbs, &point.Targets.Meals.Lunch.Protein,
			&point.Targets.Meals.Lunch.Fats,
			&point.Targets.Meals.Dinner.Carbs, &point.Targets.Meals.Dinner.Protein,
			&point.Targets.Meals.Dinner.Fats,
			&point.Targets.FruitG, &point.Targets.VeggiesG, &point.Targets.WaterL,
			&point.Targets.DayType,
			&point.Targets.EstimatedTDEE,
			&activeCaloriesBurned,
		); err != nil {
			return nil, err
		}
		if activeCaloriesBurned.Valid {
			acb := int(activeCaloriesBurned.Int64)
			point.ActiveCaloriesBurned = &acb
		}
		points = append(points, point)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return points, nil
}

// ListAdaptiveDataPoints returns historical data for adaptive TDEE calculation.
// Returns data points ordered by date (oldest first) for the specified lookback period.
func (s *DailyLogStore) ListAdaptiveDataPoints(ctx context.Context, endDate string, maxDays int) ([]domain.AdaptiveDataPoint, error) {
	const query = `
		SELECT log_date, weight_kg, total_calories, COALESCE(estimated_tdee, 0), COALESCE(formula_tdee, 0)
		FROM daily_logs
		WHERE log_date <= ?
		  AND total_calories > 0
		ORDER BY log_date DESC
		LIMIT ?
	`

	rows, err := s.db.QueryContext(ctx, query, endDate, maxDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []domain.AdaptiveDataPoint
	for rows.Next() {
		var point domain.AdaptiveDataPoint
		if err := rows.Scan(
			&point.Date,
			&point.WeightKg,
			&point.TargetCalories,
			&point.EstimatedTDEE,
			&point.FormulaTDEE,
		); err != nil {
			return nil, err
		}
		points = append(points, point)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Reverse to get oldest first (needed for adaptive calculation)
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}

	return points, nil
}

// RecoveryDataPoint contains data needed for recovery score calculation.
type RecoveryDataPoint struct {
	Date         string
	SleepQuality int
}

// UpdateActiveCaloriesBurned updates only the active_calories_burned field for a given date.
// Returns ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogStore) UpdateActiveCaloriesBurned(ctx context.Context, date string, calories *int) error {
	const query = `
		UPDATE daily_logs
		SET active_calories_burned = ?, updated_at = datetime('now')
		WHERE log_date = ?
	`

	var caloriesVal interface{}
	if calories != nil {
		caloriesVal = *calories
	}

	result, err := s.db.ExecContext(ctx, query, caloriesVal, date)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDailyLogNotFound
	}

	return nil
}

// GetRecentBodyFat returns the most recent body fat measurement within the lookback period.
// Returns nil values if no body fat data exists within the period.
// The beforeDate is exclusive (looks for data before this date).
func (s *DailyLogStore) GetRecentBodyFat(ctx context.Context, beforeDate string, lookbackDays int) (*float64, *string, error) {
	const query = `
		SELECT body_fat_percent, log_date
		FROM daily_logs
		WHERE log_date < ?
		  AND body_fat_percent IS NOT NULL
		ORDER BY log_date DESC
		LIMIT 1
	`

	var bodyFat float64
	var date string

	err := s.db.QueryRowContext(ctx, query, beforeDate).Scan(&bodyFat, &date)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}

	// Check if the date is within the lookback period
	beforeDateParsed, err := time.Parse("2006-01-02", beforeDate)
	if err != nil {
		return nil, nil, err
	}
	dateParsed, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, nil, err
	}

	daysDiff := int(beforeDateParsed.Sub(dateParsed).Hours() / 24)
	if daysDiff > lookbackDays {
		// Body fat data is too old
		return nil, nil, nil
	}

	return &bodyFat, &date, nil
}

// GetRecoveryData returns sleep quality data for the last N days before (and including) endDate.
// Results are ordered by date ascending (oldest first).
func (s *DailyLogStore) GetRecoveryData(ctx context.Context, endDate string, days int) ([]RecoveryDataPoint, error) {
	const query = `
		SELECT log_date, sleep_quality
		FROM daily_logs
		WHERE log_date <= ?
		ORDER BY log_date DESC
		LIMIT ?
	`

	rows, err := s.db.QueryContext(ctx, query, endDate, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []RecoveryDataPoint
	for rows.Next() {
		var point RecoveryDataPoint
		if err := rows.Scan(&point.Date, &point.SleepQuality); err != nil {
			return nil, err
		}
		points = append(points, point)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Reverse to get oldest first
	for i, j := 0, len(points)-1; i < j; i, j = i+1, j-1 {
		points[i], points[j] = points[j], points[i]
	}

	return points, nil
}

// GetRHRAverage returns the average resting heart rate over the specified number of days.
// The beforeDate is exclusive - it looks at data before this date.
// Returns nil if no RHR data exists within the period.
func (s *DailyLogStore) GetRHRAverage(ctx context.Context, beforeDate string, days int) (*float64, error) {
	const query = `
		SELECT AVG(resting_heart_rate)
		FROM daily_logs
		WHERE log_date < ?
		  AND resting_heart_rate IS NOT NULL
		ORDER BY log_date DESC
		LIMIT ?
	`

	// SQLite doesn't support LIMIT in AVG subquery directly, so we use a subquery
	const avgQuery = `
		SELECT AVG(rhr) FROM (
			SELECT resting_heart_rate as rhr
			FROM daily_logs
			WHERE log_date < ?
			  AND resting_heart_rate IS NOT NULL
			ORDER BY log_date DESC
			LIMIT ?
		)
	`

	var avg sql.NullFloat64
	err := s.db.QueryRowContext(ctx, avgQuery, beforeDate, days).Scan(&avg)
	if err != nil {
		return nil, err
	}

	if !avg.Valid {
		return nil, nil
	}

	return &avg.Float64, nil
}

// GetHRVHistory returns HRV values for the last N days before (not including) the given date.
// Results are ordered by date descending (newest first).
// Only returns non-null HRV values.
func (s *DailyLogStore) GetHRVHistory(ctx context.Context, beforeDate string, days int) ([]int, error) {
	const query = `
		SELECT hrv_ms
		FROM daily_logs
		WHERE log_date < ?
		  AND hrv_ms IS NOT NULL
		ORDER BY log_date DESC
		LIMIT ?
	`

	rows, err := s.db.QueryContext(ctx, query, beforeDate, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hrvValues []int
	for rows.Next() {
		var hrv int
		if err := rows.Scan(&hrv); err != nil {
			return nil, err
		}
		hrvValues = append(hrvValues, hrv)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Reverse to get oldest first (for baseline calculation)
	for i, j := 0, len(hrvValues)-1; i < j; i, j = i+1, j-1 {
		hrvValues[i], hrvValues[j] = hrvValues[j], hrvValues[i]
	}

	return hrvValues, nil
}

// UpdateFastingOverride updates the fasting override for a given date.
// Pass nil to clear the override (revert to profile default).
// Returns ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogStore) UpdateFastingOverride(ctx context.Context, date string, override *string) error {
	const query = `
		UPDATE daily_logs
		SET fasting_override = ?, updated_at = datetime('now')
		WHERE log_date = ?
	`

	result, err := s.db.ExecContext(ctx, query, override, date)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDailyLogNotFound
	}

	return nil
}

// UpdateFastedItemsKcal updates the fasted items kcal for a given date.
// Returns ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogStore) UpdateFastedItemsKcal(ctx context.Context, date string, kcal int) error {
	const query = `
		UPDATE daily_logs
		SET fasted_items_kcal = ?, updated_at = datetime('now')
		WHERE log_date = ?
	`

	result, err := s.db.ExecContext(ctx, query, kcal, date)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDailyLogNotFound
	}

	return nil
}

// ConsumedMacros represents the macros to add to the daily log.
// Meal is optional - if provided, also updates per-meal columns.
type ConsumedMacros struct {
	Meal     *domain.MealName // Optional: "breakfast", "lunch", or "dinner"
	Calories int
	ProteinG int
	CarbsG   int
	FatG     int
}

// AddConsumedMacros adds consumed macros to the existing totals for a given date.
// This is additive - it increments the existing values rather than replacing them.
// If Meal is specified, also updates the per-meal columns.
// Returns ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogStore) AddConsumedMacros(ctx context.Context, date string, macros ConsumedMacros) error {
	// Always update aggregate totals
	baseQuery := `
		UPDATE daily_logs
		SET consumed_calories = COALESCE(consumed_calories, 0) + ?,
		    consumed_protein_g = COALESCE(consumed_protein_g, 0) + ?,
		    consumed_carbs_g = COALESCE(consumed_carbs_g, 0) + ?,
		    consumed_fat_g = COALESCE(consumed_fat_g, 0) + ?`

	// If meal specified, also update per-meal columns
	if macros.Meal != nil {
		mealPrefix := string(*macros.Meal)
		baseQuery += fmt.Sprintf(`,
		    %s_consumed_kcal = COALESCE(%s_consumed_kcal, 0) + ?,
		    %s_consumed_protein_g = COALESCE(%s_consumed_protein_g, 0) + ?,
		    %s_consumed_carbs_g = COALESCE(%s_consumed_carbs_g, 0) + ?,
		    %s_consumed_fat_g = COALESCE(%s_consumed_fat_g, 0) + ?`,
			mealPrefix, mealPrefix, mealPrefix, mealPrefix,
			mealPrefix, mealPrefix, mealPrefix, mealPrefix)
	}

	baseQuery += `,
		    updated_at = datetime('now')
		WHERE log_date = ?`

	var args []interface{}
	args = append(args, macros.Calories, macros.ProteinG, macros.CarbsG, macros.FatG)
	if macros.Meal != nil {
		args = append(args, macros.Calories, macros.ProteinG, macros.CarbsG, macros.FatG)
	}
	args = append(args, date)

	result, err := s.db.ExecContext(ctx, baseQuery, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDailyLogNotFound
	}

	return nil
}

// HealthKitMetrics represents health data synced from HealthKit.
// All fields are optional - only non-nil values will be updated.
type HealthKitMetrics struct {
	Steps                *int
	ActiveCaloriesBurned *int
	RestingHeartRate     *int
	SleepHours           *float64
	WeightKg             *float64
	BodyFatPercent       *float64
}

// ErrWeightRequired is returned when trying to create a new log without weight.
var ErrWeightRequired = errors.New("weight is required to create a new daily log")

// UpsertHealthKitMetrics creates or updates a daily log with HealthKit data.
// If a log exists for the date, only non-nil fields are updated.
// If no log exists, a new minimal log is created with defaults.
// Weight is required to create a new log; returns ErrWeightRequired if missing.
func (s *DailyLogStore) UpsertHealthKitMetrics(ctx context.Context, date string, metrics HealthKitMetrics) error {
	// Check if log exists
	_, err := s.GetIDByDate(ctx, date)
	if err != nil && !errors.Is(err, ErrDailyLogNotFound) {
		return err
	}

	logExists := err == nil

	if logExists {
		// Update existing log with provided metrics
		return s.updateHealthKitMetrics(ctx, date, metrics)
	}

	// Create new log - weight is required
	if metrics.WeightKg == nil {
		return ErrWeightRequired
	}

	return s.createMinimalLog(ctx, date, metrics)
}

// updateHealthKitMetrics updates only the non-nil fields for an existing log.
func (s *DailyLogStore) updateHealthKitMetrics(ctx context.Context, date string, metrics HealthKitMetrics) error {
	// Build dynamic update query based on which fields are provided
	var setClauses []string
	var args []interface{}

	if metrics.Steps != nil {
		setClauses = append(setClauses, "steps = ?")
		args = append(args, *metrics.Steps)
	}
	if metrics.ActiveCaloriesBurned != nil {
		setClauses = append(setClauses, "active_calories_burned = ?")
		args = append(args, *metrics.ActiveCaloriesBurned)
	}
	if metrics.RestingHeartRate != nil {
		setClauses = append(setClauses, "resting_heart_rate = ?")
		args = append(args, *metrics.RestingHeartRate)
	}
	if metrics.SleepHours != nil {
		setClauses = append(setClauses, "sleep_hours = ?")
		args = append(args, *metrics.SleepHours)
	}
	if metrics.WeightKg != nil {
		setClauses = append(setClauses, "weight_kg = ?")
		args = append(args, *metrics.WeightKg)
	}
	if metrics.BodyFatPercent != nil {
		setClauses = append(setClauses, "body_fat_percent = ?")
		args = append(args, *metrics.BodyFatPercent)
	}

	if len(setClauses) == 0 {
		// Nothing to update
		return nil
	}

	// Always update updated_at
	setClauses = append(setClauses, "updated_at = datetime('now')")

	query := fmt.Sprintf("UPDATE daily_logs SET %s WHERE log_date = ?",
		strings.Join(setClauses, ", "))
	args = append(args, date)

	result, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDailyLogNotFound
	}

	return nil
}

// createMinimalLog creates a new daily log with HealthKit data and defaults.
// Weight is required; other fields use HealthKit values or defaults.
func (s *DailyLogStore) createMinimalLog(ctx context.Context, date string, metrics HealthKitMetrics) error {
	const query = `
		INSERT INTO daily_logs (
			log_date, weight_kg, body_fat_percent, resting_heart_rate,
			sleep_quality, sleep_hours,
			planned_training_type, planned_duration_min,
			day_type, active_calories_burned, steps,
			created_at, updated_at
		) VALUES (
			?, ?, ?, ?,
			50, ?,
			'rest', 0,
			'fatburner', ?, ?,
			datetime('now'), datetime('now')
		)
	`

	// Handle nullable fields
	var bodyFatPercent, sleepHours, activeCaloriesBurned, steps, heartRate interface{}

	if metrics.BodyFatPercent != nil {
		bodyFatPercent = *metrics.BodyFatPercent
	}
	if metrics.SleepHours != nil {
		sleepHours = *metrics.SleepHours
	}
	if metrics.ActiveCaloriesBurned != nil {
		activeCaloriesBurned = *metrics.ActiveCaloriesBurned
	}
	if metrics.Steps != nil {
		steps = *metrics.Steps
	}
	if metrics.RestingHeartRate != nil {
		heartRate = *metrics.RestingHeartRate
	}

	_, err := s.db.ExecContext(ctx, query,
		date, *metrics.WeightKg, bodyFatPercent, heartRate,
		sleepHours,
		activeCaloriesBurned, steps,
	)
	if err != nil {
		if isUniqueConstraint(err) {
			return ErrDailyLogAlreadyExists
		}
		return err
	}

	return nil
}

// ListByDateRange returns all daily logs within a date range (inclusive), ordered by date.
// Note: PlannedSessions and ActualSessions are NOT populated by this method.
// Use the service layer which combines this with TrainingSessionStore.
func (s *DailyLogStore) ListByDateRange(ctx context.Context, startDate, endDate string) ([]domain.DailyLog, error) {
	const query = `
		SELECT
			id, log_date, weight_kg, body_fat_percent, resting_heart_rate, hrv_ms,
			sleep_quality, sleep_hours,
			COALESCE(total_carbs_g, 0), COALESCE(total_protein_g, 0), COALESCE(total_fats_g, 0), COALESCE(total_calories, 0),
			COALESCE(breakfast_carb_points, 0), COALESCE(breakfast_protein_points, 0), COALESCE(breakfast_fat_points, 0),
			COALESCE(lunch_carb_points, 0), COALESCE(lunch_protein_points, 0), COALESCE(lunch_fat_points, 0),
			COALESCE(dinner_carb_points, 0), COALESCE(dinner_protein_points, 0), COALESCE(dinner_fat_points, 0),
			COALESCE(fruit_g, 0), COALESCE(veggies_g, 0), COALESCE(water_l, 0), COALESCE(day_type, 'fatburner'),
			COALESCE(estimated_tdee, 0), COALESCE(formula_tdee, 0),
			COALESCE(tdee_source_used, 'formula'), COALESCE(tdee_confidence, 0), COALESCE(data_points_used, 0),
			active_calories_burned, steps, COALESCE(notes, ''),
			fasting_override, COALESCE(fasted_items_kcal, 0),
			COALESCE(consumed_calories, 0), COALESCE(consumed_protein_g, 0),
			COALESCE(consumed_carbs_g, 0), COALESCE(consumed_fat_g, 0),
			COALESCE(breakfast_consumed_kcal, 0), COALESCE(breakfast_consumed_protein_g, 0),
			COALESCE(breakfast_consumed_carbs_g, 0), COALESCE(breakfast_consumed_fat_g, 0),
			COALESCE(lunch_consumed_kcal, 0), COALESCE(lunch_consumed_protein_g, 0),
			COALESCE(lunch_consumed_carbs_g, 0), COALESCE(lunch_consumed_fat_g, 0),
			COALESCE(dinner_consumed_kcal, 0), COALESCE(dinner_consumed_protein_g, 0),
			COALESCE(dinner_consumed_carbs_g, 0), COALESCE(dinner_consumed_fat_g, 0),
			created_at, updated_at
		FROM daily_logs
		WHERE log_date >= ? AND log_date <= ?
		ORDER BY log_date ASC
	`

	rows, err := s.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []domain.DailyLog
	for rows.Next() {
		var (
			log                  domain.DailyLog
			bodyFatPercent       sql.NullFloat64
			heartRate            sql.NullInt64
			hrvMs                sql.NullInt64
			sleepHours           sql.NullFloat64
			activeCaloriesBurned sql.NullInt64
			stepsVal             sql.NullInt64
			fastingOverride      sql.NullString
			createdAt            string
			updatedAt            string
		)

		if err := rows.Scan(
			&log.ID, &log.Date, &log.WeightKg, &bodyFatPercent, &heartRate, &hrvMs,
			&log.SleepQuality, &sleepHours,
			&log.CalculatedTargets.TotalCarbsG, &log.CalculatedTargets.TotalProteinG,
			&log.CalculatedTargets.TotalFatsG, &log.CalculatedTargets.TotalCalories,
			&log.CalculatedTargets.Meals.Breakfast.Carbs, &log.CalculatedTargets.Meals.Breakfast.Protein,
			&log.CalculatedTargets.Meals.Breakfast.Fats,
			&log.CalculatedTargets.Meals.Lunch.Carbs, &log.CalculatedTargets.Meals.Lunch.Protein,
			&log.CalculatedTargets.Meals.Lunch.Fats,
			&log.CalculatedTargets.Meals.Dinner.Carbs, &log.CalculatedTargets.Meals.Dinner.Protein,
			&log.CalculatedTargets.Meals.Dinner.Fats,
			&log.CalculatedTargets.FruitG, &log.CalculatedTargets.VeggiesG,
			&log.CalculatedTargets.WaterL, &log.CalculatedTargets.DayType,
			&log.EstimatedTDEE, &log.FormulaTDEE,
			&log.TDEESourceUsed, &log.TDEEConfidence, &log.DataPointsUsed,
			&activeCaloriesBurned, &stepsVal, &log.Notes,
			&fastingOverride, &log.FastedItemsKcal,
			&log.ConsumedCalories, &log.ConsumedProteinG,
			&log.ConsumedCarbsG, &log.ConsumedFatG,
			&log.MealConsumed.Breakfast.Calories, &log.MealConsumed.Breakfast.ProteinG,
			&log.MealConsumed.Breakfast.CarbsG, &log.MealConsumed.Breakfast.FatG,
			&log.MealConsumed.Lunch.Calories, &log.MealConsumed.Lunch.ProteinG,
			&log.MealConsumed.Lunch.CarbsG, &log.MealConsumed.Lunch.FatG,
			&log.MealConsumed.Dinner.Calories, &log.MealConsumed.Dinner.ProteinG,
			&log.MealConsumed.Dinner.CarbsG, &log.MealConsumed.Dinner.FatG,
			&createdAt, &updatedAt,
		); err != nil {
			return nil, err
		}

		// Handle nullable fields
		if bodyFatPercent.Valid {
			log.BodyFatPercent = &bodyFatPercent.Float64
		}
		if heartRate.Valid {
			hr := int(heartRate.Int64)
			log.RestingHeartRate = &hr
		}
		if hrvMs.Valid {
			hrv := int(hrvMs.Int64)
			log.HRVMs = &hrv
		}
		if sleepHours.Valid {
			log.SleepHours = &sleepHours.Float64
		}
		if activeCaloriesBurned.Valid {
			acb := int(activeCaloriesBurned.Int64)
			log.ActiveCaloriesBurned = &acb
		}
		if stepsVal.Valid {
			st := int(stepsVal.Int64)
			log.Steps = &st
		}
		if fastingOverride.Valid {
			fp := domain.FastingProtocol(fastingOverride.String)
			log.FastingOverride = &fp
		}

		// Parse timestamps
		log.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		log.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

		// Set log.DayType from calculated targets
		log.DayType = log.CalculatedTargets.DayType
		log.CalculatedTargets.EstimatedTDEE = log.EstimatedTDEE

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return logs, nil
}
