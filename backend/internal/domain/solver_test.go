package domain

import (
	"testing"
)

func TestSolveMacros_EmptyPantry(t *testing.T) {
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

	if result.Computed {
		t.Error("expected Computed=false for empty pantry")
	}
	if len(result.Solutions) != 0 {
		t.Errorf("expected no solutions, got %d", len(result.Solutions))
	}
}

func TestSolveMacros_SingleFood(t *testing.T) {
	// Greek Yoghurt: 10g protein, 3.6g carbs, 0.7g fat per 100g = ~60 kcal/100g
	greekYoghurt := FoodNutrition{
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

	req := SolverRequest{
		RemainingBudget: MacroBudget{
			ProteinG:     20,
			CarbsG:       10,
			FatG:         5,
			CaloriesKcal: 150,
		},
		PantryFoods: []FoodNutrition{greekYoghurt},
	}

	result := SolveMacros(req)

	if !result.Computed {
		t.Error("expected Computed=true")
	}
	if len(result.Solutions) == 0 {
		t.Fatal("expected at least one solution")
	}

	sol := result.Solutions[0]
	if len(sol.Ingredients) != 1 {
		t.Errorf("expected 1 ingredient, got %d", len(sol.Ingredients))
	}
	if sol.MatchScore <= 0 {
		t.Error("expected positive match score")
	}
}

func TestSolveMacros_TwoFoods(t *testing.T) {
	// Chicken breast: high protein
	chicken := FoodNutrition{
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

	// Brown rice: high carb
	rice := FoodNutrition{
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

	req := SolverRequest{
		RemainingBudget: MacroBudget{
			ProteinG:     45,
			CarbsG:       60,
			FatG:         10,
			CaloriesKcal: 500,
		},
		PantryFoods:    []FoodNutrition{chicken, rice},
		MaxIngredients: 2,
	}

	result := SolveMacros(req)

	if !result.Computed {
		t.Error("expected Computed=true")
	}

	// Should have solutions with chicken + rice
	found := false
	for _, sol := range result.Solutions {
		if len(sol.Ingredients) == 2 {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected at least one 2-ingredient solution")
	}
}

func TestCalculateMatchScore(t *testing.T) {
	tests := []struct {
		name     string
		actual   MacroBudget
		target   MacroBudget
		minScore float64
		maxScore float64
	}{
		{
			name: "perfect match",
			actual: MacroBudget{
				ProteinG:     40,
				CarbsG:       30,
				FatG:         10,
				CaloriesKcal: 400,
			},
			target: MacroBudget{
				ProteinG:     40,
				CarbsG:       30,
				FatG:         10,
				CaloriesKcal: 400,
			},
			minScore: 99,
			maxScore: 100,
		},
		{
			name: "10% off calories",
			actual: MacroBudget{
				ProteinG:     40,
				CarbsG:       30,
				FatG:         10,
				CaloriesKcal: 360, // 10% below
			},
			target: MacroBudget{
				ProteinG:     40,
				CarbsG:       30,
				FatG:         10,
				CaloriesKcal: 400,
			},
			minScore: 80,
			maxScore: 95,
		},
		{
			name: "very poor match",
			actual: MacroBudget{
				ProteinG:     10,
				CarbsG:       80,
				FatG:         30,
				CaloriesKcal: 600,
			},
			target: MacroBudget{
				ProteinG:     40,
				CarbsG:       30,
				FatG:         10,
				CaloriesKcal: 400,
			},
			minScore: 0,
			maxScore: 40,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := calculateMatchScore(tt.actual, tt.target)
			if score < tt.minScore || score > tt.maxScore {
				t.Errorf("expected score between %.0f and %.0f, got %.2f", tt.minScore, tt.maxScore, score)
			}
		})
	}
}

func TestRoundToServingSize(t *testing.T) {
	tests := []struct {
		name        string
		food        FoodNutrition
		rawGrams    float64
		wantDisplay string
	}{
		{
			name: "egg rounds to whole",
			food: FoodNutrition{
				FoodItem:     "Egg",
				ServingUnit:  "large",
				ServingSizeG: 53,
			},
			rawGrams:    106,
			wantDisplay: "2 larges",
		},
		{
			name: "tablespoon rounds",
			food: FoodNutrition{
				FoodItem:     "Olive Oil",
				ServingUnit:  "tbsp",
				ServingSizeG: 14,
			},
			rawGrams:    21,
			wantDisplay: "2 tbsp",
		},
		{
			name: "grams round to 10",
			food: FoodNutrition{
				FoodItem:     "Chicken",
				ServingUnit:  "g",
				ServingSizeG: 100,
			},
			rawGrams:    153,
			wantDisplay: "150g",
		},
		{
			name: "small grams round to 5",
			food: FoodNutrition{
				FoodItem:     "Nuts",
				ServingUnit:  "g",
				ServingSizeG: 30,
			},
			rawGrams:    27,
			wantDisplay: "25g",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, display := roundToServingSize(tt.food, tt.rawGrams)
			if display != tt.wantDisplay {
				t.Errorf("expected display %q, got %q", tt.wantDisplay, display)
			}
		})
	}
}

func TestGenerateWhyText(t *testing.T) {
	actual := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}
	target := MacroBudget{ProteinG: 40, CarbsG: 30, FatG: 10, CaloriesKcal: 400}

	text := generateWhyText(actual, target)
	if text == "" {
		t.Error("expected non-empty why text")
	}
}

func TestDiversifySolutions(t *testing.T) {
	solutions := []SolverSolution{
		{RecipeName: "Chicken A", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Chicken"}}}},
		{RecipeName: "Chicken B", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Chicken"}}}},
		{RecipeName: "Rice A", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Rice"}}}},
		{RecipeName: "Yoghurt A", Ingredients: []SolverIngredient{{Food: FoodNutrition{FoodItem: "Yoghurt"}}}},
	}

	result := diversifySolutions(solutions, 3)

	if len(result) != 3 {
		t.Errorf("expected 3 solutions, got %d", len(result))
	}

	// Should have one of each primary ingredient
	primaries := make(map[string]bool)
	for _, sol := range result {
		if len(sol.Ingredients) > 0 {
			primaries[sol.Ingredients[0].Food.FoodItem] = true
		}
	}

	if !primaries["Chicken"] || !primaries["Rice"] || !primaries["Yoghurt"] {
		t.Error("expected diverse primary ingredients")
	}
}
