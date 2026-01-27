package domain

import "fmt"

// Absurdity detection thresholds
const (
	maxSingleIngredientG = 300.0 // Maximum grams for a single ingredient
	maxFatG              = 50.0  // Maximum fat grams per solution
	maxProteinG          = 60.0  // Maximum protein grams (absorption concern)
	maxFiberEstimateG    = 40.0  // Estimated max fiber from carb-heavy foods
)

// High-fiber foods for fiber estimation (carbs are ~10-30% fiber in these)
var highFiberFoods = map[string]float64{
	"chia seeds":   0.34, // 34g fiber per 100g
	"flax seeds":   0.27,
	"oats":         0.10,
	"quinoa":       0.07,
	"lentils":      0.08,
	"black beans":  0.09,
	"chickpeas":    0.08,
	"almonds":      0.12,
	"broccoli":     0.03,
	"avocado":      0.07,
}

// CheckAbsurdity analyzes a solver solution for logistic concerns.
// Returns nil if no concerns detected, otherwise returns the most severe warning.
// This is a pure domain function with no I/O dependencies.
func CheckAbsurdity(solution SolverSolution) *AbsurdityWarning {
	// Check 1: Single ingredient exceeding threshold
	for _, ing := range solution.Ingredients {
		if ing.AmountG > maxSingleIngredientG {
			return &AbsurdityWarning{
				Code: "SINGLE_LARGE",
				Description: fmt.Sprintf("Large serving of %s (%.0fg). Consider splitting into two portions.",
					ing.Food.FoodItem, ing.AmountG),
				Ingredient: ing.Food.FoodItem,
			}
		}
	}

	// Check 2: High fat content
	if solution.TotalMacros.FatG > maxFatG {
		return &AbsurdityWarning{
			Code: "HIGH_FAT",
			Description: fmt.Sprintf("High fat content (%.0fg). May slow digestion and cause discomfort.",
				solution.TotalMacros.FatG),
		}
	}

	// Check 3: High protein in single meal (absorption concern)
	if solution.TotalMacros.ProteinG > maxProteinG {
		return &AbsurdityWarning{
			Code: "HIGH_PROTEIN",
			Description: fmt.Sprintf("High protein (%.0fg). Consider splitting to optimize absorption.",
				solution.TotalMacros.ProteinG),
		}
	}

	// Check 4: Estimate fiber content and check for high fiber
	estimatedFiber := estimateFiberContent(solution)
	if estimatedFiber > maxFiberEstimateG {
		return &AbsurdityWarning{
			Code: "HIGH_FIBER",
			Description: fmt.Sprintf("High fiber volume (est. %.0fg). Divide into two servings to avoid GI distress.",
				estimatedFiber),
		}
	}

	return nil
}

// estimateFiberContent estimates the fiber content of a solution.
// Uses known fiber ratios for high-fiber foods.
func estimateFiberContent(solution SolverSolution) float64 {
	var totalFiber float64

	for _, ing := range solution.Ingredients {
		// Check if this is a known high-fiber food
		foodLower := toLowerASCII(ing.Food.FoodItem)
		for pattern, fiberPer100 := range highFiberFoods {
			if containsASCII(foodLower, pattern) {
				totalFiber += (ing.AmountG / 100) * fiberPer100 * 100 // Convert to grams
				break
			}
		}
	}

	return totalFiber
}

// toLowerASCII converts a string to lowercase (ASCII only).
// Avoids importing strings package to keep domain pure.
func toLowerASCII(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + 32
		} else {
			result[i] = c
		}
	}
	return string(result)
}

// containsASCII checks if s contains substr.
// Avoids importing strings package to keep domain pure.
func containsASCII(s, substr string) bool {
	if len(substr) > len(s) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
