package store

import (
	"context"
	"database/sql"

	"victus/internal/domain"
)

// FoodReferenceStore handles database operations for food reference items.
type FoodReferenceStore struct {
	db *sql.DB
}

// NewFoodReferenceStore creates a new FoodReferenceStore.
func NewFoodReferenceStore(db *sql.DB) *FoodReferenceStore {
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
		WHERE category = ?
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
		SET plate_multiplier = ?, updated_at = datetime('now')
		WHERE id = ?
	`

	var val interface{}
	if multiplier != nil {
		val = *multiplier
	}

	_, err := s.db.ExecContext(ctx, query, val, id)
	return err
}
