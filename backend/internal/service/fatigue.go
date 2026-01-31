package service

import (
	"context"
	"database/sql"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// FatigueService handles business logic for muscle fatigue and body status.
type FatigueService struct {
	fatigueStore   *store.FatigueStore
	bodyIssueStore *store.BodyIssueStore // Optional: for issue-based fatigue modifiers
}

// NewFatigueService creates a new FatigueService.
func NewFatigueService(fs *store.FatigueStore) *FatigueService {
	return &FatigueService{fatigueStore: fs}
}

// SetBodyIssueStore enables body issue fatigue modifiers.
func (s *FatigueService) SetBodyIssueStore(bs *store.BodyIssueStore) {
	s.bodyIssueStore = bs
}

// ApplyLoadByParams applies fatigue based on archetype, duration, and RPE.
// This is a simpler version that doesn't require a training session ID.
// Used by the frontend when logging workouts.
func (s *FatigueService) ApplyLoadByParams(
	ctx context.Context,
	archetype domain.Archetype,
	durationMin int,
	rpe *int,
) (*domain.SessionFatigueReport, error) {
	// Get archetype configuration
	archetypeConfig, err := s.fatigueStore.GetArchetypeByName(ctx, archetype)
	if err != nil {
		return nil, err
	}

	// Calculate total load
	totalLoad := domain.CalculateFatigueSessionLoad(durationMin, rpe)

	// Get current fatigue for affected muscles and apply injections
	now := time.Now()
	injections := make([]domain.FatigueInjection, 0)

	err = s.fatigueStore.WithTx(ctx, func(tx *sql.Tx) error {
		for muscle, coefficient := range archetypeConfig.Coefficients {
			if coefficient <= 0 {
				continue
			}

			// Get muscle group ID
			muscleID, err := s.fatigueStore.GetMuscleGroupIDByName(ctx, muscle)
			if err != nil {
				return err
			}

			// Get current fatigue (with decay applied)
			row, err := s.fatigueStore.GetMuscleFatigue(ctx, muscleID)
			if err != nil {
				return err
			}

			var currentFatigue float64
			if row != nil {
				// Apply decay to current value
				lastUpdateTime, err := time.Parse("2006-01-02 15:04:05", row.LastUpdated)
				if err == nil {
					hoursElapsed := now.Sub(lastUpdateTime).Hours()
					currentFatigue = domain.ApplyFatigueDecay(row.FatiguePercent, hoursElapsed)
				} else {
					currentFatigue = row.FatiguePercent
				}
			}

			// Calculate injection and new total
			injectionPercent := domain.CalculateFatigueInjection(totalLoad, coefficient)
			newTotal := domain.AddFatigue(currentFatigue, injectionPercent)

			// Persist updated fatigue
			if err := s.fatigueStore.UpsertMuscleFatigueWithTx(ctx, tx, muscleID, newTotal); err != nil {
				return err
			}

			// Build injection record
			injection := domain.BuildFatigueInjection(muscle, injectionPercent, newTotal)
			injections = append(injections, injection)
		}

		// Note: We skip recording fatigue_event since we don't have a session ID
		// The muscle fatigue state is still correctly updated

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &domain.SessionFatigueReport{
		SessionID:  0, // No session ID in this flow
		Archetype:  archetype,
		TotalLoad:  totalLoad,
		Injections: injections,
		AppliedAt:  now.Format(time.RFC3339),
	}, nil
}

// GetAllArchetypes retrieves all workout archetypes.
func (s *FatigueService) GetAllArchetypes(ctx context.Context) ([]domain.ArchetypeConfig, error) {
	return s.fatigueStore.GetAllArchetypes(ctx)
}

// GetArchetypeByName retrieves an archetype by name.
func (s *FatigueService) GetArchetypeByName(ctx context.Context, name domain.Archetype) (*domain.ArchetypeConfig, error) {
	return s.fatigueStore.GetArchetypeByName(ctx, name)
}

// GetBodyStatus returns current body fatigue with decay applied.
// Implements lazy decay calculation on read.
// If bodyIssueStore is set, also applies fatigue modifiers from detected body issues.
func (s *FatigueService) GetBodyStatus(ctx context.Context, asOf time.Time) (*domain.BodyStatus, error) {
	// Get all muscle groups for complete body map
	muscleGroups, err := s.fatigueStore.GetAllMuscleGroups(ctx)
	if err != nil {
		return nil, err
	}

	// Get current fatigue entries
	fatigueRows, err := s.fatigueStore.GetAllMuscleFatigue(ctx)
	if err != nil {
		return nil, err
	}

	// Build a map of muscle fatigue by ID for quick lookup
	fatigueMap := make(map[int]store.MuscleFatigueRow)
	for _, row := range fatigueRows {
		fatigueMap[row.MuscleGroupID] = row
	}

	// Get issue-based fatigue modifiers if bodyIssueStore is available
	issueModifiers := make(map[domain.MuscleGroup]float64)
	if s.bodyIssueStore != nil {
		issues, err := s.bodyIssueStore.GetActiveIssues(ctx)
		if err == nil { // Ignore errors, just skip modifiers
			for _, issue := range issues {
				issueDate, err := time.Parse("2006-01-02", issue.Date)
				if err != nil {
					continue
				}
				daysSince := int(asOf.Sub(issueDate).Hours() / 24)
				modifier := domain.CalculateIssueFatigueModifier(issue.Severity, daysSince)
				if modifier > 0 {
					issueModifiers[issue.BodyPart] += modifier
				}
			}
		}
	}

	// Build complete muscle status list with decay applied
	muscles := make([]domain.MuscleFatigueState, 0, len(muscleGroups))
	for _, mg := range muscleGroups {
		var fatiguePercent float64
		var lastUpdated string

		if row, exists := fatigueMap[mg.ID]; exists {
			// Parse last_updated and calculate hours elapsed
			lastUpdateTime, err := time.Parse("2006-01-02 15:04:05", row.LastUpdated)
			if err != nil {
				// Fallback: use raw fatigue without decay
				fatiguePercent = row.FatiguePercent
				lastUpdated = row.LastUpdated
			} else {
				hoursElapsed := asOf.Sub(lastUpdateTime).Hours()
				fatiguePercent = domain.ApplyFatigueDecay(row.FatiguePercent, hoursElapsed)
				lastUpdated = row.LastUpdated
			}
		} else {
			// No fatigue entry = fresh muscle
			fatiguePercent = 0
			lastUpdated = ""
		}

		// Apply issue-based modifier if present
		if modifier, exists := issueModifiers[mg.Name]; exists {
			fatiguePercent = domain.AddFatigue(fatiguePercent, modifier)
		}

		state := domain.BuildMuscleFatigueState(mg.ID, mg.Name, fatiguePercent, lastUpdated)
		muscles = append(muscles, state)
	}

	// Calculate overall score
	overallScore := domain.CalculateOverallFatigueScore(muscles)

	// Calculate joint integrity (estimated from muscle fatigue)
	// Joint integrity inversely correlates with muscle fatigue around joints
	jointIntegrity := make(map[string]float64)
	for _, muscle := range muscles {
		// Common joint-muscle mappings
		switch muscle.Muscle {
		case domain.MuscleFrontDelt, domain.MuscleSideDelt, domain.MuscleRearDelt:
			val := 1.0 - (muscle.FatiguePercent / 100)
			if existing, ok := jointIntegrity["shoulder"]; ok {
				jointIntegrity["shoulder"] = (existing + val) / 2 // Average multiple muscles
			} else {
				jointIntegrity["shoulder"] = val
			}
		case domain.MuscleCore, domain.MuscleLowerBack, domain.MuscleTraps:
			val := 1.0 - (muscle.FatiguePercent / 100)
			if existing, ok := jointIntegrity["spine"]; ok {
				jointIntegrity["spine"] = (existing + val) / 2 // Average multiple muscles
			} else {
				jointIntegrity["spine"] = val
			}
		case domain.MuscleQuads, domain.MuscleHamstrings, domain.MuscleGlutes:
			val := 1.0 - (muscle.FatiguePercent / 100)
			if existing, ok := jointIntegrity["knee"]; ok {
				jointIntegrity["knee"] = (existing + val) / 2 // Average multiple muscles
			} else {
				jointIntegrity["knee"] = val
			}
		case domain.MuscleCalves:
			jointIntegrity["ankle"] = 1.0 - (muscle.FatiguePercent / 100)
		}
	}

	// Ensure all major joints have a value
	if _, ok := jointIntegrity["shoulder"]; !ok {
		jointIntegrity["shoulder"] = 1.0
	}
	if _, ok := jointIntegrity["spine"]; !ok {
		jointIntegrity["spine"] = 1.0
	}
	if _, ok := jointIntegrity["knee"]; !ok {
		jointIntegrity["knee"] = 1.0
	}
	if _, ok := jointIntegrity["ankle"]; !ok {
		jointIntegrity["ankle"] = 1.0
	}

	// Calculate systemic load as average fatigue across all muscles
	systemicLoad := overallScore

	return &domain.BodyStatus{
		Muscles:        muscles,
		OverallScore:   overallScore,
		AsOfTime:       asOf.Format(time.RFC3339),
		JointIntegrity: jointIntegrity,
		SystemicLoad:   systemicLoad,
	}, nil
}

// ApplySessionLoad calculates and persists fatigue from a workout.
// Returns a fatigue report showing what was injected.
func (s *FatigueService) ApplySessionLoad(
	ctx context.Context,
	sessionID int64,
	archetype domain.Archetype,
	durationMin int,
	rpe *int,
) (*domain.SessionFatigueReport, error) {
	// Get archetype configuration
	archetypeConfig, err := s.fatigueStore.GetArchetypeByName(ctx, archetype)
	if err != nil {
		return nil, err
	}

	// Calculate total load
	totalLoad := domain.CalculateFatigueSessionLoad(durationMin, rpe)

	// Get current fatigue for affected muscles and apply injections
	now := time.Now()
	injections := make([]domain.FatigueInjection, 0)

	err = s.fatigueStore.WithTx(ctx, func(tx *sql.Tx) error {
		for muscle, coefficient := range archetypeConfig.Coefficients {
			if coefficient <= 0 {
				continue
			}

			// Get muscle group ID
			muscleID, err := s.fatigueStore.GetMuscleGroupIDByName(ctx, muscle)
			if err != nil {
				return err
			}

			// Get current fatigue (with decay applied)
			row, err := s.fatigueStore.GetMuscleFatigue(ctx, muscleID)
			if err != nil {
				return err
			}

			var currentFatigue float64
			if row != nil {
				// Apply decay to current value
				lastUpdateTime, err := time.Parse("2006-01-02 15:04:05", row.LastUpdated)
				if err == nil {
					hoursElapsed := now.Sub(lastUpdateTime).Hours()
					currentFatigue = domain.ApplyFatigueDecay(row.FatiguePercent, hoursElapsed)
				} else {
					currentFatigue = row.FatiguePercent
				}
			}

			// Calculate injection and new total
			injectionPercent := domain.CalculateFatigueInjection(totalLoad, coefficient)
			newTotal := domain.AddFatigue(currentFatigue, injectionPercent)

			// Persist updated fatigue
			if err := s.fatigueStore.UpsertMuscleFatigueWithTx(ctx, tx, muscleID, newTotal); err != nil {
				return err
			}

			// Build injection record
			injection := domain.BuildFatigueInjection(muscle, injectionPercent, newTotal)
			injections = append(injections, injection)
		}

		// Record the fatigue event
		if err := s.fatigueStore.RecordFatigueEvent(ctx, tx, sessionID, archetypeConfig.ID, totalLoad); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &domain.SessionFatigueReport{
		SessionID:  sessionID,
		Archetype:  archetype,
		TotalLoad:  totalLoad,
		Injections: injections,
		AppliedAt:  now.Format(time.RFC3339),
	}, nil
}
