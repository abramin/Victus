package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// DualTrackAnalysisResponse represents the API response for plan analysis.
type DualTrackAnalysisResponse struct {
	PlanID              int64                         `json:"planId"`
	AnalysisDate        string                        `json:"analysisDate"`
	CurrentWeek         int                           `json:"currentWeek"`
	PlannedWeightKg     float64                       `json:"plannedWeightKg"`
	ActualWeightKg      float64                       `json:"actualWeightKg"`
	VarianceKg          float64                       `json:"varianceKg"`
	VariancePercent     float64                       `json:"variancePercent"`
	TolerancePercent    float64                       `json:"tolerancePercent"`
	RecalibrationNeeded bool                          `json:"recalibrationNeeded"`
	Options             []RecalibrationOptionResponse `json:"options,omitempty"`
	PlanProjection      []ProjectionPointResponse     `json:"planProjection"`
	TrendProjection     []ProjectionPointResponse     `json:"trendProjection,omitempty"`
}

// RecalibrationOptionResponse represents a recalibration option in the API response.
type RecalibrationOptionResponse struct {
	Type           string `json:"type"`
	FeasibilityTag string `json:"feasibilityTag"`
	NewParameter   string `json:"newParameter"`
	Impact         string `json:"impact"`
}

// ProjectionPointResponse represents a projection point in the API response.
type ProjectionPointResponse struct {
	WeekNumber int     `json:"weekNumber"`
	Date       string  `json:"date"`
	WeightKg   float64 `json:"weightKg"`
}

// analyzePlan handles GET /api/plans/{id}/analysis
func (s *Server) analyzePlan(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Plan ID must be a number")
		return
	}

	// Parse optional date parameter, default to today
	analysisDate := time.Now()
	if dateStr := r.URL.Query().Get("date"); dateStr != "" {
		parsed, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_date", "Date must be in YYYY-MM-DD format")
			return
		}
		analysisDate = parsed
	}

	analysis, err := s.analysisService.AnalyzePlan(r.Context(), id, analysisDate)
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusBadRequest, "profile_required", "A user profile is required for analysis")
			return
		}
		if errors.Is(err, domain.ErrPlanEnded) {
			writeError(w, http.StatusBadRequest, "plan_ended", "Plan has ended - current week exceeds plan duration")
			return
		}
		if errors.Is(err, domain.ErrPlanNotStarted) {
			writeError(w, http.StatusBadRequest, "plan_not_started", "Plan has not started yet")
			return
		}
		if errors.Is(err, domain.ErrInsufficientWeightData) {
			writeError(w, http.StatusBadRequest, "insufficient_data", "Insufficient weight data for analysis - need at least 1 weight entry in the last 7 days")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	response := analysisToResponse(analysis)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// analyzeActivePlan handles GET /api/plans/active/analysis
func (s *Server) analyzeActivePlan(w http.ResponseWriter, r *http.Request) {
	// Parse optional date parameter, default to today
	analysisDate := time.Now()
	if dateStr := r.URL.Query().Get("date"); dateStr != "" {
		parsed, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid_date", "Date must be in YYYY-MM-DD format")
			return
		}
		analysisDate = parsed
	}

	analysis, err := s.analysisService.AnalyzeActivePlan(r.Context(), analysisDate)
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "No active nutrition plan exists")
			return
		}
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusBadRequest, "profile_required", "A user profile is required for analysis")
			return
		}
		if errors.Is(err, domain.ErrPlanEnded) {
			writeError(w, http.StatusBadRequest, "plan_ended", "Plan has ended - current week exceeds plan duration")
			return
		}
		if errors.Is(err, domain.ErrPlanNotStarted) {
			writeError(w, http.StatusBadRequest, "plan_not_started", "Plan has not started yet")
			return
		}
		if errors.Is(err, domain.ErrInsufficientWeightData) {
			writeError(w, http.StatusBadRequest, "insufficient_data", "Insufficient weight data for analysis - need at least 1 weight entry in the last 7 days")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	response := analysisToResponse(analysis)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// analysisToResponse converts domain analysis to API response.
func analysisToResponse(a *domain.DualTrackAnalysis) DualTrackAnalysisResponse {
	response := DualTrackAnalysisResponse{
		PlanID:              a.PlanID,
		AnalysisDate:        a.AnalysisDate.Format("2006-01-02"),
		CurrentWeek:         a.CurrentWeek,
		PlannedWeightKg:     a.PlannedWeightKg,
		ActualWeightKg:      a.ActualWeightKg,
		VarianceKg:          a.VarianceKg,
		VariancePercent:     a.VariancePercent,
		TolerancePercent:    a.TolerancePercent,
		RecalibrationNeeded: a.RecalibrationNeeded,
	}

	// Convert options
	if len(a.Options) > 0 {
		response.Options = make([]RecalibrationOptionResponse, len(a.Options))
		for i, opt := range a.Options {
			response.Options[i] = RecalibrationOptionResponse{
				Type:           string(opt.Type),
				FeasibilityTag: string(opt.FeasibilityTag),
				NewParameter:   opt.NewParameter,
				Impact:         opt.Impact,
			}
		}
	}

	// Convert plan projection
	if len(a.PlanProjection) > 0 {
		response.PlanProjection = make([]ProjectionPointResponse, len(a.PlanProjection))
		for i, p := range a.PlanProjection {
			response.PlanProjection[i] = ProjectionPointResponse{
				WeekNumber: p.WeekNumber,
				Date:       p.Date.Format("2006-01-02"),
				WeightKg:   p.WeightKg,
			}
		}
	}

	// Convert trend projection
	if len(a.TrendProjection) > 0 {
		response.TrendProjection = make([]ProjectionPointResponse, len(a.TrendProjection))
		for i, p := range a.TrendProjection {
			response.TrendProjection[i] = ProjectionPointResponse{
				WeekNumber: p.WeekNumber,
				Date:       p.Date.Format("2006-01-02"),
				WeightKg:   p.WeightKg,
			}
		}
	}

	return response
}
