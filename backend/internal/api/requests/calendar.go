package requests

// CalendarSummaryResponse is the response for GET /api/calendar/summary
type CalendarSummaryResponse struct {
	Days          []CalendarSummaryPoint `json:"days"`
	Normalization NormalizationMetadata  `json:"normalization"`
}

// CalendarSummaryPoint represents a single day in the calendar summary
type CalendarSummaryPoint struct {
	Date                string  `json:"date"`
	DayType             string  `json:"dayType"`
	LoadNormalized      float64 `json:"loadNormalized"`      // 0.0-1.0
	CaloriesNormalized  float64 `json:"caloriesNormalized"`  // 0.0-1.0
	LoadRaw             float64 `json:"loadRaw"`
	CaloriesRaw         int     `json:"caloriesRaw"`
	HeatmapIntensity    float64 `json:"heatmapIntensity"`    // 0.0-1.0 (load-based)
	HasTraining         bool    `json:"hasTraining"`
	PrimaryTrainingType *string `json:"primaryTrainingType,omitempty"`
	SessionsCount       int     `json:"sessionsCount"`
	AvgRpe              *int    `json:"avgRpe,omitempty"`
}

// NormalizationMetadata provides context for denormalizing values
type NormalizationMetadata struct {
	MaxCalories int     `json:"maxCalories"`
	MaxLoad     float64 `json:"maxLoad"`
}

// DayInsightResponse is the response for GET /api/logs/{date}/insight
type DayInsightResponse struct {
	Insight   string `json:"insight"`
	Generated bool   `json:"generated"` // true if AI-generated, false if templated fallback
}
