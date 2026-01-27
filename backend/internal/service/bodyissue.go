package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// BodyIssueService handles business logic for body part issues.
type BodyIssueService struct {
	bodyIssueStore *store.BodyIssueStore
}

// NewBodyIssueService creates a new BodyIssueService.
func NewBodyIssueService(bs *store.BodyIssueStore) *BodyIssueService {
	return &BodyIssueService{bodyIssueStore: bs}
}

// CreateIssue creates a single body part issue.
func (s *BodyIssueService) CreateIssue(ctx context.Context, input domain.BodyPartIssueInput) (*domain.BodyPartIssue, error) {
	return s.bodyIssueStore.Create(ctx, input)
}

// CreateIssues creates multiple body part issues in a batch.
func (s *BodyIssueService) CreateIssues(ctx context.Context, inputs []domain.BodyPartIssueInput) ([]domain.BodyPartIssue, error) {
	return s.bodyIssueStore.CreateBatch(ctx, inputs)
}

// GetActiveIssues retrieves all body part issues that are still within the decay period.
func (s *BodyIssueService) GetActiveIssues(ctx context.Context) ([]domain.BodyPartIssue, error) {
	return s.bodyIssueStore.GetActiveIssues(ctx)
}

// GetActiveIssuesByMuscle retrieves active issues for a specific muscle group.
func (s *BodyIssueService) GetActiveIssuesByMuscle(ctx context.Context, muscle domain.MuscleGroup) ([]domain.BodyPartIssue, error) {
	return s.bodyIssueStore.GetActiveIssuesByMuscle(ctx, muscle)
}

// GetIssuesByDateRange retrieves issues within a date range.
func (s *BodyIssueService) GetIssuesByDateRange(ctx context.Context, startDate, endDate string) ([]domain.BodyPartIssue, error) {
	return s.bodyIssueStore.GetByDateRange(ctx, startDate, endDate)
}

// DeleteIssue removes a body part issue by ID.
func (s *BodyIssueService) DeleteIssue(ctx context.Context, id int64) error {
	return s.bodyIssueStore.Delete(ctx, id)
}

// MuscleFatigueModifier represents the fatigue contribution from body issues for a muscle.
type MuscleFatigueModifier struct {
	Muscle      domain.MuscleGroup `json:"muscle"`
	DisplayName string             `json:"displayName"`
	Modifier    float64            `json:"modifier"`
	IssueCount  int                `json:"issueCount"`
}

// CalculateFatigueModifiers calculates fatigue modifiers for all muscles based on active issues.
// Returns a map of muscle group to additional fatigue percentage.
func (s *BodyIssueService) CalculateFatigueModifiers(ctx context.Context) (map[domain.MuscleGroup]float64, error) {
	issues, err := s.bodyIssueStore.GetActiveIssues(ctx)
	if err != nil {
		return nil, err
	}

	today := time.Now()
	modifiers := make(map[domain.MuscleGroup]float64)

	for _, issue := range issues {
		// Parse issue date
		issueDate, err := time.Parse("2006-01-02", issue.Date)
		if err != nil {
			continue
		}

		// Calculate days since issue was created
		daysSince := int(today.Sub(issueDate).Hours() / 24)

		// Calculate decayed modifier
		modifier := domain.CalculateIssueFatigueModifier(issue.Severity, daysSince)
		if modifier > 0 {
			modifiers[issue.BodyPart] += modifier
		}
	}

	return modifiers, nil
}

// GetFatigueModifiersList returns fatigue modifiers as a list with display names.
func (s *BodyIssueService) GetFatigueModifiersList(ctx context.Context) ([]MuscleFatigueModifier, error) {
	issues, err := s.bodyIssueStore.GetActiveIssues(ctx)
	if err != nil {
		return nil, err
	}

	today := time.Now()

	// Group issues by muscle and calculate modifiers
	muscleData := make(map[domain.MuscleGroup]struct {
		modifier float64
		count    int
	})

	for _, issue := range issues {
		issueDate, err := time.Parse("2006-01-02", issue.Date)
		if err != nil {
			continue
		}

		daysSince := int(today.Sub(issueDate).Hours() / 24)
		modifier := domain.CalculateIssueFatigueModifier(issue.Severity, daysSince)

		if modifier > 0 {
			data := muscleData[issue.BodyPart]
			data.modifier += modifier
			data.count++
			muscleData[issue.BodyPart] = data
		}
	}

	// Convert to list
	result := make([]MuscleFatigueModifier, 0, len(muscleData))
	for muscle, data := range muscleData {
		result = append(result, MuscleFatigueModifier{
			Muscle:      muscle,
			DisplayName: domain.MuscleGroupDisplayNames[muscle],
			Modifier:    data.modifier,
			IssueCount:  data.count,
		})
	}

	return result, nil
}

// GetVocabulary returns the semantic detection vocabulary for the frontend.
type SemanticVocabulary struct {
	BodyParts []string `json:"bodyParts"`
	Symptoms  []string `json:"symptoms"`
}

// GetVocabulary returns the lists of recognized body parts and symptoms.
func (s *BodyIssueService) GetVocabulary() SemanticVocabulary {
	return SemanticVocabulary{
		BodyParts: domain.ValidBodyAliases(),
		Symptoms:  domain.ValidSymptoms(),
	}
}
