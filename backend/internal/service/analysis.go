package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// AnalysisService handles dual-track analysis for nutrition plans.
type AnalysisService struct {
	planStore    *store.NutritionPlanStore
	profileStore *store.ProfileStore
	logStore     *store.DailyLogStore
}

// NewAnalysisService creates a new AnalysisService.
func NewAnalysisService(ps *store.NutritionPlanStore, profileStore *store.ProfileStore, logStore *store.DailyLogStore) *AnalysisService {
	return &AnalysisService{
		planStore:    ps,
		profileStore: profileStore,
		logStore:     logStore,
	}
}

// AnalyzePlan performs dual-track analysis comparing plan vs actual progress.
// Uses a rolling 7-day average for actual weight.
// Returns analysis with variance, recalibration options (if needed), and projections.
func (s *AnalysisService) AnalyzePlan(ctx context.Context, planID int64, analysisDate time.Time) (*domain.DualTrackAnalysis, error) {
	// Get the plan
	plan, err := s.planStore.GetByID(ctx, planID)
	if err != nil {
		return nil, err
	}

	// Verify plan is active
	if !plan.IsActive() {
		return nil, domain.ErrPlanNotFound
	}

	// Get profile for tolerance setting
	profile, err := s.profileStore.Get(ctx)
	if err != nil {
		return nil, err
	}

	// Get rolling 7-day average weight
	actualWeight, err := s.getRolling7DayWeight(ctx, analysisDate)
	if err != nil {
		return nil, err
	}

	// Get weight trend for trend projection (last 30 days)
	weightTrend, _ := s.getWeightTrend(ctx, analysisDate, 30)

	// Perform analysis
	input := domain.AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   actualWeight,
		TolerancePercent: profile.RecalibrationTolerance,
		WeightTrend:      weightTrend,
		AnalysisDate:     analysisDate,
	}

	return domain.CalculateDualTrackAnalysis(input)
}

// AnalyzeActivePlan performs dual-track analysis on the currently active plan.
func (s *AnalysisService) AnalyzeActivePlan(ctx context.Context, analysisDate time.Time) (*domain.DualTrackAnalysis, error) {
	// Get active plan
	plan, err := s.planStore.GetActive(ctx)
	if err != nil {
		return nil, err
	}

	return s.AnalyzePlan(ctx, plan.ID, analysisDate)
}

// getRolling7DayWeight calculates the rolling 7-day average weight.
// Returns error if insufficient data (fewer than 1 weight entry in last 7 days).
func (s *AnalysisService) getRolling7DayWeight(ctx context.Context, asOfDate time.Time) (float64, error) {
	// Calculate start date for 7-day window
	startDate := asOfDate.AddDate(0, 0, -6) // 7 days including today
	startDateStr := startDate.Format("2006-01-02")
	endDateStr := asOfDate.Format("2006-01-02")

	// Get weight samples in the date range
	samples, err := s.logStore.ListWeights(ctx, startDateStr)
	if err != nil {
		return 0, err
	}

	// Filter to only include samples within our window
	var validSamples []domain.WeightSample
	for _, sample := range samples {
		if sample.Date >= startDateStr && sample.Date <= endDateStr {
			validSamples = append(validSamples, sample)
		}
	}

	if len(validSamples) == 0 {
		return 0, domain.ErrInsufficientWeightData
	}

	// Calculate average
	var sum float64
	for _, sample := range validSamples {
		sum += sample.WeightKg
	}

	return sum / float64(len(validSamples)), nil
}

// getWeightTrend calculates the weight trend over the specified number of days.
// Returns nil if insufficient data for trend calculation.
func (s *AnalysisService) getWeightTrend(ctx context.Context, asOfDate time.Time, days int) (*domain.WeightTrend, error) {
	startDate := asOfDate.AddDate(0, 0, -(days - 1))
	startDateStr := startDate.Format("2006-01-02")
	endDateStr := asOfDate.Format("2006-01-02")

	samples, err := s.logStore.ListWeights(ctx, startDateStr)
	if err != nil {
		return nil, err
	}

	// Filter to date range
	var validSamples []domain.WeightSample
	for _, sample := range samples {
		if sample.Date >= startDateStr && sample.Date <= endDateStr {
			validSamples = append(validSamples, sample)
		}
	}

	return domain.CalculateWeightTrend(validSamples), nil
}
