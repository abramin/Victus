package service

import (
	"context"

	"victus/internal/domain"
	"victus/internal/store"
)

// TrainingConfigService handles business logic for training configurations.
type TrainingConfigService struct {
	store *store.TrainingConfigStore
}

// NewTrainingConfigService creates a new TrainingConfigService.
func NewTrainingConfigService(s *store.TrainingConfigStore) *TrainingConfigService {
	return &TrainingConfigService{store: s}
}

// GetAll retrieves all training configurations.
func (s *TrainingConfigService) GetAll(ctx context.Context) ([]domain.TrainingTypeConfig, error) {
	return s.store.GetAll(ctx)
}

// GetByType retrieves a training configuration by type.
func (s *TrainingConfigService) GetByType(ctx context.Context, trainingType domain.TrainingType) (*domain.TrainingTypeConfig, error) {
	return s.store.GetByType(ctx, trainingType)
}
