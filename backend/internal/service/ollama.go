package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
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
// Uses a short timeout (3s) to avoid blocking for too long.
func (s *OllamaService) IsAvailable(ctx context.Context) bool {
	// Create a short-lived context for health check (3 seconds max)
	healthCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(healthCtx, "GET", s.baseURL+"/api/tags", nil)
	if err != nil {
		s.enabled = false
		return false
	}

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("[OLLAMA] Health check failed: %v", err)
		s.enabled = false
		return false
	}
	defer resp.Body.Close()

	isAvailable := resp.StatusCode == http.StatusOK
	s.enabled = isAvailable

	if isAvailable {
		log.Printf("[OLLAMA] Health check passed - service is available")
	} else {
		log.Printf("[OLLAMA] Health check failed - received status %d", resp.StatusCode)
	}

	return s.enabled
}

// Generate sends a generic prompt to Ollama and returns the response.
// Returns error if Ollama is unavailable or request fails.
func (s *OllamaService) Generate(ctx context.Context, prompt string) (string, error) {
	if !s.enabled {
		return "", fmt.Errorf("ollama service is disabled")
	}

	req := ollamaRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		s.enabled = false
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	var result ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return strings.TrimSpace(result.Response), nil
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

// semanticRefinerPayload is the JSON structure sent to Ollama for semantic refinement.
type semanticRefinerPayload struct {
	Ingredients     []string `json:"ingredients"`
	TotalCalories   int      `json:"totalCalories"`
	TotalProteinG   float64  `json:"totalProteinG"`
	TotalCarbsG     float64  `json:"totalCarbsG"`
	TotalFatG       float64  `json:"totalFatG"`
	MatchScore      float64  `json:"matchScore"`
	DayType         string   `json:"dayType,omitempty"`
	PlannedTraining []string `json:"plannedTraining,omitempty"`
	MealTime        string   `json:"mealTime,omitempty"`
	AbsurdityHint   string   `json:"absurdityHint,omitempty"`
}

// semanticRefinerResponse is the expected JSON response from Ollama.
type semanticRefinerResponse struct {
	MissionTitle      string  `json:"missionTitle"`
	OperationalSteps  string  `json:"operationalSteps"`
	LogisticAlert     *string `json:"logisticAlert"`
	FlavorPatch       *string `json:"flavorPatch"`
	ContextualInsight string  `json:"contextualInsight"`
}

// GenerateSemanticRefinement creates tactical presentation for a solver solution.
// Returns AI-enhanced recipe naming, preparation instructions, and contextual insights.
// Falls back to domain-generated content if Ollama is unavailable.
func (s *OllamaService) GenerateSemanticRefinement(
	ctx context.Context,
	solution domain.SolverSolution,
	trainingCtx *domain.TrainingContextForSolver,
	absurdity *domain.AbsurdityWarning,
) domain.SemanticRefinement {
	fallback := BuildFallbackRefinement(solution, absurdity)

	// Try to reconnect if previously disabled (don't give up permanently)
	if !s.enabled {
		log.Printf("[OLLAMA] Ollama was previously disabled, attempting reconnection...")
		// Quick health check to see if Ollama is back online
		if !s.IsAvailable(ctx) {
			log.Printf("[OLLAMA] Ollama still unavailable, using fallback")
			return fallback
		}
		log.Printf("[OLLAMA] Ollama connection restored!")
	}

	log.Printf("[OLLAMA] Generating semantic refinement for %d ingredients", len(solution.Ingredients))

	// Build the payload
	payload := buildSemanticRefinerPayload(solution, trainingCtx, absurdity)

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fallback
	}

	prompt := fmt.Sprintf(`You are the Victus Neural OS Logistics Chef. You receive raw ingredient data and transform it into a tactical field ration briefing.

SOLUTION DATA (JSON):
%s

YOUR MISSION:
Generate a JSON response with EXACTLY these 5 fields. Return ONLY valid JSON with no preamble or explanation.

REQUIRED JSON FORMAT:
{
  "missionTitle": "string",
  "operationalSteps": "string",
  "logisticAlert": null or "string",
  "flavorPatch": null or "string",
  "contextualInsight": "string"
}

FIELD SPECIFICATIONS:

1. missionTitle (string, 15-60 chars):
   - Format: [MAIN INGREDIENT] + [TEXTURE/PREP] // [ALPHA-NUMERIC CODE]
   - MUST BE ALL CAPS
   - Example: "WHEY CHIA SLUDGE // MK-4"
   - Example: "CHICKEN RICE STACK // BR-12"
   - Example: "BANANA OAT SLURRY // OP-7"

2. operationalSteps (string, 20-250 chars):
   - ONE sentence with specific mechanical instructions
   - Include measurements (ml, tbsp, minutes)
   - CRITICAL: If ingredients are dry/incompatible (whey powder + chia seeds), you MUST instruct adding liquid
   - Liquids to suggest: Water, Almond Milk, Coconut Milk, Coffee
   - Example: "Hydrate 12 tbsp chia in 300ml water for 10 mins, then fold in 6 scoops whey until pudding consistency."
   - Example: "Mix 200g chicken with 150g cooked rice and microwave 90 seconds until steaming."

3. logisticAlert (null or string, max 150 chars):
   - Only if there's a genuine problem (very high protein >60g, weird combo, digestive concern)
   - MUST include the SOLUTION/SPLITTING STRATEGY
   - Example: "PROTEIN OVERLOAD (72g). Split into 2 servings: consume 50%% now, refrigerate 50%% for +3hr post-training."
   - Example: null if no concerns

4. flavorPatch (null or string, max 100 chars):
   - ONLY zero-calorie additives
   - Options: Salt, Cinnamon, Vanilla Extract, Cocoa Powder (unsweetened), Sweetener, Citrus Zest, Cayenne
   - Example: "Add cinnamon and sweetener to neutralize whey bitterness."
   - Example: null if not needed

5. contextualInsight (string, 20-120 chars):
   - 1-2 sentences on why this combination works for the training context
   - Reference dayType or planned training if provided
   - Example: "High-protein recovery stack optimized for post-HIIT glycogen replenishment."

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no preamble, no explanation
- All strings must use double quotes
- Use null (not "null" or empty string) for absent fields
- operationalSteps must mandate liquid if ingredients are dry powders/seeds

TONE: Military logistics meets sports nutrition. Direct, mechanical, tactical.`, string(payloadJSON))

	req := ollamaRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fallback
	}

	// Use 8s timeout to prevent frontend hangs (3 solutions × 8s = 24s total, still under typical 30s frontend timeout)
	refinerCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(refinerCtx, "POST", s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		log.Printf("[OLLAMA] Failed to create HTTP request: %v", err)
		return fallback
	}
	httpReq.Header.Set("Content-Type", "application/json")

	log.Printf("[OLLAMA] Sending semantic refinement request to %s (timeout: 8s)", s.baseURL)

	resp, err := s.client.Do(httpReq)
	if err != nil {
		log.Printf("[OLLAMA] Semantic refinement request failed: %v", err)
		s.enabled = false
		return fallback
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[OLLAMA] Semantic refinement returned status %d (expected 200)", resp.StatusCode)
		return fallback
	}

	var ollamaResp ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		log.Printf("[OLLAMA] Failed to decode Ollama response: %v", err)
		return fallback
	}

	// Parse the JSON response from Ollama
	responseText := strings.TrimSpace(ollamaResp.Response)

	// Log first 200 chars to avoid truncation in logs
	logPreview := responseText
	if len(logPreview) > 200 {
		logPreview = logPreview[:200] + "..."
	}
	log.Printf("[OLLAMA] Raw response preview: %s", logPreview)

	// Try to extract JSON from the response (in case there's preamble)
	jsonStart := strings.Index(responseText, "{")
	jsonEnd := strings.LastIndex(responseText, "}")

	if jsonStart == -1 {
		log.Printf("[OLLAMA] No opening brace found in response")
		return fallback
	}

	// Handle incomplete JSON - if closing brace is missing, try to add it
	if jsonEnd == -1 || jsonEnd < jsonStart {
		log.Printf("[OLLAMA] JSON appears incomplete (response length: %d chars), attempting to fix by adding closing brace", len(responseText))
		// Take everything from the opening brace and add a closing brace
		responseText = responseText[jsonStart:] + "\n}"
		log.Printf("[OLLAMA] Fixed JSON: %s", responseText)
	} else {
		responseText = responseText[jsonStart : jsonEnd+1]
	}

	log.Printf("[OLLAMA] Extracted JSON length: %d chars", len(responseText))

	var refinerResp semanticRefinerResponse
	if err := json.Unmarshal([]byte(responseText), &refinerResp); err != nil {
		log.Printf("[OLLAMA] Failed to unmarshal semantic refinement JSON: %v", err)
		log.Printf("[OLLAMA] JSON text: %s", responseText)
		return fallback
	}

	// Validate the response
	if len(refinerResp.MissionTitle) < 5 || len(refinerResp.MissionTitle) > 100 {
		log.Printf("[OLLAMA] Invalid mission title length: %d chars", len(refinerResp.MissionTitle))
		return fallback
	}
	if len(refinerResp.OperationalSteps) < 10 || len(refinerResp.OperationalSteps) > 300 {
		log.Printf("[OLLAMA] Invalid operational steps length: %d chars", len(refinerResp.OperationalSteps))
		return fallback
	}

	log.Printf("[OLLAMA] Successfully generated semantic refinement: %s", refinerResp.MissionTitle)

	return domain.SemanticRefinement{
		MissionTitle:      refinerResp.MissionTitle,
		TacticalPrep:      refinerResp.OperationalSteps,
		AbsurdityAlert:    refinerResp.LogisticAlert,
		FlavorPatch:       refinerResp.FlavorPatch,
		ContextualInsight: refinerResp.ContextualInsight,
		GeneratedByLLM:    true,
		Model:             "llama3.2",
	}
}

// BuildFallbackRefinement creates a semantic refinement when Ollama is unavailable.
// Includes basic liquid binder logic for dry ingredient combinations.
// Exported for use by solver service for non-primary solutions.
func BuildFallbackRefinement(solution domain.SolverSolution, absurdity *domain.AbsurdityWarning) domain.SemanticRefinement {
	// Generate a simple tactical name from ingredients
	var missionTitle string
	if len(solution.Ingredients) == 1 {
		missionTitle = fmt.Sprintf("SIMPLE %s PROTOCOL", strings.ToUpper(solution.Ingredients[0].Food.FoodItem))
	} else if len(solution.Ingredients) == 2 {
		missionTitle = fmt.Sprintf("%s & %s STACK",
			strings.ToUpper(solution.Ingredients[0].Food.FoodItem),
			strings.ToUpper(solution.Ingredients[1].Food.FoodItem))
	} else {
		missionTitle = fmt.Sprintf("%s MIX: STANDARD", strings.ToUpper(solution.Ingredients[0].Food.FoodItem))
	}

	// Truncate if too long
	if len(missionTitle) > 50 {
		missionTitle = missionTitle[:50]
	}

	// Check if ingredients are primarily dry (powder/seeds) and need liquid
	needsLiquid := false
	for _, ing := range solution.Ingredients {
		name := strings.ToLower(ing.Food.FoodItem)
		if strings.Contains(name, "whey") ||
		   strings.Contains(name, "protein") ||
		   strings.Contains(name, "powder") ||
		   strings.Contains(name, "chia") ||
		   strings.Contains(name, "oat") {
			needsLiquid = true
			break
		}
	}

	// Generate tactical prep with liquid binder if needed
	var tacticalPrep string
	if needsLiquid {
		// Estimate liquid needed: roughly 15ml per 10g of dry ingredients
		totalDryWeight := 0.0
		for _, ing := range solution.Ingredients {
			name := strings.ToLower(ing.Food.FoodItem)
			if strings.Contains(name, "whey") || strings.Contains(name, "protein") ||
			   strings.Contains(name, "powder") || strings.Contains(name, "chia") ||
			   strings.Contains(name, "oat") {
				totalDryWeight += ing.AmountG
			}
		}
		liquidML := int(totalDryWeight * 1.5) // 1.5ml per gram of dry ingredients
		if liquidML < 150 {
			liquidML = 150
		}
		if liquidML > 500 {
			liquidML = 500
		}
		tacticalPrep = fmt.Sprintf("Combine all ingredients with %dml water or almond milk. Mix until uniform consistency.", liquidML)
	} else {
		tacticalPrep = "Combine all ingredients and serve."
	}

	// Use absurdity warning if provided
	var absurdityAlert *string
	if absurdity != nil {
		alert := absurdity.Description
		absurdityAlert = &alert
	}

	log.Printf("[OLLAMA] Using fallback refinement (Ollama unavailable)")

	return domain.SemanticRefinement{
		MissionTitle:      missionTitle,
		TacticalPrep:      tacticalPrep,
		AbsurdityAlert:    absurdityAlert,
		FlavorPatch:       nil,
		ContextualInsight: solution.WhyText,
		GeneratedByLLM:    false,
		Model:             "",
	}
}

// buildSemanticRefinerPayload converts solver solution to the LLM payload format.
func buildSemanticRefinerPayload(
	solution domain.SolverSolution,
	trainingCtx *domain.TrainingContextForSolver,
	absurdity *domain.AbsurdityWarning,
) semanticRefinerPayload {
	ingredients := make([]string, len(solution.Ingredients))
	for i, ing := range solution.Ingredients {
		ingredients[i] = fmt.Sprintf("%s %s", ing.Display, ing.Food.FoodItem)
	}

	payload := semanticRefinerPayload{
		Ingredients:   ingredients,
		TotalCalories: solution.TotalMacros.CaloriesKcal,
		TotalProteinG: solution.TotalMacros.ProteinG,
		TotalCarbsG:   solution.TotalMacros.CarbsG,
		TotalFatG:     solution.TotalMacros.FatG,
		MatchScore:    solution.MatchScore,
	}

	if trainingCtx != nil {
		payload.DayType = string(trainingCtx.DayType)
		payload.MealTime = trainingCtx.MealTime

		// Format training sessions
		for _, sess := range trainingCtx.PlannedSessions {
			payload.PlannedTraining = append(payload.PlannedTraining,
				fmt.Sprintf("%s %dmin", sess.Type, sess.DurationMin))
		}
	}

	if absurdity != nil {
		payload.AbsurdityHint = absurdity.Description
	}

	return payload
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
