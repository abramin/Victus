package service

import (
	"context"
	"log"
	"strings"

	"victus/internal/domain"
	"victus/internal/store"
)

// VoiceActionTaken describes what data was persisted from a voice command.
type VoiceActionTaken struct {
	Type    string // "training_logged", "nutrition_logged", "weight_updated", etc.
	Summary string // Human-readable summary
}

// VoiceCommandService handles business logic for voice command processing.
type VoiceCommandService struct {
	ollamaService      *OllamaService
	bodyIssueStore     *store.BodyIssueStore
	dailyLogService    *DailyLogService
	foodReferenceStore *store.FoodReferenceStore
}

// NewVoiceCommandService creates a new VoiceCommandService.
func NewVoiceCommandService(
	ollama *OllamaService,
	bodyIssueStore *store.BodyIssueStore,
	dailyLogService *DailyLogService,
	foodReferenceStore *store.FoodReferenceStore,
) *VoiceCommandService {
	return &VoiceCommandService{
		ollamaService:      ollama,
		bodyIssueStore:     bodyIssueStore,
		dailyLogService:    dailyLogService,
		foodReferenceStore: foodReferenceStore,
	}
}

// ProcessCommand parses raw voice input via Ollama and persists the result.
// This is the main orchestration method (fire-and-forget safe).
func (s *VoiceCommandService) ProcessCommand(ctx context.Context, rawInput, date string) {
	// Parse voice command using Ollama (this is the slow part)
	result, err := s.ollamaService.ParseVoiceCommand(ctx, rawInput)
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
		s.persistBodyIssues(ctx, date, bodyMapUpdates)
	}

	// Persist the parsed data based on intent
	action := s.persistVoiceData(ctx, date, result)
	if action != nil {
		log.Printf("[VOICE] Async action completed: %s - %s", action.Type, action.Summary)
	}
}

// persistVoiceData persists the parsed voice command data based on intent.
func (s *VoiceCommandService) persistVoiceData(ctx context.Context, date string, result *domain.VoiceCommandResult) *VoiceActionTaken {
	switch result.Intent {
	case domain.VoiceIntentNutrition:
		return s.persistNutrition(ctx, date, result.Nutrition)
	case domain.VoiceIntentTraining:
		return s.persistTraining(ctx, date, result.Training)
	case domain.VoiceIntentBiometrics:
		return s.persistBiometrics(ctx, date, result.Biometrics)
	}
	return nil
}

// persistNutrition looks up foods and adds consumed macros.
func (s *VoiceCommandService) persistNutrition(ctx context.Context, date string, data *domain.NutritionData) *VoiceActionTaken {
	if data == nil || len(data.Items) == 0 {
		return nil
	}

	// Get all foods from database for fuzzy matching
	var allFoods []domain.FoodNutrition
	if s.foodReferenceStore != nil {
		foods, err := s.foodReferenceStore.ListPantryFoods(ctx)
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
		food := domain.FindBestFoodMatch(item.Food, allFoods)

		// Default quantity to 100g if not specified
		var quantityG float64 = 100
		if item.Quantity != nil && item.Unit != nil {
			quantityG = domain.ConvertToGrams(*item.Quantity, *item.Unit)
		} else if item.Quantity != nil {
			quantityG = *item.Quantity
		}

		if food != nil {
			multiplier := quantityG / 100.0
			totalProtein += food.ProteinGPer100 * multiplier
			totalCarbs += food.CarbsGPer100 * multiplier
			totalFat += food.FatGPer100 * multiplier
			itemCals := (food.ProteinGPer100*4 + food.CarbsGPer100*4 + food.FatGPer100*9) * multiplier
			totalCalories += itemCals
			loggedItems = append(loggedItems, item.Food)
			log.Printf("[VOICE] Matched food '%s' -> %s (%.0fg): %.0f cal", item.Food, food.FoodItem, quantityG, itemCals)
		} else {
			// Use default estimates for unknown foods
			totalCalories += quantityG
			totalProtein += quantityG * 0.1
			totalCarbs += quantityG * 0.4
			totalFat += quantityG * 0.05
			loggedItems = append(loggedItems, item.Food+" (estimated)")
			log.Printf("[VOICE] Unknown food '%s' - using estimate for %.0fg", item.Food, quantityG)
		}
	}

	// Add consumed macros to daily log
	if s.dailyLogService != nil && totalCalories > 0 {
		macros := store.ConsumedMacros{
			Meal:     nil,
			Calories: int(totalCalories),
			ProteinG: int(totalProtein),
			CarbsG:   int(totalCarbs),
			FatG:     int(totalFat),
		}

		_, err := s.dailyLogService.AddConsumedMacros(ctx, date, macros)
		if err != nil {
			log.Printf("[VOICE] Failed to add consumed macros: %v", err)
			return nil
		}

		log.Printf("[VOICE] Added consumed: %.0f cal, %.0fg P, %.0fg C, %.0fg F",
			totalCalories, totalProtein, totalCarbs, totalFat)

		return &VoiceActionTaken{
			Type:    "nutrition_logged",
			Summary: strings.Join(loggedItems, ", "),
		}
	}

	return nil
}

// persistTraining adds a training session to the daily log.
func (s *VoiceCommandService) persistTraining(ctx context.Context, date string, data *domain.TrainingVoiceData) *VoiceActionTaken {
	if data == nil {
		return nil
	}

	// Don't persist drafts (missing duration)
	if data.DurationMin == nil {
		log.Printf("[VOICE] Skipping draft training session (no duration)")
		return &VoiceActionTaken{
			Type:    "training_draft",
			Summary: data.Activity + " (needs duration)",
		}
	}

	if s.dailyLogService == nil {
		return nil
	}

	session := data.ToTrainingSession(1)

	// Get current log to find existing sessions
	log_, _, err := s.dailyLogService.GetLogWithTrainingLoad(ctx, date)
	if err != nil {
		log.Printf("[VOICE] No existing log for %s, cannot add training", date)
		return nil
	}

	// Add to existing actual sessions
	var sessions []domain.TrainingSession
	for _, sess := range log_.ActualSessions {
		sessions = append(sessions, sess)
	}

	session.SessionOrder = len(sessions) + 1
	session.IsPlanned = false
	sessions = append(sessions, session)

	_, err = s.dailyLogService.UpdateActualTraining(ctx, date, sessions)
	if err != nil {
		log.Printf("[VOICE] Failed to add training session: %v", err)
		return nil
	}

	log.Printf("[VOICE] Added training: %s for %d min", session.Type, session.DurationMin)

	return &VoiceActionTaken{
		Type:    "training_logged",
		Summary: data.Activity,
	}
}

// persistBiometrics handles biometric data like weight and sleep.
func (s *VoiceCommandService) persistBiometrics(ctx context.Context, date string, data *domain.BiometricData) *VoiceActionTaken {
	if data == nil {
		return nil
	}

	if strings.ToLower(data.Metric) == "body status" {
		if data.Sensation != nil {
			return &VoiceActionTaken{
				Type:    "body_status_noted",
				Summary: *data.Sensation,
			}
		}
		return nil
	}

	log.Printf("[VOICE] Biometric data received but not yet handled: %s = %v", data.Metric, data.Value)

	return &VoiceActionTaken{
		Type:    "biometric_noted",
		Summary: data.Metric,
	}
}

// persistBodyIssues creates body issues from body map updates.
func (s *VoiceCommandService) persistBodyIssues(ctx context.Context, date string, updates []domain.BodyMapUpdate) {
	if s.bodyIssueStore == nil {
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
				input.ResolveSeverity()
				if _, err := s.bodyIssueStore.Create(ctx, input); err != nil {
					log.Printf("[VOICE] Failed to create body issue for %s: %v", mg, err)
				} else {
					log.Printf("[VOICE] Created body issue: %s %s", mg, update.Symptom)
				}
			}
		}
	}
}
