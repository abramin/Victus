package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// TrainingProgramService handles business logic for training programs.
type TrainingProgramService struct {
	programStore     *store.TrainingProgramStore
	plannedDayStore  *store.PlannedDayTypeStore
}

// NewTrainingProgramService creates a new TrainingProgramService.
func NewTrainingProgramService(ps *store.TrainingProgramStore, pds *store.PlannedDayTypeStore) *TrainingProgramService {
	return &TrainingProgramService{
		programStore:    ps,
		plannedDayStore: pds,
	}
}

// Create creates a new custom training program.
func (s *TrainingProgramService) Create(ctx context.Context, input domain.TrainingProgramInput, now time.Time) (*domain.TrainingProgram, error) {
	program, err := domain.NewTrainingProgram(input, false, now)
	if err != nil {
		return nil, err
	}

	programID, err := s.programStore.Create(ctx, program)
	if err != nil {
		return nil, err
	}

	return s.programStore.GetByID(ctx, programID)
}

// GetByID retrieves a training program by ID.
// Returns store.ErrProgramNotFound if program doesn't exist.
func (s *TrainingProgramService) GetByID(ctx context.Context, id int64) (*domain.TrainingProgram, error) {
	return s.programStore.GetByID(ctx, id)
}

// List retrieves all training programs with optional filtering.
func (s *TrainingProgramService) List(ctx context.Context, filters store.ProgramFilters) ([]*domain.TrainingProgram, error) {
	return s.programStore.List(ctx, filters)
}

// ListTemplates retrieves all template programs from the library.
func (s *TrainingProgramService) ListTemplates(ctx context.Context) ([]*domain.TrainingProgram, error) {
	isTemplate := true
	return s.programStore.List(ctx, store.ProgramFilters{
		IsTemplate: &isTemplate,
		Status:     string(domain.ProgramStatusTemplate),
	})
}

// Update updates a training program.
// Returns store.ErrProgramNotFound if program doesn't exist.
func (s *TrainingProgramService) Update(ctx context.Context, program *domain.TrainingProgram) error {
	return s.programStore.Update(ctx, program)
}

// Delete removes a training program.
// Returns store.ErrProgramNotFound if program doesn't exist.
func (s *TrainingProgramService) Delete(ctx context.Context, id int64) error {
	return s.programStore.Delete(ctx, id)
}

// DeleteWithCascade removes a program and handles active installations.
// If force is false and an active installation exists, returns store.ErrActiveInstallationExists.
// If force is true, abandons active installation before deletion.
func (s *TrainingProgramService) DeleteWithCascade(ctx context.Context, id int64, force bool) error {
	// Check for active installation for this program
	installation, err := s.programStore.GetActiveInstallationForProgram(ctx, id)
	if err != nil && err != store.ErrInstallationNotFound {
		return err
	}

	if installation != nil {
		if !force {
			return store.ErrActiveInstallationExists
		}
		// Abandon the active installation
		if err := s.AbandonInstallation(ctx, installation.ID); err != nil {
			return err
		}
	}

	// Delete all installations for this program (historical)
	if err := s.programStore.DeleteInstallationsForProgram(ctx, id); err != nil {
		return err
	}

	// Delete the program itself
	return s.programStore.Delete(ctx, id)
}

// GetWaveformData retrieves the waveform chart data for a program.
func (s *TrainingProgramService) GetWaveformData(ctx context.Context, id int64) ([]domain.WaveformPoint, error) {
	program, err := s.programStore.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return program.GetWaveformData(), nil
}

// =============================================================================
// INSTALLATION METHODS
// =============================================================================

// Install creates a new program installation and schedules all sessions.
// Returns store.ErrActiveInstallationExists if an active installation already exists.
func (s *TrainingProgramService) Install(ctx context.Context, input domain.InstallProgramInput, now time.Time) (*domain.ProgramInstallation, error) {
	// Validate program exists
	program, err := s.programStore.GetByID(ctx, input.ProgramID)
	if err != nil {
		return nil, err
	}

	// Create installation
	installation, err := domain.NewProgramInstallation(input, now)
	if err != nil {
		return nil, err
	}
	installation.Program = program

	// Create in store
	installationID, err := s.programStore.CreateInstallation(ctx, installation)
	if err != nil {
		return nil, err
	}

	// Schedule planned day types for each session
	if s.plannedDayStore != nil {
		installation.Program = program
		sessions := installation.GetScheduledSessions()
		for _, session := range sessions {
			// Create or update planned day type for this date
			dateStr := session.Date.Format("2006-01-02")
			plannedDay := &domain.PlannedDayType{
				Date:    dateStr,
				DayType: session.NutritionDay,
			}
			// Use Upsert to handle both create and update
			if err := s.plannedDayStore.Upsert(ctx, plannedDay); err != nil {
				// Log but don't fail - the installation itself was successful
				continue
			}
		}
	}

	return s.programStore.GetInstallationByID(ctx, installationID)
}

// GetActiveInstallation retrieves the currently active program installation.
// Returns store.ErrInstallationNotFound if no active installation exists.
func (s *TrainingProgramService) GetActiveInstallation(ctx context.Context) (*domain.ProgramInstallation, error) {
	return s.programStore.GetActiveInstallation(ctx)
}

// GetInstallationByID retrieves a program installation by ID.
// Returns store.ErrInstallationNotFound if installation doesn't exist.
func (s *TrainingProgramService) GetInstallationByID(ctx context.Context, id int64) (*domain.ProgramInstallation, error) {
	return s.programStore.GetInstallationByID(ctx, id)
}

// AbandonInstallation marks an installation as abandoned.
// Returns store.ErrInstallationNotFound if installation doesn't exist.
func (s *TrainingProgramService) AbandonInstallation(ctx context.Context, id int64) error {
	return s.programStore.UpdateInstallationStatus(ctx, id, domain.InstallationStatusAbandoned)
}

// CompleteInstallation marks an installation as completed.
// Returns store.ErrInstallationNotFound if installation doesn't exist.
func (s *TrainingProgramService) CompleteInstallation(ctx context.Context, id int64) error {
	return s.programStore.UpdateInstallationStatus(ctx, id, domain.InstallationStatusCompleted)
}

// DeleteInstallation removes a program installation.
// Returns store.ErrInstallationNotFound if installation doesn't exist.
func (s *TrainingProgramService) DeleteInstallation(ctx context.Context, id int64) error {
	return s.programStore.DeleteInstallation(ctx, id)
}

// GetScheduledSessions returns all scheduled sessions for an installation.
func (s *TrainingProgramService) GetScheduledSessions(ctx context.Context, installationID int64) ([]domain.ScheduledSession, error) {
	installation, err := s.programStore.GetInstallationByID(ctx, installationID)
	if err != nil {
		return nil, err
	}

	return installation.GetScheduledSessions(), nil
}
