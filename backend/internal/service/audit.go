package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// explanationCache caches AI-generated explanations by rule ID.
// Cache entries expire after 1 hour.
type explanationCache struct {
	mu      sync.RWMutex
	entries map[domain.AuditRuleID]cachedExplanation
}

type cachedExplanation struct {
	text      string
	expiresAt time.Time
}

func newExplanationCache() *explanationCache {
	return &explanationCache{
		entries: make(map[domain.AuditRuleID]cachedExplanation),
	}
}

func (c *explanationCache) get(id domain.AuditRuleID) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, ok := c.entries[id]
	if !ok || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.text, true
}

func (c *explanationCache) set(id domain.AuditRuleID, text string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[id] = cachedExplanation{
		text:      text,
		expiresAt: time.Now().Add(1 * time.Hour),
	}
}

// AuditService evaluates strategy mismatches and generates audit status.
type AuditService struct {
	fatigueStore        *store.FatigueStore
	dailyLogStore       *store.DailyLogStore
	plannedDayTypeStore *store.PlannedDayTypeStore
	ollamaURL           string
	ollamaClient        *http.Client
	cache               *explanationCache
}

// NewAuditService creates a new AuditService.
func NewAuditService(
	fatigueStore *store.FatigueStore,
	dailyLogStore *store.DailyLogStore,
	plannedDayTypeStore *store.PlannedDayTypeStore,
	ollamaURL string,
) *AuditService {
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}
	return &AuditService{
		fatigueStore:        fatigueStore,
		dailyLogStore:       dailyLogStore,
		plannedDayTypeStore: plannedDayTypeStore,
		ollamaURL:           ollamaURL,
		ollamaClient:        &http.Client{Timeout: 5 * time.Second},
		cache:               newExplanationCache(),
	}
}

// GetAuditStatus evaluates all audit rules and returns the current status.
func (s *AuditService) GetAuditStatus(ctx context.Context) (*domain.AuditStatus, error) {
	// Build audit context from current state
	auditCtx, err := s.buildAuditContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("building audit context: %w", err)
	}

	// Evaluate all rules
	rules := domain.DefaultAuditRules()
	mismatches := domain.EvaluateAuditRules(*auditCtx, rules)

	// Generate explanations for mismatches in parallel with caching
	var wg sync.WaitGroup
	for i := range mismatches {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			mismatches[idx].Explanation = s.generateExplanationCached(ctx, &mismatches[idx])
		}(i)
	}
	wg.Wait()

	severity := domain.GetHighestSeverity(mismatches)

	return &domain.AuditStatus{
		HasMismatch: len(mismatches) > 0,
		Severity:    severity,
		Mismatches:  mismatches,
		CheckedAt:   time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// buildAuditContext gathers all data needed for rule evaluation.
func (s *AuditService) buildAuditContext(ctx context.Context) (*domain.AuditContext, error) {
	now := time.Now()
	today := now.Format("2006-01-02")

	auditCtx := &domain.AuditContext{}

	// Get overall fatigue and overreached muscle count
	fatigueRows, err := s.fatigueStore.GetAllMuscleFatigue(ctx)
	if err == nil {
		var totalFatigue float64
		overreachedCount := 0
		for _, row := range fatigueRows {
			// Apply decay
			lastUpdate, parseErr := time.Parse("2006-01-02 15:04:05", row.LastUpdated)
			var fatigue float64
			if parseErr == nil {
				hoursElapsed := now.Sub(lastUpdate).Hours()
				fatigue = domain.ApplyFatigueDecay(row.FatiguePercent, hoursElapsed)
			} else {
				fatigue = row.FatiguePercent
			}

			totalFatigue += fatigue
			if fatigue > 85 {
				overreachedCount++
			}
		}
		if len(fatigueRows) > 0 {
			auditCtx.OverallFatigue = totalFatigue / float64(len(fatigueRows))
		}
		auditCtx.OverreachedMuscles = overreachedCount
	}

	// Get today's log for day type and CNS status
	log, err := s.dailyLogStore.GetByDate(ctx, today)
	if err == nil && log != nil {
		auditCtx.CurrentDayType = log.DayType

		// Get CNS status from CNSResult if available
		if log.CNSResult != nil {
			auditCtx.CNSStatus = &log.CNSResult.Status
		}

		// Calculate protein percentage if we have consumed data
		if log.ConsumedProteinG > 0 && log.CalculatedTargets.TotalProteinG > 0 {
			auditCtx.ProteinPercent = float64(log.ConsumedProteinG) / float64(log.CalculatedTargets.TotalProteinG) * 100
		}

		// Calculate training load from actual sessions
		var totalLoad float64
		for _, session := range log.ActualSessions {
			load := domain.CalculateFatigueSessionLoad(session.DurationMin, session.PerceivedIntensity)
			totalLoad += load
		}
		auditCtx.TotalTrainingLoad = totalLoad
	} else {
		// No log yet, try to get planned day type
		plannedDay, err := s.plannedDayTypeStore.GetByDate(ctx, today)
		if err == nil && plannedDay != nil {
			auditCtx.CurrentDayType = plannedDay.DayType
		}
	}

	// Check for recovery planned (rest day in next 2 days)
	auditCtx.HasRecoveryPlanned = s.checkRecoveryPlanned(ctx, today)

	return auditCtx, nil
}

// checkRecoveryPlanned checks if a rest day is planned in the next 48 hours.
func (s *AuditService) checkRecoveryPlanned(ctx context.Context, today string) bool {
	todayTime, err := time.Parse("2006-01-02", today)
	if err != nil {
		return false
	}

	// Check tomorrow and day after
	for i := 1; i <= 2; i++ {
		checkDate := todayTime.AddDate(0, 0, i).Format("2006-01-02")

		// First check planned day types
		planned, err := s.plannedDayTypeStore.GetByDate(ctx, checkDate)
		if err == nil && planned != nil {
			// Metabolize day is considered recovery
			if planned.DayType == domain.DayTypeMetabolize {
				return true
			}
		}

		// Check if there's a log with rest/recovery training
		log, err := s.dailyLogStore.GetByDate(ctx, checkDate)
		if err == nil && log != nil {
			sessions := log.PlannedSessions
			isRest := true
			for _, session := range sessions {
				if session.Type != domain.TrainingTypeRest && session.Type != domain.TrainingTypeQigong && session.Type != domain.TrainingTypeMobility {
					isRest = false
					break
				}
			}
			if isRest && len(sessions) > 0 {
				return true
			}
		}
	}

	return false
}

// ollamaRequest is the request body for Ollama API.
type ollamaExplanationRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

// ollamaResponse is the response from Ollama API.
type ollamaExplanationResponse struct {
	Response string `json:"response"`
}

// generateExplanationCached checks cache first, then calls Ollama if needed.
func (s *AuditService) generateExplanationCached(ctx context.Context, mismatch *domain.AuditMismatch) string {
	// Check cache first
	if cached, ok := s.cache.get(mismatch.ID); ok {
		return cached
	}

	// Generate new explanation
	explanation := s.generateExplanation(ctx, mismatch)

	// Cache the result
	s.cache.set(mismatch.ID, explanation)

	return explanation
}

// generateExplanation uses Ollama to generate a coaching explanation for a mismatch.
func (s *AuditService) generateExplanation(ctx context.Context, mismatch *domain.AuditMismatch) string {
	// Build the prompt
	dataJSON, _ := json.Marshal(mismatch.RelatedData)
	prompt := fmt.Sprintf(`You are a direct fitness coach explaining a strategy mismatch to an athlete.

MISMATCH DETECTED: %s
RULE: %s
DATA: %s

Write a brief (1-2 sentence) explanation of:
1. Why this is a concern
2. What to consider doing about it

TONE: Direct, slightly dry, no fluff. Address the user as "you".
Return ONLY the explanation, no preamble.`, mismatch.Summary, mismatch.Rule, string(dataJSON))

	req := ollamaExplanationRequest{
		Model:  "llama3.2",
		Prompt: prompt,
		Stream: false,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return generateFallbackExplanation(mismatch)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.ollamaURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return generateFallbackExplanation(mismatch)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.ollamaClient.Do(httpReq)
	if err != nil {
		return generateFallbackExplanation(mismatch)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return generateFallbackExplanation(mismatch)
	}

	var result ollamaExplanationResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return generateFallbackExplanation(mismatch)
	}

	// Validate response
	if len(result.Response) < 10 || len(result.Response) > 500 {
		return generateFallbackExplanation(mismatch)
	}

	return result.Response
}

// generateFallbackExplanation provides a template-based explanation when Ollama is unavailable.
func generateFallbackExplanation(mismatch *domain.AuditMismatch) string {
	switch mismatch.ID {
	case domain.AuditRuleHighFatigueLowCarbs:
		return "Your muscles need carbs to recover. Consider switching to a Performance day to fuel recovery."
	case domain.AuditRuleCNSDepletedPerformance:
		return "Your nervous system needs rest. High-intensity training today could lead to overtraining. Consider a Metabolize day instead."
	case domain.AuditRuleHeavyTrainingLowProtein:
		return "Protein supports muscle repair. Prioritize hitting your protein target to maximize adaptation from today's training."
	case domain.AuditRuleRecoveryOverreached:
		return "Several muscle groups are stressed. Schedule a rest or mobility day soon to prevent overtraining."
	default:
		return "Review your current strategy to address this mismatch."
	}
}
