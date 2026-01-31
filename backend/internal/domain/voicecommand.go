package domain

import (
	"fmt"
	"strings"
	"time"
)

// VoiceCommandIntent represents the identified intent from a voice command.
type VoiceCommandIntent string

const (
	VoiceIntentTraining   VoiceCommandIntent = "TRAINING"
	VoiceIntentNutrition  VoiceCommandIntent = "NUTRITION"
	VoiceIntentBiometrics VoiceCommandIntent = "BIOMETRICS"
)

// ValidVoiceIntents contains all valid voice command intent values.
var ValidVoiceIntents = map[VoiceCommandIntent]bool{
	VoiceIntentTraining:   true,
	VoiceIntentNutrition:  true,
	VoiceIntentBiometrics: true,
}

// ParseVoiceIntent safely converts a string to VoiceCommandIntent with validation.
func ParseVoiceIntent(s string) (VoiceCommandIntent, error) {
	intent := VoiceCommandIntent(strings.ToUpper(s))
	if !ValidVoiceIntents[intent] {
		return "", ErrInvalidVoiceIntent
	}
	return intent, nil
}

// VoiceCommandResult represents the parsed output from a voice command.
// Uses a polymorphic wrapper pattern where only one of Training/Nutrition/Biometrics
// will be populated based on the identified Intent.
type VoiceCommandResult struct {
	Intent     VoiceCommandIntent `json:"intent"`
	Training   *TrainingVoiceData `json:"training_data,omitempty"`
	Nutrition  *NutritionData     `json:"nutrition_data,omitempty"`
	Biometrics *BiometricData     `json:"biometric_data,omitempty"`
	ParsedAt   time.Time          `json:"parsed_at"`
	RawInput   string             `json:"raw_input"`
	Confidence float64            `json:"confidence"` // 0.0-1.0 parser confidence
}

// TrainingVoiceData represents training-specific data extracted from voice.
// Uses pointer types to distinguish between "not mentioned" (nil) and "mentioned as zero".
type TrainingVoiceData struct {
	Activity    string  `json:"activity"`               // e.g., "Rowing", "Running"
	DurationMin *int    `json:"duration_min,omitempty"` // nil if not mentioned
	AvgHR       *int    `json:"avg_hr,omitempty"`       // nil if not mentioned
	RPE         *int    `json:"rpe,omitempty"`          // nil if not mentioned (1-10 scale)
	Sensation   *string `json:"sensation,omitempty"`    // e.g., "wrist hurts", "felt strong"
}

// NutritionData represents nutrition-specific data extracted from voice.
type NutritionData struct {
	Items []NutritionItem `json:"items"`
}

// NutritionItem represents a single food item from a nutrition voice command.
type NutritionItem struct {
	Food     string   `json:"food"`               // e.g., "Greek Yogurt", "eggs"
	Quantity *float64 `json:"quantity,omitempty"` // nil if not mentioned
	Unit     *string  `json:"unit,omitempty"`     // e.g., "g", "cup", "whole", nil if not mentioned
}

// BiometricData represents biometric-specific data extracted from voice.
type BiometricData struct {
	Metric    string   `json:"metric"`              // e.g., "Weight", "Sleep", "Body Status"
	Value     *float64 `json:"value,omitempty"`     // nil if not mentioned (e.g., body status note)
	Unit      *string  `json:"unit,omitempty"`      // e.g., "kg", "hours", nil if not applicable
	Sensation *string  `json:"sensation,omitempty"` // e.g., "left knee clicky" for body status
}

// ValidateVoiceCommandResult checks all fields for validity.
func ValidateVoiceCommandResult(result *VoiceCommandResult) error {
	if result == nil {
		return ErrNilVoiceCommand
	}

	if !ValidVoiceIntents[result.Intent] {
		return ErrInvalidVoiceIntent
	}

	// Ensure the correct data type is populated for the intent
	switch result.Intent {
	case VoiceIntentTraining:
		if result.Training == nil {
			return fmt.Errorf("%w: TRAINING intent requires training_data", ErrMissingVoiceData)
		}
		if result.Training.Activity == "" {
			return fmt.Errorf("%w: training activity is required", ErrMissingVoiceData)
		}
		// Validate RPE range if present
		if result.Training.RPE != nil && (*result.Training.RPE < 1 || *result.Training.RPE > 10) {
			return ErrInvalidRPEOffset
		}
		// Validate HR range if present
		if result.Training.AvgHR != nil && (*result.Training.AvgHR < 30 || *result.Training.AvgHR > 250) {
			return fmt.Errorf("%w: avg_hr out of range [30, 250]", ErrInvalidVoiceData)
		}
		// Validate duration if present
		if result.Training.DurationMin != nil && (*result.Training.DurationMin < 0 || *result.Training.DurationMin > 480) {
			return ErrInvalidTrainingDuration
		}

	case VoiceIntentNutrition:
		if result.Nutrition == nil || len(result.Nutrition.Items) == 0 {
			return fmt.Errorf("%w: NUTRITION intent requires at least one item", ErrMissingVoiceData)
		}
		for i, item := range result.Nutrition.Items {
			if item.Food == "" {
				return fmt.Errorf("%w: nutrition item %d missing food name", ErrMissingVoiceData, i)
			}
			if item.Quantity != nil && *item.Quantity < 0 {
				return fmt.Errorf("%w: nutrition item %d has negative quantity", ErrInvalidVoiceData, i)
			}
		}

	case VoiceIntentBiometrics:
		if result.Biometrics == nil {
			return fmt.Errorf("%w: BIOMETRICS intent requires biometric_data", ErrMissingVoiceData)
		}
		if result.Biometrics.Metric == "" {
			return fmt.Errorf("%w: biometric metric is required", ErrMissingVoiceData)
		}
		// Value can be nil for body status notes (e.g., "knee feels clicky")
	}

	return nil
}

// IsDraftTrainingSession returns true if the training data has an activity
// but is missing duration (indicating a quick submission that needs more info).
func (r *VoiceCommandResult) IsDraftTrainingSession() bool {
	if r.Intent != VoiceIntentTraining || r.Training == nil {
		return false
	}
	return r.Training.Activity != "" && r.Training.DurationMin == nil
}

// BodyMapUpdate represents a body part update extracted from a sensation field.
type BodyMapUpdate struct {
	BodyPart string  // Matched body alias (e.g., "knee", "wrist")
	Symptom  string  // Matched symptom keyword (e.g., "clicky", "sore")
	RawText  string  // Original sensation text
	Delta    float64 // Suggested joint integrity delta (-1.0 to +1.0)
}

// ExtractBodyMapUpdates parses the sensation field from Training or Biometrics data
// to identify body parts and symptoms for BodyStatus updates.
// Returns nil if no body parts are detected.
func (r *VoiceCommandResult) ExtractBodyMapUpdates() []BodyMapUpdate {
	var sensation string

	switch r.Intent {
	case VoiceIntentTraining:
		if r.Training != nil && r.Training.Sensation != nil {
			sensation = *r.Training.Sensation
		}
	case VoiceIntentBiometrics:
		if r.Biometrics != nil && r.Biometrics.Sensation != nil {
			sensation = *r.Biometrics.Sensation
		}
	default:
		return nil
	}

	if sensation == "" {
		return nil
	}

	return parseBodyMapUpdates(sensation)
}

// parseBodyMapUpdates scans text for body part aliases and symptom keywords.
func parseBodyMapUpdates(text string) []BodyMapUpdate {
	text = strings.ToLower(text)
	words := strings.Fields(text)

	var updates []BodyMapUpdate
	foundParts := make(map[string]bool)

	// Find body parts
	for _, word := range words {
		word = strings.Trim(word, ".,!?")
		if _, ok := BodyAliasToMuscleGroup[word]; ok && !foundParts[word] {
			foundParts[word] = true

			// Look for symptoms in the text
			symptom := ""
			delta := 0.0
			for symptomWord, severity := range SymptomSeverityMap {
				if strings.Contains(text, symptomWord) {
					symptom = symptomWord
					// Convert severity to delta
					switch severity {
					case IssueSeverityHealing:
						delta = 0.3
					case IssueSeverityMinor:
						delta = -0.2
					case IssueSeverityModerate:
						delta = -0.4
					case IssueSeveritySevere:
						delta = -0.6
					}
					break
				}
			}

			updates = append(updates, BodyMapUpdate{
				BodyPart: word,
				Symptom:  symptom,
				RawText:  text,
				Delta:    delta,
			})
		}
	}

	return updates
}

// ToTrainingSession converts TrainingVoiceData to a TrainingSession for logging.
// The session will be marked as IsDraft if DurationMin is nil.
func (t *TrainingVoiceData) ToTrainingSession(order int) TrainingSession {
	session := TrainingSession{
		SessionOrder: order,
		IsPlanned:    false,
		IsDraft:      t.DurationMin == nil,
		Notes:        "",
	}

	// Parse training type from activity (best effort match)
	activity := strings.ToLower(t.Activity)
	switch {
	case strings.Contains(activity, "row"):
		session.Type = TrainingTypeRow
	case strings.Contains(activity, "run"):
		session.Type = TrainingTypeRun
	case strings.Contains(activity, "walk"):
		session.Type = TrainingTypeWalking
	case strings.Contains(activity, "cycle") || strings.Contains(activity, "bike"):
		session.Type = TrainingTypeCycle
	case strings.Contains(activity, "hiit"):
		session.Type = TrainingTypeHIIT
	case strings.Contains(activity, "strength") || strings.Contains(activity, "lift"):
		session.Type = TrainingTypeStrength
	case strings.Contains(activity, "calisthenics") || strings.Contains(activity, "bodyweight"):
		session.Type = TrainingTypeCalisthenics
	case strings.Contains(activity, "mobility") || strings.Contains(activity, "stretch"):
		session.Type = TrainingTypeMobility
	case strings.Contains(activity, "qigong") || strings.Contains(activity, "qi gong"):
		session.Type = TrainingTypeQigong
	case strings.Contains(activity, "gmb"):
		session.Type = TrainingTypeGMB
	default:
		session.Type = TrainingTypeMixed
	}

	// Set duration if provided
	if t.DurationMin != nil {
		session.DurationMin = *t.DurationMin
	}

	// Set RPE if provided
	if t.RPE != nil {
		session.PerceivedIntensity = t.RPE
	}

	// Add sensation to notes if present
	if t.Sensation != nil {
		session.Notes = *t.Sensation
	}

	return session
}
