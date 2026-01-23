package requests

import (
	"time"

	"victus/internal/domain"
)

// TrainingSessionRequest represents a single training session in API requests.
type TrainingSessionRequest struct {
	Type        string `json:"type"`
	DurationMin int    `json:"durationMin"`
	Notes       string `json:"notes,omitempty"`
}

// ActualTrainingSessionRequest represents an actual training session in API requests.
type ActualTrainingSessionRequest struct {
	Type               string `json:"type"`
	DurationMin        int    `json:"durationMin"`
	PerceivedIntensity *int   `json:"perceivedIntensity,omitempty"` // RPE 1-10
	Notes              string `json:"notes,omitempty"`
}

// UpdateActualTrainingRequest is the request body for PATCH /api/logs/:date/actual-training.
type UpdateActualTrainingRequest struct {
	ActualSessions []ActualTrainingSessionRequest `json:"actualSessions"`
}

// CreateDailyLogRequest is the request body for POST /api/logs.
type CreateDailyLogRequest struct {
	Date                    string                   `json:"date,omitempty"`
	WeightKg                float64                  `json:"weightKg"`
	BodyFatPercent          *float64                 `json:"bodyFatPercent,omitempty"`
	RestingHeartRate        *int                     `json:"restingHeartRate,omitempty"`
	SleepQuality            int                      `json:"sleepQuality"`
	SleepHours              *float64                 `json:"sleepHours,omitempty"`
	PlannedTrainingSessions []TrainingSessionRequest `json:"plannedTrainingSessions"`
	DayType                 string                   `json:"dayType,omitempty"`
}

// TrainingSessionResponse represents a training session in API responses.
type TrainingSessionResponse struct {
	SessionOrder int    `json:"sessionOrder"`
	Type         string `json:"type"`
	DurationMin  int    `json:"durationMin"`
	Notes        string `json:"notes,omitempty"`
}

// ActualTrainingSessionResponse represents an actual training session in API responses.
type ActualTrainingSessionResponse struct {
	SessionOrder       int    `json:"sessionOrder"`
	Type               string `json:"type"`
	DurationMin        int    `json:"durationMin"`
	PerceivedIntensity *int   `json:"perceivedIntensity,omitempty"`
	Notes              string `json:"notes,omitempty"`
}

// TrainingSummaryResponse provides aggregate info about training sessions.
type TrainingSummaryResponse struct {
	SessionCount     int     `json:"sessionCount"`
	TotalDurationMin int     `json:"totalDurationMin"`
	TotalLoadScore   float64 `json:"totalLoadScore"`
	Summary          string  `json:"summary"` // e.g., "3 sessions, 110 min total"
}

// TrainingLoadResponse contains ACR metrics for training load management.
type TrainingLoadResponse struct {
	DailyLoad   float64 `json:"dailyLoad"`   // Session loads summed for the day
	AcuteLoad   float64 `json:"acuteLoad"`   // 7-day rolling average
	ChronicLoad float64 `json:"chronicLoad"` // 28-day rolling average
	ACR         float64 `json:"acr"`         // Acute:Chronic ratio (1.0 default when chronic=0)
}

// RecoveryScoreResponse contains recovery score with component breakdown.
type RecoveryScoreResponse struct {
	Score          float64 `json:"score"`          // Total score 0-100
	RestComponent  float64 `json:"restComponent"`  // Rest days component (0-40)
	ACRComponent   float64 `json:"acrComponent"`   // ACR zone component (0-35)
	SleepComponent float64 `json:"sleepComponent"` // Sleep quality component (0-25)
}

// AdjustmentMultipliersResponse contains adjustment factors for daily TDEE.
type AdjustmentMultipliersResponse struct {
	TrainingLoad       float64 `json:"trainingLoad"`       // Based on ACR thresholds
	RecoveryScore      float64 `json:"recoveryScore"`      // Based on recovery score
	SleepQuality       float64 `json:"sleepQuality"`       // Based on today's sleep quality
	YesterdayIntensity float64 `json:"yesterdayIntensity"` // Based on yesterday's max load score
	Total              float64 `json:"total"`              // Product of all multipliers, rounded to 2 decimals
}

// MacroPointsResponse represents macro points for a meal.
type MacroPointsResponse struct {
	Carbs   int `json:"carbs"`
	Protein int `json:"protein"`
	Fats    int `json:"fats"`
}

// MealTargetsResponse represents macro points for all meals.
type MealTargetsResponse struct {
	Breakfast MacroPointsResponse `json:"breakfast"`
	Lunch     MacroPointsResponse `json:"lunch"`
	Dinner    MacroPointsResponse `json:"dinner"`
}

// DailyTargetsResponse represents calculated macro targets.
type DailyTargetsResponse struct {
	TotalCarbsG   int                 `json:"totalCarbsG"`
	TotalProteinG int                 `json:"totalProteinG"`
	TotalFatsG    int                 `json:"totalFatsG"`
	TotalCalories int                 `json:"totalCalories"`
	EstimatedTDEE int                 `json:"estimatedTDEE"` // Effective TDEE used for targets
	Meals         MealTargetsResponse `json:"meals"`
	FruitG        int                 `json:"fruitG"`
	VeggiesG      int                 `json:"veggiesG"`
	WaterL        float64             `json:"waterL"`
	DayType       string              `json:"dayType"`
}

// DailyTargetsRangePointResponse represents calculated targets for a date.
type DailyTargetsRangePointResponse struct {
	Date              string               `json:"date"`
	CalculatedTargets DailyTargetsResponse `json:"calculatedTargets"`
}

// DailyTargetsRangeResponse represents calculated targets over a range.
type DailyTargetsRangeResponse struct {
	Days []DailyTargetsRangePointResponse `json:"days"`
}

// DailyLogResponse is the response body for daily log endpoints.
type DailyLogResponse struct {
	Date                    string                          `json:"date"`
	WeightKg                float64                         `json:"weightKg"`
	BodyFatPercent          *float64                        `json:"bodyFatPercent,omitempty"`
	RestingHeartRate        *int                            `json:"restingHeartRate,omitempty"`
	SleepQuality            int                             `json:"sleepQuality"`
	SleepHours              *float64                        `json:"sleepHours,omitempty"`
	PlannedTrainingSessions []TrainingSessionResponse       `json:"plannedTrainingSessions"`
	ActualTrainingSessions  []ActualTrainingSessionResponse `json:"actualTrainingSessions,omitempty"`
	TrainingSummary         TrainingSummaryResponse         `json:"trainingSummary"`
	TrainingLoad            *TrainingLoadResponse           `json:"trainingLoad,omitempty"` // ACR metrics
	DayType                 string                          `json:"dayType"`
	CalculatedTargets       DailyTargetsResponse            `json:"calculatedTargets"`
	EstimatedTDEE           int                             `json:"estimatedTDEE"`
	FormulaTDEE             int                             `json:"formulaTDEE,omitempty"`
	TDEESourceUsed          string                          `json:"tdeeSourceUsed"`                  // formula, manual, or adaptive
	TDEEConfidence          float64                         `json:"tdeeConfidence,omitempty"`        // 0-1 confidence for adaptive TDEE
	DataPointsUsed          int                             `json:"dataPointsUsed,omitempty"`        // Number of data points used for adaptive
	RecoveryScore           *RecoveryScoreResponse          `json:"recoveryScore,omitempty"`         // Recovery score breakdown
	AdjustmentMultipliers   *AdjustmentMultipliersResponse  `json:"adjustmentMultipliers,omitempty"` // Adjustment multipliers breakdown
	CreatedAt               string                          `json:"createdAt,omitempty"`
	UpdatedAt               string                          `json:"updatedAt,omitempty"`
}

// ActualTrainingFromRequest converts an UpdateActualTrainingRequest to domain TrainingSessions.
// Returns an error if any training type is invalid.
func ActualTrainingFromRequest(req UpdateActualTrainingRequest) ([]domain.TrainingSession, error) {
	sessions := make([]domain.TrainingSession, len(req.ActualSessions))
	for i, s := range req.ActualSessions {
		trainingType, err := domain.ParseTrainingType(s.Type)
		if err != nil {
			return nil, err
		}
		sessions[i] = domain.TrainingSession{
			SessionOrder:       i + 1,
			IsPlanned:          false,
			Type:               trainingType,
			DurationMin:        s.DurationMin,
			PerceivedIntensity: s.PerceivedIntensity,
			Notes:              s.Notes,
		}
	}
	return sessions, nil
}

// DailyLogInputFromRequest converts a CreateDailyLogRequest to a DailyLogInput.
// Returns an error if any training type or day type is invalid.
func DailyLogInputFromRequest(req CreateDailyLogRequest) (domain.DailyLogInput, error) {
	sessions := make([]domain.TrainingSession, len(req.PlannedTrainingSessions))
	for i, s := range req.PlannedTrainingSessions {
		trainingType, err := domain.ParseTrainingType(s.Type)
		if err != nil {
			return domain.DailyLogInput{}, err
		}
		sessions[i] = domain.TrainingSession{
			SessionOrder: i + 1,
			IsPlanned:    true,
			Type:         trainingType,
			DurationMin:  s.DurationMin,
			Notes:        s.Notes,
		}
	}

	// Parse day type (empty string allowed, defaults will apply)
	dayType, err := domain.ParseDayType(req.DayType)
	if err != nil && req.DayType != "" {
		return domain.DailyLogInput{}, err
	}

	return domain.DailyLogInput{
		Date:             req.Date,
		WeightKg:         req.WeightKg,
		BodyFatPercent:   req.BodyFatPercent,
		RestingHeartRate: req.RestingHeartRate,
		SleepQuality:     domain.SleepQuality(req.SleepQuality),
		SleepHours:       req.SleepHours,
		PlannedSessions:  sessions,
		DayType:          dayType,
	}, nil
}

// TrainingLoadToResponse converts a domain TrainingLoadResult to a TrainingLoadResponse.
func TrainingLoadToResponse(t *domain.TrainingLoadResult) *TrainingLoadResponse {
	if t == nil {
		return nil
	}
	return &TrainingLoadResponse{
		DailyLoad:   t.DailyLoad,
		AcuteLoad:   t.AcuteLoad,
		ChronicLoad: t.ChronicLoad,
		ACR:         t.ACR,
	}
}

// RecoveryScoreToResponse converts a domain RecoveryScore to a RecoveryScoreResponse.
func RecoveryScoreToResponse(r *domain.RecoveryScore) *RecoveryScoreResponse {
	if r == nil {
		return nil
	}
	return &RecoveryScoreResponse{
		Score:          r.Score,
		RestComponent:  r.RestComponent,
		ACRComponent:   r.ACRComponent,
		SleepComponent: r.SleepComponent,
	}
}

// AdjustmentMultipliersToResponse converts a domain AdjustmentMultipliers to a AdjustmentMultipliersResponse.
func AdjustmentMultipliersToResponse(a *domain.AdjustmentMultipliers) *AdjustmentMultipliersResponse {
	if a == nil {
		return nil
	}
	return &AdjustmentMultipliersResponse{
		TrainingLoad:       a.TrainingLoad,
		RecoveryScore:      a.RecoveryScore,
		SleepQuality:       a.SleepQuality,
		YesterdayIntensity: a.YesterdayIntensity,
		Total:              a.Total,
	}
}

func macroPointsToResponse(points domain.MacroPoints) MacroPointsResponse {
	return MacroPointsResponse{
		Carbs:   points.Carbs,
		Protein: points.Protein,
		Fats:    points.Fats,
	}
}

func mealTargetsToResponse(meals domain.MealTargets) MealTargetsResponse {
	return MealTargetsResponse{
		Breakfast: macroPointsToResponse(meals.Breakfast),
		Lunch:     macroPointsToResponse(meals.Lunch),
		Dinner:    macroPointsToResponse(meals.Dinner),
	}
}

// DailyTargetsToResponse converts DailyTargets to a DailyTargetsResponse.
func DailyTargetsToResponse(targets domain.DailyTargets) DailyTargetsResponse {
	return DailyTargetsResponse{
		TotalCarbsG:   targets.TotalCarbsG,
		TotalProteinG: targets.TotalProteinG,
		TotalFatsG:    targets.TotalFatsG,
		TotalCalories: targets.TotalCalories,
		EstimatedTDEE: targets.EstimatedTDEE,
		Meals:         mealTargetsToResponse(targets.Meals),
		FruitG:        targets.FruitG,
		VeggiesG:      targets.VeggiesG,
		WaterL:        targets.WaterL,
		DayType:       string(targets.DayType),
	}
}

// DailyTargetsRangeToResponse converts daily targets points to a response payload.
func DailyTargetsRangeToResponse(points []domain.DailyTargetsPoint) DailyTargetsRangeResponse {
	resp := make([]DailyTargetsRangePointResponse, len(points))
	for i, point := range points {
		resp[i] = DailyTargetsRangePointResponse{
			Date:              point.Date,
			CalculatedTargets: DailyTargetsToResponse(point.Targets),
		}
	}
	return DailyTargetsRangeResponse{Days: resp}
}

// DailyLogToResponse converts a DailyLog model to a DailyLogResponse.
func DailyLogToResponse(d *domain.DailyLog) DailyLogResponse {
	return DailyLogToResponseWithTrainingLoad(d, nil)
}

// DailyLogToResponseWithTrainingLoad converts a DailyLog model to a DailyLogResponse with optional training load.
func DailyLogToResponseWithTrainingLoad(d *domain.DailyLog, trainingLoad *domain.TrainingLoadResult) DailyLogResponse {
	// Convert planned sessions to response format
	plannedSessions := make([]TrainingSessionResponse, len(d.PlannedSessions))
	for i, s := range d.PlannedSessions {
		plannedSessions[i] = TrainingSessionResponse{
			SessionOrder: s.SessionOrder,
			Type:         string(s.Type),
			DurationMin:  s.DurationMin,
			Notes:        s.Notes,
		}
	}

	// Convert actual sessions to response format
	var actualSessions []ActualTrainingSessionResponse
	if len(d.ActualSessions) > 0 {
		actualSessions = make([]ActualTrainingSessionResponse, len(d.ActualSessions))
		for i, s := range d.ActualSessions {
			actualSessions[i] = ActualTrainingSessionResponse{
				SessionOrder:       s.SessionOrder,
				Type:               string(s.Type),
				DurationMin:        s.DurationMin,
				PerceivedIntensity: s.PerceivedIntensity,
				Notes:              s.Notes,
			}
		}
	}

	summarySessions := d.PlannedSessions
	if len(d.ActualSessions) > 0 {
		summarySessions = d.ActualSessions
	}

	resp := DailyLogResponse{
		Date:                    d.Date,
		WeightKg:                d.WeightKg,
		BodyFatPercent:          d.BodyFatPercent,
		RestingHeartRate:        d.RestingHeartRate,
		SleepQuality:            int(d.SleepQuality),
		SleepHours:              d.SleepHours,
		PlannedTrainingSessions: plannedSessions,
		ActualTrainingSessions:  actualSessions,
		TrainingSummary: TrainingSummaryResponse{
			SessionCount:     len(summarySessions),
			TotalDurationMin: domain.TotalDurationMin(summarySessions),
			TotalLoadScore:   domain.TotalLoadScore(summarySessions),
			Summary:          domain.SessionSummary(summarySessions),
		},
		TrainingLoad:          TrainingLoadToResponse(trainingLoad),
		DayType:               string(d.DayType),
		CalculatedTargets:     DailyTargetsToResponse(d.CalculatedTargets),
		EstimatedTDEE:         d.EstimatedTDEE,
		FormulaTDEE:           d.FormulaTDEE,
		TDEESourceUsed:        string(d.TDEESourceUsed),
		TDEEConfidence:        d.TDEEConfidence,
		DataPointsUsed:        d.DataPointsUsed,
		RecoveryScore:         RecoveryScoreToResponse(d.RecoveryScore),
		AdjustmentMultipliers: AdjustmentMultipliersToResponse(d.AdjustmentMultipliers),
	}

	if !d.CreatedAt.IsZero() {
		resp.CreatedAt = d.CreatedAt.Format(time.RFC3339)
	}
	if !d.UpdatedAt.IsZero() {
		resp.UpdatedAt = d.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}
