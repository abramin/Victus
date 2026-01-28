package service

import (
	"context"
	"fmt"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// NutritionPlanService handles business logic for nutrition plans.
type NutritionPlanService struct {
	planStore     *store.NutritionPlanStore
	profileStore  *store.ProfileStore
	ollamaService *OllamaService
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

// Abandon marks a plan as abandoned.
// Returns store.ErrPlanNotFound if plan doesn't exist.
func (s *NutritionPlanService) Abandon(ctx context.Context, id int64) error {
	return s.planStore.UpdateStatus(ctx, id, domain.PlanStatusAbandoned)
}

// Pause marks a plan as paused.
// Returns store.ErrPlanNotFound if plan doesn't exist.
func (s *NutritionPlanService) Pause(ctx context.Context, id int64) error {
	return s.planStore.UpdateStatus(ctx, id, domain.PlanStatusPaused)
}

// Resume marks a paused plan as active again.
// Returns store.ErrPlanNotFound if plan doesn't exist.
func (s *NutritionPlanService) Resume(ctx context.Context, id int64) error {
	return s.planStore.UpdateStatus(ctx, id, domain.PlanStatusActive)
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

// Recalibrate applies a recalibration option to a plan.
// This modifies the plan based on the selected strategy:
// - increase_deficit: Increase daily deficit to hit goal on time
// - extend_timeline: Add weeks to maintain current deficit
// - revise_goal: Adjust goal weight to be achievable
// - keep_current: No changes (returns current plan)
func (s *NutritionPlanService) Recalibrate(ctx context.Context, id int64, optionType domain.RecalibrationOptionType, now time.Time) (*domain.NutritionPlan, error) {
	// Get the current plan
	plan, err := s.planStore.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Get profile for TDEE calculations
	profile, err := s.profileStore.Get(ctx)
	if err != nil {
		return nil, err
	}

	// If keep_current, just return the plan unchanged
	if optionType == domain.RecalibrationKeepCurrent {
		return plan, nil
	}

	// Apply recalibration based on option type
	updatedPlan, err := domain.ApplyRecalibration(plan, profile, optionType, now)
	if err != nil {
		return nil, err
	}

	// Update the plan in the store
	if err := s.planStore.UpdatePlan(ctx, updatedPlan); err != nil {
		return nil, err
	}

	// Return fresh copy
	return s.planStore.GetByID(ctx, id)
}

// SetOllamaService injects the Ollama service for AI-generated insights.
func (s *NutritionPlanService) SetOllamaService(os *OllamaService) {
	s.ollamaService = os
}

// PhaseInsight represents an AI-generated or templated insight for a plan phase.
type PhaseInsight struct {
	Insight   string
	Phase     string // "initiation", "momentum", or "peak"
	Generated bool   // true if AI-generated, false if fallback
}

// GetPhaseInsight returns an AI-generated insight for the current phase of a plan.
// If weekNumber is 0, uses the plan's current week.
func (s *NutritionPlanService) GetPhaseInsight(ctx context.Context, planID int64, weekNumber int) (*PhaseInsight, error) {
	// Fetch the plan
	plan, err := s.planStore.GetByID(ctx, planID)
	if err != nil {
		return nil, err
	}

	// Use provided week number or default to current week
	if weekNumber == 0 {
		weekNumber = plan.GetCurrentWeek(time.Now())
	}

	// Determine current phase
	phase := determinePlanPhase(weekNumber, plan.DurationWeeks)

	// Fallback insight based on phase
	fallbackInsight := generatePhaseFallbackInsight(phase)

	// Try AI-generated insight if Ollama service is available
	if s.ollamaService != nil {
		prompt := buildPhaseInsightPrompt(plan, weekNumber, phase)

		// Use a timeout context for Ollama
		insightCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()

		insight, err := s.ollamaService.Generate(insightCtx, prompt)
		if err == nil && len(insight) > 0 {
			return &PhaseInsight{
				Insight:   insight,
				Phase:     phase,
				Generated: true,
			}, nil
		}
		// On error, fall through to fallback
	}

	// Return fallback insight
	return &PhaseInsight{
		Insight:   fallbackInsight,
		Phase:     phase,
		Generated: false,
	}, nil
}

// determinePlanPhase calculates which phase (initiation/momentum/peak) a week falls into.
func determinePlanPhase(weekNumber int, totalWeeks int) string {
	phaseLength := totalWeeks / 3
	if phaseLength == 0 {
		phaseLength = 1
	}

	if weekNumber <= phaseLength {
		return "initiation"
	} else if weekNumber <= phaseLength*2 {
		return "momentum"
	}
	return "peak"
}

// generatePhaseFallbackInsight returns a generic insight for each phase.
func generatePhaseFallbackInsight(phase string) string {
	switch phase {
	case "initiation":
		return "Focus: Metabolic calibration and baseline adherence. Keep protein high."
	case "momentum":
		return "Focus: Maintaining consistency and optimizing adherence patterns."
	case "peak":
		return "Focus: Final push with precision execution. Stay the course."
	default:
		return "Focus: Maintain adherence and track your progress."
	}
}

// buildPhaseInsightPrompt constructs an Ollama prompt for phase insights.
func buildPhaseInsightPrompt(plan *domain.NutritionPlan, weekNumber int, phase string) string {
	weekProgress := float64(weekNumber) / float64(plan.DurationWeeks) * 100
	weightChange := plan.GoalWeightKg - plan.StartWeightKg

	return fmt.Sprintf(`You are a nutrition coach providing brief phase-specific insights.

Context:
- Plan Phase: %s
- Week %d of %d (%.0f%% complete)
- Goal: %.1f kg weight change
- Daily deficit: %.0f kcal

Generate a single-sentence tactical focus for this phase. Be specific, motivational, and actionable.
Examples:
- Initiation: "Build your metabolic baseline—precision protein tracking is your priority."
- Momentum: "You're in the groove; trust the process and stay consistent with intake."
- Peak: "Final sprint—every calorie counts, maintain intensity."

Your insight (one sentence only):`, phase, weekNumber, plan.DurationWeeks, weekProgress, weightChange, plan.RequiredDailyDeficitKcal)
}
