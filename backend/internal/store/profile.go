package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"victus/internal/models"
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
func (s *ProfileStore) Get(ctx context.Context) (*models.UserProfile, error) {
	const query = `
		SELECT
			height_cm, birth_date, sex, goal,
			target_weight_kg, target_weekly_change_kg,
			carb_ratio, protein_ratio, fat_ratio,
			breakfast_ratio, lunch_ratio, dinner_ratio,
			carb_multiplier, protein_multiplier, fat_multiplier,
			fruit_target_g, veggie_target_g,
			created_at, updated_at
		FROM user_profile
		WHERE id = 1
	`

	var (
		p         models.UserProfile
		birthDate string
		createdAt string
		updatedAt string
	)

	err := s.db.QueryRowContext(ctx, query).Scan(
		&p.HeightCM, &birthDate, &p.Sex, &p.Goal,
		&p.TargetWeightKg, &p.TargetWeeklyChangeKg,
		&p.CarbRatio, &p.ProteinRatio, &p.FatRatio,
		&p.MealRatios.Breakfast, &p.MealRatios.Lunch, &p.MealRatios.Dinner,
		&p.PointsConfig.CarbMultiplier, &p.PointsConfig.ProteinMultiplier, &p.PointsConfig.FatMultiplier,
		&p.FruitTargetG, &p.VeggieTargetG,
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

	return &p, nil
}

// Upsert creates or updates the user profile.
func (s *ProfileStore) Upsert(ctx context.Context, p *models.UserProfile) error {
	const query = `
		INSERT INTO user_profile (
			id, height_cm, birth_date, sex, goal,
			target_weight_kg, target_weekly_change_kg,
			carb_ratio, protein_ratio, fat_ratio,
			breakfast_ratio, lunch_ratio, dinner_ratio,
			carb_multiplier, protein_multiplier, fat_multiplier,
			fruit_target_g, veggie_target_g,
			created_at, updated_at
		) VALUES (
			1, ?, ?, ?, ?,
			?, ?,
			?, ?, ?,
			?, ?, ?,
			?, ?, ?,
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
			updated_at = datetime('now')
	`

	_, err := s.db.ExecContext(ctx, query,
		p.HeightCM, p.BirthDate.Format("2006-01-02"), p.Sex, p.Goal,
		p.TargetWeightKg, p.TargetWeeklyChangeKg,
		p.CarbRatio, p.ProteinRatio, p.FatRatio,
		p.MealRatios.Breakfast, p.MealRatios.Lunch, p.MealRatios.Dinner,
		p.PointsConfig.CarbMultiplier, p.PointsConfig.ProteinMultiplier, p.PointsConfig.FatMultiplier,
		p.FruitTargetG, p.VeggieTargetG,
	)

	return err
}

// Delete removes the user profile.
func (s *ProfileStore) Delete(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM user_profile WHERE id = 1")
	return err
}
