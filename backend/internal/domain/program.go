package domain

import "time"

// =============================================================================
// PROGRAM ENUMS
// =============================================================================

// ProgramDifficulty represents the skill level required for a training program.
type ProgramDifficulty string

const (
	ProgramDifficultyBeginner     ProgramDifficulty = "beginner"
	ProgramDifficultyIntermediate ProgramDifficulty = "intermediate"
	ProgramDifficultyAdvanced     ProgramDifficulty = "advanced"
)

// ValidProgramDifficulties contains all valid program difficulty values.
var ValidProgramDifficulties = map[ProgramDifficulty]bool{
	ProgramDifficultyBeginner:     true,
	ProgramDifficultyIntermediate: true,
	ProgramDifficultyAdvanced:     true,
}

// ParseProgramDifficulty safely converts a string to ProgramDifficulty with validation.
func ParseProgramDifficulty(s string) (ProgramDifficulty, error) {
	d := ProgramDifficulty(s)
	if !ValidProgramDifficulties[d] {
		return "", ErrInvalidProgramDifficulty
	}
	return d, nil
}

// ProgramFocus represents the primary training goal of a program.
type ProgramFocus string

const (
	ProgramFocusHypertrophy  ProgramFocus = "hypertrophy"
	ProgramFocusStrength     ProgramFocus = "strength"
	ProgramFocusConditioning ProgramFocus = "conditioning"
	ProgramFocusGeneral      ProgramFocus = "general"
)

// ValidProgramFocuses contains all valid program focus values.
var ValidProgramFocuses = map[ProgramFocus]bool{
	ProgramFocusHypertrophy:  true,
	ProgramFocusStrength:     true,
	ProgramFocusConditioning: true,
	ProgramFocusGeneral:      true,
}

// ParseProgramFocus safely converts a string to ProgramFocus with validation.
func ParseProgramFocus(s string) (ProgramFocus, error) {
	f := ProgramFocus(s)
	if !ValidProgramFocuses[f] {
		return "", ErrInvalidProgramFocus
	}
	return f, nil
}

// EquipmentType represents the type of equipment needed for a program.
type EquipmentType string

const (
	EquipmentTypeBarbell    EquipmentType = "barbell"
	EquipmentTypeDumbbell   EquipmentType = "dumbbell"
	EquipmentTypeBodyweight EquipmentType = "bodyweight"
	EquipmentTypeMachine    EquipmentType = "machine"
	EquipmentTypeKettlebell EquipmentType = "kettlebell"
	EquipmentTypeBands      EquipmentType = "bands"
)

// ValidEquipmentTypes contains all valid equipment type values.
var ValidEquipmentTypes = map[EquipmentType]bool{
	EquipmentTypeBarbell:    true,
	EquipmentTypeDumbbell:   true,
	EquipmentTypeBodyweight: true,
	EquipmentTypeMachine:    true,
	EquipmentTypeKettlebell: true,
	EquipmentTypeBands:      true,
}

// ParseEquipmentType safely converts a string to EquipmentType with validation.
func ParseEquipmentType(s string) (EquipmentType, error) {
	e := EquipmentType(s)
	if !ValidEquipmentTypes[e] {
		return "", ErrInvalidEquipmentType
	}
	return e, nil
}

// ProgramStatus represents the current state of a training program.
type ProgramStatus string

const (
	ProgramStatusTemplate  ProgramStatus = "template"  // Library program (read-only)
	ProgramStatusDraft     ProgramStatus = "draft"     // User's custom program being built
	ProgramStatusPublished ProgramStatus = "published" // User's custom program ready to use
)

// ValidProgramStatuses contains all valid program status values.
var ValidProgramStatuses = map[ProgramStatus]bool{
	ProgramStatusTemplate:  true,
	ProgramStatusDraft:     true,
	ProgramStatusPublished: true,
}

// ParseProgramStatus safely converts a string to ProgramStatus with validation.
func ParseProgramStatus(s string) (ProgramStatus, error) {
	if s == "" {
		return ProgramStatusTemplate, nil
	}
	status := ProgramStatus(s)
	if !ValidProgramStatuses[status] {
		return "", ErrInvalidProgramStatus
	}
	return status, nil
}

// InstallationStatus represents the current state of a program installation.
type InstallationStatus string

const (
	InstallationStatusActive    InstallationStatus = "active"
	InstallationStatusCompleted InstallationStatus = "completed"
	InstallationStatusAbandoned InstallationStatus = "abandoned"
)

// ValidInstallationStatuses contains all valid installation status values.
var ValidInstallationStatuses = map[InstallationStatus]bool{
	InstallationStatusActive:    true,
	InstallationStatusCompleted: true,
	InstallationStatusAbandoned: true,
}

// ParseInstallationStatus safely converts a string to InstallationStatus with validation.
func ParseInstallationStatus(s string) (InstallationStatus, error) {
	if s == "" {
		return InstallationStatusActive, nil
	}
	status := InstallationStatus(s)
	if !ValidInstallationStatuses[status] {
		return "", ErrInvalidInstallationStatus
	}
	return status, nil
}

// =============================================================================
// PROGRAM TYPES
// =============================================================================

// TrainingProgram represents a structured training protocol (e.g., "5/3/1", "PPL").
// Programs are either templates (from library) or user-created custom programs.
type TrainingProgram struct {
	ID                  int64
	Name                string
	Description         string
	DurationWeeks       int
	TrainingDaysPerWeek int // Typical frequency (1-7)
	Difficulty          ProgramDifficulty
	Focus               ProgramFocus
	Equipment           []EquipmentType
	Tags                []string
	CoverImageURL       *string
	Weeks               []ProgramWeek
	Status              ProgramStatus
	IsTemplate          bool // true = library, false = user's copy
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// ProgramWeek defines one week within a training program.
// Contains volume/intensity scaling for periodization and training days.
type ProgramWeek struct {
	ID             int64
	ProgramID      int64
	WeekNumber     int // 1-based
	Label          string
	IsDeload       bool
	VolumeScale    float64 // 0.5-1.5, relative volume (1.0 = normal)
	IntensityScale float64 // 0.5-1.5, relative intensity (1.0 = normal)
	Days           []ProgramDay
}

// ProgramDay defines a single training day template within a week.
// Maps to actual calendar days when the program is installed.
type ProgramDay struct {
	ID                 int64
	WeekID             int64
	DayNumber          int          // 1-based within week (Day 1, Day 2, etc.)
	Label              string       // "Upper A", "Push", "Cardio", etc.
	TrainingType       TrainingType // strength, cardio, etc.
	DurationMin        int
	LoadScore          float64 // Base load score (1-5)
	NutritionDay       DayType // Auto-set nutrition strategy when installed
	Notes              string
	ProgressionPattern *ProgressionPattern // Optional; nil = no auto-progression
	SessionExercises   []SessionExercise   // Optional; nil = no block constructor exercises
}

// ProgramInstallation represents a user's active program assignment.
// Links a program template to the user's calendar with day mapping.
type ProgramInstallation struct {
	ID             int64
	ProgramID      int64
	Program        *TrainingProgram // Populated when fetching
	StartDate      time.Time
	WeekDayMapping []int // Maps program day numbers to weekdays (1=Mon, 7=Sun, 0=skip)
	CurrentWeek    int
	Status         InstallationStatus
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// =============================================================================
// PROGRAM VALIDATION CONSTANTS
// =============================================================================

const (
	MinProgramDurationWeeks = 1
	MaxProgramDurationWeeks = 52
	MinTrainingDaysPerWeek  = 1
	MaxTrainingDaysPerWeek  = 7
	MinVolumeScale          = 0.3
	MaxVolumeScale          = 2.0
	MinIntensityScale       = 0.3
	MaxIntensityScale       = 2.0
	MinLoadScore            = 1.0
	MaxLoadScore            = 5.0
	MinDayDurationMin       = 15
	MaxDayDurationMin       = 180
)

// =============================================================================
// PROGRAM INPUT TYPES
// =============================================================================

// TrainingProgramInput contains the fields to create/update a training program.
type TrainingProgramInput struct {
	Name                string          `json:"name"`
	Description         string          `json:"description"`
	DurationWeeks       int             `json:"durationWeeks"`
	TrainingDaysPerWeek int             `json:"trainingDaysPerWeek"`
	Difficulty          string          `json:"difficulty"`
	Focus               string          `json:"focus"`
	Equipment           []string        `json:"equipment"`
	Tags                []string        `json:"tags"`
	CoverImageURL       *string         `json:"coverImageUrl"`
	Weeks               []ProgramWeekInput `json:"weeks"`
}

// ProgramWeekInput contains the fields to create/update a program week.
type ProgramWeekInput struct {
	WeekNumber     int               `json:"weekNumber"`
	Label          string            `json:"label"`
	IsDeload       bool              `json:"isDeload"`
	VolumeScale    float64           `json:"volumeScale"`
	IntensityScale float64           `json:"intensityScale"`
	Days           []ProgramDayInput `json:"days"`
}

// ProgramDayInput contains the fields to create/update a program day.
type ProgramDayInput struct {
	DayNumber          int                 `json:"dayNumber"`
	Label              string              `json:"label"`
	TrainingType       string              `json:"trainingType"`
	DurationMin        int                 `json:"durationMin"`
	LoadScore          float64             `json:"loadScore"`
	NutritionDay       string              `json:"nutritionDay"`
	Notes              string              `json:"notes"`
	ProgressionPattern *ProgressionPattern `json:"progressionPattern,omitempty"`
	SessionExercises   []SessionExercise   `json:"sessionExercises,omitempty"`
}

// SessionPhase represents a segment of a training day's session flow.
type SessionPhase string

const (
	SessionPhasePrepare  SessionPhase = "prepare"
	SessionPhasePractice SessionPhase = "practice"
	SessionPhasePush     SessionPhase = "push"
)

const MaxSessionExercises = 12

func ParseSessionPhase(s string) (SessionPhase, error) {
	switch SessionPhase(s) {
	case SessionPhasePrepare, SessionPhasePractice, SessionPhasePush:
		return SessionPhase(s), nil
	}
	return "", ErrInvalidSessionPhase
}

// SessionExercise is a single exercise node placed in a day's session flow.
// Stored as JSON array in session_exercises column on program_days.
type SessionExercise struct {
	ExerciseID  string       `json:"exerciseId"`
	Phase       SessionPhase `json:"phase"`
	Order       int          `json:"order"`       // 1-based within phase
	DurationSec int          `json:"durationSec"` // 0 = use catalog default
	Reps        int          `json:"reps"`        // 0 = use catalog default
	Notes       string       `json:"notes"`
}

// ValidateSessionExercises checks a slice of SessionExercise for consistency.
func ValidateSessionExercises(exercises []SessionExercise) error {
	if len(exercises) > MaxSessionExercises {
		return ErrTooManySessionExercises
	}
	orderSeen := map[SessionPhase]map[int]bool{}
	for _, ex := range exercises {
		if _, err := ParseSessionPhase(string(ex.Phase)); err != nil {
			return err
		}
		if ex.ExerciseID == "" {
			return ErrInvalidSessionExerciseID
		}
		if ex.Order < 1 {
			return ErrInvalidSessionExerciseOrder
		}
		if orderSeen[ex.Phase] == nil {
			orderSeen[ex.Phase] = map[int]bool{}
		}
		if orderSeen[ex.Phase][ex.Order] {
			return ErrDuplicateSessionExerciseOrder
		}
		orderSeen[ex.Phase][ex.Order] = true
	}
	return nil
}

// InstallProgramInput contains the fields to install a program.
type InstallProgramInput struct {
	ProgramID      int64  `json:"programId"`
	StartDate      string `json:"startDate"` // YYYY-MM-DD
	WeekDayMapping []int  `json:"weekDayMapping"`
}

// =============================================================================
// PROGRAM FACTORY FUNCTIONS
// =============================================================================

// NewTrainingProgram creates a new TrainingProgram from input with validation.
func NewTrainingProgram(input TrainingProgramInput, isTemplate bool, now time.Time) (*TrainingProgram, error) {
	difficulty, err := ParseProgramDifficulty(input.Difficulty)
	if err != nil {
		return nil, err
	}

	focus, err := ParseProgramFocus(input.Focus)
	if err != nil {
		return nil, err
	}

	equipment := make([]EquipmentType, 0, len(input.Equipment))
	for _, e := range input.Equipment {
		et, err := ParseEquipmentType(e)
		if err != nil {
			return nil, err
		}
		equipment = append(equipment, et)
	}

	status := ProgramStatusDraft
	if isTemplate {
		status = ProgramStatusTemplate
	}

	program := &TrainingProgram{
		Name:                input.Name,
		Description:         input.Description,
		DurationWeeks:       input.DurationWeeks,
		TrainingDaysPerWeek: input.TrainingDaysPerWeek,
		Difficulty:          difficulty,
		Focus:               focus,
		Equipment:           equipment,
		Tags:                input.Tags,
		CoverImageURL:       input.CoverImageURL,
		Status:              status,
		IsTemplate:          isTemplate,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	if err := program.Validate(); err != nil {
		return nil, err
	}

	// Parse and validate weeks
	weeks := make([]ProgramWeek, 0, len(input.Weeks))
	for _, weekInput := range input.Weeks {
		week, err := newProgramWeek(weekInput)
		if err != nil {
			return nil, err
		}
		weeks = append(weeks, *week)
	}
	program.Weeks = weeks

	return program, nil
}

// newProgramWeek creates a ProgramWeek from input with validation.
func newProgramWeek(input ProgramWeekInput) (*ProgramWeek, error) {
	if input.VolumeScale == 0 {
		input.VolumeScale = 1.0
	}
	if input.IntensityScale == 0 {
		input.IntensityScale = 1.0
	}

	week := &ProgramWeek{
		WeekNumber:     input.WeekNumber,
		Label:          input.Label,
		IsDeload:       input.IsDeload,
		VolumeScale:    input.VolumeScale,
		IntensityScale: input.IntensityScale,
	}

	if err := week.Validate(); err != nil {
		return nil, err
	}

	// Parse and validate days
	days := make([]ProgramDay, 0, len(input.Days))
	for _, dayInput := range input.Days {
		day, err := newProgramDay(dayInput)
		if err != nil {
			return nil, err
		}
		days = append(days, *day)
	}
	week.Days = days

	return week, nil
}

// newProgramDay creates a ProgramDay from input with validation.
func newProgramDay(input ProgramDayInput) (*ProgramDay, error) {
	trainingType, err := ParseTrainingType(input.TrainingType)
	if err != nil {
		return nil, err
	}

	// Default nutrition day based on training type
	nutritionDay := DayTypePerformance
	if input.NutritionDay != "" {
		nutritionDay, err = ParseDayType(input.NutritionDay)
		if err != nil {
			return nil, err
		}
	} else {
		// Auto-determine based on training type
		if trainingType == TrainingTypeRest {
			nutritionDay = DayTypeFatburner
		}
	}

	if input.LoadScore == 0 {
		input.LoadScore = 3.0 // Default moderate load
	}

	// Validate progression pattern if provided
	if input.ProgressionPattern != nil {
		if err := ValidateProgressionPattern(input.ProgressionPattern); err != nil {
			return nil, err
		}
	}

	// Validate session exercises if provided
	if len(input.SessionExercises) > 0 {
		if err := ValidateSessionExercises(input.SessionExercises); err != nil {
			return nil, err
		}
	}

	day := &ProgramDay{
		DayNumber:          input.DayNumber,
		Label:              input.Label,
		TrainingType:       trainingType,
		DurationMin:        input.DurationMin,
		LoadScore:          input.LoadScore,
		NutritionDay:       nutritionDay,
		Notes:              input.Notes,
		ProgressionPattern: input.ProgressionPattern,
		SessionExercises:   input.SessionExercises,
	}

	if err := day.Validate(); err != nil {
		return nil, err
	}

	return day, nil
}

// NewProgramInstallation creates a new ProgramInstallation from input with validation.
func NewProgramInstallation(input InstallProgramInput, now time.Time) (*ProgramInstallation, error) {
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, ErrInvalidInstallationStartDate
	}

	// Validate start date is not too far in the past (max 7 days)
	minStartDate := now.AddDate(0, 0, -7)
	if startDate.Before(minStartDate) {
		return nil, ErrInstallationStartDateTooOld
	}

	// Validate week day mapping
	if len(input.WeekDayMapping) == 0 || len(input.WeekDayMapping) > 7 {
		return nil, ErrInvalidWeekDayMapping
	}

	for _, day := range input.WeekDayMapping {
		if day < 0 || day > 7 {
			return nil, ErrInvalidWeekDayMapping
		}
	}

	installation := &ProgramInstallation{
		ProgramID:      input.ProgramID,
		StartDate:      startDate,
		WeekDayMapping: input.WeekDayMapping,
		CurrentWeek:    1,
		Status:         InstallationStatusActive,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	return installation, nil
}

// =============================================================================
// VALIDATION METHODS
// =============================================================================

// Validate checks all TrainingProgram fields for validity.
func (p *TrainingProgram) Validate() error {
	if p.Name == "" {
		return ErrInvalidProgramName
	}

	if p.DurationWeeks < MinProgramDurationWeeks || p.DurationWeeks > MaxProgramDurationWeeks {
		return ErrInvalidProgramDuration
	}

	if p.TrainingDaysPerWeek < MinTrainingDaysPerWeek || p.TrainingDaysPerWeek > MaxTrainingDaysPerWeek {
		return ErrInvalidTrainingDaysPerWeek
	}

	return nil
}

// Validate checks all ProgramWeek fields for validity.
func (w *ProgramWeek) Validate() error {
	if w.WeekNumber < 1 {
		return ErrInvalidWeekNumber
	}

	if w.Label == "" {
		w.Label = "Week " + string(rune('0'+w.WeekNumber))
	}

	if w.VolumeScale < MinVolumeScale || w.VolumeScale > MaxVolumeScale {
		return ErrInvalidVolumeScale
	}

	if w.IntensityScale < MinIntensityScale || w.IntensityScale > MaxIntensityScale {
		return ErrInvalidIntensityScale
	}

	return nil
}

// Validate checks all ProgramDay fields for validity.
func (d *ProgramDay) Validate() error {
	if d.DayNumber < 1 {
		return ErrInvalidProgramDayNumber
	}

	if d.Label == "" {
		return ErrInvalidProgramDayLabel
	}

	if d.DurationMin < MinDayDurationMin || d.DurationMin > MaxDayDurationMin {
		return ErrInvalidProgramDayDuration
	}

	if d.LoadScore < MinLoadScore || d.LoadScore > MaxLoadScore {
		return ErrInvalidProgramDayLoadScore
	}

	return nil
}

// =============================================================================
// WAVEFORM DATA
// =============================================================================

// WaveformPoint represents a single data point for the periodization waveform chart.
type WaveformPoint struct {
	WeekNumber int     `json:"weekNumber"`
	Label      string  `json:"label"`
	Volume     float64 `json:"volume"`
	Intensity  float64 `json:"intensity"`
	IsDeload   bool    `json:"isDeload"`
}

// GetWaveformData generates waveform visualization data from a program's weeks.
func (p *TrainingProgram) GetWaveformData() []WaveformPoint {
	points := make([]WaveformPoint, len(p.Weeks))

	for i, week := range p.Weeks {
		points[i] = WaveformPoint{
			WeekNumber: week.WeekNumber,
			Label:      week.Label,
			Volume:     week.VolumeScale,
			Intensity:  week.IntensityScale,
			IsDeload:   week.IsDeload,
		}
	}

	return points
}

// =============================================================================
// INSTALLATION HELPERS
// =============================================================================

// GetCurrentWeek returns the current week number based on days since installation start.
// Returns 0 if installation hasn't started, or > DurationWeeks if installation has ended.
func (i *ProgramInstallation) GetCurrentWeek(now time.Time) int {
	if i.Program == nil {
		return i.CurrentWeek
	}

	if now.Before(i.StartDate) {
		return 0
	}

	daysSinceStart := int(now.Sub(i.StartDate).Hours() / 24)
	currentWeek := (daysSinceStart / 7) + 1

	return currentWeek
}

// IsActive returns true if the installation is currently active.
func (i *ProgramInstallation) IsActive() bool {
	return i.Status == InstallationStatusActive
}

// GetScheduledSessions returns all planned training sessions for the installation.
// Maps program weeks/days to actual calendar dates based on start date and day mapping.
func (i *ProgramInstallation) GetScheduledSessions() []ScheduledSession {
	if i.Program == nil {
		return nil
	}

	var sessions []ScheduledSession

	for _, week := range i.Program.Weeks {
		weekStart := i.StartDate.AddDate(0, 0, (week.WeekNumber-1)*7)

		for _, day := range week.Days {
			// Find which weekday this program day maps to
			if day.DayNumber > len(i.WeekDayMapping) {
				continue
			}

			mappedWeekday := i.WeekDayMapping[day.DayNumber-1]
			if mappedWeekday == 0 {
				continue // Skip if not mapped
			}

			// Calculate actual date (mappedWeekday is 1=Mon, 7=Sun)
			// Go's Weekday: 0=Sun, 1=Mon, ... 6=Sat
			weekdayOffset := mappedWeekday - 1 // 0-indexed from Monday
			sessionDate := weekStart.AddDate(0, 0, weekdayOffset)

			sessions = append(sessions, ScheduledSession{
				Date:               sessionDate,
				WeekNumber:         week.WeekNumber,
				DayNumber:          day.DayNumber,
				Label:              day.Label,
				TrainingType:       day.TrainingType,
				DurationMin:        day.DurationMin,
				LoadScore:          day.LoadScore * week.VolumeScale, // Scale by week volume
				NutritionDay:       day.NutritionDay,
				ProgressionPattern: day.ProgressionPattern,
			})
		}
	}

	return sessions
}

// ScheduledSession represents a training session scheduled for a specific date.
type ScheduledSession struct {
	Date               time.Time
	WeekNumber         int
	DayNumber          int
	Label              string
	TrainingType       TrainingType
	DurationMin        int
	LoadScore          float64
	NutritionDay       DayType
	ProgressionPattern *ProgressionPattern
}

// TotalSessionCount returns the total number of sessions in the installation.
func (i *ProgramInstallation) TotalSessionCount() int {
	return len(i.GetScheduledSessions())
}
