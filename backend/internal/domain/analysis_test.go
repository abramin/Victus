package domain

import (
	"testing"
	"time"
)

func TestCalculateDualTrackAnalysis_BasicVariance(t *testing.T) {
	// Create a test plan with weekly targets
	// 5 kg loss over 10 weeks = 0.5 kg/week = safe deficit
	plan := createTestPlan(t, "2026-01-01", 90.0, 85.0, 10)

	// Week 1 projected weight for 90->85 in 10 weeks = 90 + (-0.5) = 89.5
	tests := []struct {
		name                string
		actualWeight        float64
		tolerance           float64
		wantRecalibration   bool
		wantVariancePercent float64
	}{
		{
			name:                "within tolerance - exact match",
			actualWeight:        89.5, // Week 1 projected weight
			tolerance:           3,
			wantRecalibration:   false,
			wantVariancePercent: 0,
		},
		{
			name:                "within tolerance - slightly over",
			actualWeight:        90.0, // ~0.5% over projected 89.5
			tolerance:           3,
			wantRecalibration:   false,
			wantVariancePercent: 0.56, // (90-89.5)/89.5 * 100
		},
		{
			name:                "outside tolerance - 5% over",
			actualWeight:        94.0, // ~5% over projected 89.5
			tolerance:           3,
			wantRecalibration:   true,
			wantVariancePercent: 5.03, // (94-89.5)/89.5 * 100
		},
		{
			name:                "outside tolerance - just over 3%",
			actualWeight:        92.2, // slightly over 3% over 89.5
			tolerance:           3,
			wantRecalibration:   true,
			wantVariancePercent: 3.02,
		},
		{
			name:                "custom tolerance 5% - within",
			actualWeight:        93.0, // ~3.9% over
			tolerance:           5,
			wantRecalibration:   false,
			wantVariancePercent: 3.91,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Analysis date is in week 1
			analysisDate := mustParseDate("2026-01-05")

			input := AnalysisInput{
				Plan:             plan,
				ActualWeightKg:   tt.actualWeight,
				TolerancePercent: tt.tolerance,
				AnalysisDate:     analysisDate,
			}

			result, err := CalculateDualTrackAnalysis(input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.RecalibrationNeeded != tt.wantRecalibration {
				t.Errorf("RecalibrationNeeded = %v, want %v", result.RecalibrationNeeded, tt.wantRecalibration)
			}

			// Allow some floating point tolerance
			if diff := result.VariancePercent - tt.wantVariancePercent; diff > 0.1 || diff < -0.1 {
				t.Errorf("VariancePercent = %.2f, want ~%.2f", result.VariancePercent, tt.wantVariancePercent)
			}
		})
	}
}

func TestCalculateDualTrackAnalysis_CurrentWeek(t *testing.T) {
	// 5 kg loss over 10 weeks = safe deficit
	plan := createTestPlan(t, "2026-01-01", 90.0, 85.0, 10)

	tests := []struct {
		name         string
		analysisDate string
		wantWeek     int
	}{
		{"day 1 of plan", "2026-01-01", 1},
		{"day 7 of plan", "2026-01-07", 1},
		{"day 8 of plan", "2026-01-08", 2},
		{"day 14 of plan", "2026-01-14", 2},
		{"day 15 of plan", "2026-01-15", 3},
		{"week 10", "2026-03-05", 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := AnalysisInput{
				Plan:             plan,
				ActualWeightKg:   89.0,
				TolerancePercent: 3,
				AnalysisDate:     mustParseDate(tt.analysisDate),
			}

			result, err := CalculateDualTrackAnalysis(input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.CurrentWeek != tt.wantWeek {
				t.Errorf("CurrentWeek = %d, want %d", result.CurrentWeek, tt.wantWeek)
			}
		})
	}
}

func TestCalculateDualTrackAnalysis_PlanEnded(t *testing.T) {
	// 2 kg loss over 4 weeks = safe deficit
	plan := createTestPlan(t, "2026-01-01", 90.0, 88.0, 4)

	// Analysis date after plan ends
	input := AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   85.0,
		TolerancePercent: 3,
		AnalysisDate:     mustParseDate("2026-02-15"), // Well after 4 weeks
	}

	_, err := CalculateDualTrackAnalysis(input)
	if err != ErrPlanEnded {
		t.Errorf("expected ErrPlanEnded, got %v", err)
	}
}

func TestCalculateDualTrackAnalysis_PlanNotStarted(t *testing.T) {
	// 2 kg loss over 4 weeks = safe deficit
	plan := createTestPlan(t, "2026-02-01", 90.0, 88.0, 4)

	// Analysis date before plan starts
	input := AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   90.0,
		TolerancePercent: 3,
		AnalysisDate:     mustParseDate("2026-01-15"),
	}

	_, err := CalculateDualTrackAnalysis(input)
	if err != ErrPlanNotStarted {
		t.Errorf("expected ErrPlanNotStarted, got %v", err)
	}
}

func TestCalculateDualTrackAnalysis_RecalibrationOptions(t *testing.T) {
	// 5 kg loss over 10 weeks = safe deficit
	plan := createTestPlan(t, "2026-01-01", 90.0, 85.0, 10)

	// Analysis date in week 3 with significant variance
	// Week 3 projected: 90 - (0.5 * 3) = 88.5 kg
	input := AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   92.0, // Should be ~88.5, so significantly behind
		TolerancePercent: 3,
		AnalysisDate:     mustParseDate("2026-01-17"),
	}

	result, err := CalculateDualTrackAnalysis(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !result.RecalibrationNeeded {
		t.Fatal("expected recalibration to be needed")
	}

	if len(result.Options) != 4 {
		t.Fatalf("expected 4 recalibration options, got %d", len(result.Options))
	}

	// Verify all option types are present
	optionTypes := make(map[RecalibrationOptionType]bool)
	for _, opt := range result.Options {
		optionTypes[opt.Type] = true

		// Verify each option has required fields
		if opt.FeasibilityTag == "" {
			t.Errorf("option %s missing feasibility tag", opt.Type)
		}
		if opt.NewParameter == "" {
			t.Errorf("option %s missing new parameter", opt.Type)
		}
		if opt.Impact == "" {
			t.Errorf("option %s missing impact", opt.Type)
		}
	}

	expectedTypes := []RecalibrationOptionType{
		RecalibrationIncreaseDeficit,
		RecalibrationExtendTimeline,
		RecalibrationReviseGoal,
		RecalibrationKeepCurrent,
	}

	for _, expected := range expectedTypes {
		if !optionTypes[expected] {
			t.Errorf("missing option type: %s", expected)
		}
	}
}

func TestCalculateDualTrackAnalysis_PlanProjection(t *testing.T) {
	// 5 kg loss over 10 weeks = safe deficit
	plan := createTestPlan(t, "2026-01-01", 90.0, 85.0, 10)

	input := AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   89.0,
		TolerancePercent: 3,
		AnalysisDate:     mustParseDate("2026-01-05"),
	}

	result, err := CalculateDualTrackAnalysis(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have 11 projection points (week 0 + 10 weeks)
	if len(result.PlanProjection) != 11 {
		t.Errorf("expected 11 plan projection points, got %d", len(result.PlanProjection))
	}

	// First point should be start weight
	if result.PlanProjection[0].WeightKg != 90.0 {
		t.Errorf("first projection point weight = %.1f, want 90.0", result.PlanProjection[0].WeightKg)
	}

	// Last point should be goal weight (or close to it)
	lastWeight := result.PlanProjection[len(result.PlanProjection)-1].WeightKg
	if lastWeight < 84.5 || lastWeight > 85.5 {
		t.Errorf("last projection point weight = %.1f, want ~85.0", lastWeight)
	}
}

func TestCalculateDualTrackAnalysis_TrendProjection(t *testing.T) {
	// 5 kg loss over 10 weeks = safe deficit (0.5 kg/week)
	plan := createTestPlan(t, "2026-01-01", 90.0, 85.0, 10)

	// Provide weight trend data
	trend := &WeightTrend{
		WeeklyChangeKg: -0.4, // Losing 0.4 kg/week (slower than plan's -0.5 kg/week)
		RSquared:       0.9,
		StartWeightKg:  90.0,
		EndWeightKg:    88.8,
	}

	input := AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   88.5,
		TolerancePercent: 3,
		WeightTrend:      trend,
		AnalysisDate:     mustParseDate("2026-01-17"), // Week 3
	}

	result, err := CalculateDualTrackAnalysis(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(result.TrendProjection) == 0 {
		t.Error("expected trend projection points")
	}

	// Verify trend projection uses the trend's weekly change
	if len(result.TrendProjection) >= 2 {
		point1 := result.TrendProjection[0]
		point2 := result.TrendProjection[1]
		weeklyChange := point2.WeightKg - point1.WeightKg

		// Should be approximately -0.4 kg/week
		if weeklyChange < -0.5 || weeklyChange > -0.3 {
			t.Errorf("trend projection weekly change = %.2f, want ~-0.4", weeklyChange)
		}
	}
}

func TestCalculateDualTrackAnalysis_DefaultTolerance(t *testing.T) {
	// 5 kg loss over 10 weeks = safe deficit
	plan := createTestPlan(t, "2026-01-01", 90.0, 85.0, 10)

	input := AnalysisInput{
		Plan:             plan,
		ActualWeightKg:   89.0,
		TolerancePercent: 0, // Should default to 3%
		AnalysisDate:     mustParseDate("2026-01-05"),
	}

	result, err := CalculateDualTrackAnalysis(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.TolerancePercent != 3 {
		t.Errorf("TolerancePercent = %.1f, want 3.0 (default)", result.TolerancePercent)
	}
}

func TestGenerateRecalibrationOptions_FeasibilityTags(t *testing.T) {
	// Test that feasibility tags are assigned appropriately
	tests := []struct {
		name             string
		startWeight      float64
		goalWeight       float64
		durationWeeks    int
		currentWeek      int
		actualWeight     float64
		expectAmbitious  bool // At least one option should be ambitious
	}{
		{
			name:            "minor variance",
			startWeight:     90,
			goalWeight:      85, // 5 kg over 10 weeks = safe deficit
			durationWeeks:   10,
			currentWeek:     5,
			actualWeight:    88.5, // Slightly behind (should be ~87.5)
			expectAmbitious: false,
		},
		{
			name:            "major variance",
			startWeight:     90,
			goalWeight:      85, // 5 kg over 10 weeks = safe deficit
			durationWeeks:   10,
			currentWeek:     8,
			actualWeight:    90, // Very behind with only 2 weeks left (should be ~86)
			expectAmbitious: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := createTestPlan(t, "2026-01-01", tt.startWeight, tt.goalWeight, tt.durationWeeks)

			// Calculate analysis date for the specified current week
			analysisDate := plan.StartDate.AddDate(0, 0, (tt.currentWeek-1)*7+3)

			input := AnalysisInput{
				Plan:             plan,
				ActualWeightKg:   tt.actualWeight,
				TolerancePercent: 1, // Low tolerance to trigger recalibration
				AnalysisDate:     analysisDate,
			}

			result, err := CalculateDualTrackAnalysis(input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			hasAmbitious := false
			for _, opt := range result.Options {
				if opt.FeasibilityTag == FeasibilityAmbitious {
					hasAmbitious = true
					break
				}
			}

			if tt.expectAmbitious && !hasAmbitious {
				t.Error("expected at least one ambitious option")
			}
		})
	}
}

// Helper functions

func createTestPlan(t *testing.T, startDateStr string, startWeight, goalWeight float64, durationWeeks int) *NutritionPlan {
	t.Helper()

	startDate := mustParseDate(startDateStr)

	profile := &UserProfile{
		HeightCM:               175,
		Sex:                    "male",
		BirthDate:              mustParseDate("1990-01-01"),
		CurrentWeightKg:        startWeight,
		BMREquation:            BMREquationMifflinStJeor,
		CarbRatio:              0.45,
		ProteinRatio:           0.30,
		FatRatio:               0.25,
		RecalibrationTolerance: 3,
	}

	input := NutritionPlanInput{
		StartDate:     startDate.Format("2006-01-02"),
		StartWeightKg: startWeight,
		GoalWeightKg:  goalWeight,
		DurationWeeks: durationWeeks,
	}

	plan, err := NewNutritionPlan(input, profile, startDate)
	if err != nil {
		t.Fatalf("failed to create test plan: %v", err)
	}

	plan.ID = 1 // Set a test ID

	return plan
}

func mustParseDate(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}
