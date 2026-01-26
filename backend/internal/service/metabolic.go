package service

import (
	"context"

	"victus/internal/domain"
	"victus/internal/store"
)

// MetabolicService handles business logic for metabolic history.
type MetabolicService struct {
	metabolicStore *store.MetabolicStore
	dailyLogStore  *store.DailyLogStore
}

// NewMetabolicService creates a new MetabolicService.
func NewMetabolicService(ms *store.MetabolicStore, dls *store.DailyLogStore) *MetabolicService {
	return &MetabolicService{
		metabolicStore: ms,
		dailyLogStore:  dls,
	}
}

// GetChartData returns metabolic history for the Metabolism Graph visualization.
func (s *MetabolicService) GetChartData(ctx context.Context, weeks int) (*domain.FluxChartData, error) {
	if weeks <= 0 {
		weeks = 12 // Default to 12 weeks
	}

	points, err := s.metabolicStore.ListForChart(ctx, weeks)
	if err != nil {
		return nil, err
	}

	if len(points) == 0 {
		return &domain.FluxChartData{
			Points:      []domain.FluxChartPoint{},
			Trend:       "stable",
			InsightText: "Start logging daily to see your metabolic trends!",
		}, nil
	}

	// Calculate summary stats
	var totalTDEE int
	for _, p := range points {
		totalTDEE += p.CalculatedTDEE
	}
	avgTDEE := totalTDEE / len(points)
	latestTDEE := points[len(points)-1].CalculatedTDEE

	// Determine trend and delta
	trend, deltaKcal := domain.DetermineTrend(points)

	// Generate insight text
	insightText := domain.GenerateInsightText(trend, deltaKcal, weeks)

	return &domain.FluxChartData{
		Points:      points,
		LatestTDEE:  latestTDEE,
		AverageTDEE: avgTDEE,
		DeltaKcal:   deltaKcal,
		Trend:       trend,
		InsightText: insightText,
	}, nil
}

// GetPendingNotification returns any pending weekly strategy update notification.
func (s *MetabolicService) GetPendingNotification(ctx context.Context) (*domain.FluxNotification, error) {
	return s.metabolicStore.GetPendingNotification(ctx)
}

// DismissNotification marks a notification as dismissed.
func (s *MetabolicService) DismissNotification(ctx context.Context, id int64) error {
	return s.metabolicStore.DismissNotification(ctx, id)
}

// CalculateAndRecordFlux performs the Flux calculation and persists the result.
// This is called from DailyLogService.Create after the daily log is created.
func (s *MetabolicService) CalculateAndRecordFlux(
	ctx context.Context,
	dailyLogID int64,
	currentBMR float64,
	formulaTDEE int,
	adaptiveResult *domain.AdaptiveTDEEResult,
	config domain.FluxConfig,
) (*domain.FluxResult, error) {
	// Get previous TDEE for swing constraint
	previousTDEE, err := s.metabolicStore.GetPreviousTDEE(ctx)
	if err != nil {
		return nil, err
	}

	// Get adherence (days logged in last 7 days)
	adherenceDays, err := s.metabolicStore.CountRecentLogs(ctx, config.AdherenceWindowDays)
	if err != nil {
		return nil, err
	}

	// Get recent weight history for EMA smoothing
	weightHistory, err := s.metabolicStore.ListRecentWeights(ctx, 14) // 2 weeks for smoothing
	if err != nil {
		return nil, err
	}

	// Build Flux input
	input := domain.FluxInput{
		CurrentBMR:     currentBMR,
		PreviousTDEE:   float64(previousTDEE),
		WeightHistory:  weightHistory,
		AdaptiveResult: adaptiveResult,
		FormulaTDEE:    formulaTDEE,
		AdherenceDays:  adherenceDays,
	}

	// Calculate Flux with constraints
	result := domain.CalculateFlux(input, config)

	// Determine if notification should be triggered
	notificationPending := domain.ShouldTriggerNotification(result.DeltaKcal) && result.UsedAdaptive

	// Build history record
	record := &domain.MetabolicHistoryRecord{
		DailyLogID:          dailyLogID,
		CalculatedTDEE:      result.TDEE,
		PreviousTDEE:        result.PreviousTDEE,
		DeltaKcal:           result.DeltaKcal,
		TDEESource:          string(result.Source),
		WasSwingConstrained: result.WasSwingConstrained,
		BMRFloorApplied:     result.BMRFloorApplied,
		AdherenceGatePassed: result.AdherenceGatePassed,
		Confidence:          result.Confidence,
		DataPointsUsed:      result.DataPointsUsed,
		EMAWeightKg:         result.EMASmoothedWeight,
		BMRValue:            currentBMR,
		NotificationPending: notificationPending,
	}

	// Persist the record
	_, err = s.metabolicStore.Create(ctx, record)
	if err != nil {
		return nil, err
	}

	return &result, nil
}
