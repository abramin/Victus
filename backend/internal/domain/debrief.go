package domain

import (
	"math"
	"strings"
)

// =============================================================================
// WEEKLY DEBRIEF ENGINE
// =============================================================================
//
// The Weekly Debrief provides an automated analysis of the past 7 days,
// generating a vitality score, tactical recommendations, and supporting
// data for LLM narrative generation.

// WeeklyDebrief represents a complete weekly summary.
type WeeklyDebrief struct {
	WeekStartDate   string                   // Monday YYYY-MM-DD
	WeekEndDate     string                   // Sunday YYYY-MM-DD
	VitalityScore   VitalityScore            // Module A: composite weekly health score
	Narrative       DebriefNarrative         // Module B: LLM or template-generated text
	Recommendations []TacticalRecommendation // Module C: 3 actionable bullet points
	DailyBreakdown  []DebriefDayPoint        // Per-day data for the weekly breakdown
	GeneratedAt     string                   // ISO8601 timestamp
}

// VitalityScore is the composite weekly health score (Module A).
// Components are weighted to create a 0-100 overall score.
type VitalityScore struct {
	Overall           float64                // 0-100 composite score
	MealAdherence     float64                // Percentage of meals logged within targets (0-100)
	TrainingAdherence float64                // Percentage of planned sessions completed (0-100)
	WeightDelta       float64                // kg change from week start to end
	TrendWeight       float64                // EMA-filtered trend weight at week end
	MetabolicFlux     MetabolicFluxIndicator // TDEE up/down/stable
}

// MetabolicFluxIndicator summarizes TDEE changes for the week.
type MetabolicFluxIndicator struct {
	StartTDEE int    // TDEE at week start
	EndTDEE   int    // TDEE at week end
	DeltaKcal int    // EndTDEE - StartTDEE
	Trend     string // "upregulated", "downregulated", "stable"
}

// DebriefNarrative contains the AI or template-generated weekly summary.
type DebriefNarrative struct {
	Text           string // The narrative text
	GeneratedByLLM bool   // true if Ollama generated, false if template fallback
	Model          string // "llama3.2" or "template"
}

// TacticalRecommendation is a single actionable suggestion for the coming week.
type TacticalRecommendation struct {
	Priority    int      // 1-3, where 1 is highest priority
	Category    string   // "training", "nutrition", "recovery"
	Summary     string   // Short headline (1-2 sentences)
	Rationale   string   // Why this recommendation
	ActionItems []string // Specific things to do
}

// DebriefDayPoint contains per-day data for the weekly breakdown.
type DebriefDayPoint struct {
	Date             string     // YYYY-MM-DD
	DayName          string     // "Monday", "Tuesday", etc.
	DayType          DayType    // performance, fatburner, metabolize
	TargetCalories   int        // Calculated target
	ConsumedCalories int        // Actual consumed
	CalorieDelta     int        // consumed - target (positive = surplus)
	TargetProteinG   int        // Target protein in grams
	ConsumedProteinG int        // Actual protein consumed
	ProteinPercent   float64    // Percentage of target achieved
	PlannedSessions  int        // Number of planned training sessions
	ActualSessions   int        // Number of completed training sessions
	TrainingLoad     float64    // Daily training load score
	AvgRPE           *float64   // Average RPE if sessions have it
	HRVMs            *int       // Heart Rate Variability
	CNSStatus        *CNSStatus // CNS status (nil if no HRV data)
	SleepQuality     int        // 1-100 scale
	SleepHours       *float64   // Hours of sleep
	Notes            string     // User notes for the day
}

// DebriefInput contains the data needed to generate a weekly debrief.
// This is passed to LLM for narrative generation.
type DebriefInput struct {
	WeekStartDate string
	WeekEndDate   string
	Profile       *UserProfile
	DailyLogs     []DailyLog
	WeightTrend   *WeightTrend
	FluxHistory   []FluxChartPoint
}

// VitalityScore component weights (total = 100).
const (
	VitalityMealAdherenceWeight     = 35.0 // Meal tracking is primary goal
	VitalityTrainingAdherenceWeight = 30.0 // Training consistency
	VitalityRecoveryWeight          = 20.0 // Sleep + HRV indicators
	VitalityTrendWeight             = 15.0 // Weight moving in right direction
)

// CalculateVitalityScore computes the weekly vitality score from daily logs.
func CalculateVitalityScore(logs []DailyLog, fluxHistory []FluxChartPoint, profile *UserProfile) VitalityScore {
	if len(logs) == 0 {
		return VitalityScore{}
	}

	// Calculate meal adherence (% of calories within ±10% of target)
	mealAdherence := calculateMealAdherence(logs)

	// Calculate training adherence (% of planned sessions completed)
	trainingAdherence := calculateTrainingAdherence(logs)

	// Calculate recovery component (average sleep quality + CNS status)
	recoveryScore := calculateRecoveryComponent(logs)

	// Calculate trend score (weight moving toward goal)
	trendScore := calculateTrendScore(logs, profile)

	// Weighted composite
	overall := mealAdherence*VitalityMealAdherenceWeight/100 +
		trainingAdherence*VitalityTrainingAdherenceWeight/100 +
		recoveryScore*VitalityRecoveryWeight/100 +
		trendScore*VitalityTrendWeight/100

	// Clamp to 0-100
	overall = math.Max(0, math.Min(100, overall))

	// Calculate weight delta
	weightDelta := 0.0
	if len(logs) >= 2 {
		weightDelta = logs[len(logs)-1].WeightKg - logs[0].WeightKg
	}

	// Calculate EMA trend weight
	trendWeight := calculateTrendWeight(logs)

	// Calculate metabolic flux
	metabolicFlux := calculateMetabolicFlux(fluxHistory)

	return VitalityScore{
		Overall:           math.Round(overall*10) / 10,
		MealAdherence:     math.Round(mealAdherence*10) / 10,
		TrainingAdherence: math.Round(trainingAdherence*10) / 10,
		WeightDelta:       math.Round(weightDelta*100) / 100,
		TrendWeight:       math.Round(trendWeight*100) / 100,
		MetabolicFlux:     metabolicFlux,
	}
}

// calculateMealAdherence returns the percentage of days where calories were within ±10% of target.
func calculateMealAdherence(logs []DailyLog) float64 {
	if len(logs) == 0 {
		return 0
	}

	adherentDays := 0
	daysWithData := 0

	for _, log := range logs {
		// Skip days without consumption data
		if log.ConsumedCalories == 0 && log.CalculatedTargets.TotalCalories == 0 {
			continue
		}
		daysWithData++

		target := log.CalculatedTargets.TotalCalories
		if target == 0 {
			continue
		}

		deviation := math.Abs(float64(log.ConsumedCalories-target)) / float64(target)
		if deviation <= 0.10 { // Within 10%
			adherentDays++
		}
	}

	if daysWithData == 0 {
		return 0
	}
	return float64(adherentDays) / float64(daysWithData) * 100
}

// calculateTrainingAdherence returns the percentage of planned sessions that were completed.
func calculateTrainingAdherence(logs []DailyLog) float64 {
	totalPlanned := 0
	totalCompleted := 0

	for _, log := range logs {
		// Count non-rest planned sessions
		for _, session := range log.PlannedSessions {
			if session.Type != TrainingTypeRest {
				totalPlanned++
			}
		}

		// Count actual sessions
		for _, session := range log.ActualSessions {
			if session.Type != TrainingTypeRest {
				totalCompleted++
			}
		}
	}

	if totalPlanned == 0 {
		// No training planned - 100% adherence
		return 100
	}

	// Cap at 100% (can complete more than planned)
	adherence := float64(totalCompleted) / float64(totalPlanned) * 100
	return math.Min(adherence, 100)
}

// calculateRecoveryComponent returns a 0-100 score based on sleep and CNS status.
func calculateRecoveryComponent(logs []DailyLog) float64 {
	if len(logs) == 0 {
		return 50 // Neutral
	}

	totalScore := 0.0
	daysWithData := 0

	for _, log := range logs {
		dayScore := 0.0
		hasData := false

		// Sleep component (50% of recovery)
		if log.SleepQuality > 0 {
			dayScore += float64(log.SleepQuality) * 0.5
			hasData = true
		}

		// CNS component (50% of recovery)
		if log.CNSResult != nil {
			switch log.CNSResult.Status {
			case CNSStatusOptimized:
				dayScore += 50 // Full CNS points
			case CNSStatusStrained:
				dayScore += 25 // Half CNS points
			case CNSStatusDepleted:
				dayScore += 0 // No CNS points
			}
			hasData = true
		} else if log.SleepQuality > 0 {
			// No CNS data, just use sleep
			dayScore += float64(log.SleepQuality) * 0.5
		}

		if hasData {
			totalScore += dayScore
			daysWithData++
		}
	}

	if daysWithData == 0 {
		return 50 // Neutral if no data
	}

	return totalScore / float64(daysWithData)
}

// calculateTrendScore returns a 0-100 score based on weight trend direction vs goal.
func calculateTrendScore(logs []DailyLog, profile *UserProfile) float64 {
	if len(logs) < 2 || profile == nil {
		return 50 // Neutral
	}

	// Calculate weight change
	weightChange := logs[len(logs)-1].WeightKg - logs[0].WeightKg

	// Score based on goal alignment
	switch profile.Goal {
	case GoalLoseWeight:
		if weightChange < -0.5 {
			return 100 // Great progress
		} else if weightChange < 0 {
			return 75 // Some progress
		} else if weightChange < 0.5 {
			return 50 // Maintenance
		}
		return 25 // Going wrong direction

	case GoalGainWeight:
		if weightChange > 0.5 {
			return 100 // Great progress
		} else if weightChange > 0 {
			return 75 // Some progress
		} else if weightChange > -0.5 {
			return 50 // Maintenance
		}
		return 25 // Going wrong direction

	case GoalMaintain:
		absChange := math.Abs(weightChange)
		if absChange < 0.3 {
			return 100 // Great stability
		} else if absChange < 0.5 {
			return 75 // Good stability
		} else if absChange < 1.0 {
			return 50 // Some fluctuation
		}
		return 25 // Too much change

	default:
		return 50
	}
}

// calculateTrendWeight returns the EMA-smoothed weight from the logs.
func calculateTrendWeight(logs []DailyLog) float64 {
	if len(logs) == 0 {
		return 0
	}

	weights := make([]float64, len(logs))
	for i, log := range logs {
		weights[i] = log.WeightKg
	}

	smoothed := CalculateEMAWeight(weights, 0.3)
	return smoothed[len(smoothed)-1]
}

// calculateMetabolicFlux determines the metabolic trend from flux history.
func calculateMetabolicFlux(fluxHistory []FluxChartPoint) MetabolicFluxIndicator {
	if len(fluxHistory) == 0 {
		return MetabolicFluxIndicator{Trend: "stable"}
	}

	startTDEE := fluxHistory[0].CalculatedTDEE
	endTDEE := fluxHistory[len(fluxHistory)-1].CalculatedTDEE
	delta := endTDEE - startTDEE

	trend := "stable"
	if delta > 50 {
		trend = "upregulated"
	} else if delta < -50 {
		trend = "downregulated"
	}

	return MetabolicFluxIndicator{
		StartTDEE: startTDEE,
		EndTDEE:   endTDEE,
		DeltaKcal: delta,
		Trend:     trend,
	}
}

// BuildDebriefDayPoints extracts per-day data for the debrief breakdown.
func BuildDebriefDayPoints(logs []DailyLog) []DebriefDayPoint {
	points := make([]DebriefDayPoint, len(logs))

	for i, log := range logs {
		point := DebriefDayPoint{
			Date:             log.Date,
			DayName:          getDayName(log.Date),
			DayType:          log.DayType,
			TargetCalories:   log.CalculatedTargets.TotalCalories,
			ConsumedCalories: log.ConsumedCalories,
			CalorieDelta:     log.ConsumedCalories - log.CalculatedTargets.TotalCalories,
			TargetProteinG:   log.CalculatedTargets.TotalProteinG,
			ConsumedProteinG: log.ConsumedProteinG,
			PlannedSessions:  countNonRestSessions(log.PlannedSessions),
			ActualSessions:   countNonRestSessions(log.ActualSessions),
			TrainingLoad:     calculateDailyLoad(log.ActualSessions),
			SleepQuality:     int(log.SleepQuality),
			SleepHours:       log.SleepHours,
			Notes:            log.Notes,
		}

		// Calculate protein percentage
		if point.TargetProteinG > 0 {
			point.ProteinPercent = float64(point.ConsumedProteinG) / float64(point.TargetProteinG) * 100
		}

		// Extract HRV and CNS status
		if log.HRVMs != nil {
			point.HRVMs = log.HRVMs
		}
		if log.CNSResult != nil {
			point.CNSStatus = &log.CNSResult.Status
		}

		// Calculate average RPE
		avgRPE := calculateAverageRPE(log.ActualSessions)
		if avgRPE > 0 {
			point.AvgRPE = &avgRPE
		}

		points[i] = point
	}

	return points
}

// getDayName returns the day of week name for a date string.
func getDayName(date string) string {
	// Parse YYYY-MM-DD and get weekday
	// Simple lookup based on date calculation to avoid time package
	dayNames := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}

	// Parse date components
	if len(date) < 10 {
		return ""
	}

	year := parseInt(date[0:4])
	month := parseInt(date[5:7])
	day := parseInt(date[8:10])

	// Zeller's congruence for Gregorian calendar
	if month < 3 {
		month += 12
		year--
	}
	k := year % 100
	j := year / 100
	h := (day + (13*(month+1))/5 + k + k/4 + j/4 - 2*j) % 7

	// Convert Zeller result to Sunday=0 index
	dayIdx := ((h + 6) % 7)
	return dayNames[dayIdx]
}

// parseInt parses a string to int without fmt.
func parseInt(s string) int {
	result := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			result = result*10 + int(c-'0')
		}
	}
	return result
}

// countNonRestSessions counts sessions that are not rest type.
func countNonRestSessions(sessions []TrainingSession) int {
	count := 0
	for _, s := range sessions {
		if s.Type != TrainingTypeRest {
			count++
		}
	}
	return count
}

// calculateDailyLoad sums load scores for all sessions.
func calculateDailyLoad(sessions []TrainingSession) float64 {
	var total float64
	for _, s := range sessions {
		config := GetTrainingConfig(s.Type)
		total += config.LoadScore * float64(s.DurationMin) / 60.0
	}
	return math.Round(total*10) / 10
}

// calculateAverageRPE returns the average RPE across sessions, or 0 if none.
func calculateAverageRPE(sessions []TrainingSession) float64 {
	var sum float64
	count := 0
	for _, s := range sessions {
		if s.PerceivedIntensity != nil {
			sum += float64(*s.PerceivedIntensity)
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return math.Round(sum/float64(count)*10) / 10
}

// GenerateTacticalRecommendations analyzes patterns to produce 3 recommendations.
func GenerateTacticalRecommendations(input DebriefInput) []TacticalRecommendation {
	var recommendations []TacticalRecommendation

	// Analyze patterns in the data
	mealAdherence := calculateMealAdherence(input.DailyLogs)
	trainingAdherence := calculateTrainingAdherence(input.DailyLogs)
	avgSleepQuality := calculateAverageSleepQuality(input.DailyLogs)
	proteinAdherence := calculateProteinAdherence(input.DailyLogs)
	depletedDays := countDepletedDays(input.DailyLogs)

	// Priority 1: Address most critical issue
	if depletedDays >= 2 {
		recommendations = append(recommendations, TacticalRecommendation{
			Priority: 1,
			Category: "recovery",
			Summary:  "CNS fatigue detected - prioritize recovery",
			Rationale: formatRecommendationRationale(
				"You had %d days with depleted CNS status this week. This indicates accumulated fatigue that may impair performance and increase injury risk.",
				depletedDays,
			),
			ActionItems: []string{
				"Schedule at least 2 rest or mobility-only days next week",
				"Ensure 7+ hours of sleep on training days",
				"Consider reducing training intensity by 20%",
			},
		})
	} else if mealAdherence < 60 {
		recommendations = append(recommendations, TacticalRecommendation{
			Priority: 1,
			Category: "nutrition",
			Summary:  "Meal tracking consistency needs attention",
			Rationale: formatRecommendationRationale(
				"Your meal adherence was %.0f%% this week. Inconsistent tracking makes it difficult to assess progress and adjust targets.",
				mealAdherence,
			),
			ActionItems: []string{
				"Set meal logging reminders after each meal",
				"Pre-plan meals for at least 3 days ahead",
				"Log meals within 30 minutes of eating",
			},
		})
	} else if trainingAdherence < 70 {
		recommendations = append(recommendations, TacticalRecommendation{
			Priority: 1,
			Category: "training",
			Summary:  "Training consistency can improve",
			Rationale: formatRecommendationRationale(
				"You completed %.0f%% of planned training sessions. Consistency is key for long-term progress.",
				trainingAdherence,
			),
			ActionItems: []string{
				"Schedule training at the same time each day",
				"Have a backup 20-minute workout for busy days",
				"Review if your training plan is realistic",
			},
		})
	}

	// Priority 2: Secondary issue
	if proteinAdherence < 80 && len(recommendations) < 3 {
		recommendations = append(recommendations, TacticalRecommendation{
			Priority: 2,
			Category: "nutrition",
			Summary:  "Protein intake below target",
			Rationale: formatRecommendationRationale(
				"Your average protein intake was %.0f%% of target. Adequate protein is essential for muscle retention.",
				proteinAdherence,
			),
			ActionItems: []string{
				"Include a protein source with every meal",
				"Consider protein supplementation post-workout",
				"Front-load protein earlier in the day",
			},
		})
	}

	if avgSleepQuality < 60 && len(recommendations) < 3 {
		recommendations = append(recommendations, TacticalRecommendation{
			Priority: 2,
			Category: "recovery",
			Summary:  "Sleep quality affecting recovery",
			Rationale: formatRecommendationRationale(
				"Your average sleep quality was %.0f/100. Poor sleep impairs recovery and increases hunger hormones.",
				avgSleepQuality,
			),
			ActionItems: []string{
				"Establish a consistent sleep schedule",
				"Limit screen time 1 hour before bed",
				"Keep bedroom cool and dark",
			},
		})
	}

	// Priority 3: Positive reinforcement or optimization
	if len(recommendations) < 3 {
		if mealAdherence >= 85 && trainingAdherence >= 85 {
			recommendations = append(recommendations, TacticalRecommendation{
				Priority: 3,
				Category: "training",
				Summary:  "Great week - consider progressive overload",
				Rationale: formatRecommendationRationale(
					"Your adherence was excellent (%.0f%% meals, %.0f%% training). You're ready to progress.",
					mealAdherence, trainingAdherence,
				),
				ActionItems: []string{
					"Add 5-10% to training volume or intensity",
					"Try a new exercise variation",
					"Set a specific performance goal for next week",
				},
			})
		} else {
			recommendations = append(recommendations, TacticalRecommendation{
				Priority: 3,
				Category: "nutrition",
				Summary:  "Focus on meal timing consistency",
				Rationale: "Consistent meal timing helps regulate hunger hormones and energy levels throughout the day.",
				ActionItems: []string{
					"Eat within 30 minutes of your target meal times",
					"Plan your largest meal around training",
					"Keep healthy snacks available for busy days",
				},
			})
		}
	}

	// Ensure we have exactly 3 recommendations
	for len(recommendations) < 3 {
		recommendations = append(recommendations, TacticalRecommendation{
			Priority: len(recommendations) + 1,
			Category: "recovery",
			Summary:  "Maintain current momentum",
			Rationale: "Consistency is the key to long-term success. Keep doing what's working.",
			ActionItems: []string{
				"Review your wins from this week",
				"Identify one small improvement to focus on",
				"Celebrate progress, not just outcomes",
			},
		})
	}

	// Ensure we have no more than 3
	if len(recommendations) > 3 {
		recommendations = recommendations[:3]
	}

	return recommendations
}

// Helper functions for recommendations

func calculateAverageSleepQuality(logs []DailyLog) float64 {
	if len(logs) == 0 {
		return 0
	}
	var total float64
	count := 0
	for _, log := range logs {
		if log.SleepQuality > 0 {
			total += float64(log.SleepQuality)
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return total / float64(count)
}

func calculateProteinAdherence(logs []DailyLog) float64 {
	if len(logs) == 0 {
		return 0
	}
	var totalPercent float64
	count := 0
	for _, log := range logs {
		if log.CalculatedTargets.TotalProteinG > 0 && log.ConsumedProteinG > 0 {
			percent := float64(log.ConsumedProteinG) / float64(log.CalculatedTargets.TotalProteinG) * 100
			totalPercent += math.Min(percent, 100) // Cap at 100%
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return totalPercent / float64(count)
}

func countDepletedDays(logs []DailyLog) int {
	count := 0
	for _, log := range logs {
		if log.CNSResult != nil && log.CNSResult.Status == CNSStatusDepleted {
			count++
		}
	}
	return count
}

func formatRecommendationRationale(format string, args ...interface{}) string {
	result := format
	for _, arg := range args {
		switch v := arg.(type) {
		case int:
			result = replaceFirstPlaceholder(result, debriefIntToString(v))
		case float64:
			result = replaceFirstPlaceholder(result, debriefFloatToString(v))
		}
	}
	return result
}

func replaceFirstPlaceholder(s, replacement string) string {
	// Find %.0f or %d
	for i := 0; i < len(s)-1; i++ {
		if s[i] == '%' {
			// Find the end of the format specifier
			j := i + 1
			for j < len(s) && (s[j] == '.' || (s[j] >= '0' && s[j] <= '9') || s[j] == 'd' || s[j] == 'f') {
				j++
				if s[j-1] == 'd' || s[j-1] == 'f' {
					break
				}
			}
			return s[:i] + replacement + s[j:]
		}
	}
	return s
}

// debriefFloatToString converts a float to string for debrief narratives.
func debriefFloatToString(f float64) string {
	return debriefIntToString(int(math.Round(f)))
}

// debriefIntToString converts an int to string for debrief narratives.
func debriefIntToString(n int) string {
	if n == 0 {
		return "0"
	}

	negative := n < 0
	if negative {
		n = -n
	}

	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}

	if negative {
		digits = append([]byte{'-'}, digits...)
	}

	return string(digits)
}

// GenerateFallbackNarrative creates a template-based narrative when LLM is unavailable.
func GenerateFallbackNarrative(debrief *WeeklyDebrief) DebriefNarrative {
	var sb strings.Builder

	// Opening with score
	sb.WriteString("Week of ")
	sb.WriteString(debrief.WeekStartDate)
	sb.WriteString(" - ")
	sb.WriteString(debrief.WeekEndDate)
	sb.WriteString("\n\n")

	sb.WriteString("Vitality Score: ")
	sb.WriteString(debriefIntToString(int(debrief.VitalityScore.Overall)))
	sb.WriteString("/100. ")

	if debrief.VitalityScore.Overall >= 80 {
		sb.WriteString("Strong week overall.")
	} else if debrief.VitalityScore.Overall >= 60 {
		sb.WriteString("Decent week with room for improvement.")
	} else {
		sb.WriteString("Challenging week - time to recalibrate.")
	}
	sb.WriteString("\n\n")

	// Adherence summary
	sb.WriteString("Meal adherence: ")
	sb.WriteString(debriefIntToString(int(debrief.VitalityScore.MealAdherence)))
	sb.WriteString("%. Training completion: ")
	sb.WriteString(debriefIntToString(int(debrief.VitalityScore.TrainingAdherence)))
	sb.WriteString("%.")
	sb.WriteString("\n\n")

	// Weight trend
	if debrief.VitalityScore.WeightDelta > 0.1 {
		sb.WriteString("Weight trended up ")
		sb.WriteString(debriefFloatToStringWithDecimal(debrief.VitalityScore.WeightDelta))
		sb.WriteString("kg.")
	} else if debrief.VitalityScore.WeightDelta < -0.1 {
		sb.WriteString("Weight dropped ")
		sb.WriteString(debriefFloatToStringWithDecimal(-debrief.VitalityScore.WeightDelta))
		sb.WriteString("kg.")
	} else {
		sb.WriteString("Weight held steady.")
	}
	sb.WriteString("\n\n")

	// Metabolic flux
	flux := debrief.VitalityScore.MetabolicFlux
	switch flux.Trend {
	case "upregulated":
		sb.WriteString("Metabolism showed upregulation (+")
		sb.WriteString(debriefIntToString(flux.DeltaKcal))
		sb.WriteString(" kcal) - your body is adapting well.")
	case "downregulated":
		sb.WriteString("Metabolism showed signs of downregulation (")
		sb.WriteString(debriefIntToString(flux.DeltaKcal))
		sb.WriteString(" kcal) - consider a refeed or diet break.")
	default:
		sb.WriteString("Metabolic rate remained stable.")
	}

	return DebriefNarrative{
		Text:           sb.String(),
		GeneratedByLLM: false,
		Model:          "template",
	}
}

func debriefFloatToStringWithDecimal(f float64) string {
	// Format as X.X
	whole := int(f)
	decimal := int(math.Abs(f-float64(whole)) * 10)
	return debriefIntToString(whole) + "." + debriefIntToString(decimal)
}
