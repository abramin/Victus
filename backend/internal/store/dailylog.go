package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"victus/internal/models"
)

// ErrDailyLogNotFound is returned when no daily log exists for the given date.
var ErrDailyLogNotFound = errors.New("daily log not found")

// DailyLogStore handles database operations for daily logs.
type DailyLogStore struct {
	db *sql.DB
}

// NewDailyLogStore creates a new DailyLogStore.
func NewDailyLogStore(db *sql.DB) *DailyLogStore {
	return &DailyLogStore{db: db}
}

// GetByDate retrieves a daily log by date (YYYY-MM-DD format).
// Returns ErrDailyLogNotFound if no log exists for that date.
func (s *DailyLogStore) GetByDate(ctx context.Context, date string) (*models.DailyLog, error) {
	const query = `
		SELECT
			log_date, weight_kg, body_fat_percent, resting_heart_rate,
			sleep_quality, sleep_hours,
			planned_training_type, planned_duration_min,
			total_carbs_g, total_protein_g, total_fats_g, total_calories,
			breakfast_carb_points, breakfast_protein_points, breakfast_fat_points,
			lunch_carb_points, lunch_protein_points, lunch_fat_points,
			dinner_carb_points, dinner_protein_points, dinner_fat_points,
			fruit_g, veggies_g, water_l, day_type, estimated_tdee,
			created_at, updated_at
		FROM daily_logs
		WHERE log_date = ?
	`

	var (
		log            models.DailyLog
		bodyFatPercent sql.NullFloat64
		heartRate      sql.NullInt64
		sleepHours     sql.NullFloat64
		createdAt      string
		updatedAt      string
	)

	err := s.db.QueryRowContext(ctx, query, date).Scan(
		&log.Date, &log.WeightKg, &bodyFatPercent, &heartRate,
		&log.SleepQuality, &sleepHours,
		&log.PlannedTraining.Type, &log.PlannedTraining.PlannedDurationMin,
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
		&log.EstimatedTDEE,
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

	return &log, nil
}

// GetToday retrieves today's daily log.
// Returns ErrDailyLogNotFound if no log exists for today.
func (s *DailyLogStore) GetToday(ctx context.Context) (*models.DailyLog, error) {
	today := time.Now().Format("2006-01-02")
	return s.GetByDate(ctx, today)
}

// Create inserts a new daily log.
// Returns an error if a log already exists for that date.
func (s *DailyLogStore) Create(ctx context.Context, log *models.DailyLog) error {
	const query = `
		INSERT INTO daily_logs (
			log_date, weight_kg, body_fat_percent, resting_heart_rate,
			sleep_quality, sleep_hours,
			planned_training_type, planned_duration_min,
			total_carbs_g, total_protein_g, total_fats_g, total_calories,
			breakfast_carb_points, breakfast_protein_points, breakfast_fat_points,
			lunch_carb_points, lunch_protein_points, lunch_fat_points,
			dinner_carb_points, dinner_protein_points, dinner_fat_points,
			fruit_g, veggies_g, water_l, day_type, estimated_tdee,
			created_at, updated_at
		) VALUES (
			?, ?, ?, ?,
			?, ?,
			?, ?,
			?, ?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?, ?, ?,
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

	_, err := s.db.ExecContext(ctx, query,
		log.Date, log.WeightKg, bodyFatPercent, heartRate,
		log.SleepQuality, sleepHours,
		log.PlannedTraining.Type, log.PlannedTraining.PlannedDurationMin,
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
		log.EstimatedTDEE,
	)

	return err
}

// DeleteToday removes today's daily log.
func (s *DailyLogStore) DeleteToday(ctx context.Context) error {
	today := time.Now().Format("2006-01-02")
	_, err := s.db.ExecContext(ctx, "DELETE FROM daily_logs WHERE log_date = ?", today)
	return err
}
