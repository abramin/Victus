package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// NutritionPlanService handles business logic for nutrition plans.
type NutritionPlanService struct {
	planStore    *store.NutritionPlanStore
	profileStore *store.ProfileStore
}

// NewNutritionPlanService creates a new NutritionPlanService.
func NewNutritionPlanService(ps *store.NutritionPlanStore, profileStore *store.ProfileStore) *NutritionPlanService {
	return &NutritionPlanService{
		planStore:    ps,
		profileStore: profileStore,
	}
}

// Create creates a new nutrition plan with weekly targets.
// Requires an existing profile for TDEE calculations.
// Returns store.ErrActivePlanExists if an active plan already exists.
// Returns store.ErrProfileNotFound if no profile exists.
func (s *NutritionPlanService) Create(ctx context.Context, input domain.NutritionPlanInput, now time.Time) (*domain.NutritionPlan, error) {
	// Get profile for TDEE calculations
	profile, err := s.profileStore.Get(ctx)
	if err != nil {
		return nil, err
	}

	// Create and validate plan with weekly targets
	plan, err := domain.NewNutritionPlan(input, profile, now)
	if err != nil {
		return nil, err
	}

	// Persist plan and targets
	planID, err := s.planStore.Create(ctx, plan)
	if err != nil {
		return nil, err
	}

	// Return fresh copy with IDs populated
	return s.planStore.GetByID(ctx, planID)
}

// GetActive retrieves the currently active nutrition plan.
// Returns store.ErrPlanNotFound if no active plan exists.
func (s *NutritionPlanService) GetActive(ctx context.Context) (*domain.NutritionPlan, error) {
	return s.planStore.GetActive(ctx)
}

// GetByID retrieves a nutrition plan by ID.
// Returns store.ErrPlanNotFound if plan doesn't exist.
func (s *NutritionPlanService) GetByID(ctx context.Context, id int64) (*domain.NutritionPlan, error) {
	return s.planStore.GetByID(ctx, id)
}

// Complete marks a plan as completed.
// Returns store.ErrPlanNotFound if plan doesn't exist.
func (s *NutritionPlanService) Complete(ctx context.Context, id int64) error {
	return s.planStore.UpdateStatus(ctx, id, domain.PlanStatusCompleted)
}

// Cancel marks a plan as cancelled.
// Returns store.ErrPlanNotFound if plan doesn't exist.
func (s *NutritionPlanService) Cancel(ctx context.Context, id int64) error {
	return s.planStore.UpdateStatus(ctx, id, domain.PlanStatusCancelled)
}

// Delete removes a nutrition plan.
func (s *NutritionPlanService) Delete(ctx context.Context, id int64) error {
	return s.planStore.Delete(ctx, id)
}

// ListAll retrieves all nutrition plans.
func (s *NutritionPlanService) ListAll(ctx context.Context) ([]*domain.NutritionPlan, error) {
	return s.planStore.ListAll(ctx)
}

// UpdateWeeklyActuals updates the actual values for a weekly target.
// This is called when daily logs are aggregated at the end of each week.
func (s *NutritionPlanService) UpdateWeeklyActuals(ctx context.Context, planID int64, weekNumber int, actualWeight *float64, actualIntake *int, daysLogged int) error {
	return s.planStore.UpdateWeeklyActuals(ctx, planID, weekNumber, actualWeight, actualIntake, daysLogged)
}

// GetCurrentWeekTarget returns the target for the current week of the active plan.
// Returns nil if no active plan or if plan hasn't started yet.
func (s *NutritionPlanService) GetCurrentWeekTarget(ctx context.Context, now time.Time) (*domain.WeeklyTarget, error) {
	plan, err := s.planStore.GetActive(ctx)
	if err != nil {
		return nil, err
	}

	currentWeek := plan.GetCurrentWeek(now)
	if currentWeek == 0 || currentWeek > plan.DurationWeeks {
		return nil, nil // Plan hasn't started or has ended
	}

	target := plan.GetWeeklyTarget(currentWeek)
	return target, nil
}
