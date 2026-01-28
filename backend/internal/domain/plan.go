package domain

import (
	"math"
	"time"
)

// PlanStatus represents the current state of a nutrition plan.
type PlanStatus string

const (
	PlanStatusActive    PlanStatus = "active"
	PlanStatusCompleted PlanStatus = "completed"
	PlanStatusAbandoned PlanStatus = "abandoned"
	PlanStatusPaused    PlanStatus = "paused"
)

// ValidPlanStatuses contains all valid plan status values.
var ValidPlanStatuses = map[PlanStatus]bool{
	PlanStatusActive:    true,
	PlanStatusCompleted: true,
	PlanStatusAbandoned: true,
	PlanStatusPaused:    true,
}

// ParsePlanStatus safely converts a string to PlanStatus with validation.
func ParsePlanStatus(s string) (PlanStatus, error) {
	if s == "" {
		return PlanStatusActive, nil // Default to active
	}
	status := PlanStatus(s)
	if !ValidPlanStatuses[status] {
		return "", ErrInvalidPlanStatus
	}
	return status, nil
}

// NutritionPlan represents a long-term nutrition plan with weekly targets.
// A plan defines a goal weight, duration, and generates weekly milestones.
type NutritionPlan struct {
	ID                       int64
	Name                     string // User-defined plan name (e.g., "Summer Cut")
	StartDate                time.Time
	StartWeightKg            float64
	GoalWeightKg             float64
	DurationWeeks            int
	RequiredWeeklyChangeKg   float64    // Calculated: (goalWeight - startWeight) / durationWeeks
	RequiredDailyDeficitKcal float64    // Calculated: requiredWeeklyChange * 7700 / 7
	KcalFactorOverride       *float64   // Optional: if set, TDEE = Weight × KcalFactor instead of BMR-based
	Status                   PlanStatus
	WeeklyTargets            []WeeklyTarget
	LastRecalibratedAt       *time.Time // When the plan was last recalibrated (nil if never)
	CreatedAt                time.Time
	UpdatedAt                time.Time
}

// WeeklyTarget represents the projected targets for a single week of a plan.
type WeeklyTarget struct {
	ID               int64
	PlanID           int64
	WeekNumber       int     // 1-based week number
	StartDate        time.Time
	EndDate          time.Time
	ProjectedWeightKg float64
	ProjectedTDEE    int     // TDEE adjusted for projected weight
	TargetIntakeKcal int     // ProjectedTDEE - daily deficit
	TargetCarbsG     int
	TargetProteinG   int
	TargetFatsG      int
	ActualWeightKg   *float64 // Logged weight for the week (nil if not logged)
	ActualIntakeKcal *int     // Average actual intake for the week
	DaysLogged       int      // Number of days with logs in this week
}

// DailyPlanTarget represents the macro targets for a single day within a plan week.
type DailyPlanTarget struct {
	DayNumber int     // 1-7 within week (Monday=1)
	DayType   DayType // performance, fatburner, metabolize
	Date      time.Time
	CarbsG    int
	ProteinG  int
	FatsG     int
	Calories  int
}

// GenerateDailyTargets creates 7 daily targets from a weekly target using day type cycling.
// The pattern determines which day type applies to each day of the week.
// Day type multipliers are applied to the weekly base macros:
//   - Fatburner:   Carbs×0.60, Protein×1.0, Fats×0.85
//   - Performance: Carbs×1.30, Protein×1.0, Fats×1.00
//   - Metabolize:  Carbs×1.50, Protein×1.0, Fats×1.10
func (w *WeeklyTarget) GenerateDailyTargets(pattern WeeklyDayPattern) []DailyPlanTarget {
	// Calculate base macros that, when averaged with day type cycling, produce weekly target
	// The base is calibrated so the 7-day average equals the weekly target
	baseMacros := calculateBaseMacrosForCycling(
		float64(w.TargetCarbsG),
		float64(w.TargetProteinG),
		float64(w.TargetFatsG),
		pattern,
	)

	dailyTargets := make([]DailyPlanTarget, 7)
	for day := 1; day <= 7; day++ {
		dayType := pattern.GetDayType(day)
		mult := getDayTypeModifiers(dayType)

		carbsG := int(math.Round(baseMacros.CarbsG * mult.Carbs))
		proteinG := int(math.Round(baseMacros.ProteinG * mult.Protein))
		fatsG := int(math.Round(baseMacros.FatsG * mult.Fats))
		calories := (carbsG * 4) + (proteinG * 4) + (fatsG * 9)

		dailyTargets[day-1] = DailyPlanTarget{
			DayNumber: day,
			DayType:   dayType,
			Date:      w.StartDate.AddDate(0, 0, day-1),
			CarbsG:    carbsG,
			ProteinG:  proteinG,
			FatsG:     fatsG,
			Calories:  calories,
		}
	}

	return dailyTargets
}

// calculateBaseMacrosForCycling determines the base macros that, when day type multipliers
// are applied across the week, will average to the target weekly macros.
func calculateBaseMacrosForCycling(targetCarbsG, targetProteinG, targetFatsG float64, pattern WeeklyDayPattern) MacroAllocation {
	// Calculate the average multiplier for each macro across the week
	var carbMultSum, protMultSum, fatMultSum float64
	for day := 1; day <= 7; day++ {
		dayType := pattern.GetDayType(day)
		mult := getDayTypeModifiers(dayType)
		carbMultSum += mult.Carbs
		protMultSum += mult.Protein
		fatMultSum += mult.Fats
	}

	avgCarbMult := carbMultSum / 7.0
	avgProtMult := protMultSum / 7.0
	avgFatMult := fatMultSum / 7.0

	// Base = Target / AverageMultiplier
	return MacroAllocation{
		CarbsG:   targetCarbsG / avgCarbMult,
		ProteinG: targetProteinG / avgProtMult,
		FatsG:    targetFatsG / avgFatMult,
	}
}

// NutritionPlanInput contains the required fields to create a new plan.
type NutritionPlanInput struct {
	Name               string   // User-defined plan name (optional)
	StartDate          string   // YYYY-MM-DD format
	StartWeightKg      float64
	GoalWeightKg       float64
	DurationWeeks      int
	KcalFactorOverride *float64 // Optional: if set, TDEE = Weight × KcalFactor instead of BMR-based
}

// Plan validation constants
const (
	MinPlanDurationWeeks = 4
	MaxPlanDurationWeeks = 104 // 2 years
	MaxSafeDeficitKcal   = 750 // ~0.75 kg/week loss
	MaxSafeSurplusKcal   = 500 // ~0.5 kg/week gain
)

// NewNutritionPlan creates a new NutritionPlan from input, validates it,
// and generates weekly targets.
func NewNutritionPlan(input NutritionPlanInput, profile *UserProfile, now time.Time) (*NutritionPlan, error) {
	startDate, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		return nil, ErrInvalidPlanStartDate
	}

	plan := &NutritionPlan{
		Name:               input.Name,
		StartDate:          startDate,
		StartWeightKg:      input.StartWeightKg,
		GoalWeightKg:       input.GoalWeightKg,
		DurationWeeks:      input.DurationWeeks,
		KcalFactorOverride: input.KcalFactorOverride,
		Status:             PlanStatusActive,
	}

	if err := plan.Validate(now); err != nil {
		return nil, err
	}

	// Calculate derived fields
	plan.calculateDerivedFields()

	// Generate weekly targets
	plan.WeeklyTargets = plan.generateWeeklyTargets(profile, now)

	return plan, nil
}

// Validate checks all plan fields for validity.
func (p *NutritionPlan) Validate(now time.Time) error {
	// Start date validation - cannot be more than 7 days in the past
	minStartDate := now.AddDate(0, 0, -7)
	if p.StartDate.Before(minStartDate) {
		return ErrPlanStartDateTooOld
	}

	// Start weight validation
	if p.StartWeightKg < 30 || p.StartWeightKg > 300 {
		return ErrInvalidPlanStartWeight
	}

	// Goal weight validation
	if p.GoalWeightKg < 30 || p.GoalWeightKg > 300 {
		return ErrInvalidPlanGoalWeight
	}

	// Duration validation
	if p.DurationWeeks < MinPlanDurationWeeks || p.DurationWeeks > MaxPlanDurationWeeks {
		return ErrInvalidPlanDuration
	}

	// Calculate and validate deficit/surplus
	weeklyChange := (p.GoalWeightKg - p.StartWeightKg) / float64(p.DurationWeeks)
	dailyDeficit := weeklyChange * 7700 / 7 // kcal per day

	// For weight loss (negative change), deficit should be capped
	if weeklyChange < 0 && math.Abs(dailyDeficit) > MaxSafeDeficitKcal {
		return ErrPlanDeficitTooAggressive
	}

	// For weight gain (positive change), surplus should be capped
	if weeklyChange > 0 && dailyDeficit > MaxSafeSurplusKcal {
		return ErrPlanSurplusTooAggressive
	}

	return nil
}

// calculateDerivedFields computes requiredWeeklyChange and requiredDailyDeficit.
func (p *NutritionPlan) calculateDerivedFields() {
	p.RequiredWeeklyChangeKg = (p.GoalWeightKg - p.StartWeightKg) / float64(p.DurationWeeks)
	p.RequiredDailyDeficitKcal = p.RequiredWeeklyChangeKg * 7700 / 7
}

// generateWeeklyTargets creates the weekly target milestones for the plan.
func (p *NutritionPlan) generateWeeklyTargets(profile *UserProfile, now time.Time) []WeeklyTarget {
	targets := make([]WeeklyTarget, p.DurationWeeks)

	for week := 0; week < p.DurationWeeks; week++ {
		weekNum := week + 1

		// Calculate dates for this week
		startDate := p.StartDate.AddDate(0, 0, week*7)
		endDate := startDate.AddDate(0, 0, 6)

		// Calculate projected weight (linear interpolation)
		projectedWeight := p.StartWeightKg + (p.RequiredWeeklyChangeKg * float64(weekNum))
		projectedWeight = math.Round(projectedWeight*10) / 10 // Round to 0.1 kg

		// Calculate projected TDEE for this weight
		projectedTDEE := calculateProjectedTDEE(profile, p, projectedWeight, now)

		// Calculate target intake (TDEE - deficit)
		targetIntake := int(math.Round(float64(projectedTDEE) + p.RequiredDailyDeficitKcal))

		// Calculate macro targets based on profile ratios
		targetCarbsG, targetProteinG, targetFatsG := calculateMacroTargets(
			targetIntake, profile.CarbRatio, profile.ProteinRatio, profile.FatRatio,
		)

		targets[week] = WeeklyTarget{
			PlanID:            p.ID,
			WeekNumber:        weekNum,
			StartDate:         startDate,
			EndDate:           endDate,
			ProjectedWeightKg: projectedWeight,
			ProjectedTDEE:     projectedTDEE,
			TargetIntakeKcal:  targetIntake,
			TargetCarbsG:      targetCarbsG,
			TargetProteinG:    targetProteinG,
			TargetFatsG:       targetFatsG,
			DaysLogged:        0,
		}
	}

	return targets
}

// calculateProjectedTDEE estimates TDEE for a given weight using profile data.
// If plan has KcalFactorOverride set, uses simple formula: TDEE = Weight × KcalFactor.
// Otherwise uses BMR-based calculation: BMR × NEAT multiplier.
func calculateProjectedTDEE(profile *UserProfile, plan *NutritionPlan, weightKg float64, now time.Time) int {
	// If KcalFactor override is set, use simple calculation
	if plan != nil && plan.KcalFactorOverride != nil && *plan.KcalFactorOverride > 0 {
		return int(math.Round(weightKg * *plan.KcalFactorOverride))
	}

	// Default: BMR-based calculation
	bmrEquation := profile.BMREquation
	if bmrEquation == "" {
		bmrEquation = BMREquationMifflinStJeor
	}
	bmr := CalculateBMR(profile, weightKg, now, bmrEquation)

	// Use NEAT multiplier (sedentary baseline)
	tdee := bmr * NEATMultiplier

	return int(math.Round(tdee))
}

// calculateMacroTargets computes gram targets from calorie target and ratios.
func calculateMacroTargets(targetCalories int, carbRatio, proteinRatio, fatRatio float64) (carbsG, proteinG, fatsG int) {
	totalCalories := float64(targetCalories)

	carbCalories := totalCalories * carbRatio
	proteinCalories := totalCalories * proteinRatio
	fatCalories := totalCalories * fatRatio

	carbsG = int(math.Round(carbCalories / CaloriesPerGramCarb))
	proteinG = int(math.Round(proteinCalories / CaloriesPerGramProtein))
	fatsG = int(math.Round(fatCalories / CaloriesPerGramFat))

	return carbsG, proteinG, fatsG
}

// GetCurrentWeek returns the current week number based on days since plan start.
// Returns 0 if plan hasn't started, or > DurationWeeks if plan has ended.
func (p *NutritionPlan) GetCurrentWeek(now time.Time) int {
	if now.Before(p.StartDate) {
		return 0
	}

	daysSinceStart := int(now.Sub(p.StartDate).Hours() / 24)
	currentWeek := (daysSinceStart / 7) + 1

	return currentWeek
}

// IsActive returns true if the plan is currently active.
func (p *NutritionPlan) IsActive() bool {
	return p.Status == PlanStatusActive
}

// IsPaused returns true if the plan is currently paused.
func (p *NutritionPlan) IsPaused() bool {
	return p.Status == PlanStatusPaused
}

// GetWeeklyTarget returns the target for a specific week number (1-based).
// Returns nil if week is out of range.
func (p *NutritionPlan) GetWeeklyTarget(weekNum int) *WeeklyTarget {
	if weekNum < 1 || weekNum > len(p.WeeklyTargets) {
		return nil
	}
	return &p.WeeklyTargets[weekNum-1]
}

// ApplyRecalibration modifies a plan based on the selected recalibration strategy.
// Returns a new plan with updated parameters and regenerated weekly targets.
func ApplyRecalibration(plan *NutritionPlan, profile *UserProfile, optionType RecalibrationOptionType, now time.Time) (*NutritionPlan, error) {
	currentWeek := plan.GetCurrentWeek(now)
	weeksRemaining := plan.DurationWeeks - currentWeek
	if weeksRemaining < 1 {
		weeksRemaining = 1
	}

	// Get current actual weight (use last logged weight or start weight)
	actualWeight := plan.StartWeightKg
	for i := len(plan.WeeklyTargets) - 1; i >= 0; i-- {
		if plan.WeeklyTargets[i].ActualWeightKg != nil {
			actualWeight = *plan.WeeklyTargets[i].ActualWeightKg
			break
		}
	}

	switch optionType {
	case RecalibrationIncreaseDeficit:
		return applyIncreaseDeficit(plan, profile, actualWeight, weeksRemaining, now)
	case RecalibrationExtendTimeline:
		return applyExtendTimeline(plan, profile, actualWeight, now)
	case RecalibrationReviseGoal:
		return applyReviseGoal(plan, profile, actualWeight, weeksRemaining, now)
	default:
		return plan, nil
	}
}

// applyIncreaseDeficit recalculates the plan with a higher deficit to hit the goal on time.
func applyIncreaseDeficit(plan *NutritionPlan, profile *UserProfile, actualWeight float64, weeksRemaining int, now time.Time) (*NutritionPlan, error) {
	// Calculate new required weekly change to hit goal
	weightToGoal := plan.GoalWeightKg - actualWeight
	newWeeklyChange := weightToGoal / float64(weeksRemaining)
	newDailyDeficit := newWeeklyChange * 7700 / 7

	// Cap at maximum safe deficit
	if newDailyDeficit < -MaxSafeDeficitKcal {
		newDailyDeficit = -MaxSafeDeficitKcal
		newWeeklyChange = newDailyDeficit * 7 / 7700
	}

	plan.RequiredWeeklyChangeKg = newWeeklyChange
	plan.RequiredDailyDeficitKcal = newDailyDeficit
	plan.LastRecalibratedAt = &now
	plan.UpdatedAt = now

	// Regenerate remaining weekly targets
	plan.WeeklyTargets = regenerateWeeklyTargets(plan, profile, actualWeight, now)

	return plan, nil
}

// applyExtendTimeline adds weeks to the plan to maintain current deficit.
func applyExtendTimeline(plan *NutritionPlan, profile *UserProfile, actualWeight float64, now time.Time) (*NutritionPlan, error) {
	// Calculate weeks needed at current safe rate
	weightToGoal := math.Abs(actualWeight - plan.GoalWeightKg)
	safeWeeklyChange := 0.5 // kg/week default
	if plan.RequiredWeeklyChangeKg > 0 {
		safeWeeklyChange = 0.35 // Slower for gaining
	}

	weeksNeeded := int(math.Ceil(weightToGoal / safeWeeklyChange))
	currentWeek := plan.GetCurrentWeek(now)

	newDuration := currentWeek + weeksNeeded
	if newDuration > MaxPlanDurationWeeks {
		newDuration = MaxPlanDurationWeeks
	}

	plan.DurationWeeks = newDuration

	// Recalculate weekly change for new duration
	weeksRemaining := newDuration - currentWeek
	if weeksRemaining < 1 {
		weeksRemaining = 1
	}
	weightChange := plan.GoalWeightKg - actualWeight
	plan.RequiredWeeklyChangeKg = weightChange / float64(weeksRemaining)
	plan.RequiredDailyDeficitKcal = plan.RequiredWeeklyChangeKg * 7700 / 7
	plan.LastRecalibratedAt = &now
	plan.UpdatedAt = now

	// Regenerate weekly targets
	plan.WeeklyTargets = regenerateWeeklyTargets(plan, profile, actualWeight, now)

	return plan, nil
}

// applyReviseGoal adjusts the goal weight to be achievable with remaining time.
func applyReviseGoal(plan *NutritionPlan, profile *UserProfile, actualWeight float64, weeksRemaining int, now time.Time) (*NutritionPlan, error) {
	// Calculate achievable goal at safe rate
	safeWeeklyChange := 0.5 // kg/week
	if plan.GoalWeightKg > plan.StartWeightKg {
		safeWeeklyChange = 0.35 // Slower for gaining
	}

	achievableChange := safeWeeklyChange * float64(weeksRemaining)
	var newGoal float64

	if plan.GoalWeightKg < plan.StartWeightKg {
		// Weight loss
		newGoal = actualWeight - achievableChange
	} else {
		// Weight gain
		newGoal = actualWeight + achievableChange
	}
	newGoal = math.Round(newGoal*10) / 10

	// Clamp to valid range
	if newGoal < 30 {
		newGoal = 30
	} else if newGoal > 300 {
		newGoal = 300
	}

	plan.GoalWeightKg = newGoal

	// Recalculate weekly change
	weightChange := plan.GoalWeightKg - actualWeight
	plan.RequiredWeeklyChangeKg = weightChange / float64(weeksRemaining)
	plan.RequiredDailyDeficitKcal = plan.RequiredWeeklyChangeKg * 7700 / 7
	plan.LastRecalibratedAt = &now
	plan.UpdatedAt = now

	// Regenerate weekly targets
	plan.WeeklyTargets = regenerateWeeklyTargets(plan, profile, actualWeight, now)

	return plan, nil
}

// regenerateWeeklyTargets creates new weekly targets from current week onwards.
func regenerateWeeklyTargets(plan *NutritionPlan, profile *UserProfile, currentWeight float64, now time.Time) []WeeklyTarget {
	currentWeek := plan.GetCurrentWeek(now)

	// Keep existing targets before current week (preserve actuals)
	var targets []WeeklyTarget
	for i := 0; i < len(plan.WeeklyTargets) && i < currentWeek-1; i++ {
		targets = append(targets, plan.WeeklyTargets[i])
	}

	// Generate new targets from current week onwards
	for week := currentWeek; week <= plan.DurationWeeks; week++ {
		weekIndex := week - 1
		weeksFromNow := week - currentWeek

		// Calculate dates for this week
		startDate := plan.StartDate.AddDate(0, 0, weekIndex*7)
		endDate := startDate.AddDate(0, 0, 6)

		// Calculate projected weight (linear interpolation from current)
		projectedWeight := currentWeight + (plan.RequiredWeeklyChangeKg * float64(weeksFromNow+1))
		projectedWeight = math.Round(projectedWeight*10) / 10

		// Calculate projected TDEE for this weight
		projectedTDEE := calculateProjectedTDEE(profile, plan, projectedWeight, now)

		// Calculate target intake (TDEE + deficit/surplus)
		targetIntake := int(math.Round(float64(projectedTDEE) + plan.RequiredDailyDeficitKcal))

		// Calculate macro targets
		targetCarbsG, targetProteinG, targetFatsG := calculateMacroTargets(
			targetIntake, profile.CarbRatio, profile.ProteinRatio, profile.FatRatio,
		)

		target := WeeklyTarget{
			PlanID:            plan.ID,
			WeekNumber:        week,
			StartDate:         startDate,
			EndDate:           endDate,
			ProjectedWeightKg: projectedWeight,
			ProjectedTDEE:     projectedTDEE,
			TargetIntakeKcal:  targetIntake,
			TargetCarbsG:      targetCarbsG,
			TargetProteinG:    targetProteinG,
			TargetFatsG:       targetFatsG,
			DaysLogged:        0,
		}

		// Preserve existing ID if we're updating an existing target
		if weekIndex < len(plan.WeeklyTargets) {
			target.ID = plan.WeeklyTargets[weekIndex].ID
			target.ActualWeightKg = plan.WeeklyTargets[weekIndex].ActualWeightKg
			target.ActualIntakeKcal = plan.WeeklyTargets[weekIndex].ActualIntakeKcal
			target.DaysLogged = plan.WeeklyTargets[weekIndex].DaysLogged
		}

		targets = append(targets, target)
	}

	return targets
}
