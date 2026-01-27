package service

import (
	"context"

	"victus/internal/domain"
	"victus/internal/store"
)

// SolverService orchestrates the Macro Tetris Solver.
type SolverService struct {
	foodStore *store.FoodReferenceStore
	ollama    *OllamaService
}

// NewSolverService creates a new SolverService.
func NewSolverService(foodStore *store.FoodReferenceStore, ollama *OllamaService) *SolverService {
	return &SolverService{
		foodStore: foodStore,
		ollama:    ollama,
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

	// Build solver request
	req := domain.SolverRequest{
		RemainingBudget:  budget,
		MaxIngredients:   3,
		TolerancePercent: 0.10,
		PantryFoods:      pantry,
	}

	// Run the solver algorithm
	result := domain.SolveMacros(req)

	// Enhance solutions with Ollama (if available)
	if s.ollama != nil && result.Computed {
		for i := range result.Solutions {
			// Get ingredient names for recipe naming
			ingredientNames := make([]string, len(result.Solutions[i].Ingredients))
			for j, ing := range result.Solutions[i].Ingredients {
				ingredientNames[j] = ing.Food.FoodItem
			}

			// Generate simple recipe name (fallback if no refinement)
			result.Solutions[i].RecipeName = s.ollama.GenerateRecipeName(ctx, ingredientNames)

			// Check for absurdity (pure domain function)
			absurdity := domain.CheckAbsurdity(result.Solutions[i])

			// Generate semantic refinement with training context
			refinement := s.ollama.GenerateSemanticRefinement(ctx, result.Solutions[i], trainingCtx, absurdity)
			result.Solutions[i].Refinement = &refinement

			// If LLM generated a mission title, use it as the recipe name
			if refinement.GeneratedByLLM && refinement.MissionTitle != "" {
				result.Solutions[i].RecipeName = refinement.MissionTitle
			}
		}
	}

	return &result, nil
}
