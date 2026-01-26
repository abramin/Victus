package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Macro solver is a combinatorial algorithm; unit tests lock the
// scoring formula, serving rounding, and diversification logic without E2E dependencies.

type SolverSuite struct {
	suite.Suite
}

func TestSolverSuite(t *testing.T) {
	suite.Run(t, new(SolverSuite))
}

func (s *SolverSuite) greekYoghurt() FoodNutrition {
	return FoodNutrition{
		ID:             1,
		Category:       FoodCategoryHighProtein,
		FoodItem:       "Greek Yoghurt",
		ProteinGPer100: 10.0,
		CarbsGPer100:   3.6,
		FatGPer100:     0.7,
		ServingUnit:    "g",
		ServingSizeG:   150,
		IsPantryStaple: true,
	}
}

func (s *SolverSuite) chicken() FoodNutrition {
	return FoodNutrition{
		ID:             1,
		Category:       FoodCategoryHighProtein,
		FoodItem:       "Chicken Breast",
		ProteinGPer100: 31.0,
		CarbsGPer100:   0.0,
		FatGPer100:     3.6,
		ServingUnit:    "g",
		ServingSizeG:   120,
		IsPantryStaple: true,
	}
}

func (s *SolverSuite) rice() FoodNutrition {
	return FoodNutrition{
		ID:             2,
		Category:       FoodCategoryHighCarb,
		FoodItem:       "Brown Rice",
		ProteinGPer100: 7.5,
		CarbsGPer100:   76.2,
		FatGPer100:     2.7,
		ServingUnit:    "g",
		ServingSizeG:   100,
		IsPantryStaple: true,
	}
}

func (s *SolverSuite) TestSolutionFinding() {
	s.Run("empty pantry returns no solutions", func() {
		req := SolverRequest{
			RemainingBudget: MacroBudget{
				ProteinG:     40,
				CarbsG:       30,
				FatG:         10,
				CaloriesKcal: 400,
			},
			PantryFoods: []FoodNutrition{},
		}

		result := SolveMacros(req)

		s.False(result.Computed)
		s.Empty(result.Solutions)
	})

	s.Run("single food finds solution", func() {
		req := SolverRequest{
			RemainingBudget: MacroBudget{
				ProteinG:     20,
				CarbsG:       10,
				FatG:         5,
				CaloriesKcal: 150,
			},
			PantryFoods: []FoodNutrition{s.greekYoghurt()},
		}

		result := SolveMacros(req)

		s.True(result.Computed)
		s.NotEmpty(result.Solutions)
		s.Len(result.Solutions[0].Ingredients, 1)
		s.Greater(result.Solutions[0].MatchScore, 0.0)
	})

	s.Run("two foods finds multi-ingredient solution", func() {
		req := SolverRequest{
			RemainingBudget: MacroBudget{
				ProteinG:     45,
				CarbsG:       60,
				FatG:         10,
				CaloriesKcal: 500,
			},
			PantryFoods:    []FoodNutrition{s.chicken(), s.rice()},
			MaxIngredients: 2,
		}

		result := SolveMacros(req)

		s.True(result.Computed)

		// Should have solutions with chicken + rice
		found := false
		for _, sol := range result.Solutions {
			if len(sol.Ingredients) == 2 {
				found = true
				break
			}
		}
		s.True(found, "expected at least one 2-ingredient solution")
	})
}

func (s *SolverSuite) TestMatchScoring() {
	s.Run("perfect match scores near 100", func() {
		actual := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}
		target := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}

		score := calculateMatchScore(actual, target)

		s.GreaterOrEqual(score, 99.0)
		s.LessOrEqual(score, 100.0)
	})

	s.Run("10% off calories penalized", func() {
		actual := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 360}
		target := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}

		score := calculateMatchScore(actual, target)

		s.GreaterOrEqual(score, 80.0)
		s.LessOrEqual(score, 95.0)
	})

	s.Run("very poor match scores low", func() {
		actual := MacroBudget{ProteinG: 10, CarbsG: 80, FatG: 30, CaloriesKcal: 600}
		target := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}

		score := calculateMatchScore(actual, target)

		s.GreaterOrEqual(score, 0.0)
		s.LessOrEqual(score, 40.0)
	})
}

func (s *SolverSuite) TestServingSizeRounding() {
	s.Run("egg rounds to whole", func() {
		egg := FoodNutrition{
			FoodItem:     "Egg",
			ServingUnit:  "large",
			ServingSizeG: 53,
		}
		_, display := roundToServingSize(egg, 106)
		s.Equal("2 larges", display)
	})

	s.Run("tablespoon rounds", func() {
		oil := FoodNutrition{
			FoodItem:     "Olive Oil",
			ServingUnit:  "tbsp",
			ServingSizeG: 14,
		}
		_, display := roundToServingSize(oil, 21)
		s.Equal("2 tbsp", display)
	})

	s.Run("grams round to 10", func() {
		chicken := FoodNutrition{
			FoodItem:     "Chicken",
			ServingUnit:  "g",
			ServingSizeG: 100,
		}
		_, display := roundToServingSize(chicken, 153)
		s.Equal("150g", display)
	})

	s.Run("small grams round to 5", func() {
		nuts := FoodNutrition{
			FoodItem:     "Nuts",
			ServingUnit:  "g",
			ServingSizeG: 30,
		}
		_, display := roundToServingSize(nuts, 27)
		s.Equal("25g", display)
	})
}

func (s *SolverSuite) TestWhyTextGeneration() {
	s.Run("generates non-empty text", func() {
		actual := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}
		target := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}

		text := generateWhyText(actual, target)
		s.NotEmpty(text)
	})
}

func (s *SolverSuite) TestSolutionDiversification() {
	s.Run("selects diverse primary ingredients", func() {
		solutions := []SolverSolution{
			{RecipeName: "Chicken A", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Chicken"}}}},
			{RecipeName: "Chicken B", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Chicken"}}}},
			{RecipeName: "Rice A", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Rice"}}}},
			{RecipeName: "Yoghurt A", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Yoghurt"}}}},
		}

		result := diversifySolutions(solutions, 3)

		s.Len(result, 3)

		// Should have one of each primary ingredient
		primaries := make(map[string]bool)
		for _, sol := range result {
			if len(sol.Ingredients) > 0 {
				primaries[sol.Ingredients[0].Food.FoodItem] = true
			}
		}

		s.True(primaries["Chicken"])
		s.True(primaries["Rice"])
		s.True(primaries["Yoghurt"])
	})
}
