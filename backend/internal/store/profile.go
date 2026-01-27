package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"victus/internal/domain"
)

// ErrProfileNotFound is returned when no profile exists.
var ErrProfileNotFound = errors.New("profile not found")

// ProfileStore handles database operations for user profiles.
type ProfileStore struct {
	db DBTX
}

// NewProfileStore creates a new ProfileStore.
func NewProfileStore(db DBTX) *ProfileStore {
	return &ProfileStore{db: db}
}

// Get retrieves the user profile.
// Returns ErrProfileNotFound if no profile exists.
func (s *ProfileStore) Get(ctx context.Context) (*domain.UserProfile, error) {
	const query = `
		SELECT
			height_cm, birth_date, sex, goal,
			current_weight_kg, target_weight_kg, timeframe_weeks, target_weekly_change_kg,
			carb_ratio, protein_ratio, fat_ratio,
			breakfast_ratio, lunch_ratio, dinner_ratio,
			carb_multiplier, protein_multiplier, fat_multiplier,
			fruit_target_g, veggie_target_g,
			bmr_equation, body_fat_percent,
			COALESCE(maltodextrin_g, 0), COALESCE(whey_g, 0), COALESCE(collagen_g, 0),
			COALESCE(tdee_source, 'formula'), COALESCE(manual_tdee, 0),
			COALESCE(recalibration_tolerance, 3),
			COALESCE(fasting_protocol, 'standard'), COALESCE(eating_window_start, '08:00'), COALESCE(eating_window_end, '20:00'),
			created_at, updated_at
		FROM user_profile
		WHERE id = 1
	`

	var (
		p               domain.UserProfile
		birthDate       string
		currentWeightKg sql.NullFloat64
		timeframeWeeks  sql.NullInt64
		bodyFatPercent  sql.NullFloat64
		createdAt       string
		updatedAt       string
	)

	err := s.db.QueryRowContext(ctx, query).Scan(
		&p.HeightCM, &birthDate, &p.Sex, &p.Goal,
		&currentWeightKg, &p.TargetWeightKg, &timeframeWeeks, &p.TargetWeeklyChangeKg,
		&p.CarbRatio, &p.ProteinRatio, &p.FatRatio,
		&p.MealRatios.Breakfast, &p.MealRatios.Lunch, &p.MealRatios.Dinner,
		&p.PointsConfig.CarbMultiplier, &p.PointsConfig.ProteinMultiplier, &p.PointsConfig.FatMultiplier,
		&p.FruitTargetG, &p.VeggieTargetG,
		&p.BMREquation, &bodyFatPercent,
		&p.SupplementConfig.MaltodextrinG, &p.SupplementConfig.WheyG, &p.SupplementConfig.CollagenG,
		&p.TDEESource, &p.ManualTDEE,
		&p.RecalibrationTolerance,
		&p.FastingProtocol, &p.EatingWindowStart, &p.EatingWindowEnd,
		&createdAt, &updatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProfileNotFound
	}
	if err != nil {
		return nil, err
	}

	// Parse dates
	p.BirthDate, _ = time.Parse("2006-01-02", birthDate)
	p.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	p.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

	// Handle nullable fields
	if currentWeightKg.Valid {
		p.CurrentWeightKg = currentWeightKg.Float64
	}
	if timeframeWeeks.Valid {
		p.TimeframeWeeks = int(timeframeWeeks.Int64)
	}
	if bodyFatPercent.Valid {
		p.BodyFatPercent = bodyFatPercent.Float64
	}

	return &p, nil
}

// Upsert creates or updates the user profile.
func (s *ProfileStore) Upsert(ctx context.Context, p *domain.UserProfile) error {
	const query = `
		INSERT INTO user_profile (
			id, height_cm, birth_date, sex, goal,
			current_weight_kg, target_weight_kg, timeframe_weeks, target_weekly_change_kg,
			carb_ratio, protein_ratio, fat_ratio,
			breakfast_ratio, lunch_ratio, dinner_ratio,
			carb_multiplier, protein_multiplier, fat_multiplier,
			fruit_target_g, veggie_target_g,
			bmr_equation, body_fat_percent,
			maltodextrin_g, whey_g, collagen_g,
			tdee_source, manual_tdee,
			recalibration_tolerance,
			fasting_protocol, eating_window_start, eating_window_end,
			created_at, updated_at
		) VALUES (
			1, $1, $2, $3, $4,
			$5, $6, $7, $8,
			$9, $10, $11,
			$12, $13, $14,
			$15, $16, $17,
			$18, $19,
			$20, $21,
			$22, $23, $24,
			$25, $26,
			$27,
			$28, $29, $30,
			$31, $32
		)
		ON CONFLICT(id) DO UPDATE SET
			height_cm = excluded.height_cm,
			birth_date = excluded.birth_date,
			sex = excluded.sex,
			goal = excluded.goal,
			current_weight_kg = excluded.current_weight_kg,
			target_weight_kg = excluded.target_weight_kg,
			timeframe_weeks = excluded.timeframe_weeks,
			target_weekly_change_kg = excluded.target_weekly_change_kg,
			carb_ratio = excluded.carb_ratio,
			protein_ratio = excluded.protein_ratio,
			fat_ratio = excluded.fat_ratio,
			breakfast_ratio = excluded.breakfast_ratio,
			lunch_ratio = excluded.lunch_ratio,
			dinner_ratio = excluded.dinner_ratio,
			carb_multiplier = excluded.carb_multiplier,
			protein_multiplier = excluded.protein_multiplier,
			fat_multiplier = excluded.fat_multiplier,
			fruit_target_g = excluded.fruit_target_g,
			veggie_target_g = excluded.veggie_target_g,
			bmr_equation = excluded.bmr_equation,
			body_fat_percent = excluded.body_fat_percent,
			maltodextrin_g = excluded.maltodextrin_g,
			whey_g = excluded.whey_g,
			collagen_g = excluded.collagen_g,
			tdee_source = excluded.tdee_source,
			manual_tdee = excluded.manual_tdee,
			recalibration_tolerance = excluded.recalibration_tolerance,
			fasting_protocol = excluded.fasting_protocol,
			eating_window_start = excluded.eating_window_start,
			eating_window_end = excluded.eating_window_end,
			updated_at = excluded.updated_at
	`

	// Convert nullable fields for database
	var currentWeightKg interface{}
	if p.CurrentWeightKg > 0 {
		currentWeightKg = p.CurrentWeightKg
	}
	var bodyFatPercent interface{}
	if p.BodyFatPercent > 0 {
		bodyFatPercent = p.BodyFatPercent
	}

	now := time.Now()
	_, err := s.db.ExecContext(ctx, query,
		p.HeightCM, p.BirthDate.Format("2006-01-02"), p.Sex, p.Goal,
		currentWeightKg, p.TargetWeightKg, p.TimeframeWeeks, p.TargetWeeklyChangeKg,
		p.CarbRatio, p.ProteinRatio, p.FatRatio,
		p.MealRatios.Breakfast, p.MealRatios.Lunch, p.MealRatios.Dinner,
		p.PointsConfig.CarbMultiplier, p.PointsConfig.ProteinMultiplier, p.PointsConfig.FatMultiplier,
		p.FruitTargetG, p.VeggieTargetG,
		p.BMREquation, bodyFatPercent,
		p.SupplementConfig.MaltodextrinG, p.SupplementConfig.WheyG, p.SupplementConfig.CollagenG,
		p.TDEESource, p.ManualTDEE,
		p.RecalibrationTolerance,
		p.FastingProtocol, p.EatingWindowStart, p.EatingWindowEnd,
		now, now,
	)

	return err
}

// Delete removes the user profile.
func (s *ProfileStore) Delete(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM user_profile WHERE id = 1")
	return err
}
