package requests

import (
	"time"

	"victus/internal/domain"
)

// =============================================================================
// REQUEST TYPES
// =============================================================================

// CreateProgramRequest is the request body for POST /api/training-programs.
type CreateProgramRequest struct {
	Name                string              `json:"name"`
	Description         string              `json:"description"`
	DurationWeeks       int                 `json:"durationWeeks"`
	TrainingDaysPerWeek int                 `json:"trainingDaysPerWeek"`
	Difficulty          string              `json:"difficulty"`
	Focus               string              `json:"focus"`
	Equipment           []string            `json:"equipment"`
	Tags                []string            `json:"tags"`
	CoverImageURL       *string             `json:"coverImageUrl,omitempty"`
	Weeks               []ProgramWeekRequest `json:"weeks"`
}

// ProgramWeekRequest is a week in a create/update program request.
type ProgramWeekRequest struct {
	WeekNumber     int                `json:"weekNumber"`
	Label          string             `json:"label"`
	IsDeload       bool               `json:"isDeload"`
	VolumeScale    float64            `json:"volumeScale"`
	IntensityScale float64            `json:"intensityScale"`
	Days           []ProgramDayRequest `json:"days"`
}

// ProgramDayRequest is a day in a create/update program request.
type ProgramDayRequest struct {
	DayNumber          int                        `json:"dayNumber"`
	Label              string                     `json:"label"`
	TrainingType       string                     `json:"trainingType"`
	DurationMin        int                        `json:"durationMin"`
	LoadScore          float64                    `json:"loadScore"`
	NutritionDay       string                     `json:"nutritionDay"`
	Notes              string                     `json:"notes"`
	ProgressionPattern *domain.ProgressionPattern `json:"progressionPattern,omitempty"`
	SessionExercises   []domain.SessionExercise   `json:"sessionExercises,omitempty"`
}

// InstallProgramRequest is the request body for POST /api/training-programs/{id}/install.
type InstallProgramRequest struct {
	StartDate      string `json:"startDate"` // YYYY-MM-DD
	WeekDayMapping []int  `json:"weekDayMapping"`
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

// ProgramResponse is the full response for a training program.
type ProgramResponse struct {
	ID                  int64                 `json:"id"`
	Name                string                `json:"name"`
	Description         string                `json:"description,omitempty"`
	DurationWeeks       int                   `json:"durationWeeks"`
	TrainingDaysPerWeek int                   `json:"trainingDaysPerWeek"`
	Difficulty          string                `json:"difficulty"`
	Focus               string                `json:"focus"`
	Equipment           []string              `json:"equipment"`
	Tags                []string              `json:"tags"`
	CoverImageURL       *string               `json:"coverImageUrl,omitempty"`
	Status              string                `json:"status"`
	IsTemplate          bool                  `json:"isTemplate"`
	Weeks               []ProgramWeekResponse `json:"weeks,omitempty"`
	CreatedAt           string                `json:"createdAt,omitempty"`
	UpdatedAt           string                `json:"updatedAt,omitempty"`
}

// ProgramSummaryResponse is a condensed program response for list endpoints.
type ProgramSummaryResponse struct {
	ID                  int64    `json:"id"`
	Name                string   `json:"name"`
	Description         string   `json:"description,omitempty"`
	DurationWeeks       int      `json:"durationWeeks"`
	TrainingDaysPerWeek int      `json:"trainingDaysPerWeek"`
	Difficulty          string   `json:"difficulty"`
	Focus               string   `json:"focus"`
	Equipment           []string `json:"equipment"`
	Tags                []string `json:"tags"`
	CoverImageURL       *string  `json:"coverImageUrl,omitempty"`
	Status              string   `json:"status"`
	IsTemplate          bool     `json:"isTemplate"`
}

// ProgramWeekResponse is a week in a program response.
type ProgramWeekResponse struct {
	ID             int64                `json:"id"`
	WeekNumber     int                  `json:"weekNumber"`
	Label          string               `json:"label"`
	IsDeload       bool                 `json:"isDeload"`
	VolumeScale    float64              `json:"volumeScale"`
	IntensityScale float64              `json:"intensityScale"`
	Days           []ProgramDayResponse `json:"days"`
}

// ProgramDayResponse is a day in a program response.
type ProgramDayResponse struct {
	ID                 int64                      `json:"id"`
	DayNumber          int                        `json:"dayNumber"`
	Label              string                     `json:"label"`
	TrainingType       string                     `json:"trainingType"`
	DurationMin        int                        `json:"durationMin"`
	LoadScore          float64                    `json:"loadScore"`
	NutritionDay       string                     `json:"nutritionDay"`
	Notes              string                     `json:"notes,omitempty"`
	ProgressionPattern *domain.ProgressionPattern `json:"progressionPattern,omitempty"`
	SessionExercises   []domain.SessionExercise   `json:"sessionExercises,omitempty"`
}

// WaveformPointResponse is a single point for the periodization waveform chart.
type WaveformPointResponse struct {
	WeekNumber int     `json:"weekNumber"`
	Label      string  `json:"label"`
	Volume     float64 `json:"volume"`
	Intensity  float64 `json:"intensity"`
	IsDeload   bool    `json:"isDeload"`
}

// InstallationResponse is the response for a program installation.
type InstallationResponse struct {
	ID                    int64                  `json:"id"`
	ProgramID             int64                  `json:"programId"`
	Program               *ProgramSummaryResponse `json:"program,omitempty"`
	StartDate             string                 `json:"startDate"`
	WeekDayMapping        []int                  `json:"weekDayMapping"`
	CurrentWeek           int                    `json:"currentWeek"`
	Status                string                 `json:"status"`
	TotalSessionsScheduled int                   `json:"totalSessionsScheduled"`
	CreatedAt             string                 `json:"createdAt,omitempty"`
	UpdatedAt             string                 `json:"updatedAt,omitempty"`
}

// ScheduledSessionResponse is a single scheduled training session.
type ScheduledSessionResponse struct {
	Date               string                     `json:"date"`
	WeekNumber         int                        `json:"weekNumber"`
	DayNumber          int                        `json:"dayNumber"`
	Label              string                     `json:"label"`
	TrainingType       string                     `json:"trainingType"`
	DurationMin        int                        `json:"durationMin"`
	LoadScore          float64                    `json:"loadScore"`
	NutritionDay       string                     `json:"nutritionDay"`
	ProgressionPattern *domain.ProgressionPattern `json:"progressionPattern,omitempty"`
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

// ProgramInputFromRequest converts a CreateProgramRequest to a TrainingProgramInput.
func ProgramInputFromRequest(req CreateProgramRequest) domain.TrainingProgramInput {
	weeks := make([]domain.ProgramWeekInput, len(req.Weeks))
	for i, w := range req.Weeks {
		days := make([]domain.ProgramDayInput, len(w.Days))
		for j, d := range w.Days {
			days[j] = domain.ProgramDayInput{
				DayNumber:          d.DayNumber,
				Label:              d.Label,
				TrainingType:       d.TrainingType,
				DurationMin:        d.DurationMin,
				LoadScore:          d.LoadScore,
				NutritionDay:       d.NutritionDay,
				Notes:              d.Notes,
				ProgressionPattern: d.ProgressionPattern,
				SessionExercises:   d.SessionExercises,
			}
		}
		weeks[i] = domain.ProgramWeekInput{
			WeekNumber:     w.WeekNumber,
			Label:          w.Label,
			IsDeload:       w.IsDeload,
			VolumeScale:    w.VolumeScale,
			IntensityScale: w.IntensityScale,
			Days:           days,
		}
	}

	return domain.TrainingProgramInput{
		Name:                req.Name,
		Description:         req.Description,
		DurationWeeks:       req.DurationWeeks,
		TrainingDaysPerWeek: req.TrainingDaysPerWeek,
		Difficulty:          req.Difficulty,
		Focus:               req.Focus,
		Equipment:           req.Equipment,
		Tags:                req.Tags,
		CoverImageURL:       req.CoverImageURL,
		Weeks:               weeks,
	}
}

// InstallInputFromRequest converts an InstallProgramRequest to an InstallProgramInput.
func InstallInputFromRequest(programID int64, req InstallProgramRequest) domain.InstallProgramInput {
	return domain.InstallProgramInput{
		ProgramID:      programID,
		StartDate:      req.StartDate,
		WeekDayMapping: req.WeekDayMapping,
	}
}

// ProgramToResponse converts a TrainingProgram to a ProgramResponse.
func ProgramToResponse(p *domain.TrainingProgram) ProgramResponse {
	equipment := make([]string, len(p.Equipment))
	for i, e := range p.Equipment {
		equipment[i] = string(e)
	}

	weeks := make([]ProgramWeekResponse, len(p.Weeks))
	for i, w := range p.Weeks {
		days := make([]ProgramDayResponse, len(w.Days))
		for j, d := range w.Days {
			days[j] = ProgramDayResponse{
				ID:                 d.ID,
				DayNumber:          d.DayNumber,
				Label:              d.Label,
				TrainingType:       string(d.TrainingType),
				DurationMin:        d.DurationMin,
				LoadScore:          d.LoadScore,
				NutritionDay:       string(d.NutritionDay),
				Notes:              d.Notes,
				ProgressionPattern: d.ProgressionPattern,
			SessionExercises:   d.SessionExercises,
			}
		}
		weeks[i] = ProgramWeekResponse{
			ID:             w.ID,
			WeekNumber:     w.WeekNumber,
			Label:          w.Label,
			IsDeload:       w.IsDeload,
			VolumeScale:    w.VolumeScale,
			IntensityScale: w.IntensityScale,
			Days:           days,
		}
	}

	resp := ProgramResponse{
		ID:                  p.ID,
		Name:                p.Name,
		Description:         p.Description,
		DurationWeeks:       p.DurationWeeks,
		TrainingDaysPerWeek: p.TrainingDaysPerWeek,
		Difficulty:          string(p.Difficulty),
		Focus:               string(p.Focus),
		Equipment:           equipment,
		Tags:                p.Tags,
		CoverImageURL:       p.CoverImageURL,
		Status:              string(p.Status),
		IsTemplate:          p.IsTemplate,
		Weeks:               weeks,
	}

	if !p.CreatedAt.IsZero() {
		resp.CreatedAt = p.CreatedAt.Format(time.RFC3339)
	}
	if !p.UpdatedAt.IsZero() {
		resp.UpdatedAt = p.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}

// ProgramToSummaryResponse converts a TrainingProgram to a ProgramSummaryResponse.
func ProgramToSummaryResponse(p *domain.TrainingProgram) ProgramSummaryResponse {
	equipment := make([]string, len(p.Equipment))
	for i, e := range p.Equipment {
		equipment[i] = string(e)
	}

	return ProgramSummaryResponse{
		ID:                  p.ID,
		Name:                p.Name,
		Description:         p.Description,
		DurationWeeks:       p.DurationWeeks,
		TrainingDaysPerWeek: p.TrainingDaysPerWeek,
		Difficulty:          string(p.Difficulty),
		Focus:               string(p.Focus),
		Equipment:           equipment,
		Tags:                p.Tags,
		CoverImageURL:       p.CoverImageURL,
		Status:              string(p.Status),
		IsTemplate:          p.IsTemplate,
	}
}

// WaveformToResponse converts domain WaveformPoints to WaveformPointResponses.
func WaveformToResponse(points []domain.WaveformPoint) []WaveformPointResponse {
	resp := make([]WaveformPointResponse, len(points))
	for i, p := range points {
		resp[i] = WaveformPointResponse{
			WeekNumber: p.WeekNumber,
			Label:      p.Label,
			Volume:     p.Volume,
			Intensity:  p.Intensity,
			IsDeload:   p.IsDeload,
		}
	}
	return resp
}

// InstallationToResponse converts a ProgramInstallation to an InstallationResponse.
func InstallationToResponse(i *domain.ProgramInstallation, now time.Time) InstallationResponse {
	resp := InstallationResponse{
		ID:                    i.ID,
		ProgramID:             i.ProgramID,
		StartDate:             i.StartDate.Format("2006-01-02"),
		WeekDayMapping:        i.WeekDayMapping,
		CurrentWeek:           i.GetCurrentWeek(now),
		Status:                string(i.Status),
		TotalSessionsScheduled: i.TotalSessionCount(),
	}

	if i.Program != nil {
		summary := ProgramToSummaryResponse(i.Program)
		resp.Program = &summary
	}

	if !i.CreatedAt.IsZero() {
		resp.CreatedAt = i.CreatedAt.Format(time.RFC3339)
	}
	if !i.UpdatedAt.IsZero() {
		resp.UpdatedAt = i.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}

// ScheduledSessionsToResponse converts domain ScheduledSessions to responses.
func ScheduledSessionsToResponse(sessions []domain.ScheduledSession) []ScheduledSessionResponse {
	resp := make([]ScheduledSessionResponse, len(sessions))
	for i, s := range sessions {
		resp[i] = ScheduledSessionResponse{
			Date:               s.Date.Format("2006-01-02"),
			WeekNumber:         s.WeekNumber,
			DayNumber:          s.DayNumber,
			Label:              s.Label,
			TrainingType:       string(s.TrainingType),
			DurationMin:        s.DurationMin,
			LoadScore:          s.LoadScore,
			NutritionDay:       string(s.NutritionDay),
			ProgressionPattern: s.ProgressionPattern,
		}
	}
	return resp
}
