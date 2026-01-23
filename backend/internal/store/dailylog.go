package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"victus/internal/domain"
)

// ErrDailyLogNotFound is returned when no daily log exists for the given date.
var ErrDailyLogNotFound = errors.New("daily log not found")

// ErrDailyLogAlreadyExists is returned when a daily log already exists for the date.
var ErrDailyLogAlreadyExists = errors.New("daily log already exists")

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
			id, log_date, weight_kg, body_fat_percent, resting_heart_rate,
			sleep_quality, sleep_hours,
			COALESCE(total_carbs_g, 0), COALESCE(total_protein_g, 0), COALESCE(total_fats_g, 0), COALESCE(total_calories, 0),
			COALESCE(breakfast_carb_points, 0), COALESCE(breakfast_protein_points, 0), COALESCE(breakfast_fat_points, 0),
			COALESCE(lunch_carb_points, 0), COALESCE(lunch_protein_points, 0), COALESCE(lunch_fat_points, 0),
			COALESCE(dinner_carb_points, 0), COALESCE(dinner_protein_points, 0), COALESCE(dinner_fat_points, 0),
			COALESCE(fruit_g, 0), COALESCE(veggies_g, 0), COALESCE(water_l, 0), COALESCE(day_type, 'fatburner'),
			COALESCE(estimated_tdee, 0), COALESCE(formula_tdee, 0),
			COALESCE(tdee_source_used, 'formula'), COALESCE(tdee_confidence, 0), COALESCE(data_points_used, 0),
			created_at, updated_at
		FROM daily_logs
		WHERE log_date = ?
	`

	var (
		log            domain.DailyLog
		bodyFatPercent sql.NullFloat64
		heartRate      sql.NullInt64
		sleepHours     sql.NullFloat64
		createdAt      string
		updatedAt      string
	)

	err := s.db.QueryRowContext(ctx, query, date).Scan(
		&log.ID, &log.Date, &log.WeightKg, &bodyFatPercent, &heartRate,
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
	if sleepHours.Valid {
		log.SleepHours = &sleepHours.Float64
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
			log_date, weight_kg, body_fat_percent, resting_heart_rate,
			sleep_quality, sleep_hours,
			planned_training_type, planned_duration_min,
			total_carbs_g, total_protein_g, total_fats_g, total_calories,
			breakfast_carb_points, breakfast_protein_points, breakfast_fat_points,
			lunch_carb_points, lunch_protein_points, lunch_fat_points,
			dinner_carb_points, dinner_protein_points, dinner_fat_points,
			fruit_g, veggies_g, water_l, day_type, estimated_tdee, formula_tdee,
			tdee_source_used, tdee_confidence, data_points_used,
			created_at, updated_at
		) VALUES (
			?, ?, ?, ?,
			?, ?,
			'rest', 0,
			?, ?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?, ?, ?, ?,
			?, ?, ?,
			datetime('now'), datetime('now')
		)
	`

	// Handle nullable fields
	var bodyFatPercent, sleepHours interface{}
	var heartRate interface{}

	if log.BodyFatPercent != nil {
		bodyFatPercent = *log.BodyFatPercent
	}
	if log.RestingHeartRate != nil {
		heartRate = *log.RestingHeartRate
	}
	if log.SleepHours != nil {
		sleepHours = *log.SleepHours
	}

	result, err := execer.ExecContext(ctx, query,
		log.Date, log.WeightKg, bodyFatPercent, heartRate,
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
		log.TDEESourceUsed, log.TDEEConfidence, log.DataPointsUsed,
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
		SELECT log_date, weight_kg, COALESCE(estimated_tdee, 0), COALESCE(tdee_confidence, 0)
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
		if err := rows.Scan(
			&point.Date,
			&point.WeightKg,
			&point.EstimatedTDEE,
			&point.TDEEConfidence,
		); err != nil {
			return nil, err
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
			COALESCE(estimated_tdee, 0)
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
		); err != nil {
			return nil, err
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

func isUniqueConstraint(err error) bool {
	return strings.Contains(err.Error(), "UNIQUE constraint")
}

// RecoveryDataPoint contains data needed for recovery score calculation.
type RecoveryDataPoint struct {
	Date         string
	SleepQuality int
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
