package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"victus/internal/domain"
	"victus/internal/service"
	"victus/internal/store"
)

// VoiceCommandHandler handles voice command parsing requests.
type VoiceCommandHandler struct {
	ollamaService      *service.OllamaService
	bodyIssueStore     *store.BodyIssueStore
	dailyLogService    *service.DailyLogService
	foodReferenceStore *store.FoodReferenceStore
}

// NewVoiceCommandHandler creates a new voice command handler.
func NewVoiceCommandHandler(
	ollama *service.OllamaService,
	bodyIssueStore *store.BodyIssueStore,
	dailyLogService *service.DailyLogService,
	foodReferenceStore *store.FoodReferenceStore,
) *VoiceCommandHandler {
	return &VoiceCommandHandler{
		ollamaService:      ollama,
		bodyIssueStore:     bodyIssueStore,
		dailyLogService:    dailyLogService,
		foodReferenceStore: foodReferenceStore,
	}
}

// ParseVoiceCommandRequest represents the input for voice command parsing.
type ParseVoiceCommandRequest struct {
	RawInput string `json:"raw_input"`
	Date     string `json:"date,omitempty"` // Optional date context for body issues
}

// ActionTaken describes what data was persisted.
type ActionTaken struct {
	Type    string `json:"type"`    // "training_logged", "nutrition_logged", "weight_updated", etc.
	Summary string `json:"summary"` // Human-readable summary
}

// ParseVoiceCommandResponse represents the output of voice command parsing.
type ParseVoiceCommandResponse struct {
	Success        bool                       `json:"success"`
	Result         *domain.VoiceCommandResult `json:"result,omitempty"`
	IsDraft        bool                       `json:"is_draft"`        // True if training with missing duration
	NeedsMoreInfo  bool                       `json:"needs_more_info"` // True if critical fields are missing
	BodyMapUpdates []domain.BodyMapUpdate     `json:"body_map_updates,omitempty"`
	ActionTaken    *ActionTaken               `json:"action_taken,omitempty"` // What was persisted
	Error          string                     `json:"error,omitempty"`
}

// ParseVoiceCommand handles POST /api/voice/parse
// Immediately returns "queued" status, then processes in background goroutine.
// This makes the feature resilient to Ollama timeouts.
func (h *VoiceCommandHandler) ParseVoiceCommand(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ParseVoiceCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ParseVoiceCommandResponse{
			Success: false,
			Error:   "Invalid request body",
		})
		return
	}

	if req.RawInput == "" {
		writeJSON(w, http.StatusBadRequest, ParseVoiceCommandResponse{
			Success: false,
			Error:   "raw_input is required",
		})
		return
	}

	// Default to today's date if not provided
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}

	// Immediately return "queued" response
	log.Printf("[VOICE] Queued voice command: %q (date: %s)", req.RawInput, req.Date)

	// Fire off background processing (don't block the HTTP response)
	go h.processVoiceCommandAsync(req.RawInput, req.Date)

	// Return immediately with queued status
	writeJSON(w, http.StatusAccepted, ParseVoiceCommandResponse{
		Success: true,
		ActionTaken: &ActionTaken{
			Type:    "queued",
			Summary: "Processing in background...",
		},
	})
}

// processVoiceCommandAsync handles the Ollama parsing and persistence in a background goroutine.
// This is fire-and-forget - errors are logged but not returned to the client.
func (h *VoiceCommandHandler) processVoiceCommandAsync(rawInput, date string) {
	ctx := context.Background() // Use background context since HTTP request is already done

	// Parse voice command using Ollama (this is the slow part)
	result, err := h.ollamaService.ParseVoiceCommand(ctx, rawInput)
	if err != nil {
		log.Printf("[VOICE] Async parse error: %v", err)
		return
	}

	if result == nil {
		log.Printf("[VOICE] Async parse returned nil result")
		return
	}

	log.Printf("[VOICE] Async parse complete: intent=%s", result.Intent)

	// Extract body map updates if sensation is present
	bodyMapUpdates := result.ExtractBodyMapUpdates()
	if len(bodyMapUpdates) > 0 {
		h.persistBodyIssues(ctx, date, bodyMapUpdates)
	}

	// Persist the parsed data based on intent
	action := h.persistVoiceData(ctx, date, result)
	if action != nil {
		log.Printf("[VOICE] Async action completed: %s - %s", action.Type, action.Summary)
	}
}

// persistVoiceData persists the parsed voice command data to the database.
func (h *VoiceCommandHandler) persistVoiceData(ctx context.Context, date string, result *domain.VoiceCommandResult) *ActionTaken {
	switch result.Intent {
	case domain.VoiceIntentNutrition:
		return h.persistNutrition(ctx, date, result.Nutrition)
	case domain.VoiceIntentTraining:
		return h.persistTraining(ctx, date, result.Training)
	case domain.VoiceIntentBiometrics:
		return h.persistBiometrics(ctx, date, result.Biometrics)
	}
	return nil
}

// persistNutrition looks up foods and adds consumed macros.
func (h *VoiceCommandHandler) persistNutrition(ctx context.Context, date string, data *domain.NutritionData) *ActionTaken {
	if data == nil || len(data.Items) == 0 {
		return nil
	}

	// Get all foods from database for fuzzy matching
	var allFoods []domain.FoodNutrition
	if h.foodReferenceStore != nil {
		foods, err := h.foodReferenceStore.ListPantryFoods(ctx)
		if err != nil {
			log.Printf("[VOICE] Failed to load food reference: %v", err)
		} else {
			allFoods = foods
		}
	}

	// Calculate total macros from all items
	var totalCalories, totalProtein, totalCarbs, totalFat float64
	var loggedItems []string

	for _, item := range data.Items {
		// Try to find food in database
		food := findBestFoodMatch(item.Food, allFoods)

		// Default quantity to 100g if not specified
		var quantityG float64 = 100
		if item.Quantity != nil && item.Unit != nil {
			quantityG = convertToGrams(*item.Quantity, *item.Unit)
		} else if item.Quantity != nil {
			quantityG = *item.Quantity
		}

		if food != nil {
			// Calculate macros from database food
			multiplier := quantityG / 100.0
			totalProtein += food.ProteinGPer100 * multiplier
			totalCarbs += food.CarbsGPer100 * multiplier
			totalFat += food.FatGPer100 * multiplier
			// Calories = 4*protein + 4*carbs + 9*fat
			itemCals := (food.ProteinGPer100*4 + food.CarbsGPer100*4 + food.FatGPer100*9) * multiplier
			totalCalories += itemCals
			loggedItems = append(loggedItems, item.Food)
			log.Printf("[VOICE] Matched food '%s' -> %s (%.0fg): %.0f cal", item.Food, food.FoodItem, quantityG, itemCals)
		} else {
			// Use default estimates for unknown foods
			// Rough default: 1 cal/g, balanced macros
			totalCalories += quantityG
			totalProtein += quantityG * 0.1 // 10% protein
			totalCarbs += quantityG * 0.4   // 40% carbs
			totalFat += quantityG * 0.05    // 5% fat
			loggedItems = append(loggedItems, item.Food+" (estimated)")
			log.Printf("[VOICE] Unknown food '%s' - using estimate for %.0fg", item.Food, quantityG)
		}
	}

	// Add consumed macros to daily log
	if h.dailyLogService != nil && totalCalories > 0 {
		macros := store.ConsumedMacros{
			Meal:     nil, // No specific meal specified
			Calories: int(totalCalories),
			ProteinG: int(totalProtein),
			CarbsG:   int(totalCarbs),
			FatG:     int(totalFat),
		}

		_, err := h.dailyLogService.AddConsumedMacros(ctx, date, macros)
		if err != nil {
			log.Printf("[VOICE] Failed to add consumed macros: %v", err)
			return nil
		}

		log.Printf("[VOICE] Added consumed: %.0f cal, %.0fg P, %.0fg C, %.0fg F",
			totalCalories, totalProtein, totalCarbs, totalFat)

		return &ActionTaken{
			Type:    "nutrition_logged",
			Summary: strings.Join(loggedItems, ", "),
		}
	}

	return nil
}

// persistTraining adds a training session to the daily log.
func (h *VoiceCommandHandler) persistTraining(ctx context.Context, date string, data *domain.TrainingVoiceData) *ActionTaken {
	if data == nil {
		return nil
	}

	// Don't persist drafts (missing duration)
	if data.DurationMin == nil {
		log.Printf("[VOICE] Skipping draft training session (no duration)")
		return &ActionTaken{
			Type:    "training_draft",
			Summary: data.Activity + " (needs duration)",
		}
	}

	if h.dailyLogService == nil {
		return nil
	}

	// Convert to training session
	session := data.ToTrainingSession(1)

	// Get current log to find existing sessions
	log_, _, err := h.dailyLogService.GetLogWithTrainingLoad(ctx, date)
	if err != nil {
		log.Printf("[VOICE] No existing log for %s, cannot add training", date)
		return nil
	}

	// Add to existing actual sessions
	var sessions []domain.TrainingSession
	for _, s := range log_.ActualSessions {
		sessions = append(sessions, s)
	}

	// Add new session with correct session order
	session.SessionOrder = len(sessions) + 1
	session.IsPlanned = false
	sessions = append(sessions, session)

	// Update log
	_, err = h.dailyLogService.UpdateActualTraining(ctx, date, sessions)
	if err != nil {
		log.Printf("[VOICE] Failed to add training session: %v", err)
		return nil
	}

	log.Printf("[VOICE] Added training: %s for %d min", session.Type, session.DurationMin)

	return &ActionTaken{
		Type:    "training_logged",
		Summary: data.Activity,
	}
}

// persistBiometrics handles biometric data like weight and sleep.
func (h *VoiceCommandHandler) persistBiometrics(ctx context.Context, date string, data *domain.BiometricData) *ActionTaken {
	if data == nil {
		return nil
	}

	// Handle body status notes (sensations) - these are handled by body issue creation
	if strings.ToLower(data.Metric) == "body status" {
		if data.Sensation != nil {
			return &ActionTaken{
				Type:    "body_status_noted",
				Summary: *data.Sensation,
			}
		}
		return nil
	}

	// For weight/sleep, we'd need to update the log
	// This would require more complex logic (creating log if not exists, etc.)
	log.Printf("[VOICE] Biometric data received but not yet handled: %s = %v", data.Metric, data.Value)

	return &ActionTaken{
		Type:    "biometric_noted",
		Summary: data.Metric,
	}
}

// persistBodyIssues creates body issues from body map updates.
func (h *VoiceCommandHandler) persistBodyIssues(ctx context.Context, date string, updates []domain.BodyMapUpdate) {
	if h.bodyIssueStore == nil {
		return
	}

	for _, update := range updates {
		if update.BodyPart != "" && update.Symptom != "" {
			muscleGroups := domain.GetMuscleGroupsForAlias(update.BodyPart)
			for _, mg := range muscleGroups {
				input := domain.BodyPartIssueInput{
					Date:     date,
					BodyPart: mg,
					Symptom:  update.Symptom,
					RawText:  update.RawText,
				}
				if _, err := h.bodyIssueStore.Create(ctx, input); err != nil {
					log.Printf("[VOICE] Failed to create body issue for %s: %v", mg, err)
				} else {
					log.Printf("[VOICE] Created body issue: %s %s", mg, update.Symptom)
				}
			}
		}
	}
}

// findBestFoodMatch finds the best matching food from the database.
func findBestFoodMatch(searchTerm string, foods []domain.FoodNutrition) *domain.FoodNutrition {
	searchLower := strings.ToLower(searchTerm)

	// First pass: exact match
	for i := range foods {
		if strings.ToLower(foods[i].FoodItem) == searchLower {
			return &foods[i]
		}
	}

	// Second pass: contains match
	for i := range foods {
		foodLower := strings.ToLower(foods[i].FoodItem)
		if strings.Contains(foodLower, searchLower) || strings.Contains(searchLower, foodLower) {
			return &foods[i]
		}
	}

	// Third pass: partial word match
	searchWords := strings.Fields(searchLower)
	for i := range foods {
		foodLower := strings.ToLower(foods[i].FoodItem)
		for _, word := range searchWords {
			if len(word) > 2 && strings.Contains(foodLower, word) {
				return &foods[i]
			}
		}
	}

	return nil
}

// convertToGrams converts a quantity with unit to grams.
func convertToGrams(quantity float64, unit string) float64 {
	unit = strings.ToLower(unit)
	switch unit {
	case "g", "gram", "grams":
		return quantity
	case "kg", "kilogram", "kilograms":
		return quantity * 1000
	case "oz", "ounce", "ounces":
		return quantity * 28.35
	case "lb", "pound", "pounds":
		return quantity * 453.6
	case "cup", "cups":
		return quantity * 240 // approximate
	case "tbsp", "tablespoon", "tablespoons":
		return quantity * 15
	case "tsp", "teaspoon", "teaspoons":
		return quantity * 5
	case "ml", "milliliter", "milliliters":
		return quantity // approximate 1:1 for water-based liquids
	case "l", "liter", "liters":
		return quantity * 1000
	case "whole", "piece", "pieces":
		return quantity * 100 // rough estimate for "whole" items
	default:
		// Assume grams if unknown
		return quantity
	}
}

// writeJSON writes a JSON response with the given status code.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("[VOICE] Failed to encode response: %v", err)
	}
}
