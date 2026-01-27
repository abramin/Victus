package store

import (
	"context"

	"victus/internal/domain"
)

// TrainingConfigStore handles database operations for training configurations.
type TrainingConfigStore struct {
	db DBTX
}

// NewTrainingConfigStore creates a new TrainingConfigStore.
func NewTrainingConfigStore(db DBTX) *TrainingConfigStore {
	return &TrainingConfigStore{db: db}
}

// GetAll retrieves all training configurations.
func (s *TrainingConfigStore) GetAll(ctx context.Context) ([]domain.TrainingTypeConfig, error) {
	const query = `
		SELECT type, met, load_score
		FROM training_configs
		ORDER BY type
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []domain.TrainingTypeConfig
	for rows.Next() {
		var cfg domain.TrainingTypeConfig
		if err := rows.Scan(&cfg.Type, &cfg.MET, &cfg.LoadScore); err != nil {
			return nil, err
		}
		configs = append(configs, cfg)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return configs, nil
}

// GetByType retrieves a training configuration by type.
func (s *TrainingConfigStore) GetByType(ctx context.Context, trainingType domain.TrainingType) (*domain.TrainingTypeConfig, error) {
	const query = `
		SELECT type, met, load_score
		FROM training_configs
		WHERE type = ?
	`

	var cfg domain.TrainingTypeConfig
	err := s.db.QueryRowContext(ctx, query, trainingType).Scan(
		&cfg.Type, &cfg.MET, &cfg.LoadScore,
	)
	if err != nil {
		return nil, err
	}

	return &cfg, nil
}
