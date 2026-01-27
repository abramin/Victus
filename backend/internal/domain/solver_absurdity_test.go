package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheckAbsurdity(t *testing.T) {
	t.Run("no warning for normal solution", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Chicken Breast"}, AmountG: 150},
				{Food: FoodNutrition{FoodItem: "Rice"}, AmountG: 100},
			},
			TotalMacros: MacroBudget{
				ProteinG: 45,
				CarbsG:   30,
				FatG:     5,
			},
		}

		warning := CheckAbsurdity(solution)
		assert.Nil(t, warning)
	})

	t.Run("warns for large single ingredient", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Chia Seeds"}, AmountG: 350},
			},
			TotalMacros: MacroBudget{
				ProteinG: 58,
				CarbsG:   140,
				FatG:     105,
			},
		}

		warning := CheckAbsurdity(solution)
		require.NotNil(t, warning)
		assert.Equal(t, "SINGLE_LARGE", warning.Code)
		assert.Contains(t, warning.Description, "Chia Seeds")
		assert.Equal(t, "Chia Seeds", warning.Ingredient)
	})

	t.Run("warns for high fat content", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Almonds"}, AmountG: 100},
				{Food: FoodNutrition{FoodItem: "Peanut Butter"}, AmountG: 50},
			},
			TotalMacros: MacroBudget{
				ProteinG: 25,
				CarbsG:   15,
				FatG:     55, // Over 50g threshold
			},
		}

		warning := CheckAbsurdity(solution)
		require.NotNil(t, warning)
		assert.Equal(t, "HIGH_FAT", warning.Code)
	})

	t.Run("warns for high protein", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Whey Protein"}, AmountG: 100},
				{Food: FoodNutrition{FoodItem: "Chicken Breast"}, AmountG: 200},
			},
			TotalMacros: MacroBudget{
				ProteinG: 70, // Over 60g threshold
				CarbsG:   5,
				FatG:     8,
			},
		}

		warning := CheckAbsurdity(solution)
		require.NotNil(t, warning)
		assert.Equal(t, "HIGH_PROTEIN", warning.Code)
	})

	t.Run("warns for high fiber from chia seeds", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Chia Seeds"}, AmountG: 150}, // Under 300g but high fiber
			},
			TotalMacros: MacroBudget{
				ProteinG: 25,
				CarbsG:   60,
				FatG:     45,
			},
		}

		warning := CheckAbsurdity(solution)
		require.NotNil(t, warning)
		assert.Equal(t, "HIGH_FIBER", warning.Code)
	})

	t.Run("single large takes precedence over high fiber", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Oats"}, AmountG: 400}, // Both large and high fiber
			},
			TotalMacros: MacroBudget{
				ProteinG: 50,
				CarbsG:   260,
				FatG:     28,
			},
		}

		warning := CheckAbsurdity(solution)
		require.NotNil(t, warning)
		// SINGLE_LARGE should be checked first
		assert.Equal(t, "SINGLE_LARGE", warning.Code)
	})
}

func TestEstimateFiberContent(t *testing.T) {
	t.Run("estimates fiber for chia seeds", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Chia Seeds"}, AmountG: 100},
			},
		}

		fiber := estimateFiberContent(solution)
		// Chia seeds have 34% fiber, so 100g = ~34g fiber
		assert.InDelta(t, 34.0, fiber, 1.0)
	})

	t.Run("estimates fiber for multiple high-fiber foods", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Oats"}, AmountG: 100},    // ~10g fiber
				{Food: FoodNutrition{FoodItem: "Almonds"}, AmountG: 50}, // ~6g fiber
			},
		}

		fiber := estimateFiberContent(solution)
		assert.InDelta(t, 16.0, fiber, 2.0)
	})

	t.Run("returns zero for non-fiber foods", func(t *testing.T) {
		solution := SolverSolution{
			Ingredients: []SolverIngredient{
				{Food: FoodNutrition{FoodItem: "Chicken Breast"}, AmountG: 200},
				{Food: FoodNutrition{FoodItem: "Eggs"}, AmountG: 100},
			},
		}

		fiber := estimateFiberContent(solution)
		assert.Equal(t, 0.0, fiber)
	})
}
