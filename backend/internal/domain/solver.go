package domain

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

// SolveMacros finds food combinations that match the remaining macro budget.
// Uses a combinatorial approach with 1, 2, and 3-ingredient combinations.
// Returns up to 3 solutions sorted by match score (highest first).
func SolveMacros(req SolverRequest) SolverResponse {
	if len(req.PantryFoods) == 0 {
		return SolverResponse{Computed: false}
	}

	maxIngredients := req.MaxIngredients
	if maxIngredients <= 0 {
		maxIngredients = 3
	}
	tolerance := req.TolerancePercent
	if tolerance <= 0 {
		tolerance = 0.10
	}

	var solutions []SolverSolution

	// Try single ingredient solutions
	for _, food := range req.PantryFoods {
		if sol := trySingleFood(food, req.RemainingBudget); sol != nil && sol.MatchScore >= 60 {
			solutions = append(solutions, *sol)
		}
	}

	// Try two ingredient combinations
	if maxIngredients >= 2 {
		for i := 0; i < len(req.PantryFoods); i++ {
			for j := i + 1; j < len(req.PantryFoods); j++ {
				if sol := tryTwoFoods(req.PantryFoods[i], req.PantryFoods[j], req.RemainingBudget); sol != nil && sol.MatchScore >= 60 {
					solutions = append(solutions, *sol)
				}
			}
		}
	}

	// Try three ingredient combinations only if we don't have enough good solutions
	if maxIngredients >= 3 && len(solutions) < 5 {
		for i := 0; i < len(req.PantryFoods); i++ {
			for j := i + 1; j < len(req.PantryFoods); j++ {
				for k := j + 1; k < len(req.PantryFoods); k++ {
					if sol := tryThreeFoods(req.PantryFoods[i], req.PantryFoods[j], req.PantryFoods[k], req.RemainingBudget); sol != nil && sol.MatchScore >= 60 {
						solutions = append(solutions, *sol)
					}
				}
			}
		}
	}

	// Sort by match score (descending)
	sort.Slice(solutions, func(i, j int) bool {
		return solutions[i].MatchScore > solutions[j].MatchScore
	})

	// Take top 3 diverse solutions (avoid duplicates of same primary ingredient)
	solutions = diversifySolutions(solutions, 3)

	return SolverResponse{
		Solutions: solutions,
		Computed:  len(solutions) > 0,
	}
}

// trySingleFood attempts to match the budget with a single food.
func trySingleFood(food FoodNutrition, target MacroBudget) *SolverSolution {
	caloriesPer100 := calculateCaloriesPer100(food)
	if caloriesPer100 <= 0 {
		return nil
	}

	// Calculate amount needed to hit calorie target
	amountG := float64(target.CaloriesKcal) / caloriesPer100 * 100

	// Skip if amount is unreasonable (< 10g or > 500g)
	if amountG < 10 || amountG > 500 {
		return nil
	}

	amountG, display := roundToServingSize(food, amountG)

	actual := calculateMacros(food, amountG)
	score := calculateMatchScore(actual, target)

	return &SolverSolution{
		Ingredients: []SolverIngredient{{
			Food:    food,
			AmountG: amountG,
			Display: display,
		}},
		TotalMacros: actual,
		MatchScore:  score,
		RecipeName:  generateFallbackName([]string{food.FoodItem}),
		WhyText:     generateWhyText(actual, target),
	}
}

// tryTwoFoods attempts to match the budget with two foods.
// Uses protein-first strategy: prioritize protein-rich food, then fill remaining with carbs/fat.
func tryTwoFoods(food1, food2 FoodNutrition, target MacroBudget) *SolverSolution {
	// Order foods: protein-heavy first, then carb/fat filler
	proteinFood, fillerFood := orderByProteinDensity(food1, food2)

	// Try different splits: 70/30, 60/40, 50/50
	splits := []struct{ protein, filler float64 }{
		{0.70, 0.30},
		{0.60, 0.40},
		{0.50, 0.50},
	}

	var bestSolution *SolverSolution
	bestScore := 0.0

	for _, split := range splits {
		proteinCals := float64(target.CaloriesKcal) * split.protein
		fillerCals := float64(target.CaloriesKcal) * split.filler

		proteinAmount := proteinCals / calculateCaloriesPer100(proteinFood) * 100
		fillerAmount := fillerCals / calculateCaloriesPer100(fillerFood) * 100

		// Skip unreasonable amounts
		if proteinAmount < 10 || proteinAmount > 400 || fillerAmount < 10 || fillerAmount > 400 {
			continue
		}

		proteinAmount, proteinDisplay := roundToServingSize(proteinFood, proteinAmount)
		fillerAmount, fillerDisplay := roundToServingSize(fillerFood, fillerAmount)

		actual := MacroBudget{}
		addMacros(&actual, proteinFood, proteinAmount)
		addMacros(&actual, fillerFood, fillerAmount)

		score := calculateMatchScore(actual, target)
		if score > bestScore {
			bestScore = score
			bestSolution = &SolverSolution{
				Ingredients: []SolverIngredient{
					{Food: proteinFood, AmountG: proteinAmount, Display: proteinDisplay},
					{Food: fillerFood, AmountG: fillerAmount, Display: fillerDisplay},
				},
				TotalMacros: actual,
				MatchScore:  score,
				RecipeName:  generateFallbackName([]string{proteinFood.FoodItem, fillerFood.FoodItem}),
				WhyText:     generateWhyText(actual, target),
			}
		}
	}

	return bestSolution
}

// tryThreeFoods attempts to match the budget with three foods.
// Uses protein-first strategy with primary protein, secondary protein/carb, and fat.
func tryThreeFoods(food1, food2, food3 FoodNutrition, target MacroBudget) *SolverSolution {
	foods := []FoodNutrition{food1, food2, food3}

	// Sort by protein density (highest first)
	sort.Slice(foods, func(i, j int) bool {
		return foods[i].ProteinGPer100 > foods[j].ProteinGPer100
	})

	// Split: 50% protein source, 30% secondary, 20% filler
	primaryCals := float64(target.CaloriesKcal) * 0.50
	secondaryCals := float64(target.CaloriesKcal) * 0.30
	fillerCals := float64(target.CaloriesKcal) * 0.20

	primaryAmount := primaryCals / calculateCaloriesPer100(foods[0]) * 100
	secondaryAmount := secondaryCals / calculateCaloriesPer100(foods[1]) * 100
	fillerAmount := fillerCals / calculateCaloriesPer100(foods[2]) * 100

	// Skip unreasonable amounts
	if primaryAmount < 10 || primaryAmount > 400 ||
		secondaryAmount < 10 || secondaryAmount > 300 ||
		fillerAmount < 10 || fillerAmount > 200 {
		return nil
	}

	primaryAmount, primaryDisplay := roundToServingSize(foods[0], primaryAmount)
	secondaryAmount, secondaryDisplay := roundToServingSize(foods[1], secondaryAmount)
	fillerAmount, fillerDisplay := roundToServingSize(foods[2], fillerAmount)

	actual := MacroBudget{}
	addMacros(&actual, foods[0], primaryAmount)
	addMacros(&actual, foods[1], secondaryAmount)
	addMacros(&actual, foods[2], fillerAmount)

	score := calculateMatchScore(actual, target)

	return &SolverSolution{
		Ingredients: []SolverIngredient{
			{Food: foods[0], AmountG: primaryAmount, Display: primaryDisplay},
			{Food: foods[1], AmountG: secondaryAmount, Display: secondaryDisplay},
			{Food: foods[2], AmountG: fillerAmount, Display: fillerDisplay},
		},
		TotalMacros: actual,
		MatchScore:  score,
		RecipeName:  generateFallbackName([]string{foods[0].FoodItem, foods[1].FoodItem, foods[2].FoodItem}),
		WhyText:     generateWhyText(actual, target),
	}
}

// calculateCaloriesPer100 returns calories per 100g for a food.
func calculateCaloriesPer100(food FoodNutrition) float64 {
	return food.ProteinGPer100*4 + food.CarbsGPer100*4 + food.FatGPer100*9
}

// calculateMacros returns the macros for a given amount of food.
func calculateMacros(food FoodNutrition, amountG float64) MacroBudget {
	factor := amountG / 100
	return MacroBudget{
		ProteinG:     food.ProteinGPer100 * factor,
		CarbsG:       food.CarbsGPer100 * factor,
		FatG:         food.FatGPer100 * factor,
		CaloriesKcal: int(calculateCaloriesPer100(food) * factor),
	}
}

// addMacros adds the macros from a food to an existing budget.
func addMacros(budget *MacroBudget, food FoodNutrition, amountG float64) {
	factor := amountG / 100
	budget.ProteinG += food.ProteinGPer100 * factor
	budget.CarbsG += food.CarbsGPer100 * factor
	budget.FatG += food.FatGPer100 * factor
	budget.CaloriesKcal += int(calculateCaloriesPer100(food) * factor)
}

// calculateMatchScore computes how well a solution matches the target.
// Returns 0-100 where 100 is perfect match.
// Weights: Calories 40%, Protein 30%, Carbs 20%, Fat 10%
func calculateMatchScore(actual, target MacroBudget) float64 {
	// Prevent division by zero
	if target.CaloriesKcal == 0 {
		return 0
	}

	// Calculate percentage differences
	calDiff := math.Abs(float64(actual.CaloriesKcal-target.CaloriesKcal)) / float64(target.CaloriesKcal)
	protDiff := safePercentDiff(actual.ProteinG, target.ProteinG)
	carbDiff := safePercentDiff(actual.CarbsG, target.CarbsG)
	fatDiff := safePercentDiff(actual.FatG, target.FatG)

	// Convert differences to scores (0% diff = 100 score, 50%+ diff = 0 score)
	calScore := math.Max(0, 100*(1-calDiff*2))
	protScore := math.Max(0, 100*(1-protDiff*2))
	carbScore := math.Max(0, 100*(1-carbDiff*2))
	fatScore := math.Max(0, 100*(1-fatDiff*2))

	// Weighted average
	return calScore*0.40 + protScore*0.30 + carbScore*0.20 + fatScore*0.10
}

// safePercentDiff calculates percentage difference safely.
func safePercentDiff(actual, target float64) float64 {
	if target <= 0 {
		if actual <= 0 {
			return 0
		}
		return 1.0 // 100% difference if target is 0 but actual is not
	}
	return math.Abs(actual-target) / target
}

// roundToServingSize rounds grams to realistic portions based on the food's serving unit.
func roundToServingSize(food FoodNutrition, rawGrams float64) (float64, string) {
	servingG := food.ServingSizeG
	if servingG <= 0 {
		servingG = 100
	}

	unit := food.ServingUnit
	if unit == "" {
		unit = "g"
	}

	// For gram-based servings, round to nearest 5g or 10g
	if unit == "g" || unit == "ml" {
		if rawGrams >= 100 {
			// Round to nearest 10g for larger amounts
			rounded := math.Round(rawGrams/10) * 10
			return rounded, fmt.Sprintf("%dg", int(rounded))
		}
		// Round to nearest 5g for smaller amounts
		rounded := math.Round(rawGrams/5) * 5
		if rounded < 10 {
			rounded = 10
		}
		return rounded, fmt.Sprintf("%dg", int(rounded))
	}

	// For unit-based servings (eggs, slices, tbsp, etc.)
	servings := math.Round(rawGrams / servingG)
	if servings < 1 {
		servings = 1
	}

	amountG := servings * servingG

	// Format display string
	if servings == 1 {
		return amountG, fmt.Sprintf("1 %s", unit)
	}
	return amountG, fmt.Sprintf("%d %s", int(servings), pluralizeUnit(unit))
}

// pluralizeUnit adds 's' to common units that need pluralization.
func pluralizeUnit(unit string) string {
	// Units that don't change in plural form
	noPlural := map[string]bool{
		"g": true, "ml": true, "tbsp": true, "tsp": true,
	}
	if noPlural[strings.ToLower(unit)] {
		return unit
	}

	// Simple pluralization
	return unit + "s"
}

// orderByProteinDensity returns foods ordered by protein density (highest first).
func orderByProteinDensity(food1, food2 FoodNutrition) (FoodNutrition, FoodNutrition) {
	if food1.ProteinGPer100 >= food2.ProteinGPer100 {
		return food1, food2
	}
	return food2, food1
}

// generateFallbackName creates a simple name from ingredient list.
func generateFallbackName(ingredients []string) string {
	if len(ingredients) == 0 {
		return "Quick Meal"
	}
	if len(ingredients) == 1 {
		return fmt.Sprintf("Simple %s", ingredients[0])
	}
	if len(ingredients) == 2 {
		return fmt.Sprintf("%s & %s", ingredients[0], ingredients[1])
	}
	return fmt.Sprintf("%s Mix", ingredients[0])
}

// generateWhyText creates a brief explanation of why the solution works.
func generateWhyText(actual, target MacroBudget) string {
	proteinDiff := actual.ProteinG - target.ProteinG
	calDiff := actual.CaloriesKcal - target.CaloriesKcal

	var parts []string

	if math.Abs(proteinDiff) < 5 && math.Abs(float64(calDiff)) < 30 {
		return "Near-perfect macro match for your remaining budget."
	}

	if proteinDiff > 5 {
		parts = append(parts, fmt.Sprintf("+%.0fg protein", proteinDiff))
	} else if proteinDiff < -5 {
		parts = append(parts, fmt.Sprintf("%.0fg protein below target", -proteinDiff))
	}

	if calDiff > 30 {
		parts = append(parts, fmt.Sprintf("+%d kcal", calDiff))
	} else if calDiff < -30 {
		parts = append(parts, fmt.Sprintf("%d kcal below target", -calDiff))
	}

	if len(parts) == 0 {
		return "Good balance of macros for your remaining budget."
	}

	return strings.Join(parts, ", ") + "."
}

// diversifySolutions filters solutions to avoid showing similar combinations.
// Prioritizes diversity by primary ingredient.
func diversifySolutions(solutions []SolverSolution, maxCount int) []SolverSolution {
	if len(solutions) <= maxCount {
		return solutions
	}

	var result []SolverSolution
	usedPrimary := make(map[string]bool)

	for _, sol := range solutions {
		if len(result) >= maxCount {
			break
		}
		if len(sol.Ingredients) == 0 {
			continue
		}

		primary := sol.Ingredients[0].Food.FoodItem
		if !usedPrimary[primary] {
			result = append(result, sol)
			usedPrimary[primary] = true
		}
	}

	// If we don't have enough diverse solutions, add more
	for _, sol := range solutions {
		if len(result) >= maxCount {
			break
		}
		found := false
		for _, r := range result {
			if r.RecipeName == sol.RecipeName {
				found = true
				break
			}
		}
		if !found {
			result = append(result, sol)
		}
	}

	return result
}
