package store

import (
	"context"
	"database/sql"
	"time"

	"victus/internal/domain"
)

// FoodReferenceStore handles database operations for food reference items.
type FoodReferenceStore struct {
	db DBTX
}

// NewFoodReferenceStore creates a new FoodReferenceStore.
func NewFoodReferenceStore(db DBTX) *FoodReferenceStore {
	return &FoodReferenceStore{db: db}
}

// ListAll retrieves all food reference items, ordered by category and name.
func (s *FoodReferenceStore) ListAll(ctx context.Context) ([]domain.FoodReference, error) {
	const query = `
		SELECT id, category, food_item, plate_multiplier
		FROM food_reference
		ORDER BY category, food_item
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.FoodReference
	for rows.Next() {
		var fr domain.FoodReference
		var plateMultiplier sql.NullFloat64
		if err := rows.Scan(&fr.ID, &fr.Category, &fr.FoodItem, &plateMultiplier); err != nil {
			return nil, err
		}
		if plateMultiplier.Valid {
			fr.PlateMultiplier = &plateMultiplier.Float64
		}
		result = append(result, fr)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// ListByCategory retrieves food reference items for a specific category.
func (s *FoodReferenceStore) ListByCategory(ctx context.Context, category domain.FoodCategory) ([]domain.FoodReference, error) {
	const query = `
		SELECT id, category, food_item, plate_multiplier
		FROM food_reference
		WHERE category = $1
		ORDER BY food_item
	`

	rows, err := s.db.QueryContext(ctx, query, category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.FoodReference
	for rows.Next() {
		var fr domain.FoodReference
		var plateMultiplier sql.NullFloat64
		if err := rows.Scan(&fr.ID, &fr.Category, &fr.FoodItem, &plateMultiplier); err != nil {
			return nil, err
		}
		if plateMultiplier.Valid {
			fr.PlateMultiplier = &plateMultiplier.Float64
		}
		result = append(result, fr)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// UpdatePlateMultiplier updates the plate multiplier for a specific food item.
func (s *FoodReferenceStore) UpdatePlateMultiplier(ctx context.Context, id int64, multiplier *float64) error {
	const query = `
		UPDATE food_reference
		SET plate_multiplier = $1, updated_at = $2
		WHERE id = $3
	`

	var val interface{}
	if multiplier != nil {
		val = *multiplier
	}

	_, err := s.db.ExecContext(ctx, query, val, time.Now(), id)
	return err
}

// ListPantryFoods retrieves foods with nutritional data for the Macro Tetris Solver.
// Prioritizes pantry staples, but returns all foods with valid nutritional data.
func (s *FoodReferenceStore) ListPantryFoods(ctx context.Context) ([]domain.FoodNutrition, error) {
	const query = `
		SELECT
			id, category, food_item,
			COALESCE(protein_g_per_100, 0) as protein_g_per_100,
			COALESCE(carbs_g_per_100, 0) as carbs_g_per_100,
			COALESCE(fat_g_per_100, 0) as fat_g_per_100,
			COALESCE(serving_unit, 'g') as serving_unit,
			COALESCE(serving_size_g, 100) as serving_size_g,
			COALESCE(is_pantry_staple, false) as is_pantry_staple
		FROM food_reference
		WHERE protein_g_per_100 > 0 OR carbs_g_per_100 > 0 OR fat_g_per_100 > 0
		ORDER BY is_pantry_staple DESC, food_item
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.FoodNutrition
	for rows.Next() {
		var fn domain.FoodNutrition
		if err := rows.Scan(
			&fn.ID, &fn.Category, &fn.FoodItem,
			&fn.ProteinGPer100, &fn.CarbsGPer100, &fn.FatGPer100,
			&fn.ServingUnit, &fn.ServingSizeG, &fn.IsPantryStaple,
		); err != nil {
			return nil, err
		}
		result = append(result, fn)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
