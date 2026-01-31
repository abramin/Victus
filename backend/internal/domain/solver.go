package domain

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

// SolveMacros finds food combinations that match the remaining macro budget.
// Uses a recursive backtracking approach (templated) to find combinations of 3-5 ingredients.
// Enforces biological protocols (Category Locking) and prioritizes nutrient density.
func SolveMacros(req SolverRequest) SolverResponse {
	if len(req.PantryFoods) == 0 {
		return SolverResponse{Computed: false}
	}

	minIngredients := req.MinIngredients
	if minIngredients <= 0 {
		minIngredients = 3
	}
	maxIngredients := req.MaxIngredients
	if maxIngredients <= 0 {
		maxIngredients = 5
	}
	// Safety constraint to prevent exponential explosion
	if maxIngredients > 5 {
		maxIngredients = 5
	}

	// Tolerance unused in new scoring model, relying on MatchScore threshold instead.

	// Normalize meal time
	mealTime := strings.ToLower(req.MealTime)

	// Filter and Prune pantry foods aggressively based on meal time
	validFoods := pruneFoodsForMealTime(req.PantryFoods, mealTime)

	if len(validFoods) == 0 {
		return SolverResponse{Computed: false}
	}

	// Use template-based generator
	solutions := generateSolutionsByTemplates(validFoods, req.RemainingBudget, mealTime, minIngredients, maxIngredients)

	// Sort by match score (descending)
	sort.Slice(solutions, func(i, j int) bool {
		return solutions[i].MatchScore > solutions[j].MatchScore
	})

	// Take top diverse solutions
	solutions = diversifySolutions(solutions, 5)

	return SolverResponse{
		Solutions: solutions,
		Computed:  len(solutions) > 0,
	}
}

// pruneFoodsForMealTime filters foods that violate meal-specific rules/protocols.
func pruneFoodsForMealTime(foods []FoodNutrition, mealTime string) []FoodNutrition {
	var keep []FoodNutrition
	isBF := mealTime == "breakfast"
	isMain := mealTime == "lunch" || mealTime == "dinner"

	for _, f := range foods {
		// General validity check
		if calculateCaloriesPer100(f) <= 0 {
			continue
		}

		lowerName := strings.ToLower(f.FoodItem)

		// Breakfast Constraints:
		// - No Vegetables
		// - No Savory Meats (Chicken, Fish, Beef, etc.)
		if isBF {
			if f.Category == FoodCategoryVegetable {
				continue
			}
			// Exclude savory meats - crude heuristic
			if isSavoryMeat(lowerName, f.Category) {
				continue
			}
		}

		// Lunch/Dinner Constraints:
		// - No Fruit
		// - No "Breakfast foods" (Oats, Nuts, Seeds - unless used in savory context? User said 'dont include oats, nuts, seeds')
		if isMain {
			if f.Category == FoodCategoryFruit {
				continue
			}
			if strings.Contains(lowerName, "oat") ||
				strings.Contains(lowerName, "muesli") ||
				strings.Contains(lowerName, "cereal") {
				continue
			}
			// Nuts/Seeds check - debatable if strictly breakfast, but user requested exclusion for Lunch/Dinner
			// often these are fats.
			if strings.Contains(lowerName, "nut") || strings.Contains(lowerName, "seed") || strings.Contains(lowerName, "chia") {
				continue
			}
		}

		keep = append(keep, f)
	}
	return keep
}

func isSavoryMeat(name string, cat FoodCategory) bool {
	// If it matches common meat names and is NOT a neutral protein powder/yogurt
	// Allow: Whey, Casein, Youtube, Egg (Eggs are breakfast friendly)
	if strings.Contains(name, "whey") || strings.Contains(name, "casein") || strings.Contains(name, "yog") || strings.Contains(name, "egg") {
		return false
	}

	savoryKeywords := []string{"chicken", "beef", "fish", "tuna", "pork", "steak", "cod", "salmon", "turkey", "ham", "lamb"}
	for _, kw := range savoryKeywords {
		if strings.Contains(name, kw) {
			return true
		}
	}
	// Fallback: mostly HighProtein is savory unless allowed list
	return false
}

// generateSolutionsByTemplates uses broad templates to find candidates
func generateSolutionsByTemplates(foods []FoodNutrition, target MacroBudget, mealTime string, min, max int) []SolverSolution {
	var solutions []SolverSolution

	// Categorize foods for faster access
	prots := filterByMacroRole(foods, "protein")
	carbs := filterByMacroRole(foods, "carb")
	fats := filterByMacroRole(foods, "fat")
	veggies := filterByMacroRole(foods, "veg")
	fruits := filterByMacroRole(foods, "fruit")

	// Helpers
	isBF := mealTime == "breakfast"

	// --- 1-Ingredient Templates ---
	if min <= 1 && max >= 1 {
		// Just Protein, or just Carb (Snack?)
		solutions = append(solutions, tryTemplate1(prots, target, mealTime)...)
		solutions = append(solutions, tryTemplate1(carbs, target, mealTime)...)
	}

	// --- 2-Ingredient Templates ---
	if min <= 2 && max >= 2 {
		// Protein + Carb
		solutions = append(solutions, tryTemplate2(prots, carbs, target, mealTime)...)
		// Protein + Fat
		solutions = append(solutions, tryTemplate2(prots, fats, target, mealTime)...)
		// Protein + Fruit (Breakfast?)
		if isBF {
			solutions = append(solutions, tryTemplate2(prots, filterByMacroRole(foods, "fruit"), target, mealTime)...)
		}
	}

	// --- 3-Ingredient Templates ---
	// 1. Protein + Carb + Veg/Fruit
	if min <= 3 && max >= 3 {
		thirdCat := veggies
		if isBF {
			thirdCat = fruits
			// Fallback: If no fruit, perhaps just double carb? Or Carb type B?
			// Protocol: Breakfast MUST contain Fruit or Grain.
			// pruneFoodsForMealTime removes Veg from BF.
			// So thirdCat=veggies is empty for BF.
			// If fruits is empty, we only have Prots+Carbs left.
		}

		solutions = append(solutions, tryTemplate3(prots, carbs, thirdCat, target, mealTime)...)

		// 2. Protein + Fat + Veg/Fruit (Keto style or just fat focused)
		solutions = append(solutions, tryTemplate3(prots, fats, thirdCat, target, mealTime)...)
	}

	// --- 4-Ingredient Templates ---
	// Protein + Carb + Fat + Veg/Fruit
	if min <= 4 && max >= 4 {
		fourthCat := veggies
		if isBF {
			fourthCat = fruits
		}
		solutions = append(solutions, tryTemplate4(prots, carbs, fats, fourthCat, target, mealTime)...)
	}

	return solutions
}

func filterByMacroRole(foods []FoodNutrition, role string) []FoodNutrition {
	var out []FoodNutrition
	for _, f := range foods {
		switch role {
		case "protein":
			if f.ProteinGPer100 >= 10 && f.Category != FoodCategoryVegetable {
				out = append(out, f)
			}
		case "carb":
			if f.CarbsGPer100 >= 10 && f.Category != FoodCategoryVegetable && f.Category != FoodCategoryFruit {
				out = append(out, f)
			}
		case "fat":
			if f.FatGPer100 >= 10 {
				out = append(out, f)
			}
		case "veg":
			if f.Category == FoodCategoryVegetable {
				out = append(out, f)
			}
		case "fruit":
			if f.Category == FoodCategoryFruit {
				out = append(out, f)
			}
		}
	}
	return out
}

func tryTemplate1(g1 []FoodNutrition, target MacroBudget, mealTime string) []SolverSolution {
	var sols []SolverSolution
	for _, f1 := range g1 {
		sol := solveAmounts1(f1, target)
		if sol != nil && isProtocolCompliant(sol.Ingredients, mealTime) {
			sols = append(sols, *sol)
		}
	}
	return sols
}

func tryTemplate2(g1, g2 []FoodNutrition, target MacroBudget, mealTime string) []SolverSolution {
	var sols []SolverSolution
	for _, f1 := range g1 {
		for _, f2 := range g2 {
			if f1.ID == f2.ID {
				continue
			}
			sol := solveAmounts2(f1, f2, target)
			if sol != nil && isProtocolCompliant(sol.Ingredients, mealTime) {
				sols = append(sols, *sol)
			}
		}
	}
	return sols
}

func tryTemplate3(g1, g2, g3 []FoodNutrition, target MacroBudget, mealTime string) []SolverSolution {
	var sols []SolverSolution

	for _, f1 := range g1 {
		for _, f2 := range g2 {
			if f1.ID == f2.ID {
				continue
			}
			for _, f3 := range g3 {
				if f3.ID == f1.ID || f3.ID == f2.ID {
					continue
				}

				// Attempt to solve amounts
				sol := solveAmounts3(f1, f2, f3, target)
				if sol != nil && isProtocolCompliant(sol.Ingredients, mealTime) {
					sols = append(sols, *sol)
				}
			}
		}
	}
	return sols
}

func tryTemplate4(g1, g2, g3, g4 []FoodNutrition, target MacroBudget, mealTime string) []SolverSolution {
	var sols []SolverSolution
	count := 0
	limit := 2000

	for _, f1 := range g1 {
		for _, f2 := range g2 {
			if f1.ID == f2.ID {
				continue
			}
			for _, f3 := range g3 {
				if f3.ID == f1.ID || f3.ID == f2.ID {
					continue
				}
				for _, f4 := range g4 {
					if f4.ID == f1.ID || f4.ID == f2.ID || f4.ID == f3.ID {
						continue
					}

					if count > limit {
						return sols
					}
					count++

					sol := solveAmounts4(f1, f2, f3, f4, target)
					if sol != nil && isProtocolCompliant(sol.Ingredients, mealTime) {
						sols = append(sols, *sol)
					}
				}
			}
		}
	}
	return sols
}

// solveAmounts1
func solveAmounts1(f1 FoodNutrition, target MacroBudget) *SolverSolution {
	// Fit to Calories
	cals := calculateCaloriesPer100(f1)
	if cals <= 0 {
		return nil
	}
	amt1 := (float64(target.CaloriesKcal) / cals) * 100
	return buildSolution([]FoodNutrition{f1}, []float64{amt1}, target)
}

// solveAmounts2
func solveAmounts2(f1, f2 FoodNutrition, target MacroBudget) *SolverSolution {
	// 70/30 split logic
	reqProt := target.ProteinG
	amt1 := (reqProt * 0.7 / f1.ProteinGPer100) * 100 // Slightly reduced protein reliance
	if amt1 <= 0 || math.IsInf(amt1, 0) {
		amt1 = 100
	}

	cals1 := calculateCaloriesPer100(f1) * (amt1 / 100)
	remCals := float64(target.CaloriesKcal) - cals1
	if remCals < 0 {
		remCals = 0
	}

	// Fit remainder to F2
	cals2 := calculateCaloriesPer100(f2)
	if cals2 <= 0 {
		return nil
	}
	amt2 := (remCals / cals2) * 100

	return buildSolution([]FoodNutrition{f1, f2}, []float64{amt1, amt2}, target)
}

// solveAmounts3 attempts to fit 3 foods to target
func solveAmounts3(f1, f2, f3 FoodNutrition, target MacroBudget) *SolverSolution {
	// Heuristic Scale:
	// F1 (Protein): 80% of protein need
	reqProt := target.ProteinG

	amt1 := (reqProt * 0.8 / f1.ProteinGPer100) * 100
	if amt1 <= 0 || math.IsInf(amt1, 0) {
		amt1 = 100
	}

	// Remaining calories
	cals1 := calculateCaloriesPer100(f1) * (amt1 / 100)
	remCals := float64(target.CaloriesKcal) - cals1
	if remCals < 0 {
		remCals = 0
	}

	// Split remainder: F2=70%, F3=30%
	cals2 := remCals * 0.7
	cals3 := remCals * 0.3

	amt2 := (cals2 / calculateCaloriesPer100(f2)) * 100
	amt3 := (cals3 / calculateCaloriesPer100(f3)) * 100

	return buildSolution([]FoodNutrition{f1, f2, f3}, []float64{amt1, amt2, amt3}, target)
}

func solveAmounts4(f1, f2, f3, f4 FoodNutrition, target MacroBudget) *SolverSolution {
	reqProt := target.ProteinG
	amt1 := (reqProt * 0.75 / f1.ProteinGPer100) * 100
	if amt1 <= 0 || math.IsInf(amt1, 0) {
		amt1 = 100
	}

	cals1 := calculateCaloriesPer100(f1) * (amt1 / 100)
	remCals := float64(target.CaloriesKcal) - cals1
	if remCals < 0 {
		remCals = 0
	}

	// Split remaining: F2(40%), F3(30%), F4(30%)
	amt2 := (remCals * 0.4 / calculateCaloriesPer100(f2)) * 100
	amt3 := (remCals * 0.3 / calculateCaloriesPer100(f3)) * 100
	amt4 := (remCals * 0.3 / calculateCaloriesPer100(f4)) * 100

	return buildSolution([]FoodNutrition{f1, f2, f3, f4}, []float64{amt1, amt2, amt3, amt4}, target)
}

func buildSolution(foods []FoodNutrition, amounts []float64, target MacroBudget) *SolverSolution {
	var ingredients []SolverIngredient
	var total MacroBudget

	for i, f := range foods {
		amt := amounts[i]
		// Rounds
		amt, display := roundToServingSize(f, amt)

		// Sanity limits
		if amt < 10 || amt > 600 {
			return nil
		}

		ingredients = append(ingredients, SolverIngredient{
			Food:    f,
			AmountG: amt,
			Display: display,
		})
		addMacros(&total, f, amt)
	}

	score := calculateAdvancedScore(total, target, ingredients)
	if score < 60 {
		return nil
	}

	return &SolverSolution{
		Ingredients: ingredients,
		TotalMacros: total,
		MatchScore:  score,
		WhyText:     generateWhyText(total, target),
		RecipeName:  generateFallbackNameFromIngredients(ingredients),
	}
}

// calculateAdvancedScore implements: (MacroAccuracy * 0.6) + (IngredientCount * 0.2) + (FiberContent * 0.2)
func calculateAdvancedScore(actual, target MacroBudget, ingredients []SolverIngredient) float64 {
	macroScore := calculateMatchScore(actual, target)

	count := len(ingredients)
	countScore := 0.0
	if count >= 5 {
		countScore = 100.0
	} else if count == 4 {
		countScore = 80.0
	} else if count >= 3 {
		countScore = 60.0
	} else {
		countScore = 20.0
	}

	estFiber := 0.0
	for _, ing := range ingredients {
		estFiber += estimateFiber(ing.Food, ing.AmountG)
	}

	fiberScore := math.Min(100, estFiber*10.0)

	finalScore := (macroScore * 0.6) + (countScore * 0.2) + (fiberScore * 0.2)

	return finalScore
}

func estimateFiber(f FoodNutrition, amountG float64) float64 {
	rate := 0.0
	if f.Category == FoodCategoryVegetable {
		rate = 0.04
	}
	if f.Category == FoodCategoryFruit {
		rate = 0.03
	}
	if f.Category == FoodCategoryHighCarb {
		rate = 0.03
	}

	return amountG * rate
}

// isProtocolCompliant enforces category locking
func isProtocolCompliant(ingredients []SolverIngredient, mealTime string) bool {
	// Post-validation in case templates missed something or if we use this elsewhere.
	// Pruning handles most, but this is the final gate.

	hasFruit := false
	hasGrain := false
	hasVeg := false

	for _, ing := range ingredients {
		if ing.Food.Category == FoodCategoryFruit {
			hasFruit = true
		}
		if ing.Food.Category == FoodCategoryVegetable {
			hasVeg = true
		}
		if ing.Food.Category == FoodCategoryHighCarb {
			hasGrain = true
		} // Proxy for grain

		// Savory check for BF
		if mealTime == "breakfast" {
			if ing.Food.Category == FoodCategoryVegetable {
				return false
			}
			if isSavoryMeat(strings.ToLower(ing.Food.FoodItem), ing.Food.Category) {
				return false
			}
		}

		// Fruit/Grain exclusion for Lunch/Dinner check (based on Pruning, but good to have)
		if mealTime == "lunch" || mealTime == "dinner" {
			if ing.Food.Category == FoodCategoryFruit {
				return false
			}
			// Also checking user restriction "dont include oats, nuts, seeds"
			name := strings.ToLower(ing.Food.FoodItem)
			if strings.Contains(name, "oat") || strings.Contains(name, "seed") || strings.Contains(name, "nut") {
				return false
			}
		}
	}

	if mealTime == "breakfast" {
		// MUST contain Fruit OR Grain
		if !hasFruit && !hasGrain {
			return false
		}
	}

	if mealTime == "lunch" || mealTime == "dinner" {
		// MUST contain Vegetable
		if !hasVeg {
			return false
		}
	}

	return true
}

// --- Helpers reuse ---

func calculateCaloriesPer100(food FoodNutrition) float64 {
	return food.ProteinGPer100*4 + food.CarbsGPer100*4 + food.FatGPer100*9
}

func addMacros(budget *MacroBudget, food FoodNutrition, amountG float64) {
	factor := amountG / 100
	budget.ProteinG += food.ProteinGPer100 * factor
	budget.CarbsG += food.CarbsGPer100 * factor
	budget.FatG += food.FatGPer100 * factor
	budget.CaloriesKcal += int(calculateCaloriesPer100(food) * factor)
}

func calculateMatchScore(actual, target MacroBudget) float64 {
	if target.CaloriesKcal == 0 {
		return 0
	}
	calDiff := math.Abs(float64(actual.CaloriesKcal-target.CaloriesKcal)) / float64(target.CaloriesKcal)
	protDiff := safePercentDiff(actual.ProteinG, target.ProteinG)
	carbDiff := safePercentDiff(actual.CarbsG, target.CarbsG)
	fatDiff := safePercentDiff(actual.FatG, target.FatG)

	calScore := math.Max(0, 100*(1-calDiff*2))
	protScore := math.Max(0, 100*(1-protDiff*2))
	carbScore := math.Max(0, 100*(1-carbDiff*2))
	fatScore := math.Max(0, 100*(1-fatDiff*2))

	return calScore*0.40 + protScore*0.30 + carbScore*0.20 + fatScore*0.10
}

func safePercentDiff(actual, target float64) float64 {
	if target <= 0 {
		if actual <= 0 {
			return 0
		}
		return 1.0
	}
	return math.Abs(actual-target) / target
}

func roundToServingSize(food FoodNutrition, rawGrams float64) (float64, string) {
	servingG := food.ServingSizeG
	if servingG <= 0 {
		servingG = 100
	}
	unit := food.ServingUnit
	if unit == "" {
		unit = "g"
	}

	if unit == "g" || unit == "ml" {
		if rawGrams >= 100 {
			rounded := math.Round(rawGrams/10) * 10
			return rounded, fmt.Sprintf("%dg", int(rounded))
		}
		rounded := math.Round(rawGrams/5) * 5
		if rounded < 10 {
			rounded = 10
		}
		return rounded, fmt.Sprintf("%dg", int(rounded))
	}

	servings := math.Round(rawGrams / servingG)
	if servings < 1 {
		servings = 1
	}
	amountG := servings * servingG
	if servings == 1 {
		return amountG, fmt.Sprintf("1 %s", unit)
	}
	return amountG, fmt.Sprintf("%d %s", int(servings), pluralizeUnit(unit))
}

func pluralizeUnit(unit string) string {
	noPlural := map[string]bool{"g": true, "ml": true, "tbsp": true, "tsp": true}
	if noPlural[strings.ToLower(unit)] {
		return unit
	}
	return unit + "s"
}

func generateFallbackNameFromIngredients(ingredients []SolverIngredient) string {
	var names []string
	for _, ing := range ingredients {
		names = append(names, ing.Food.FoodItem)
	}
	if len(names) == 0 {
		return "Quick Meal"
	}
	if len(names) == 1 {
		return fmt.Sprintf("Simple %s", names[0])
	}
	if len(names) == 2 {
		return fmt.Sprintf("%s & %s", names[0], names[1])
	}
	return fmt.Sprintf("%s Bowl", names[0])
}

func generateWhyText(actual, target MacroBudget) string {
	proteinDiff := actual.ProteinG - target.ProteinG
	calDiff := actual.CaloriesKcal - target.CaloriesKcal
	var parts []string
	if math.Abs(proteinDiff) < 5 && math.Abs(float64(calDiff)) < 30 {
		return "Perfect macro precision. Nutrient dense."
	}
	if proteinDiff > 5 {
		parts = append(parts, fmt.Sprintf("+%.0fg protein", proteinDiff))
	}
	if proteinDiff < -5 {
		parts = append(parts, fmt.Sprintf("%.0fg protein under", -proteinDiff))
	}
	if calDiff > 30 {
		parts = append(parts, fmt.Sprintf("+%d kcal", calDiff))
	}
	if calDiff < -30 {
		parts = append(parts, fmt.Sprintf("%d kcal under", -calDiff))
	}
	if len(parts) == 0 {
		return "Balanced and protocol compliant."
	}
	return strings.Join(parts, ", ") + "."
}

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
