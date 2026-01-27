package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"victus/internal/domain"
)

// Program store errors
var (
	ErrProgramNotFound           = errors.New("training program not found")
	ErrActiveInstallationExists  = errors.New("an active program installation already exists")
	ErrInstallationNotFound      = errors.New("program installation not found")
)

// TrainingProgramStore handles database operations for training programs.
type TrainingProgramStore struct {
	db DBTX
}

// NewTrainingProgramStore creates a new TrainingProgramStore.
func NewTrainingProgramStore(db DBTX) *TrainingProgramStore {
	return &TrainingProgramStore{db: db}
}

// Create creates a new training program with its weeks and days.
func (s *TrainingProgramStore) Create(ctx context.Context, program *domain.TrainingProgram) (int64, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Serialize equipment and tags to JSON
	equipmentJSON, err := json.Marshal(program.Equipment)
	if err != nil {
		return 0, err
	}
	tagsJSON, err := json.Marshal(program.Tags)
	if err != nil {
		return 0, err
	}

	// Insert program
	const programQuery = `
		INSERT INTO training_programs (
			name, description, duration_weeks, training_days_per_week,
			difficulty, focus, equipment, tags, cover_image_url,
			status, is_template, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
	`

	result, err := tx.ExecContext(ctx, programQuery,
		program.Name,
		program.Description,
		program.DurationWeeks,
		program.TrainingDaysPerWeek,
		program.Difficulty,
		program.Focus,
		string(equipmentJSON),
		string(tagsJSON),
		program.CoverImageURL,
		program.Status,
		program.IsTemplate,
	)
	if err != nil {
		return 0, err
	}

	programID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	// Insert weeks and days
	for _, week := range program.Weeks {
		weekID, err := s.insertWeek(ctx, tx, programID, &week)
		if err != nil {
			return 0, err
		}

		for _, day := range week.Days {
			if err := s.insertDay(ctx, tx, weekID, &day); err != nil {
				return 0, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return programID, nil
}

func (s *TrainingProgramStore) insertWeek(ctx context.Context, tx *sql.Tx, programID int64, week *domain.ProgramWeek) (int64, error) {
	const query = `
		INSERT INTO program_weeks (
			program_id, week_number, label, is_deload, volume_scale, intensity_scale
		) VALUES (?, ?, ?, ?, ?, ?)
	`

	result, err := tx.ExecContext(ctx, query,
		programID,
		week.WeekNumber,
		week.Label,
		week.IsDeload,
		week.VolumeScale,
		week.IntensityScale,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func (s *TrainingProgramStore) insertDay(ctx context.Context, tx *sql.Tx, weekID int64, day *domain.ProgramDay) error {
	const query = `
		INSERT INTO program_days (
			week_id, day_number, label, training_type, duration_min,
			load_score, nutrition_day, notes
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := tx.ExecContext(ctx, query,
		weekID,
		day.DayNumber,
		day.Label,
		day.TrainingType,
		day.DurationMin,
		day.LoadScore,
		day.NutritionDay,
		day.Notes,
	)
	return err
}

// GetByID retrieves a training program by ID with its weeks and days.
func (s *TrainingProgramStore) GetByID(ctx context.Context, id int64) (*domain.TrainingProgram, error) {
	const query = `
		SELECT
			id, name, description, duration_weeks, training_days_per_week,
			difficulty, focus, equipment, tags, cover_image_url,
			status, is_template, created_at, updated_at
		FROM training_programs
		WHERE id = ?
	`

	var program domain.TrainingProgram
	var equipmentJSON, tagsJSON, createdAt, updatedAt string
	var description, coverImageURL sql.NullString

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&program.ID,
		&program.Name,
		&description,
		&program.DurationWeeks,
		&program.TrainingDaysPerWeek,
		&program.Difficulty,
		&program.Focus,
		&equipmentJSON,
		&tagsJSON,
		&coverImageURL,
		&program.Status,
		&program.IsTemplate,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProgramNotFound
	}
	if err != nil {
		return nil, err
	}

	if description.Valid {
		program.Description = description.String
	}
	if coverImageURL.Valid {
		program.CoverImageURL = &coverImageURL.String
	}

	// Parse JSON arrays
	if err := json.Unmarshal([]byte(equipmentJSON), &program.Equipment); err != nil {
		program.Equipment = []domain.EquipmentType{}
	}
	if err := json.Unmarshal([]byte(tagsJSON), &program.Tags); err != nil {
		program.Tags = []string{}
	}

	program.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	program.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

	// Load weeks and days
	weeks, err := s.getWeeks(ctx, program.ID)
	if err != nil {
		return nil, err
	}
	program.Weeks = weeks

	return &program, nil
}

// List retrieves all training programs with optional filtering.
func (s *TrainingProgramStore) List(ctx context.Context, filters ProgramFilters) ([]*domain.TrainingProgram, error) {
	query := `
		SELECT
			id, name, description, duration_weeks, training_days_per_week,
			difficulty, focus, equipment, tags, cover_image_url,
			status, is_template, created_at, updated_at
		FROM training_programs
		WHERE 1=1
	`
	var args []interface{}

	if filters.Difficulty != "" {
		query += " AND difficulty = ?"
		args = append(args, filters.Difficulty)
	}
	if filters.Focus != "" {
		query += " AND focus = ?"
		args = append(args, filters.Focus)
	}
	if filters.IsTemplate != nil {
		query += " AND is_template = ?"
		args = append(args, *filters.IsTemplate)
	}
	if filters.Status != "" {
		query += " AND status = ?"
		args = append(args, filters.Status)
	}

	query += " ORDER BY created_at DESC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var programs []*domain.TrainingProgram
	for rows.Next() {
		var program domain.TrainingProgram
		var equipmentJSON, tagsJSON, createdAt, updatedAt string
		var description, coverImageURL sql.NullString

		err := rows.Scan(
			&program.ID,
			&program.Name,
			&description,
			&program.DurationWeeks,
			&program.TrainingDaysPerWeek,
			&program.Difficulty,
			&program.Focus,
			&equipmentJSON,
			&tagsJSON,
			&coverImageURL,
			&program.Status,
			&program.IsTemplate,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			return nil, err
		}

		if description.Valid {
			program.Description = description.String
		}
		if coverImageURL.Valid {
			program.CoverImageURL = &coverImageURL.String
		}

		if err := json.Unmarshal([]byte(equipmentJSON), &program.Equipment); err != nil {
			program.Equipment = []domain.EquipmentType{}
		}
		if err := json.Unmarshal([]byte(tagsJSON), &program.Tags); err != nil {
			program.Tags = []string{}
		}

		program.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		program.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

		programs = append(programs, &program)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return programs, nil
}

// ProgramFilters contains optional filters for listing programs.
type ProgramFilters struct {
	Difficulty string
	Focus      string
	IsTemplate *bool
	Status     string
}

// Update updates a training program (not including weeks/days for simplicity).
func (s *TrainingProgramStore) Update(ctx context.Context, program *domain.TrainingProgram) error {
	equipmentJSON, err := json.Marshal(program.Equipment)
	if err != nil {
		return err
	}
	tagsJSON, err := json.Marshal(program.Tags)
	if err != nil {
		return err
	}

	const query = `
		UPDATE training_programs
		SET name = ?, description = ?, duration_weeks = ?, training_days_per_week = ?,
			difficulty = ?, focus = ?, equipment = ?, tags = ?, cover_image_url = ?,
			status = ?, updated_at = datetime('now')
		WHERE id = ?
	`

	result, err := s.db.ExecContext(ctx, query,
		program.Name,
		program.Description,
		program.DurationWeeks,
		program.TrainingDaysPerWeek,
		program.Difficulty,
		program.Focus,
		string(equipmentJSON),
		string(tagsJSON),
		program.CoverImageURL,
		program.Status,
		program.ID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrProgramNotFound
	}

	return nil
}

// Delete removes a training program and its weeks/days (cascade).
func (s *TrainingProgramStore) Delete(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM training_programs WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrProgramNotFound
	}

	return nil
}

// getWeeks retrieves all weeks for a program with their days.
func (s *TrainingProgramStore) getWeeks(ctx context.Context, programID int64) ([]domain.ProgramWeek, error) {
	const query = `
		SELECT id, program_id, week_number, label, is_deload, volume_scale, intensity_scale
		FROM program_weeks
		WHERE program_id = ?
		ORDER BY week_number ASC
	`

	rows, err := s.db.QueryContext(ctx, query, programID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// First pass: collect all weeks (must close rows before nested queries to avoid SQLite deadlock)
	var weeks []domain.ProgramWeek
	for rows.Next() {
		var week domain.ProgramWeek
		err := rows.Scan(
			&week.ID,
			&week.ProgramID,
			&week.WeekNumber,
			&week.Label,
			&week.IsDeload,
			&week.VolumeScale,
			&week.IntensityScale,
		)
		if err != nil {
			return nil, err
		}
		weeks = append(weeks, week)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Close rows before making nested queries to avoid SQLite connection deadlock
	rows.Close()

	// Second pass: load days for each week
	for i := range weeks {
		days, err := s.getDays(ctx, weeks[i].ID)
		if err != nil {
			return nil, err
		}
		weeks[i].Days = days
	}

	return weeks, nil
}

// getDays retrieves all days for a week.
func (s *TrainingProgramStore) getDays(ctx context.Context, weekID int64) ([]domain.ProgramDay, error) {
	const query = `
		SELECT id, week_id, day_number, label, training_type, duration_min,
			   load_score, nutrition_day, COALESCE(notes, '')
		FROM program_days
		WHERE week_id = ?
		ORDER BY day_number ASC
	`

	rows, err := s.db.QueryContext(ctx, query, weekID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var days []domain.ProgramDay
	for rows.Next() {
		var day domain.ProgramDay
		err := rows.Scan(
			&day.ID,
			&day.WeekID,
			&day.DayNumber,
			&day.Label,
			&day.TrainingType,
			&day.DurationMin,
			&day.LoadScore,
			&day.NutritionDay,
			&day.Notes,
		)
		if err != nil {
			return nil, err
		}

		days = append(days, day)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return days, nil
}

// =============================================================================
// PROGRAM INSTALLATION STORE
// =============================================================================

// CreateInstallation creates a new program installation.
// Returns ErrActiveInstallationExists if an active installation already exists.
func (s *TrainingProgramStore) CreateInstallation(ctx context.Context, installation *domain.ProgramInstallation) (int64, error) {
	// Check for existing active installation
	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM program_installations WHERE status = 'active'").Scan(&count)
	if err != nil {
		return 0, err
	}
	if count > 0 {
		return 0, ErrActiveInstallationExists
	}

	// Serialize week day mapping to JSON
	mappingJSON, err := json.Marshal(installation.WeekDayMapping)
	if err != nil {
		return 0, err
	}

	const query = `
		INSERT INTO program_installations (
			program_id, start_date, week_day_mapping, current_week, status,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
	`

	result, err := s.db.ExecContext(ctx, query,
		installation.ProgramID,
		installation.StartDate.Format("2006-01-02"),
		string(mappingJSON),
		installation.CurrentWeek,
		installation.Status,
	)
	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetActiveInstallation retrieves the currently active program installation.
func (s *TrainingProgramStore) GetActiveInstallation(ctx context.Context) (*domain.ProgramInstallation, error) {
	const query = `
		SELECT id, program_id, start_date, week_day_mapping, current_week, status,
			   created_at, updated_at
		FROM program_installations
		WHERE status = 'active'
		LIMIT 1
	`

	var installation domain.ProgramInstallation
	var startDate, mappingJSON, createdAt, updatedAt string

	err := s.db.QueryRowContext(ctx, query).Scan(
		&installation.ID,
		&installation.ProgramID,
		&startDate,
		&mappingJSON,
		&installation.CurrentWeek,
		&installation.Status,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInstallationNotFound
	}
	if err != nil {
		return nil, err
	}

	installation.StartDate, _ = time.Parse("2006-01-02", startDate)
	installation.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	installation.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

	if err := json.Unmarshal([]byte(mappingJSON), &installation.WeekDayMapping); err != nil {
		installation.WeekDayMapping = []int{}
	}

	// Load the associated program
	program, err := s.GetByID(ctx, installation.ProgramID)
	if err != nil {
		return nil, err
	}
	installation.Program = program

	return &installation, nil
}

// GetInstallationByID retrieves a program installation by ID.
func (s *TrainingProgramStore) GetInstallationByID(ctx context.Context, id int64) (*domain.ProgramInstallation, error) {
	const query = `
		SELECT id, program_id, start_date, week_day_mapping, current_week, status,
			   created_at, updated_at
		FROM program_installations
		WHERE id = ?
	`

	var installation domain.ProgramInstallation
	var startDate, mappingJSON, createdAt, updatedAt string

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&installation.ID,
		&installation.ProgramID,
		&startDate,
		&mappingJSON,
		&installation.CurrentWeek,
		&installation.Status,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrInstallationNotFound
	}
	if err != nil {
		return nil, err
	}

	installation.StartDate, _ = time.Parse("2006-01-02", startDate)
	installation.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	installation.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

	if err := json.Unmarshal([]byte(mappingJSON), &installation.WeekDayMapping); err != nil {
		installation.WeekDayMapping = []int{}
	}

	// Load the associated program
	program, err := s.GetByID(ctx, installation.ProgramID)
	if err != nil {
		return nil, err
	}
	installation.Program = program

	return &installation, nil
}

// UpdateInstallationStatus updates the status of a program installation.
func (s *TrainingProgramStore) UpdateInstallationStatus(ctx context.Context, id int64, status domain.InstallationStatus) error {
	const query = `
		UPDATE program_installations
		SET status = ?, updated_at = datetime('now')
		WHERE id = ?
	`

	result, err := s.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrInstallationNotFound
	}

	return nil
}

// UpdateInstallationWeek updates the current week of a program installation.
func (s *TrainingProgramStore) UpdateInstallationWeek(ctx context.Context, id int64, week int) error {
	const query = `
		UPDATE program_installations
		SET current_week = ?, updated_at = datetime('now')
		WHERE id = ?
	`

	result, err := s.db.ExecContext(ctx, query, week, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrInstallationNotFound
	}

	return nil
}

// DeleteInstallation removes a program installation.
func (s *TrainingProgramStore) DeleteInstallation(ctx context.Context, id int64) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM program_installations WHERE id = ?", id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrInstallationNotFound
	}

	return nil
}
