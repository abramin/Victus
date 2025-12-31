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
	db *sql.DB
}

// NewProfileStore creates a new ProfileStore.
func NewProfileStore(db *sql.DB) *ProfileStore {
	return &ProfileStore{db: db}
}

// Get retrieves the user profile.
// Returns ErrProfileNotFound if no profile exists.
func (s *ProfileStore) Get(ctx context.Context) (*domain.UserProfile, error) {
	const query = `
		SELECT
			height_cm, birth_date, sex, goal,
			target_weight_kg, target_weekly_change_kg,
			carb_ratio, protein_ratio, fat_ratio,
			breakfast_ratio, lunch_ratio, dinner_ratio,
			carb_multiplier, protein_multiplier, fat_multiplier,
			fruit_target_g, veggie_target_g,
			bmr_equation, body_fat_percent,
			created_at, updated_at
		FROM user_profile
		WHERE id = 1
	`

	var (
		p              domain.UserProfile
		birthDate      string
		bodyFatPercent sql.NullFloat64
		createdAt      string
		updatedAt      string
	)

	err := s.db.QueryRowContext(ctx, query).Scan(
		&p.HeightCM, &birthDate, &p.Sex, &p.Goal,
		&p.TargetWeightKg, &p.TargetWeeklyChangeKg,
		&p.CarbRatio, &p.ProteinRatio, &p.FatRatio,
		&p.MealRatios.Breakfast, &p.MealRatios.Lunch, &p.MealRatios.Dinner,
		&p.PointsConfig.CarbMultiplier, &p.PointsConfig.ProteinMultiplier, &p.PointsConfig.FatMultiplier,
		&p.FruitTargetG, &p.VeggieTargetG,
		&p.BMREquation, &bodyFatPercent,
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

	// Handle nullable body fat percent
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
			target_weight_kg, target_weekly_change_kg,
			carb_ratio, protein_ratio, fat_ratio,
			breakfast_ratio, lunch_ratio, dinner_ratio,
			carb_multiplier, protein_multiplier, fat_multiplier,
			fruit_target_g, veggie_target_g,
			bmr_equation, body_fat_percent,
			created_at, updated_at
		) VALUES (
			1, ?, ?, ?, ?,
			?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?,
			?, ?,
			datetime('now'), datetime('now')
		)
		ON CONFLICT(id) DO UPDATE SET
			height_cm = excluded.height_cm,
			birth_date = excluded.birth_date,
			sex = excluded.sex,
			goal = excluded.goal,
			target_weight_kg = excluded.target_weight_kg,
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
			updated_at = datetime('now')
	`

	// Convert body fat percent to nullable for database
	var bodyFatPercent interface{}
	if p.BodyFatPercent > 0 {
		bodyFatPercent = p.BodyFatPercent
	}

	_, err := s.db.ExecContext(ctx, query,
		p.HeightCM, p.BirthDate.Format("2006-01-02"), p.Sex, p.Goal,
		p.TargetWeightKg, p.TargetWeeklyChangeKg,
		p.CarbRatio, p.ProteinRatio, p.FatRatio,
		p.MealRatios.Breakfast, p.MealRatios.Lunch, p.MealRatios.Dinner,
		p.PointsConfig.CarbMultiplier, p.PointsConfig.ProteinMultiplier, p.PointsConfig.FatMultiplier,
		p.FruitTargetG, p.VeggieTargetG,
		p.BMREquation, bodyFatPercent,
	)

	return err
}

// Delete removes the user profile.
func (s *ProfileStore) Delete(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM user_profile WHERE id = 1")
	return err
}
