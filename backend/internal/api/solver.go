package api

import (
	"encoding/json"
	"net/http"

	"victus/internal/domain"
)

// SolveMacrosRequest represents the API request body for macro solving.
type SolveMacrosRequest struct {
	RemainingProteinG int `json:"remainingProteinG"`
	RemainingCarbsG   int `json:"remainingCarbsG"`
	RemainingFatG     int `json:"remainingFatG"`
	RemainingCalories int `json:"remainingCalories"`
	// Optional training context for semantic refinement
	DayType         string                   `json:"dayType,omitempty"`
	PlannedTraining []PlannedTrainingRequest `json:"plannedTraining,omitempty"`
	MealTime        string                   `json:"mealTime,omitempty"`
	ActiveProtocol  string                   `json:"activeProtocol,omitempty"`
}

// PlannedTrainingRequest represents a planned training session in the solver request.
type PlannedTrainingRequest struct {
	Type        string `json:"type"`
	DurationMin int    `json:"durationMin"`
}

// SolveMacrosResponse represents the API response for macro solving.
type SolveMacrosResponse struct {
	Solutions []SolutionResponse `json:"solutions"`
	Computed  bool               `json:"computed"`
}

// SolutionResponse represents a single solver solution.
type SolutionResponse struct {
	Ingredients []IngredientResponse        `json:"ingredients"`
	TotalMacros MacroBudgetResponse         `json:"totalMacros"`
	MatchScore  float64                     `json:"matchScore"`
	RecipeName  string                      `json:"recipeName"`
	WhyText     string                      `json:"whyText"`
	Refinement  *SemanticRefinementResponse `json:"refinement,omitempty"`
}

// SemanticRefinementResponse represents AI-enhanced recipe presentation.
type SemanticRefinementResponse struct {
	MissionTitle      string  `json:"missionTitle"`
	TacticalPrep      string  `json:"tacticalPrep"`
	AbsurdityAlert    *string `json:"absurdityAlert,omitempty"`
	ContextualInsight string  `json:"contextualInsight"`
	GeneratedByLLM    bool    `json:"generatedByLlm"`
}

// IngredientResponse represents a food ingredient in a solution.
type IngredientResponse struct {
	FoodID   int64   `json:"foodId"`
	FoodName string  `json:"foodName"`
	AmountG  float64 `json:"amountG"`
	Display  string  `json:"display"`
}

// MacroBudgetResponse represents macro values in a solution.
type MacroBudgetResponse struct {
	ProteinG     float64 `json:"proteinG"`
	CarbsG       float64 `json:"carbsG"`
	FatG         float64 `json:"fatG"`
	CaloriesKcal int     `json:"caloriesKcal"`
}

// solveMacros handles POST /api/solver/solve
func (s *Server) solveMacros(w http.ResponseWriter, r *http.Request) {
	var req SolveMacrosRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON in request body")
		return
	}

	// Validate minimum remaining budget
	if req.RemainingCalories < 150 {
		writeError(w, http.StatusBadRequest, "insufficient_budget", "Need at least 150 kcal remaining to solve")
		return
	}

	budget := domain.MacroBudget{
		ProteinG:     float64(req.RemainingProteinG),
		CarbsG:       float64(req.RemainingCarbsG),
		FatG:         float64(req.RemainingFatG),
		CaloriesKcal: req.RemainingCalories,
	}

	// Build training context if provided
	var trainingCtx *domain.TrainingContextForSolver
	if req.DayType != "" || len(req.PlannedTraining) > 0 || req.MealTime != "" {
		trainingCtx = &domain.TrainingContextForSolver{
			MealTime: req.MealTime,
		}

		// Parse day type
		if req.DayType != "" {
			if dayType, err := domain.ParseDayType(req.DayType); err == nil {
				trainingCtx.DayType = dayType
			}
		}

		// Convert planned training sessions
		for _, sess := range req.PlannedTraining {
			if trainingType, err := domain.ParseTrainingType(sess.Type); err == nil {
				trainingCtx.PlannedSessions = append(trainingCtx.PlannedSessions, domain.TrainingSession{
					Type:        trainingType,
					DurationMin: sess.DurationMin,
				})
			}
		}

		// Parse active protocol
		if req.ActiveProtocol != "" {
			if protocol, err := domain.ParseFastingProtocol(req.ActiveProtocol); err == nil {
				trainingCtx.ActiveProtocol = protocol
			}
		}
	}

	result, err := s.solverService.SolveWithContext(r.Context(), budget, trainingCtx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "solver_error", err.Error())
		return
	}

	// Convert to response
	response := SolveMacrosResponse{
		Computed:  result.Computed,
		Solutions: make([]SolutionResponse, 0, len(result.Solutions)),
	}

	for _, sol := range result.Solutions {
		ingredients := make([]IngredientResponse, 0, len(sol.Ingredients))
		for _, ing := range sol.Ingredients {
			ingredients = append(ingredients, IngredientResponse{
				FoodID:   ing.Food.ID,
				FoodName: ing.Food.FoodItem,
				AmountG:  ing.AmountG,
				Display:  ing.Display,
			})
		}

		solResp := SolutionResponse{
			Ingredients: ingredients,
			TotalMacros: MacroBudgetResponse{
				ProteinG:     sol.TotalMacros.ProteinG,
				CarbsG:       sol.TotalMacros.CarbsG,
				FatG:         sol.TotalMacros.FatG,
				CaloriesKcal: sol.TotalMacros.CaloriesKcal,
			},
			MatchScore: sol.MatchScore,
			RecipeName: sol.RecipeName,
			WhyText:    sol.WhyText,
		}

		// Add refinement if available
		if sol.Refinement != nil {
			solResp.Refinement = &SemanticRefinementResponse{
				MissionTitle:      sol.Refinement.MissionTitle,
				TacticalPrep:      sol.Refinement.TacticalPrep,
				AbsurdityAlert:    sol.Refinement.AbsurdityAlert,
				ContextualInsight: sol.Refinement.ContextualInsight,
				GeneratedByLLM:    sol.Refinement.GeneratedByLLM,
			}
		}

		response.Solutions = append(response.Solutions, solResp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
