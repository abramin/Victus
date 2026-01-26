package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
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
