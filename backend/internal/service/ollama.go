package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"victus/internal/domain"
)

// OllamaService provides AI-generated recipe names via local Ollama.
type OllamaService struct {
	baseURL string
	client  *http.Client
	enabled bool
}

// NewOllamaService creates a new OllamaService.
// If baseURL is empty, uses default "http://localhost:11434".
func NewOllamaService(baseURL string) *OllamaService {
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	return &OllamaService{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 10 * time.Second},
		enabled: true,
	}
}

type ollamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type ollamaResponse struct {
	Response string `json:"response"`
}

// GenerateRecipeName creates a creative name for the ingredient combination.
// Returns fallback name if Ollama is unavailable or returns an invalid response.
func (s *OllamaService) GenerateRecipeName(ctx context.Context, ingredients []string) string {
	fallback := generateFallbackName(ingredients)

	if !s.enabled || len(ingredients) == 0 {
		return fallback
	}

	prompt := fmt.Sprintf(
		`You are a creative chef naming simple meals. Create a short, appetizing name (2-4 words) for a meal with these ingredients: %s

Rules:
- Return ONLY the name, nothing else
- No quotes, no explanation
- Keep it simple and appetizing
- Example responses: "Protein Power Bowl", "Mediterranean Delight", "Quick Energy Mix"`,
		strings.Join(ingredients, ", "))

	req := ollamaRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fallback
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return fallback
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		// Disable for future requests if connection failed
		s.enabled = false
		return fallback
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fallback
	}

	var result ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fallback
	}

	// Clean up the response
	name := strings.TrimSpace(result.Response)
	name = strings.Trim(name, `"'`)
	name = strings.Split(name, "\n")[0] // Take only first line

	// Validate the response
	if len(name) < 3 || len(name) > 50 {
		return fallback
	}

	return name
}

// IsAvailable checks if Ollama service is reachable.
func (s *OllamaService) IsAvailable(ctx context.Context) bool {
	req, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/api/tags", nil)
	if err != nil {
		return false
	}

	resp, err := s.client.Do(req)
	if err != nil {
		s.enabled = false
		return false
	}
	defer resp.Body.Close()

	s.enabled = resp.StatusCode == http.StatusOK
	return s.enabled
}

// generateFallbackName creates a simple name when Ollama is unavailable.
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

// debriefLLMPayload is the JSON structure sent to Ollama for debrief narrative.
type debriefLLMPayload struct {
	WeekStart         string            `json:"weekStart"`
	WeekEnd           string            `json:"weekEnd"`
	OverallScore      float64           `json:"overallScore"`
	MealAdherence     float64           `json:"mealAdherence"`
	TrainingAdherence float64           `json:"trainingAdherence"`
	WeightChangeKg    float64           `json:"weightChangeKg"`
	MetabolicTrend    string            `json:"metabolicTrend"`
	TDEEDelta         int               `json:"tdeeDelta"`
	Days              []debriefDayShort `json:"days"`
	UserNotes         []string          `json:"userNotes,omitempty"`
}

type debriefDayShort struct {
	Date             string  `json:"date"`
	DayName          string  `json:"dayName"`
	DayType          string  `json:"dayType"`
	CalorieDelta     int     `json:"calorieDelta"`
	ProteinPercent   float64 `json:"proteinPercent"`
	TrainingComplete bool    `json:"trainingComplete"`
	TrainingLoad     float64 `json:"trainingLoad"`
	RPE              *int    `json:"rpe,omitempty"`
	CNSStatus        string  `json:"cnsStatus,omitempty"`
	SleepQuality     int     `json:"sleepQuality"`
	Notes            string  `json:"notes,omitempty"`
}

// GenerateDebriefNarrative generates a coaching-style narrative for the weekly debrief.
// Falls back to template-based narrative if Ollama is unavailable.
func (s *OllamaService) GenerateDebriefNarrative(
	ctx context.Context,
	input domain.DebriefInput,
	debrief *domain.WeeklyDebrief,
) domain.DebriefNarrative {
	// Build fallback first
	fallback := domain.GenerateFallbackNarrative(debrief)

	if !s.enabled {
		return fallback
	}

	// Build the LLM payload
	payload := buildDebriefPayload(input, debrief)

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fallback
	}

	prompt := fmt.Sprintf(`You are a direct, slightly dry, performance-oriented fitness coach analyzing a week of training and nutrition data.

WEEK DATA (JSON):
%s

Generate a weekly debrief narrative (2-3 paragraphs) that:
1. Opens with the overall vitality score and what it means
2. Highlights key wins and areas of concern
3. Notes any patterns in training, nutrition, or recovery
4. Ends with a forward-looking statement for the coming week

TONE: Direct and factual, with occasional dry humor. Think military briefing meets sports coach. No excessive enthusiasm or emoji. Address the user as "you".

CONSTRAINTS:
- Keep under 300 words
- Reference specific days when relevant (e.g., "Thursday's HIIT session...")
- Mention specific numbers when they're notable (e.g., "Your protein hit 92%% of target...")
- If CNS was depleted any day, mention it prominently

Return ONLY the narrative text, no preamble or explanation.`, string(payloadJSON))

	req := ollamaRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fallback
	}

	// Use a longer timeout for narrative generation (30s instead of 10s)
	narrativeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(narrativeCtx, "POST", s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return fallback
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		s.enabled = false
		return fallback
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fallback
	}

	var result ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fallback
	}

	// Clean up the response
	text := strings.TrimSpace(result.Response)
	if len(text) < 50 || len(text) > 2000 {
		return fallback
	}

	return domain.DebriefNarrative{
		Text:           text,
		GeneratedByLLM: true,
		Model:          "llama3.2",
	}
}

// buildDebriefPayload converts domain types to the LLM payload format.
func buildDebriefPayload(input domain.DebriefInput, debrief *domain.WeeklyDebrief) debriefLLMPayload {
	var days []debriefDayShort
	var userNotes []string

	for _, day := range debrief.DailyBreakdown {
		d := debriefDayShort{
			Date:             day.Date,
			DayName:          day.DayName,
			DayType:          string(day.DayType),
			CalorieDelta:     day.CalorieDelta,
			ProteinPercent:   day.ProteinPercent,
			TrainingComplete: day.ActualSessions >= day.PlannedSessions,
			TrainingLoad:     day.TrainingLoad,
			SleepQuality:     day.SleepQuality,
		}

		if day.AvgRPE != nil {
			rpe := int(*day.AvgRPE)
			d.RPE = &rpe
		}
		if day.CNSStatus != nil {
			d.CNSStatus = string(*day.CNSStatus)
		}
		if day.Notes != "" {
			d.Notes = day.Notes
			userNotes = append(userNotes, day.DayName+": "+day.Notes)
		}

		days = append(days, d)
	}

	return debriefLLMPayload{
		WeekStart:         debrief.WeekStartDate,
		WeekEnd:           debrief.WeekEndDate,
		OverallScore:      debrief.VitalityScore.Overall,
		MealAdherence:     debrief.VitalityScore.MealAdherence,
		TrainingAdherence: debrief.VitalityScore.TrainingAdherence,
		WeightChangeKg:    debrief.VitalityScore.WeightDelta,
		MetabolicTrend:    debrief.VitalityScore.MetabolicFlux.Trend,
		TDEEDelta:         debrief.VitalityScore.MetabolicFlux.DeltaKcal,
		Days:              days,
		UserNotes:         userNotes,
	}
}
