package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// MovementService handles business logic for the adaptive movement engine.
type MovementService struct {
	movementStore  *store.MovementStore
	fatigueService *FatigueService
}

// NewMovementService creates a new MovementService.
func NewMovementService(ms *store.MovementStore, fs *FatigueService) *MovementService {
	return &MovementService{
		movementStore:  ms,
		fatigueService: fs,
	}
}

// ListMovements returns all movements in the taxonomy.
func (s *MovementService) ListMovements(ctx context.Context) ([]domain.Movement, error) {
	return s.movementStore.GetAll(ctx)
}

// GetMovement returns a single movement by ID.
func (s *MovementService) GetMovement(ctx context.Context, id string) (*domain.Movement, error) {
	return s.movementStore.GetByID(ctx, id)
}

// GetUserProgress returns the user's progression for a movement.
func (s *MovementService) GetUserProgress(ctx context.Context, movementID string) (*domain.UserMovementProgress, error) {
	return s.movementStore.GetUserProgress(ctx, movementID)
}

// GetFilteredMovements returns movements filtered by joint integrity and neural battery ceiling.
func (s *MovementService) GetFilteredMovements(ctx context.Context, intensityCeiling int) ([]domain.Movement, error) {
	movements, err := s.movementStore.GetAll(ctx)
	if err != nil {
		return nil, err
	}

	// Get joint integrity from fatigue service
	bodyStatus, err := s.fatigueService.GetBodyStatus(ctx, time.Now())
	if err != nil {
		// Fail open — return unfiltered if fatigue data unavailable
		return movements, nil
	}

	return domain.FilterMovementsByJointIntegrity(movements, bodyStatus.JointIntegrity, intensityCeiling), nil
}

// RecordSessionCompletion records a movement session and calculates progression.
func (s *MovementService) RecordSessionCompletion(ctx context.Context, movementID string, input domain.MovementProgressionInput) (*domain.UserMovementProgress, error) {
	// Get movement to initialize default difficulty
	mov, err := s.movementStore.GetByID(ctx, movementID)
	if err != nil {
		return nil, err
	}

	// Get current progress (or initialize from movement default)
	current, err := s.movementStore.GetUserProgress(ctx, movementID)
	if err != nil {
		return nil, err
	}
	if current == nil {
		current = &domain.UserMovementProgress{
			MovementID:     movementID,
			UserDifficulty: mov.Difficulty,
		}
	}

	// Calculate progression (pure domain function)
	updated := domain.CalculateMovementProgression(*current, input, time.Now())

	// Persist
	if err := s.movementStore.UpsertUserProgress(ctx, updated); err != nil {
		return nil, err
	}

	return &updated, nil
}
