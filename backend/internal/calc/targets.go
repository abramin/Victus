// Package calc re-exports calculation functions for backward compatibility.
// New code should import from victus/internal/domain directly.
package calc

import (
	"time"

	"victus/internal/domain"
	"victus/internal/models"
)

// Re-export types
type TrainingConfig = domain.TrainingConfig
type DayTypeMultipliers = domain.DayTypeMultipliers

// Re-export variables
var (
	TrainingConfigs = domain.TrainingConfigs
	Multipliers     = domain.Multipliers
)

// CalculateDailyTargets computes daily macro targets based on profile and log.
func CalculateDailyTargets(profile *models.UserProfile, log *models.DailyLog, now time.Time) models.DailyTargets {
	return domain.CalculateDailyTargets(profile, log, now)
}

// CalculateEstimatedTDEE returns the estimated TDEE for the day.
func CalculateEstimatedTDEE(profile *models.UserProfile, weightKg float64, trainingType models.TrainingType, durationMin int, now time.Time) int {
	return domain.CalculateEstimatedTDEE(profile, weightKg, trainingType, durationMin, now)
}
