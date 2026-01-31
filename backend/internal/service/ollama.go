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
	bodyStatus *domain.BodyStatus, // New parameter for bio-status integration
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

	// Dynamic Prompt Construction based on Bio-Status and Meal Logic
	prompt := buildTacticalPrompt(string(payloadJSON), trainingCtx, bodyStatus, solution.TotalMacros.ProteinG)

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

// buildTacticalPrompt constructs the dynamic system prompt based on BodyStatus and MealType.
func buildTacticalPrompt(jsonPayload string, trainingCtx *domain.TrainingContextForSolver, bodyStatus *domain.BodyStatus, totalProtein float64) string {
	basePrompt := `You are the Victus Neural OS Logistics Chef. You receive raw ingredient data and transform it into a tactical field ration briefing.

SOLUTION DATA (JSON):
%s

YOUR MISSION:
Generate a JSON response with EXACTLY these 5 fields. Return ONLY valid JSON with no preamble or explanation.

CONTEXTUAL LOGIC:
%s

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

2. operationalSteps (string, 20-250 chars):
   - ONE sentence with specific mechanical instructions.
   - ASSIGN CULINARY ROLES: Identify the 'Base' (volume), 'Binder' (fat/liquid), and 'Crunch'.
   - TEXTURE GUARD: If ingredients are dry/powders (e.g., Whey + Chia), you MUST instruct adding liquid (Water/Almond Milk/Coffee) to reach pudding consistency.
   - Example: "Hydrate chia in 200ml almond milk for 10 min, then fold in whey to form a cohesive sludge."

3. logisticAlert (null or string, max 150 chars):
   - ABSORPTION GUARD: If protein > 60g, you MUST suggest a Splitting Strategy (Stage 1 & Stage 2).
   - Example: "PROTEIN OVERLOAD (72g). Split into 2 servings: consume 50%% now, refrigerate 50%% for +3hr."
   - Otherwise, use null unless a genuine digestive concern exists.

4. flavorPatch (null or string, max 100 chars):
   - STRICTLY LIMITED TO ZERO-CALORIE PATCHES: Salt, Cinnamon, Stevia, Black Pepper, Lemon Juice, Hot Sauce.
   - You MUST include exactly one patch suggestion to prevent flavor fatigue.
   - Example: "Add cinnamon and stevia to neutralize whey bitterness."

5. contextualInsight (string, 20-120 chars):
   - 1-2 sentences on why this stack fits the current bio-status or protocol.
   - Example: "Anti-inflammatory stack optimized for wrist recovery."

CRITICAL RULES:
- Return ONLY valid JSON.
- All strings must use double quotes.
- Use null for absent fields.

TONE: Military logistics meets sports nutrition. Direct, mechanical, tactical.`

	// Build Dynamic Context Logic
	var contextLogic strings.Builder

	// 1. Joint/Bio-Repair Check
	if bodyStatus != nil {
		for joint, integrity := range bodyStatus.JointIntegrity {
			if integrity < 0.5 { // Red/Amber status
				contextLogic.WriteString(fmt.Sprintf("- CRITICAL: Detect inflammation in %s. Prioritize anti-inflammatory prep steps. Add [BIO-REPAIR] tag to title.\n", joint))
			}
		}
		// Systemic Load Check
		if bodyStatus.SystemicLoad > 7.5 {
			contextLogic.WriteString("- HIGH SYSTEMIC LOAD DETECTED: Prioritize digestibility and gut health.\n")
		}
	}

	// 2. Protocol-Aware Meal Logic
	if trainingCtx != nil {
		mealTime := strings.ToUpper(trainingCtx.MealTime)

		// Inject Protocol Context
		if trainingCtx.ActiveProtocol != "" {
			contextLogic.WriteString(fmt.Sprintf("- PROTOCOL ACTIVE: %s. \n", strings.ToUpper(string(trainingCtx.ActiveProtocol))))
		}

		if strings.Contains(mealTime, "BREAKFAST") {
			contextLogic.WriteString("- PROTOCOL: Sweet/Energy. Use fruits/grains as textural base. Exclude savory vegetables logic.\n")
		} else if strings.Contains(mealTime, "LUNCH") || strings.Contains(mealTime, "DINNER") {
			contextLogic.WriteString("- PROTOCOL: Savory/Recovery. Use vegetables/proteins as base. Exclude high-sugar fruits logic.\n")
		}
	}

	// 3. Protein Load Check (Explicit)
	if totalProtein > 60.0 {
		contextLogic.WriteString(fmt.Sprintf("- HIGH PROTEIN ALERT (%.0fg): Trigger Splitting Strategy in logisticAlert.\n", totalProtein))
	}

	return fmt.Sprintf(basePrompt, jsonPayload, contextLogic.String())
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

// ParseEchoLog processes a natural language echo log and extracts structured data.
// Returns nil if Ollama is unavailable or parsing fails (caller should handle gracefully).
func (s *OllamaService) ParseEchoLog(ctx context.Context, sessionCtx domain.EchoSessionContext, rawEcho string) (*domain.EchoLogResult, error) {
	if !s.enabled {
		log.Printf("[OLLAMA] Service disabled, skipping echo parsing")
		return nil, nil
	}

	// Build list of valid body aliases for the prompt
	validAliases := domain.ValidBodyAliases()

	prompt := fmt.Sprintf(`You are the Victus Neural Echo Processor. Analyze this post-workout reflection and extract structured feedback.

SESSION CONTEXT:
- Training Type: %s
- Duration: %d minutes
- Initial RPE: %d
- Notes: %s

USER'S ECHO LOG:
%s

Extract ONLY what the user explicitly mentions. Return valid JSON with these exact fields:

{
  "achievements": ["string array of specific accomplishments mentioned"],
  "joint_integrity_delta": {"body_part": 0.0},
  "perceived_exertion_offset": 0
}

RULES:
1. achievements: List specific PRs, milestones, or notable accomplishments. Empty array if none mentioned.
2. joint_integrity_delta: Map body parts to change (-1.0 to +1.0):
   - Positive = improvement (feeling better, more mobile, loosened up)
   - Negative = degradation (sore, tight, painful, clicking)
   - Valid body parts: %s
   - Only include parts explicitly mentioned
3. perceived_exertion_offset: Integer adjustment (-3 to +3):
   - Positive = felt harder than initial RPE suggests
   - Negative = felt easier than initial RPE suggests
   - 0 = initial RPE was accurate

Return ONLY valid JSON, no explanation or preamble.`,
		sessionCtx.TrainingType,
		sessionCtx.DurationMin,
		sessionCtx.InitialRPE,
		sessionCtx.Notes,
		rawEcho,
		strings.Join(validAliases, ", "),
	)

	req := ollamaRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	// Use shorter timeout for echo parsing
	echoCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(echoCtx, "POST", s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		log.Printf("[OLLAMA] Echo parse request failed: %v", err)
		s.enabled = false
		return nil, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[OLLAMA] Echo parse returned status %d", resp.StatusCode)
		return nil, nil
	}

	var result ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[OLLAMA] Failed to decode echo response: %v", err)
		return nil, nil
	}

	// Extract JSON from response
	responseText := strings.TrimSpace(result.Response)
	log.Printf("[OLLAMA] Echo raw response: %s", responseText[:min(200, len(responseText))])

	// Find JSON object in response
	startIdx := strings.Index(responseText, "{")
	endIdx := strings.LastIndex(responseText, "}")
	if startIdx == -1 || endIdx == -1 || endIdx <= startIdx {
		log.Printf("[OLLAMA] No valid JSON found in echo response")
		return nil, nil
	}

	jsonStr := responseText[startIdx : endIdx+1]

	var echoResult domain.EchoLogResult
	if err := json.Unmarshal([]byte(jsonStr), &echoResult); err != nil {
		log.Printf("[OLLAMA] Failed to parse echo JSON: %v", err)
		return nil, nil
	}

	// Validate the result
	if err := domain.ValidateEchoResult(echoResult); err != nil {
		log.Printf("[OLLAMA] Echo result validation failed: %v", err)
		return nil, nil
	}

	log.Printf("[OLLAMA] Successfully parsed echo: %d achievements, %d joint deltas, RPE offset %d",
		len(echoResult.Achievements),
		len(echoResult.JointIntegrityDelta),
		echoResult.PerceivedExertionOffset)

	return &echoResult, nil
}

// voiceCommandLLMResponse is the expected JSON response from Ollama for voice commands.
type voiceCommandLLMResponse struct {
	Intent      string             `json:"intent"`
	Activity    *string            `json:"activity,omitempty"`
	DurationMin *int               `json:"duration_min,omitempty"`
	AvgHR       *int               `json:"avg_hr,omitempty"`
	RPE         *int               `json:"rpe,omitempty"`
	Sensation   *string            `json:"sensation,omitempty"`
	Items       []nutritionItemLLM `json:"items,omitempty"`
	Metric      *string            `json:"metric,omitempty"`
	Value       *float64           `json:"value,omitempty"`
	Unit        *string            `json:"unit,omitempty"`
}

type nutritionItemLLM struct {
	Food     string   `json:"food"`
	Quantity *float64 `json:"quantity,omitempty"`
	Unit     *string  `json:"unit,omitempty"`
}

// ParseVoiceCommand processes a natural language voice command and extracts structured data.
// Uses a flexible JSON schema that handles partial data (returns null for missing fields).
// Returns nil if Ollama is unavailable or parsing fails (caller should handle gracefully).
func (s *OllamaService) ParseVoiceCommand(ctx context.Context, rawInput string) (*domain.VoiceCommandResult, error) {
	if !s.enabled {
		log.Printf("[OLLAMA] Service disabled, skipping voice command parsing")
		return nil, nil
	}

	if rawInput == "" {
		return nil, nil
	}

	prompt := buildVoiceCommandPrompt(rawInput)

	req := ollamaRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	// Use 60s timeout for voice command parsing (async background process)
	voiceCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(voiceCtx, "POST", s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	log.Printf("[OLLAMA] Sending voice command parse request (input length: %d chars)", len(rawInput))

	resp, err := s.client.Do(httpReq)
	if err != nil {
		log.Printf("[OLLAMA] Voice command parse request failed: %v", err)
		s.enabled = false
		return nil, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[OLLAMA] Voice command parse returned status %d", resp.StatusCode)
		return nil, nil
	}

	var result ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[OLLAMA] Failed to decode voice command response: %v", err)
		return nil, nil
	}

	// Extract JSON from response
	responseText := strings.TrimSpace(result.Response)
	log.Printf("[OLLAMA] Voice command raw response: %s", responseText[:min(200, len(responseText))])

	// Find JSON object in response
	startIdx := strings.Index(responseText, "{")
	endIdx := strings.LastIndex(responseText, "}")
	if startIdx == -1 || endIdx == -1 || endIdx <= startIdx {
		log.Printf("[OLLAMA] No valid JSON found in voice command response")
		return nil, nil
	}

	jsonStr := responseText[startIdx : endIdx+1]

	var llmResp voiceCommandLLMResponse
	if err := json.Unmarshal([]byte(jsonStr), &llmResp); err != nil {
		log.Printf("[OLLAMA] Failed to parse voice command JSON: %v", err)
		return nil, nil
	}

	// Convert LLM response to domain type
	voiceResult := convertLLMToVoiceResult(llmResp, rawInput)

	// Validate the result
	if err := domain.ValidateVoiceCommandResult(voiceResult); err != nil {
		log.Printf("[OLLAMA] Voice command validation failed: %v", err)
		return nil, nil
	}

	log.Printf("[OLLAMA] Successfully parsed voice command: intent=%s, isDraft=%v",
		voiceResult.Intent, voiceResult.IsDraftTrainingSession())

	return voiceResult, nil
}

// buildVoiceCommandPrompt constructs the Universal Neural Parser system prompt.
func buildVoiceCommandPrompt(rawInput string) string {
	return fmt.Sprintf(`You are the Victus Neural Parser. Your job is to extract structured data from messy natural language.

USER INPUT:
%s

GLOBAL RULES:
1. Identify Intent: Is this TRAINING, NUTRITION, or BIOMETRICS?
2. Extract Data: Map words to the Schema below.
3. Handle Missing Data: If a specific field is not mentioned, return null. Do not guess.
4. Ignore Filler: Ignore words like 'uh', 'maybe', 'I think'.

SCHEMA 1: TRAINING
- activity: String (e.g., 'Rowing', 'Running', 'Strength', 'Walking')
- duration_min: Integer or null
- avg_hr: Integer or null
- rpe: Integer (1-10) or null
- sensation: String or null (e.g., 'wrist hurts', 'felt strong', 'knee clicky')

SCHEMA 2: NUTRITION
- items: Array of objects:
  - food: String (e.g., 'Greek Yogurt', 'eggs', 'chicken breast')
  - quantity: Number (e.g., 100, 1, 2)
  - unit: String (e.g., 'g', 'cup', 'whole', 'slice')

SCHEMA 3: BIOMETRICS
- metric: String (e.g., 'Weight', 'Sleep', 'Body Status')
- value: Number or null
- unit: String (e.g., 'kg', 'hours') or null
- sensation: String or null (e.g., 'left knee clicky', 'back stiff')

EXAMPLES:

Input: 'Did 20 mins of rowing, heart rate was around 145.'
Output: {"intent": "TRAINING", "activity": "Rowing", "duration_min": 20, "avg_hr": 145, "rpe": null, "sensation": null}

Input: 'Just did some rowing'
Output: {"intent": "TRAINING", "activity": "Rowing", "duration_min": null, "avg_hr": null, "rpe": null, "sensation": null}

Input: 'My left knee feels a bit clicky today.'
Output: {"intent": "BIOMETRICS", "metric": "Body Status", "value": null, "unit": null, "sensation": "left knee clicky"}

Input: 'Weighed in at 82.5 kg this morning'
Output: {"intent": "BIOMETRICS", "metric": "Weight", "value": 82.5, "unit": "kg", "sensation": null}

Input: 'Had 100g Greek yogurt and 2 eggs for breakfast'
Output: {"intent": "NUTRITION", "items": [{"food": "Greek yogurt", "quantity": 100, "unit": "g"}, {"food": "eggs", "quantity": 2, "unit": "whole"}]}

Input: 'Slept 7.5 hours last night'
Output: {"intent": "BIOMETRICS", "metric": "Sleep", "value": 7.5, "unit": "hours", "sensation": null}

Input: 'Strength training for 45 minutes, RPE 8, shoulders feeling tight'
Output: {"intent": "TRAINING", "activity": "Strength", "duration_min": 45, "avg_hr": null, "rpe": 8, "sensation": "shoulders feeling tight"}

Return ONLY valid JSON with no preamble or explanation.`, rawInput)
}

// convertLLMToVoiceResult transforms the LLM response into a domain VoiceCommandResult.
func convertLLMToVoiceResult(llmResp voiceCommandLLMResponse, rawInput string) *domain.VoiceCommandResult {
	result := &domain.VoiceCommandResult{
		RawInput:   rawInput,
		ParsedAt:   time.Now(),
		Confidence: 0.8, // Default confidence
	}

	// Parse intent
	intent, err := domain.ParseVoiceIntent(llmResp.Intent)
	if err != nil {
		// Default to biometrics if intent parsing fails
		intent = domain.VoiceIntentBiometrics
		result.Confidence = 0.5
	}
	result.Intent = intent

	switch intent {
	case domain.VoiceIntentTraining:
		activity := ""
		if llmResp.Activity != nil {
			activity = *llmResp.Activity
		}
		result.Training = &domain.TrainingVoiceData{
			Activity:    activity,
			DurationMin: llmResp.DurationMin,
			AvgHR:       llmResp.AvgHR,
			RPE:         llmResp.RPE,
			Sensation:   llmResp.Sensation,
		}

	case domain.VoiceIntentNutrition:
		items := make([]domain.NutritionItem, len(llmResp.Items))
		for i, item := range llmResp.Items {
			items[i] = domain.NutritionItem{
				Food:     item.Food,
				Quantity: item.Quantity,
				Unit:     item.Unit,
			}
		}
		result.Nutrition = &domain.NutritionData{
			Items: items,
		}

	case domain.VoiceIntentBiometrics:
		metric := ""
		if llmResp.Metric != nil {
			metric = *llmResp.Metric
		}
		result.Biometrics = &domain.BiometricData{
			Metric:    metric,
			Value:     llmResp.Value,
			Unit:      llmResp.Unit,
			Sensation: llmResp.Sensation,
		}
	}

	return result
}

// GenerateFormCorrection analyzes user feedback about a movement and provides a tactical cue.
// Returns nil if Ollama is unavailable.
func (s *OllamaService) GenerateFormCorrection(ctx context.Context, req domain.FormCorrectionRequest) *domain.FormCorrectionResult {
	if !s.enabled || req.UserFeedback == "" {
		return nil
	}

	prompt := fmt.Sprintf(`You are the Victus Movement Specialist. A user reported a technical failure during %s.

USER FEEDBACK: %s

INSTRUCTIONS:
1. Identify the likely mechanical error (e.g., lack of core bracing).
2. Provide a 1-sentence 'Cue' for the next session (e.g., 'Pin your lower back to the floor').
3. Suggest a 1-level 'Regression' if the failure was due to strength (e.g., 'Switch to Knee-Tucks'). Use null if no regression needed.

Return ONLY valid JSON:
{"mechanicalError": "string", "tacticalCue": "string", "regression": null or "string"}`, req.MovementName, req.UserFeedback)

	raw, err := s.Generate(ctx, prompt)
	if err != nil {
		log.Printf("[OLLAMA] Form correction failed: %v", err)
		return nil
	}

	// Extract JSON
	startIdx := strings.Index(raw, "{")
	endIdx := strings.LastIndex(raw, "}")
	if startIdx == -1 || endIdx == -1 || endIdx <= startIdx {
		return nil
	}

	var result domain.FormCorrectionResult
	if err := json.Unmarshal([]byte(raw[startIdx:endIdx+1]), &result); err != nil {
		log.Printf("[OLLAMA] Form correction JSON parse failed: %v", err)
		return nil
	}

	return &result
}
