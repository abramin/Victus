package requests

import "victus/internal/store"

// HealthSyncRequest is the request body for PATCH /api/logs/{date}/health-sync.
// All fields are optional - only provided fields are updated.
// If no log exists for the date and weight is provided, a minimal log is created.
type HealthSyncRequest struct {
	Steps      *int     `json:"steps,omitempty"`
	ActiveKcal *int     `json:"active_kcal,omitempty"`
	RHR        *int     `json:"rhr,omitempty"`
	SleepHours *float64 `json:"sleep_hours,omitempty"`
	Weight     *float64 `json:"weight,omitempty"`     // kg
	BodyFat    *float64 `json:"body_fat,omitempty"`   // percentage 0-100
}

// ToHealthKitMetrics converts the request to store.HealthKitMetrics.
func (r HealthSyncRequest) ToHealthKitMetrics() store.HealthKitMetrics {
	return store.HealthKitMetrics{
		Steps:                r.Steps,
		ActiveCaloriesBurned: r.ActiveKcal,
		RestingHeartRate:     r.RHR,
		SleepHours:           r.SleepHours,
		WeightKg:             r.Weight,
		BodyFatPercent:       r.BodyFat,
	}
}
