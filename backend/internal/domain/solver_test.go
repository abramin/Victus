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

func (s *SolverSuite) berries() FoodNutrition {
	return FoodNutrition{
		ID:             3,
		Category:       FoodCategoryFruit,
		FoodItem:       "Berries",
		ProteinGPer100: 0.7,
		CarbsGPer100:   12.0,
		FatGPer100:     0.3,
		ServingUnit:    "g",
		ServingSizeG:   100,
		IsPantryStaple: true,
	}
}

func (s *SolverSuite) broccoli() FoodNutrition {
	return FoodNutrition{
		ID:             4,
		Category:       FoodCategoryVegetable,
		FoodItem:       "Broccoli",
		ProteinGPer100: 2.8,
		CarbsGPer100:   7.0,
		FatGPer100:     0.4,
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

	s.Run("single food fails complexity score", func() {
		req := SolverRequest{
			RemainingBudget: MacroBudget{ProteinG: 20, CarbsG: 10, FatG: 5, CaloriesKcal: 150},
			PantryFoods:     []FoodNutrition{s.greekYoghurt()},
			MinIngredients:  1,
		}
		result := SolveMacros(req)
		s.False(result.Computed, "Single food should fail due to low complexity score")
	})

	s.Run("three foods finds solution", func() {
		req := SolverRequest{
			RemainingBudget: MacroBudget{
				ProteinG:     45,
				CarbsG:       60,
				FatG:         10,
				CaloriesKcal: 500,
			},
			PantryFoods:    []FoodNutrition{s.chicken(), s.rice(), s.broccoli()},
			MinIngredients: 3,
			MaxIngredients: 3,
			MealTime:       "dinner",
		}

		result := SolveMacros(req)

		s.True(result.Computed)
		s.NotEmpty(result.Solutions)

		// Should have 3 ingredients
		found := false
		for _, sol := range result.Solutions {
			if len(sol.Ingredients) == 3 {
				found = true
				break
			}
		}
		s.True(found, "expected at least one 3-ingredient solution")
	})

	s.Run("breakfast requires fruit or grain", func() {
		chicken := s.chicken()
		rice := s.rice() // Grain
		yoghurt := s.greekYoghurt()
		berries := s.berries() // Fruit

		// Case 1: Chicken only -> Fail (Protocol + Complexity)
		req := SolverRequest{
			RemainingBudget: MacroBudget{ProteinG: 30, CarbsG: 0, FatG: 5, CaloriesKcal: 200},
			PantryFoods:     []FoodNutrition{chicken},
			MinIngredients:  1,
			MealTime:        "breakfast",
		}
		res := SolveMacros(req)
		s.False(res.Computed)

		// Case 2: Yoghurt + Rice + Berries -> Valid
		req2 := SolverRequest{
			RemainingBudget: MacroBudget{ProteinG: 20, CarbsG: 50, FatG: 5, CaloriesKcal: 350},
			PantryFoods:     []FoodNutrition{yoghurt, rice, berries},
			MinIngredients:  3,
			MealTime:        "breakfast",
		}
		res2 := SolveMacros(req2)
		s.True(res2.Computed, "Should pass with Grain+Fruit")
	})

	s.Run("lunch prune excludes fruit", func() {
		// Mock foods
		apple := FoodNutrition{
			ID: 3, Category: FoodCategoryFruit, FoodItem: "Apple",
			CarbsGPer100: 14, ServingUnit: "large", ServingSizeG: 180,
		}
		chicken := s.chicken()

		req := SolverRequest{
			RemainingBudget: MacroBudget{ProteinG: 30, CarbsG: 30, FatG: 5, CaloriesKcal: 300},
			PantryFoods:     []FoodNutrition{chicken, apple},
			MinIngredients:  2,
			MealTime:        "lunch",
		}
		res := SolveMacros(req)

		// Since apple is pruned, we only have chicken. MinIngredients=2.
		// Should fail to compute.
		s.False(res.Computed, "Should fail because Apple is pruned for Lunch")
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
