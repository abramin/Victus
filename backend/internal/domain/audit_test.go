package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Audit rules are pure-domain invariants. EvaluateAuditRules breaks
// silently if a rule's threshold or trigger condition is changed.

type AuditSuite struct {
	suite.Suite
}

func TestAuditSuite(t *testing.T) {
	suite.Run(t, new(AuditSuite))
}

func (s *AuditSuite) TestHighFatigueLowCarbs() {
	s.Run("triggers when fatigue exceeds 60% on a fatburner day", func() {
		ctx := AuditContext{
			OverallFatigue: 65,
			CurrentDayType: DayTypeFatburner,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Require().Len(mismatches, 1)
		s.Equal(AuditRuleHighFatigueLowCarbs, mismatches[0].ID)
		s.Equal(AuditSeverityWarning, mismatches[0].Severity)
		s.NotEmpty(mismatches[0].Summary)
	})

	s.Run("does not trigger when fatigue is below threshold", func() {
		ctx := AuditContext{
			OverallFatigue: 55,
			CurrentDayType: DayTypeFatburner,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Empty(mismatches)
	})
}

func (s *AuditSuite) TestCNSDepletedPerformance() {
	s.Run("triggers when CNS is depleted on a performance day", func() {
		depleted := CNSStatusDepleted
		ctx := AuditContext{
			CNSStatus:      &depleted,
			CurrentDayType: DayTypePerformance,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Require().Len(mismatches, 1)
		s.Equal(AuditRuleCNSDepletedPerformance, mismatches[0].ID)
		s.Equal(AuditSeverityCritical, mismatches[0].Severity)
	})

	s.Run("does not trigger when CNS is optimized", func() {
		optimized := CNSStatusOptimized
		ctx := AuditContext{
			CNSStatus:      &optimized,
			CurrentDayType: DayTypePerformance,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Empty(mismatches)
	})

	s.Run("does not trigger when day type is not performance", func() {
		depleted := CNSStatusDepleted
		ctx := AuditContext{
			CNSStatus:      &depleted,
			CurrentDayType: DayTypeFatburner,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		// Only the high-fatigue-low-carbs rule might trigger, not CNS
		for _, m := range mismatches {
			s.NotEqual(AuditRuleCNSDepletedPerformance, m.ID)
		}
	})
}

func (s *AuditSuite) TestHeavyTrainingLowProtein() {
	s.Run("triggers when load exceeds 10 and protein below 80%", func() {
		ctx := AuditContext{
			TotalTrainingLoad: 15,
			ProteinPercent:    60,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Require().Len(mismatches, 1)
		s.Equal(AuditRuleHeavyTrainingLowProtein, mismatches[0].ID)
		s.NotEmpty(mismatches[0].Summary)
	})

	s.Run("does not trigger when protein meets threshold", func() {
		ctx := AuditContext{
			TotalTrainingLoad: 15,
			ProteinPercent:    85,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Empty(mismatches)
	})
}

func (s *AuditSuite) TestRecoveryOverreached() {
	s.Run("triggers when muscles overreached without recovery planned", func() {
		ctx := AuditContext{
			OverreachedMuscles: 5,
			HasRecoveryPlanned: false,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Require().Len(mismatches, 1)
		s.Equal(AuditRuleRecoveryOverreached, mismatches[0].ID)
	})

	s.Run("does not trigger when recovery is planned", func() {
		ctx := AuditContext{
			OverreachedMuscles: 5,
			HasRecoveryPlanned: true,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Empty(mismatches)
	})
}

func (s *AuditSuite) TestNoMismatchOnValidContext() {
	s.Run("returns empty when all conditions are safe", func() {
		optimized := CNSStatusOptimized
		ctx := AuditContext{
			OverallFatigue:     40,
			CurrentDayType:     DayTypePerformance,
			CNSStatus:          &optimized,
			TotalTrainingLoad:  5,
			ProteinPercent:     90,
			OverreachedMuscles: 1,
			HasRecoveryPlanned: true,
		}

		mismatches := EvaluateAuditRules(ctx, DefaultAuditRules())

		s.Empty(mismatches)
	})
}

func (s *AuditSuite) TestGetHighestSeverity() {
	s.Run("returns empty string for no mismatches", func() {
		s.Equal(AuditSeverity(""), GetHighestSeverity([]AuditMismatch{}))
	})

	s.Run("returns warning when only warnings present", func() {
		mismatches := []AuditMismatch{
			{Severity: AuditSeverityWarning},
		}
		s.Equal(AuditSeverityWarning, GetHighestSeverity(mismatches))
	})

	s.Run("returns critical when critical is present", func() {
		mismatches := []AuditMismatch{
			{Severity: AuditSeverityWarning},
			{Severity: AuditSeverityCritical},
			{Severity: AuditSeverityWarning},
		}
		s.Equal(AuditSeverityCritical, GetHighestSeverity(mismatches))
	})
}
