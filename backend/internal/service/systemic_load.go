package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"victus/internal/domain"
)

// SystemicLoadService computes the dual-axis Neural/Mechanical load balance.
type SystemicLoadService struct {
	dailyLogService *DailyLogService
	fatigueService  *FatigueService
	ollamaService   *OllamaService
}

// NewSystemicLoadService creates a new SystemicLoadService.
func NewSystemicLoadService(dls *DailyLogService, fs *FatigueService, oll *OllamaService) *SystemicLoadService {
	return &SystemicLoadService{
		dailyLogService: dls,
		fatigueService:  fs,
		ollamaService:   oll,
	}
}

// SystemicLoadResponse contains the computed load and optional prescription.
type SystemicLoadResponse struct {
	Load         domain.SystemicLoad          `json:"load"`
	Prescription *domain.SystemicPrescription `json:"prescription,omitempty"`
}

// GetSystemicLoad computes the dual-axis load from today's data.
// Returns nil if no daily log exists for today.
func (s *SystemicLoadService) GetSystemicLoad(ctx context.Context) (*domain.SystemicLoad, error) {
	now := time.Now()

	// Read: get today's log (includes CNS, recovery score, sleep)
	todayLog, err := s.dailyLogService.GetToday(ctx, now)
	if err != nil {
		return nil, err
	}

	// Read: get body status (muscle fatigue with decay)
	bodyStatus, err := s.fatigueService.GetBodyStatus(ctx, now)
	if err != nil {
		return nil, err
	}

	// Read: get neural battery from today's HRV
	neuralBattery := s.dailyLogService.GetNeuralBattery(ctx)

	// Compute
	input := domain.SystemicLoadInput{
		NeuralBattery: neuralBattery,
		SleepQuality:  todayLog.SleepQuality,
		RecoveryScore: todayLog.RecoveryScore,
		BodyStatus:    bodyStatus,
	}

	load := domain.CalculateSystemicLoad(input)
	return &load, nil
}

// GetSystemicLoadWithPrescription computes load and generates a tactical prescription.
func (s *SystemicLoadService) GetSystemicLoadWithPrescription(ctx context.Context) (*SystemicLoadResponse, error) {
	load, err := s.GetSystemicLoad(ctx)
	if err != nil {
		return nil, err
	}

	// Generate prescription (Ollama or fallback)
	rx := s.generatePrescription(ctx, *load)

	return &SystemicLoadResponse{
		Load:         *load,
		Prescription: &rx,
	}, nil
}

// generatePrescription tries Ollama first, falls back to deterministic prescription.
func (s *SystemicLoadService) generatePrescription(ctx context.Context, load domain.SystemicLoad) domain.SystemicPrescription {
	if s.ollamaService == nil {
		return domain.GenerateFallbackPrescription(load)
	}

	rx, err := s.generateSystemicRx(ctx, load)
	if err != nil {
		log.Printf("[SYSTEMIC] Ollama prescription failed: %v, using fallback", err)
		return domain.GenerateFallbackPrescription(load)
	}
	return *rx
}

// generateSystemicRx calls Ollama to generate a tactical prescription.
func (s *SystemicLoadService) generateSystemicRx(ctx context.Context, load domain.SystemicLoad) (*domain.SystemicPrescription, error) {
	prompt := fmt.Sprintf(systemicPrescriptionPrompt,
		int(load.NeuralLoadPct),
		int(load.MechanicalLoadPct),
	)

	// Use 8s timeout consistent with other Ollama calls
	rxCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	raw, err := s.ollamaService.Generate(rxCtx, prompt)
	if err != nil {
		return nil, fmt.Errorf("ollama generate: %w", err)
	}

	// Extract JSON from response
	startIdx := strings.Index(raw, "{")
	endIdx := strings.LastIndex(raw, "}")
	if startIdx == -1 || endIdx == -1 || endIdx <= startIdx {
		return nil, fmt.Errorf("no valid JSON in response")
	}

	jsonStr := raw[startIdx : endIdx+1]

	var rx ollamaSystemicRx
	if err := json.Unmarshal([]byte(jsonStr), &rx); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	// Validate
	if rx.DifficultyCap < 1 || rx.DifficultyCap > 10 {
		return nil, fmt.Errorf("invalid difficulty_cap: %d", rx.DifficultyCap)
	}
	if rx.StatusCode == "" || rx.Diagnosis == "" {
		return nil, fmt.Errorf("empty required fields")
	}

	return &domain.SystemicPrescription{
		StatusCode:       domain.SystemicLoadState(strings.ToLower(rx.StatusCode)),
		Diagnosis:        rx.Diagnosis,
		PrescriptionName: rx.PrescriptionName,
		Rationale:        rx.Rationale,
		AllowedTags:      rx.AllowedTags,
		DifficultyCap:    rx.DifficultyCap,
		GeneratedByLLM:   true,
	}, nil
}

// ollamaSystemicRx matches the JSON schema returned by Ollama.
type ollamaSystemicRx struct {
	StatusCode       string   `json:"status_code"`
	Diagnosis        string   `json:"diagnosis"`
	PrescriptionName string   `json:"prescription_name"`
	Rationale        string   `json:"rationale"`
	AllowedTags      []string `json:"allowed_tags"`
	DifficultyCap    int      `json:"difficulty_cap"`
}

const systemicPrescriptionPrompt = `You are the Victus Systemic Triage Officer.
Analyze the user's load balance and prescribe a tactical training protocol.

INPUT DATA:
- Neural Load (CNS): %d%% (Stress, Sleep Deficit, HRV)
- Mechanical Load (Body): %d%% (Volume, Soreness, Joint Stress)

LOGIC MATRIX:
1. CEREBRAL_OVERHEAT (Neural > 70%%, Mech < 50%%):
   - Diagnosis: "Brain Fried, Body Fresh."
   - Rx: "Mindless Grind." Low complexity, rhythmic, steady state. No decision making.
   - Tags: [Zone 2, CaliMove]

2. STRUCTURAL_FAILURE (Neural < 50%%, Mech > 70%%):
   - Diagnosis: "Body Wrecked, Brain Sharp."
   - Rx: "Neural Ignition." High skill, low impact, reactive speed. Spark the CNS without tissue damage.
   - Tags: [GMB, skill]

3. SYSTEM_CRITICAL (Both > 70%%):
   - Diagnosis: "Total System Failure Imminent."
   - Rx: "Full Reboot." Parasympathetic activation only.
   - Tags: [mobility]

4. PRIME_STATE (Both < 50%%):
   - Diagnosis: "All Systems Nominal."
   - Rx: "Go For Kill." Max effort, high complexity, high volume.
   - Tags: [power, CaliMove, GMB, skill]

Return a JSON object identifying the state and specific workout parameters.

OUTPUT SCHEMA:
{
  "status_code": "STRING (e.g., CEREBRAL_OVERHEAT)",
  "diagnosis": "STRING (Short, punchy tactical assessment)",
  "prescription_name": "STRING (e.g., 'Zone 2 Flush // Alpha')",
  "rationale": "STRING (Why this fixes the specific imbalance)",
  "allowed_tags": ["ARRAY", "OF", "STRINGS"],
  "difficulty_cap": INTEGER (1-10)
}

Return ONLY valid JSON, no preamble or explanation.`
