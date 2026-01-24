package domain

import (
	"math"
	"time"
)

// RecalibrationOptionType represents the type of recalibration action.
type RecalibrationOptionType string

const (
	RecalibrationIncreaseDeficit RecalibrationOptionType = "increase_deficit"
	RecalibrationExtendTimeline  RecalibrationOptionType = "extend_timeline"
	RecalibrationReviseGoal      RecalibrationOptionType = "revise_goal"
	RecalibrationKeepCurrent     RecalibrationOptionType = "keep_current"
)

// FeasibilityTag indicates how achievable a recalibration option is.
type FeasibilityTag string

const (
	FeasibilityAchievable FeasibilityTag = "Achievable"
	FeasibilityModerate   FeasibilityTag = "Moderate"
	FeasibilityAmbitious  FeasibilityTag = "Ambitious"
)

// DualTrackAnalysis contains the results of comparing plan vs actual progress.
type DualTrackAnalysis struct {
	PlanID              int64
	AnalysisDate        time.Time
	CurrentWeek         int
	PlannedWeightKg     float64
	ActualWeightKg      float64
	VarianceKg          float64 // Actual - Planned (positive = heavier than planned)
	VariancePercent     float64 // (Variance / Planned) * 100
	TolerancePercent    float64
	RecalibrationNeeded bool
	Options             []RecalibrationOption
	PlanProjection      []ProjectionPoint // Linear interpolation from start to goal
	TrendProjection     []ProjectionPoint // Projection based on current trend
	LandingPoint        *LandingPointProjection // Where user will end up at current pace
}

// LandingPointProjection represents where the user will end up if they continue
// at their current rate of change through the end of the plan.
type LandingPointProjection struct {
	WeightKg           float64   // Projected final weight at plan end date
	Date               time.Time // Plan end date
	VarianceFromGoalKg float64   // Difference from goal weight (positive = above goal)
	OnTrackForGoal     bool      // Whether landing point is within tolerance of goal
}

// RecalibrationOption represents a single recalibration action the user can take.
type RecalibrationOption struct {
	Type           RecalibrationOptionType
	FeasibilityTag FeasibilityTag
	NewParameter   string // Human-readable: "2,100 kcal/day" or "24 weeks" or "82 kg"
	Impact         string // Description of outcome
}

// ProjectionPoint represents a single point on a weight projection chart.
type ProjectionPoint struct {
	WeekNumber int
	Date       time.Time
	WeightKg   float64
}

// AnalysisInput contains the data needed to perform dual-track analysis.
type AnalysisInput struct {
	Plan             *NutritionPlan
	ActualWeightKg   float64       // Rolling 7-day average weight
	TolerancePercent float64       // From profile (1-10%, default 3%)
	WeightTrend      *WeightTrend  // Current trend from weight history (optional)
	AnalysisDate     time.Time
}

// CalculateDualTrackAnalysis performs variance analysis between plan and actual progress.
func CalculateDualTrackAnalysis(input AnalysisInput) (*DualTrackAnalysis, error) {
	plan := input.Plan
	analysisDate := input.AnalysisDate

	// Get current week
	currentWeek := plan.GetCurrentWeek(analysisDate)

	// Check if plan has ended
	if currentWeek > plan.DurationWeeks {
		return nil, ErrPlanEnded
	}

	// Check if plan hasn't started
	if currentWeek < 1 {
		return nil, ErrPlanNotStarted
	}

	// Get planned weight for current week
	weeklyTarget := plan.GetWeeklyTarget(currentWeek)
	if weeklyTarget == nil {
		return nil, ErrPlanNotFound
	}
	plannedWeightKg := weeklyTarget.ProjectedWeightKg

	// Calculate variance
	varianceKg := input.ActualWeightKg - plannedWeightKg
	variancePercent := (varianceKg / plannedWeightKg) * 100

	// Determine if recalibration is needed
	tolerancePercent := input.TolerancePercent
	if tolerancePercent == 0 {
		tolerancePercent = 3 // Default 3%
	}
	recalibrationNeeded := math.Abs(variancePercent) >= tolerancePercent

	analysis := &DualTrackAnalysis{
		PlanID:              plan.ID,
		AnalysisDate:        analysisDate,
		CurrentWeek:         currentWeek,
		PlannedWeightKg:     plannedWeightKg,
		ActualWeightKg:      input.ActualWeightKg,
		VarianceKg:          math.Round(varianceKg*10) / 10,
		VariancePercent:     math.Round(variancePercent*100) / 100,
		TolerancePercent:    tolerancePercent,
		RecalibrationNeeded: recalibrationNeeded,
	}

	// Generate plan projection points
	analysis.PlanProjection = generatePlanProjection(plan)

	// Generate trend projection if weight trend data is available
	if input.WeightTrend != nil {
		analysis.TrendProjection = generateTrendProjection(plan, input.ActualWeightKg, input.WeightTrend, currentWeek)

		// Calculate landing point from trend projection
		analysis.LandingPoint = calculateLandingPoint(plan, analysis.TrendProjection, tolerancePercent)
	}

	// Generate recalibration options if needed
	if recalibrationNeeded {
		analysis.Options = generateRecalibrationOptions(plan, input.ActualWeightKg, varianceKg, currentWeek)
	}

	return analysis, nil
}

// generatePlanProjection creates the linear projection from start to goal weight.
func generatePlanProjection(plan *NutritionPlan) []ProjectionPoint {
	points := make([]ProjectionPoint, plan.DurationWeeks+1)

	// Week 0 is start weight
	points[0] = ProjectionPoint{
		WeekNumber: 0,
		Date:       plan.StartDate,
		WeightKg:   plan.StartWeightKg,
	}

	// Each subsequent week
	for i := 0; i < plan.DurationWeeks; i++ {
		weekNum := i + 1
		target := plan.GetWeeklyTarget(weekNum)
		if target != nil {
			points[weekNum] = ProjectionPoint{
				WeekNumber: weekNum,
				Date:       target.EndDate,
				WeightKg:   target.ProjectedWeightKg,
			}
		}
	}

	return points
}

// generateTrendProjection creates a projection based on current weight trend.
func generateTrendProjection(plan *NutritionPlan, currentWeight float64, trend *WeightTrend, currentWeek int) []ProjectionPoint {
	weeksRemaining := plan.DurationWeeks - currentWeek + 1
	if weeksRemaining < 1 {
		return nil
	}

	points := make([]ProjectionPoint, weeksRemaining+1)
	weeklyChange := trend.WeeklyChangeKg

	// Start from current week with current weight
	for i := 0; i <= weeksRemaining; i++ {
		weekNum := currentWeek + i - 1
		if weekNum < 0 {
			weekNum = 0
		}

		projectedWeight := currentWeight + (weeklyChange * float64(i))
		projectedWeight = math.Round(projectedWeight*10) / 10

		date := plan.StartDate.AddDate(0, 0, weekNum*7)

		points[i] = ProjectionPoint{
			WeekNumber: currentWeek + i - 1,
			Date:       date,
			WeightKg:   projectedWeight,
		}
	}

	return points
}

// calculateLandingPoint extracts the final projected weight from the trend projection.
// This represents where the user will end up if they continue at their current pace.
func calculateLandingPoint(plan *NutritionPlan, trendProjection []ProjectionPoint, tolerancePercent float64) *LandingPointProjection {
	if len(trendProjection) == 0 {
		return nil
	}

	// Get the last point in the trend projection (plan end)
	lastPoint := trendProjection[len(trendProjection)-1]

	// Calculate variance from goal
	varianceFromGoal := lastPoint.WeightKg - plan.GoalWeightKg

	// Determine if on track (within tolerance of goal)
	toleranceKg := plan.GoalWeightKg * (tolerancePercent / 100)
	onTrack := math.Abs(varianceFromGoal) <= toleranceKg

	// Calculate plan end date
	endDate := plan.StartDate.AddDate(0, 0, plan.DurationWeeks*7)

	return &LandingPointProjection{
		WeightKg:           math.Round(lastPoint.WeightKg*10) / 10,
		Date:               endDate,
		VarianceFromGoalKg: math.Round(varianceFromGoal*10) / 10,
		OnTrackForGoal:     onTrack,
	}
}

// generateRecalibrationOptions creates the 4 recalibration options with feasibility tags.
func generateRecalibrationOptions(plan *NutritionPlan, actualWeight, varianceKg float64, currentWeek int) []RecalibrationOption {
	weeksRemaining := plan.DurationWeeks - currentWeek
	if weeksRemaining < 1 {
		weeksRemaining = 1
	}

	// Calculate how much we need to adjust to get back on track
	weightToLose := actualWeight - plan.GoalWeightKg
	requiredWeeklyChange := weightToLose / float64(weeksRemaining)
	requiredDailyDeficit := requiredWeeklyChange * 7700 / 7

	options := make([]RecalibrationOption, 4)

	// Option 1: Increase Deficit
	options[0] = createIncreaseDeficitOption(requiredDailyDeficit, plan.RequiredDailyDeficitKcal)

	// Option 2: Extend Timeline
	options[1] = createExtendTimelineOption(plan, actualWeight, weeksRemaining)

	// Option 3: Revise Goal
	options[2] = createReviseGoalOption(plan, actualWeight, weeksRemaining)

	// Option 4: Keep Current
	options[3] = RecalibrationOption{
		Type:           RecalibrationKeepCurrent,
		FeasibilityTag: FeasibilityAchievable,
		NewParameter:   formatKcal(int(plan.RequiredDailyDeficitKcal)),
		Impact:         "Continue with current plan settings",
	}

	return options
}

// createIncreaseDeficitOption calculates the increased deficit needed.
func createIncreaseDeficitOption(requiredDeficit, currentDeficit float64) RecalibrationOption {
	// For weight loss, both values are negative
	newDeficit := requiredDeficit

	// Determine feasibility based on new deficit magnitude
	absDeficit := math.Abs(newDeficit)
	var feasibility FeasibilityTag
	var impact string

	if absDeficit <= 500 {
		feasibility = FeasibilityAchievable
		impact = "Moderate calorie reduction, sustainable long-term"
	} else if absDeficit <= 750 {
		feasibility = FeasibilityModerate
		impact = "Noticeable calorie reduction, may require adjustment period"
	} else {
		feasibility = FeasibilityAmbitious
		impact = "Aggressive deficit, may impact energy levels"
		// Cap at maximum safe deficit
		if newDeficit < -MaxSafeDeficitKcal {
			newDeficit = -MaxSafeDeficitKcal
		}
	}

	return RecalibrationOption{
		Type:           RecalibrationIncreaseDeficit,
		FeasibilityTag: feasibility,
		NewParameter:   formatKcal(int(newDeficit)),
		Impact:         impact,
	}
}

// createExtendTimelineOption calculates how many weeks to add.
func createExtendTimelineOption(plan *NutritionPlan, actualWeight float64, weeksRemaining int) RecalibrationOption {
	weightToLose := actualWeight - plan.GoalWeightKg

	// Calculate weeks needed at current safe deficit rate
	safeWeeklyChange := math.Abs(plan.RequiredDailyDeficitKcal) * 7 / 7700
	if safeWeeklyChange < 0.1 {
		safeWeeklyChange = 0.5 // Default to 0.5 kg/week
	}

	weeksNeeded := int(math.Ceil(math.Abs(weightToLose) / safeWeeklyChange))
	additionalWeeks := weeksNeeded - weeksRemaining
	if additionalWeeks < 1 {
		additionalWeeks = 1
	}

	newTotalWeeks := plan.DurationWeeks + additionalWeeks

	var feasibility FeasibilityTag
	var impact string

	if additionalWeeks <= 4 {
		feasibility = FeasibilityAchievable
		impact = "Minor timeline extension, maintains comfortable pace"
	} else if additionalWeeks <= 12 {
		feasibility = FeasibilityModerate
		impact = "Moderate extension, spreads deficit over more time"
	} else {
		feasibility = FeasibilityAmbitious
		impact = "Significant extension, may need plan reassessment"
	}

	if newTotalWeeks > MaxPlanDurationWeeks {
		newTotalWeeks = MaxPlanDurationWeeks
		feasibility = FeasibilityAmbitious
		impact = "Maximum duration reached, goal may need revision"
	}

	return RecalibrationOption{
		Type:           RecalibrationExtendTimeline,
		FeasibilityTag: feasibility,
		NewParameter:   formatWeeks(newTotalWeeks),
		Impact:         impact,
	}
}

// createReviseGoalOption calculates a new achievable goal weight.
func createReviseGoalOption(plan *NutritionPlan, actualWeight float64, weeksRemaining int) RecalibrationOption {
	// Calculate what goal is achievable at current safe rate
	safeWeeklyChange := 0.5 // kg/week
	if plan.RequiredWeeklyChangeKg > 0 {
		safeWeeklyChange = 0.35 // Slower for gaining
	}

	achievableChange := safeWeeklyChange * float64(weeksRemaining)
	var newGoal float64

	if plan.GoalWeightKg < plan.StartWeightKg {
		// Weight loss: new goal = actual - achievable loss
		newGoal = actualWeight - achievableChange
	} else {
		// Weight gain: new goal = actual + achievable gain
		newGoal = actualWeight + achievableChange
	}
	newGoal = math.Round(newGoal*10) / 10

	// Clamp to valid range
	if newGoal < 30 {
		newGoal = 30
	} else if newGoal > 300 {
		newGoal = 300
	}

	var feasibility FeasibilityTag
	var impact string

	goalDiff := math.Abs(newGoal - plan.GoalWeightKg)
	if goalDiff <= 2 {
		feasibility = FeasibilityAchievable
		impact = "Minor goal adjustment, maintains motivation"
	} else if goalDiff <= 5 {
		feasibility = FeasibilityModerate
		impact = "Moderate goal revision, still meaningful progress"
	} else {
		feasibility = FeasibilityAmbitious
		impact = "Significant goal change, consider reassessing approach"
	}

	return RecalibrationOption{
		Type:           RecalibrationReviseGoal,
		FeasibilityTag: feasibility,
		NewParameter:   formatWeight(newGoal),
		Impact:         impact,
	}
}

// formatKcal formats a calorie value for display (e.g., "-550 kcal/day").
func formatKcal(kcal int) string {
	if kcal < 0 {
		return "-" + formatNumber(-kcal) + " kcal/day"
	}
	return "+" + formatNumber(kcal) + " kcal/day"
}

// formatWeeks formats a week count for display (e.g., "24 weeks").
func formatWeeks(weeks int) string {
	return formatNumber(weeks) + " weeks"
}

// formatWeight formats a weight value for display (e.g., "82 kg").
func formatWeight(kg float64) string {
	return formatFloat(kg) + " kg"
}

// formatNumber formats an integer with comma separators.
func formatNumber(n int) string {
	if n < 0 {
		return "-" + formatNumber(-n)
	}
	if n < 1000 {
		return intToString(n)
	}
	return formatNumber(n/1000) + "," + padZeros(n%1000, 3)
}

func intToString(n int) string {
	if n == 0 {
		return "0"
	}
	if n < 0 {
		return "-" + intToString(-n)
	}
	digits := []byte{}
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}

func padZeros(n, width int) string {
	s := intToString(n)
	for len(s) < width {
		s = "0" + s
	}
	return s
}

func formatFloat(f float64) string {
	intPart := int(f)
	decPart := int(math.Round((f - float64(intPart)) * 10))
	if decPart == 10 {
		intPart++
		decPart = 0
	}
	return intToString(intPart) + "." + intToString(decPart)
}
