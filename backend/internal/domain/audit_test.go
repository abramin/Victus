package domain

import "testing"

func TestEvaluateAuditRules_HighFatigueLowCarbs(t *testing.T) {
	rules := DefaultAuditRules()
	ctx := AuditContext{
		OverallFatigue: 65,
		CurrentDayType: DayTypeFatburner,
	}

	mismatches := EvaluateAuditRules(ctx, rules)

	if len(mismatches) != 1 {
		t.Errorf("expected 1 mismatch, got %d", len(mismatches))
	}
	if mismatches[0].ID != AuditRuleHighFatigueLowCarbs {
		t.Errorf("expected %s, got %s", AuditRuleHighFatigueLowCarbs, mismatches[0].ID)
	}
	if mismatches[0].Severity != AuditSeverityWarning {
		t.Errorf("expected warning severity, got %s", mismatches[0].Severity)
	}
}

func TestEvaluateAuditRules_CNSDepletedPerformance(t *testing.T) {
	rules := DefaultAuditRules()
	depleted := CNSStatusDepleted
	ctx := AuditContext{
		CNSStatus:      &depleted,
		CurrentDayType: DayTypePerformance,
	}

	mismatches := EvaluateAuditRules(ctx, rules)

	if len(mismatches) != 1 {
		t.Errorf("expected 1 mismatch, got %d", len(mismatches))
	}
	if mismatches[0].ID != AuditRuleCNSDepletedPerformance {
		t.Errorf("expected %s, got %s", AuditRuleCNSDepletedPerformance, mismatches[0].ID)
	}
	if mismatches[0].Severity != AuditSeverityCritical {
		t.Errorf("expected critical severity, got %s", mismatches[0].Severity)
	}
}

func TestEvaluateAuditRules_HeavyTrainingLowProtein(t *testing.T) {
	rules := DefaultAuditRules()
	ctx := AuditContext{
		TotalTrainingLoad: 15,
		ProteinPercent:    60,
	}

	mismatches := EvaluateAuditRules(ctx, rules)

	if len(mismatches) != 1 {
		t.Errorf("expected 1 mismatch, got %d", len(mismatches))
	}
	if mismatches[0].ID != AuditRuleHeavyTrainingLowProtein {
		t.Errorf("expected %s, got %s", AuditRuleHeavyTrainingLowProtein, mismatches[0].ID)
	}
}

func TestEvaluateAuditRules_RecoveryOverreached(t *testing.T) {
	rules := DefaultAuditRules()
	ctx := AuditContext{
		OverreachedMuscles: 5,
		HasRecoveryPlanned: false,
	}

	mismatches := EvaluateAuditRules(ctx, rules)

	if len(mismatches) != 1 {
		t.Errorf("expected 1 mismatch, got %d", len(mismatches))
	}
	if mismatches[0].ID != AuditRuleRecoveryOverreached {
		t.Errorf("expected %s, got %s", AuditRuleRecoveryOverreached, mismatches[0].ID)
	}
}

func TestEvaluateAuditRules_NoMismatch(t *testing.T) {
	rules := DefaultAuditRules()
	ctx := AuditContext{
		OverallFatigue:     40,
		CurrentDayType:     DayTypePerformance,
		TotalTrainingLoad:  5,
		ProteinPercent:     90,
		OverreachedMuscles: 1,
		HasRecoveryPlanned: true,
	}

	mismatches := EvaluateAuditRules(ctx, rules)

	if len(mismatches) != 0 {
		t.Errorf("expected no mismatches, got %d", len(mismatches))
	}
}

func TestGetHighestSeverity(t *testing.T) {
	tests := []struct {
		name       string
		mismatches []AuditMismatch
		want       AuditSeverity
	}{
		{
			name:       "empty",
			mismatches: []AuditMismatch{},
			want:       "",
		},
		{
			name: "warning only",
			mismatches: []AuditMismatch{
				{Severity: AuditSeverityWarning},
			},
			want: AuditSeverityWarning,
		},
		{
			name: "critical only",
			mismatches: []AuditMismatch{
				{Severity: AuditSeverityCritical},
			},
			want: AuditSeverityCritical,
		},
		{
			name: "mixed - critical wins",
			mismatches: []AuditMismatch{
				{Severity: AuditSeverityWarning},
				{Severity: AuditSeverityCritical},
				{Severity: AuditSeverityWarning},
			},
			want: AuditSeverityCritical,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetHighestSeverity(tt.mismatches)
			if got != tt.want {
				t.Errorf("GetHighestSeverity() = %v, want %v", got, tt.want)
			}
		})
	}
}
