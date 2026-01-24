package domain

import "math"

// ACR Thresholds based on sports science literature.
const (
	ACRUndertrained = 0.8 // Below this: detraining risk
	ACROptimalUpper = 1.3 // 0.8-1.3 is optimal zone
	ACRHighUpper    = 1.5 // 1.3-1.5 is high but manageable
	// Above 1.5 is danger zone
)

// Recovery Score component weights (total = 100).
const (
	RestComponentMax  = 40.0 // Rest days contribution
	ACRComponentMax   = 35.0 // ACR zone contribution
	SleepComponentMax = 25.0 // Sleep quality contribution
)

// Rest days threshold for maximum recovery score.
const RestDaysForMaxScore = 3

// RecoveryScoreInput contains data for recovery score calculation.
type RecoveryScoreInput struct {
	RestDaysLast7     int     // Number of rest days in last 7 days
	ACR               float64 // Acute:Chronic Workload Ratio
	AvgSleepQualityL7 float64 // Average sleep quality (1-100) over last 7 days
}

// RecoveryScore represents the calculated recovery state with component breakdown.
type RecoveryScore struct {
	Score          float64 // Total score 0-100, clamped
	RestComponent  float64 // Rest days component (0-40)
	ACRComponent   float64 // ACR zone component (0-35)
	SleepComponent float64 // Sleep quality component (0-25)
}

// AdjustmentInput contains data for calculating daily adjustment multipliers.
type AdjustmentInput struct {
	ACR               float64 // Acute:Chronic Workload Ratio
	RecoveryScore     float64 // Recovery score (0-100)
	TodaySleepQuality int     // Today's sleep quality (1-100)
	YesterdayMaxLoad  float64 // Max load score from yesterday's sessions
}

// AdjustmentMultipliers contains all adjustment factors for daily TDEE.
type AdjustmentMultipliers struct {
	TrainingLoad       float64 // Based on ACR thresholds
	RecoveryScore      float64 // Based on recovery score thresholds
	SleepQuality       float64 // Based on today's sleep quality
	YesterdayIntensity float64 // Based on yesterday's max load score
	Total              float64 // Product of all multipliers, rounded to 2 decimals
}

// CalculateRecoveryScore computes the recovery score from historical data.
// The score is clamped to [0, 100] as per PRD 3.5.
func CalculateRecoveryScore(input RecoveryScoreInput) RecoveryScore {
	// Rest days component (0-40 points)
	// Linear scaling: 0 days = 0 points, 3+ days = 40 points
	restRatio := math.Min(float64(input.RestDaysLast7)/float64(RestDaysForMaxScore), 1.0)
	restComponent := restRatio * RestComponentMax

	// ACR component (0-35 points)
	acrRatio := calculateACRRecoveryRatio(input.ACR)
	acrComponent := acrRatio * ACRComponentMax

	// Sleep quality component (0-25 points)
	// Maps average sleep quality (1-100) to 0-25 points
	sleepRatio := math.Max(0, math.Min(input.AvgSleepQualityL7/100.0, 1.0))
	sleepComponent := sleepRatio * SleepComponentMax

	// Calculate total and clamp to [0, 100]
	total := restComponent + acrComponent + sleepComponent
	total = math.Max(0, math.Min(total, 100))

	return RecoveryScore{
		Score:          total,
		RestComponent:  restComponent,
		ACRComponent:   acrComponent,
		SleepComponent: sleepComponent,
	}
}

// calculateACRRecoveryRatio returns a 0-1 ratio based on ACR zone.
// Optimal zone (0.8-1.3) gets full score, other zones are penalized.
func calculateACRRecoveryRatio(acr float64) float64 {
	switch {
	case acr >= ACRUndertrained && acr <= ACROptimalUpper:
		// Optimal zone: full score
		return 1.0
	case acr >= 0.5 && acr < ACRUndertrained:
		// Slightly undertrained: 50-100% score (linear)
		return 0.5 + (acr-0.5)/(ACRUndertrained-0.5)*0.5
	case acr > ACROptimalUpper && acr <= ACRHighUpper:
		// High zone: 70-100% score (linear decrease)
		return 1.0 - (acr-ACROptimalUpper)/(ACRHighUpper-ACROptimalUpper)*0.3
	case acr > ACRHighUpper:
		// Danger zone: rapid decrease from 70% down to minimum 10%
		return math.Max(0.1, 0.7-(acr-ACRHighUpper)*0.4)
	default:
		// Very undertrained (< 0.5): minimum 30%
		return 0.3
	}
}

// Adjustment multiplier thresholds.
const (
	// Training load (ACR) multipliers
	TrainingLoadUndertrainedMult = 0.98
	TrainingLoadOptimalMult      = 1.00
	TrainingLoadHighMult         = 1.02
	TrainingLoadDangerMult       = 1.05

	// Recovery score thresholds
	RecoveryScorePoorThreshold     = 30.0
	RecoveryScoreModerateThreshold = 60.0
	RecoveryScoreGoodThreshold     = 80.0

	// Recovery score multipliers
	RecoveryScorePoorMult      = 1.05
	RecoveryScoreModerateMult  = 1.02
	RecoveryScoreGoodMult      = 1.00
	RecoveryScoreExcellentMult = 0.98

	// Sleep quality thresholds
	SleepQualityPoorThreshold = 40
	SleepQualityGoodThreshold = 70

	// Sleep quality multipliers
	SleepQualityPoorMult     = 1.03
	SleepQualityModerateMult = 1.00
	SleepQualityGoodMult     = 0.98

	// Yesterday intensity threshold and multiplier
	YesterdayHighIntensityThreshold = 5.0 // LoadScore >= 5 is high intensity (HIIT, Strength)
	YesterdayHighIntensityMult      = 1.02
	YesterdayNormalMult             = 1.00
)

// CalculateAdjustmentMultipliers computes all adjustment factors.
// Total multiplier is the product of all components, rounded to 2 decimals.
func CalculateAdjustmentMultipliers(input AdjustmentInput) AdjustmentMultipliers {
	// Training load multiplier based on ACR
	trainingLoadMult := calculateTrainingLoadMultiplier(input.ACR)

	// Recovery score multiplier
	recoveryMult := calculateRecoveryScoreMultiplier(input.RecoveryScore)

	// Sleep quality multiplier (today's sleep)
	sleepMult := calculateSleepQualityMultiplier(input.TodaySleepQuality)

	// Yesterday intensity multiplier
	yesterdayMult := YesterdayNormalMult
	if input.YesterdayMaxLoad >= YesterdayHighIntensityThreshold {
		yesterdayMult = YesterdayHighIntensityMult
	}

	// Calculate total as product of all multipliers
	total := trainingLoadMult * recoveryMult * sleepMult * yesterdayMult

	// Round to 2 decimal places
	total = math.Round(total*100) / 100

	return AdjustmentMultipliers{
		TrainingLoad:       trainingLoadMult,
		RecoveryScore:      recoveryMult,
		SleepQuality:       sleepMult,
		YesterdayIntensity: yesterdayMult,
		Total:              total,
	}
}

// calculateTrainingLoadMultiplier returns a multiplier based on ACR zone.
func calculateTrainingLoadMultiplier(acr float64) float64 {
	switch {
	case acr < ACRUndertrained:
		return TrainingLoadUndertrainedMult
	case acr >= ACRUndertrained && acr <= ACROptimalUpper:
		return TrainingLoadOptimalMult
	case acr > ACROptimalUpper && acr <= ACRHighUpper:
		return TrainingLoadHighMult
	default: // acr > ACRHighUpper
		return TrainingLoadDangerMult
	}
}

// calculateRecoveryScoreMultiplier returns a multiplier based on recovery score.
func calculateRecoveryScoreMultiplier(score float64) float64 {
	switch {
	case score < RecoveryScorePoorThreshold:
		return RecoveryScorePoorMult
	case score < RecoveryScoreModerateThreshold:
		return RecoveryScoreModerateMult
	case score < RecoveryScoreGoodThreshold:
		return RecoveryScoreGoodMult
	default: // score >= 80
		return RecoveryScoreExcellentMult
	}
}

// calculateSleepQualityMultiplier returns a multiplier based on today's sleep quality.
func calculateSleepQualityMultiplier(quality int) float64 {
	switch {
	case quality < SleepQualityPoorThreshold:
		return SleepQualityPoorMult
	case quality < SleepQualityGoodThreshold:
		return SleepQualityModerateMult
	default: // quality >= 70
		return SleepQualityGoodMult
	}
}

// MaxSessionLoadScore returns the maximum load score from a list of sessions.
// Returns 0 if the list is empty.
func MaxSessionLoadScore(sessions []TrainingSession) float64 {
	var maxLoad float64
	for _, s := range sessions {
		config := GetTrainingConfig(s.Type)
		if config.LoadScore > maxLoad {
			maxLoad = config.LoadScore
		}
	}
	return maxLoad
}

// SessionPatternData contains session information for a single day.
// Used for recovery calculations without store dependency.
type SessionPatternData struct {
	Date            string
	PlannedSessions []TrainingSession
	ActualSessions  []TrainingSession
}

// SessionPatternResult contains the analysis of session patterns for recovery calculation.
type SessionPatternResult struct {
	RestDays         int
	YesterdayMaxLoad float64
}

// AnalyzeSessionPattern analyzes training session patterns to determine rest days
// and yesterday's max load score. Uses ActualSessions if available, falls back to PlannedSessions.
func AnalyzeSessionPattern(sessionsData []SessionPatternData, yesterdayDate string) SessionPatternResult {
	var result SessionPatternResult

	for _, sd := range sessionsData {
		// Prefer actual sessions over planned sessions
		sessions := sd.ActualSessions
		if len(sessions) == 0 {
			sessions = sd.PlannedSessions
		}

		// Check if it's a rest day (no sessions or all sessions are rest type)
		isRestDay := true
		for _, sess := range sessions {
			if sess.Type != TrainingTypeRest {
				isRestDay = false
				break
			}
		}

		if isRestDay || len(sessions) == 0 {
			result.RestDays++
		}

		// Check if this is yesterday to get max load score
		if sd.Date == yesterdayDate {
			result.YesterdayMaxLoad = MaxSessionLoadScore(sessions)
		}
	}

	return result
}
