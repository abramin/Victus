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

	// Enhance recipe names with Ollama (if available)
	if s.ollama != nil && result.Computed {
		for i := range result.Solutions {
			ingredientNames := make([]string, len(result.Solutions[i].Ingredients))
			for j, ing := range result.Solutions[i].Ingredients {
				ingredientNames[j] = ing.Food.FoodItem
			}
			result.Solutions[i].RecipeName = s.ollama.GenerateRecipeName(ctx, ingredientNames)
		}
	}

	return &result, nil
}
