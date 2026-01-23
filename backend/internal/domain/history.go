package domain

// HistoryPoint represents a single historical data point for history views.
type HistoryPoint struct {
	Date           string
	WeightKg       float64
	EstimatedTDEE  int
	TDEEConfidence float64
}

// TrainingSummaryAggregate provides aggregate training totals over a range.
type TrainingSummaryAggregate struct {
	SessionCount     int
	TotalDurationMin int
	TotalLoadScore   float64
}

// HistorySummary aggregates data for the history view.
type HistorySummary struct {
	Points          []HistoryPoint
	Trend           *WeightTrend
	PlannedTraining TrainingSummaryAggregate
	ActualTraining  TrainingSummaryAggregate
}
