package domain

// HistoryPoint represents a single historical data point for history views.
type HistoryPoint struct {
	Date           string
	WeightKg       float64
	EstimatedTDEE  int
	TDEEConfidence float64
	HasTraining    bool // Whether actual training sessions occurred on this day

	// Per-day training details for compliance tracking
	PlannedSessionCount int
	ActualSessionCount  int
	PlannedDurationMin  int
	ActualDurationMin   int
	TrainingLoad        *float64 // Total training load score for the day

	// Annotated history: aggregated notes from training sessions
	Notes string

	// Body composition: for lean mass vs fat mass visualization
	BodyFatPercent *float64

	// Recovery metrics for correlation analysis
	RestingHeartRate *int
	SleepHours       *float64
	HRVMs            *int // Heart Rate Variability in milliseconds
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
