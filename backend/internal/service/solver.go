package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// SolverService orchestrates the Macro Tetris Solver.
type SolverService struct {
	foodStore      *store.FoodReferenceStore
	ollama         *OllamaService
	fatigueService *FatigueService
}

// NewSolverService creates a new SolverService.
func NewSolverService(foodStore *store.FoodReferenceStore, ollama *OllamaService, fatigueService *FatigueService) *SolverService {
	return &SolverService{
		foodStore:      foodStore,
		ollama:         ollama,
		fatigueService: fatigueService,
	}
}

// Solve finds meal combinations for the given macro budget.
// Uses the pantry foods from the database and optionally generates
// creative recipe names via Ollama.
func (s *SolverService) Solve(ctx context.Context, budget domain.MacroBudget) (*domain.SolverResponse, error) {
	return s.SolveWithContext(ctx, budget, nil)
}

// SolveWithContext finds meal combinations with optional training context for semantic refinement.
// When trainingCtx is provided, generates AI-enhanced recipe presentation with tactical names,
// preparation instructions, and contextual insights.
func (s *SolverService) SolveWithContext(
	ctx context.Context,
	budget domain.MacroBudget,
	trainingCtx *domain.TrainingContextForSolver,
) (*domain.SolverResponse, error) {
	// Get pantry foods with nutritional data
	pantry, err := s.foodStore.ListPantryFoods(ctx)
	if err != nil {
		return nil, err
	}

	if len(pantry) == 0 {
		return &domain.SolverResponse{
			Computed: false,
		}, nil
	}

	// Determine meal time for protocol locking
	mealTime := "any"
	if trainingCtx != nil {
		mealTime = trainingCtx.MealTime
	}

	// Build solver request
	req := domain.SolverRequest{
		RemainingBudget:  budget,
		MinIngredients:   3,
		MaxIngredients:   5,
		TolerancePercent: 0.10,
		PantryFoods:      pantry,
		MealTime:         mealTime,
	}

	// Run the solver algorithm
	result := domain.SolveMacros(req)

	// Enhance solutions with Ollama (if available)
	// Only generate AI refinement for the TOP solution to avoid frontend timeouts
	// (3 solutions × 8s each = 24s, which can cause timeouts)
	if s.ollama != nil && result.Computed && len(result.Solutions) > 0 {
		// Get current body status from fatigue service
		bodyStatus, err := s.fatigueService.GetBodyStatus(ctx, time.Now())
		if err != nil {
			bodyStatus = nil // Gracefully handle errors; continue without body context
		}

		// Generate full semantic refinement for the first (best match) solution
		absurdity := domain.CheckAbsurdity(result.Solutions[0])
		refinement := s.ollama.GenerateSemanticRefinement(ctx, result.Solutions[0], trainingCtx, absurdity, bodyStatus)
		result.Solutions[0].Refinement = &refinement

		// Use the LLM-generated mission title as the recipe name
		if refinement.GeneratedByLLM && refinement.MissionTitle != "" {
			result.Solutions[0].RecipeName = refinement.MissionTitle
		}

		// For remaining solutions, use fast fallback refinement (no LLM call)
		for i := 1; i < len(result.Solutions); i++ {
			absurdity := domain.CheckAbsurdity(result.Solutions[i])
			fallbackRefinement := BuildFallbackRefinement(result.Solutions[i], absurdity)
			result.Solutions[i].Refinement = &fallbackRefinement
			result.Solutions[i].RecipeName = fallbackRefinement.MissionTitle
		}
	}

	return &result, nil
}
