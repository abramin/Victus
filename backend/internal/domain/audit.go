package domain

// AuditRuleID identifies a specific mismatch rule.
type AuditRuleID string

const (
	AuditRuleHighFatigueLowCarbs     AuditRuleID = "high_fatigue_low_carbs"
	AuditRuleCNSDepletedPerformance  AuditRuleID = "cns_depleted_performance"
	AuditRuleHeavyTrainingLowProtein AuditRuleID = "heavy_training_low_protein"
	AuditRuleRecoveryOverreached     AuditRuleID = "recovery_overreached"
)

// AuditSeverity indicates how critical a mismatch is.
type AuditSeverity string

const (
	AuditSeverityWarning  AuditSeverity = "warning"  // Amber light
	AuditSeverityCritical AuditSeverity = "critical" // Red light
)

// AuditMismatch represents a detected strategy mismatch.
type AuditMismatch struct {
	ID          AuditRuleID   `json:"id"`
	Rule        string        `json:"rule"`
	Severity    AuditSeverity `json:"severity"`
	Summary     string        `json:"summary"`
	Explanation string        `json:"explanation,omitempty"`
	RelatedData map[string]any `json:"relatedData,omitempty"`
}

// AuditStatus represents the current audit state for the Check Engine light.
type AuditStatus struct {
	HasMismatch bool            `json:"hasMismatch"`
	Severity    AuditSeverity   `json:"severity,omitempty"` // Highest severity among mismatches
	Mismatches  []AuditMismatch `json:"mismatches"`
	CheckedAt   string          `json:"checkedAt"`
}

// AuditContext contains all data needed to evaluate audit rules.
type AuditContext struct {
	// Fatigue data
	OverallFatigue      float64 // 0-100 percentage
	OverreachedMuscles  int     // Count of muscles > 85% fatigue
	HasRecoveryPlanned  bool    // Whether rest day is planned in next 48h

	// Day type
	CurrentDayType DayType

	// CNS status
	CNSStatus *CNSStatus

	// Training data
	TotalTrainingLoad float64 // Sum of session loads for the day

	// Nutrition adherence
	ProteinPercent float64 // Percentage of protein target consumed
}

// AuditRule defines a single audit check.
type AuditRule struct {
	ID       AuditRuleID
	Name     string
	Severity AuditSeverity
	Check    func(ctx AuditContext) (bool, string, map[string]any)
}

// DefaultAuditRules returns the standard set of mismatch detection rules.
func DefaultAuditRules() []AuditRule {
	return []AuditRule{
		{
			ID:       AuditRuleHighFatigueLowCarbs,
			Name:     "HIGH_FATIGUE_LOW_CARBS",
			Severity: AuditSeverityWarning,
			Check: func(ctx AuditContext) (bool, string, map[string]any) {
				// Condition: overallFatigue > 60% AND dayType = 'fatburner'
				if ctx.OverallFatigue > 60 && ctx.CurrentDayType == DayTypeFatburner {
					return true,
						"Muscles fatigued but today is Fat Burner day",
						map[string]any{
							"fatigue": ctx.OverallFatigue,
							"dayType": string(ctx.CurrentDayType),
						}
				}
				return false, "", nil
			},
		},
		{
			ID:       AuditRuleCNSDepletedPerformance,
			Name:     "CNS_DEPLETED_PERFORMANCE",
			Severity: AuditSeverityCritical,
			Check: func(ctx AuditContext) (bool, string, map[string]any) {
				// Condition: cnsStatus = 'depleted' AND dayType = 'performance'
				if ctx.CNSStatus != nil && *ctx.CNSStatus == CNSStatusDepleted && ctx.CurrentDayType == DayTypePerformance {
					return true,
						"CNS is depleted but today is a Performance day",
						map[string]any{
							"cnsStatus": string(*ctx.CNSStatus),
							"dayType":   string(ctx.CurrentDayType),
						}
				}
				return false, "", nil
			},
		},
		{
			ID:       AuditRuleHeavyTrainingLowProtein,
			Name:     "HEAVY_TRAINING_LOW_PROTEIN",
			Severity: AuditSeverityWarning,
			Check: func(ctx AuditContext) (bool, string, map[string]any) {
				// Condition: trainingLoad > 10 AND proteinPercent < 80%
				if ctx.TotalTrainingLoad > 10 && ctx.ProteinPercent < 80 {
					return true,
						"Heavy training day with insufficient protein intake",
						map[string]any{
							"trainingLoad":   ctx.TotalTrainingLoad,
							"proteinPercent": ctx.ProteinPercent,
						}
				}
				return false, "", nil
			},
		},
		{
			ID:       AuditRuleRecoveryOverreached,
			Name:     "RECOVERY_OVERREACHED",
			Severity: AuditSeverityWarning,
			Check: func(ctx AuditContext) (bool, string, map[string]any) {
				// Condition: >3 muscles overreached AND no rest planned
				if ctx.OverreachedMuscles > 3 && !ctx.HasRecoveryPlanned {
					return true,
						"Multiple muscles overreached with no recovery planned",
						map[string]any{
							"overreachedMuscles":  ctx.OverreachedMuscles,
							"hasRecoveryPlanned": ctx.HasRecoveryPlanned,
						}
				}
				return false, "", nil
			},
		},
	}
}

// EvaluateAuditRules checks all rules against the given context.
// Returns detected mismatches (can be empty if all checks pass).
func EvaluateAuditRules(ctx AuditContext, rules []AuditRule) []AuditMismatch {
	var mismatches []AuditMismatch

	for _, rule := range rules {
		triggered, summary, data := rule.Check(ctx)
		if triggered {
			mismatches = append(mismatches, AuditMismatch{
				ID:          rule.ID,
				Rule:        rule.Name,
				Severity:    rule.Severity,
				Summary:     summary,
				RelatedData: data,
			})
		}
	}

	return mismatches
}

// GetHighestSeverity returns the highest severity among mismatches.
func GetHighestSeverity(mismatches []AuditMismatch) AuditSeverity {
	for _, m := range mismatches {
		if m.Severity == AuditSeverityCritical {
			return AuditSeverityCritical
		}
	}
	if len(mismatches) > 0 {
		return AuditSeverityWarning
	}
	return ""
}
