import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanHealthPanel } from './PlanHealthPanel';
import { AdjustStrategyModal } from './AdjustStrategyModal';
import type { NutritionPlan, DualTrackAnalysis, RecalibrationOption } from '../../api/types';

describe('PlanHealthPanel - Vector-First Plan Health Status', () => {
  const mockPlan: NutritionPlan = {
    id: 1,
    userId: 1,
    startWeightKg: 75,
    goalWeightKg: 40,
    durationWeeks: 12,
    requiredWeeklyChangeKg: -0.5,
    startDate: '2024-01-01',
    endDate: '2024-03-25',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  // -------------------------------------------------------------------------
  // Step 1: CRITICAL DEVIATION - Vector Direction Check (highest priority)
  // -------------------------------------------------------------------------
  it('shows CRITICAL DEVIATION when trend diverges from goal (weight loss plan gaining weight)', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 75.4, // Slightly above plan
      varianceKg: 1.4,
      variancePercent: 1.9, // Within tolerance
      tolerancePercent: 3,
      recalibrationNeeded: false, // Backend says within tolerance
      trendDiverging: true, // But trend is going WRONG direction
      trendDivergingMsg: 'Weight trending +0.6 kg/wk, plan requires -0.5 kg/wk',
      planProjection: [],
      landingPoint: {
        weightKg: 125.2, // Projected to land way over goal
        date: '2024-03-25',
        varianceFromGoalKg: 85.2,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('CRITICAL DEVIATION')).toBeInTheDocument();
    expect(screen.getByText(/Weight trending \+0\.6 kg\/wk/)).toBeInTheDocument();
  });

  it('shows CRITICAL DEVIATION for weight gain plan when losing weight', () => {
    const gainPlan: NutritionPlan = {
      ...mockPlan,
      startWeightKg: 60,
      goalWeightKg: 75,
      requiredWeeklyChangeKg: 0.5,
    };

    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 61,
      actualWeightKg: 59.5,
      varianceKg: -1.5,
      variancePercent: -2.5, // Within tolerance
      tolerancePercent: 3,
      recalibrationNeeded: false,
      trendDiverging: true, // Weight gain plan but losing weight
      trendDivergingMsg: 'Weight trending -0.3 kg/wk, plan requires +0.5 kg/wk',
      planProjection: [],
      landingPoint: {
        weightKg: 55,
        date: '2024-03-25',
        varianceFromGoalKg: -20,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={gainPlan} analysis={analysis} />);

    expect(screen.getByText('CRITICAL DEVIATION')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Step 2 & 3: Status based on Projected Landing Variance
  // -------------------------------------------------------------------------
  it('shows ON TRACK when projected landing variance < 1.0kg', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 73.5,
      varianceKg: -0.5,
      variancePercent: -0.68,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 40.5, // 0.5kg from goal (40kg) — ON TRACK
        date: '2024-03-25',
        varianceFromGoalKg: 0.5,
        onTrackForGoal: true,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('ON TRACK')).toBeInTheDocument();
    expect(screen.getByText(/At this pace, you reach 40.5kg/)).toBeInTheDocument();
  });

  it('shows ON TRACK at exactly 0.99kg variance (boundary)', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 73.5,
      varianceKg: -0.5,
      variancePercent: -0.68,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 40.99, // 0.99kg from goal — still ON TRACK
        date: '2024-03-25',
        varianceFromGoalKg: 0.99,
        onTrackForGoal: true,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('ON TRACK')).toBeInTheDocument();
  });

  it('shows AT RISK when projected landing variance is 1.0-3.0kg', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 42.5, // 2.5kg from goal (40kg) — AT RISK
        date: '2024-03-25',
        varianceFromGoalKg: 2.5,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('AT RISK')).toBeInTheDocument();
    expect(screen.getByText(/Current velocity puts you at 42.5kg/)).toBeInTheDocument();
  });

  it('shows AT RISK at exactly 1.0kg variance (boundary into AT RISK)', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 41.0, // Exactly 1.0kg from goal — AT RISK
        date: '2024-03-25',
        varianceFromGoalKg: 1.0,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('AT RISK')).toBeInTheDocument();
  });

  it('shows AT RISK at exactly 3.0kg variance (boundary)', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 43, // Exactly 3.0kg from goal (40kg) — last AT RISK
        date: '2024-03-25',
        varianceFromGoalKg: 3.0,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('AT RISK')).toBeInTheDocument();
  });

  it('shows OFF TRACK when projected landing variance > 3.0kg', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 68.3, // 28.3kg from goal (40kg) — OFF TRACK
        date: '2024-03-25',
        varianceFromGoalKg: 28.3,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('OFF TRACK')).toBeInTheDocument();
    expect(screen.getByText(/Current velocity puts you at 68.3kg/)).toBeInTheDocument();
  });

  it('shows OFF TRACK at 3.01kg variance (just past boundary)', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 43.01, // 3.01kg from goal — crosses into OFF TRACK
        date: '2024-03-25',
        varianceFromGoalKg: 3.01,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('OFF TRACK')).toBeInTheDocument();
  });

  it('calculates correct kcal adjustment for OFF TRACK status', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 50, // 10kg from goal (40kg)
        date: '2024-03-25',
        varianceFromGoalKg: 10,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    // With 10 weeks remaining and 10kg to lose:
    // Additional weekly change needed: 10kg / 10 weeks = 1kg/week
    // Daily kcal adjustment: (1 * 7700) / 7 = 1100 kcal/day
    expect(screen.getByText(/Increase deficit by 1100 kcal to correct/)).toBeInTheDocument();
  });

  it('handles weight gain plans correctly (OFF TRACK)', () => {
    const gainPlan: NutritionPlan = {
      ...mockPlan,
      startWeightKg: 60,
      goalWeightKg: 75,
      requiredWeeklyChangeKg: 0.5,
    };

    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 61,
      actualWeightKg: 60.5,
      varianceKg: -0.5,
      variancePercent: -0.82,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 70, // 5kg below goal (75kg)
        date: '2024-03-25',
        varianceFromGoalKg: -5,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={gainPlan} analysis={analysis} />);

    expect(screen.getByText('OFF TRACK')).toBeInTheDocument();
    // For weight gain, should say "Decrease deficit" (i.e., eat more)
    expect(screen.getByText(/Decrease deficit by.*kcal to correct/)).toBeInTheDocument();
  });

  it('shows ON TRACK when no landing point data available', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 73.5,
      varianceKg: -0.5,
      variancePercent: -0.68,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      // No landingPoint — insufficient trend data
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('ON TRACK')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Variance Display: Shows projected variance for critical/off_track
  // -------------------------------------------------------------------------
  it('shows projected variance (red) for CRITICAL DEVIATION', async () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 75.4,
      varianceKg: 1.4,
      variancePercent: 1.9,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      trendDiverging: true,
      trendDivergingMsg: 'Weight trending +0.6 kg/wk, plan requires -0.5 kg/wk',
      planProjection: [],
      landingPoint: {
        weightKg: 125.2,
        date: '2024-03-25',
        varianceFromGoalKg: 85.2,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    // Should show projected variance label (may appear in multiple places)
    expect(screen.getAllByText('Projected Variance').length).toBeGreaterThanOrEqual(1);
    // Should show the large projected variance prominently
    expect(screen.getByText('+85.2 kg')).toBeInTheDocument();
    // Current variance shown as secondary info
    expect(screen.getByText('Current: +1.4 kg')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Coherence: health signal and strategy modal agreement tests
// Note: The modal uses recalibrationNeeded from backend, while the health panel
// now uses Vector-First logic. Some scenarios may show different signals.
// ---------------------------------------------------------------------------
describe('Health signal ↔ strategy availability coherence', () => {
  const plan: NutritionPlan = {
    id: 1,
    userId: 1,
    startWeightKg: 90,
    goalWeightKg: 85,
    durationWeeks: 10,
    requiredWeeklyChangeKg: -0.5,
    requiredDailyDeficitKcal: 550,
    startDate: '2026-01-01',
    status: 'active',
    currentWeek: 3,
    weeklyTargets: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const offTrackOptions: RecalibrationOption[] = [
    { type: 'increase_deficit', feasibilityTag: 'Moderate', newParameter: '-750 kcal/day', impact: 'Increase deficit' },
    { type: 'extend_timeline', feasibilityTag: 'Achievable', newParameter: '14 weeks', impact: 'Add 4 weeks' },
    { type: 'revise_goal', feasibilityTag: 'Achievable', newParameter: '86 kg', impact: 'Minor goal shift' },
    { type: 'keep_current', feasibilityTag: 'Achievable', newParameter: '-550 kcal/day', impact: 'Continue current' },
  ];

  const noop = vi.fn(() => Promise.resolve());

  it('ON TRACK: health green, modal shows no adjustments needed', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 88.5,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 85.2, // 0.2kg from goal — ON TRACK
        date: '2026-03-12',
        varianceFromGoalKg: 0.2,
        onTrackForGoal: true,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
      </>
    );

    // Health panel: green
    expect(screen.getByText('ON TRACK')).toBeInTheDocument();

    // Modal: no options to offer
    expect(screen.getByText('No adjustments needed')).toBeInTheDocument();
    expect(screen.queryByText('Push Harder')).not.toBeInTheDocument();
  });

  it('OFF TRACK with options: health red, modal offers adjustment options', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 92.0,
      varianceKg: 3.5,
      variancePercent: 3.95,
      tolerancePercent: 3,
      recalibrationNeeded: true,
      options: offTrackOptions,
      planProjection: [],
      landingPoint: {
        weightKg: 91.0, // 6kg from goal — OFF TRACK
        date: '2026-03-12',
        varianceFromGoalKg: 6.0,
        onTrackForGoal: false,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
      </>
    );

    // Health panel: red
    expect(screen.getByText('OFF TRACK')).toBeInTheDocument();

    // Modal: strategies available
    expect(screen.getByText('Push Harder')).toBeInTheDocument();
    expect(screen.getByText('Extend Timeline')).toBeInTheDocument();
    expect(screen.queryByText('No adjustments needed')).not.toBeInTheDocument();
  });

  it('AT RISK with options: health amber, modal offers adjustment options', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 91.2,
      varianceKg: 2.7,
      variancePercent: 3.05,
      tolerancePercent: 3,
      recalibrationNeeded: true,
      options: offTrackOptions,
      planProjection: [],
      landingPoint: {
        weightKg: 87.5, // 2.5kg from goal — AT RISK
        date: '2026-03-12',
        varianceFromGoalKg: 2.5,
        onTrackForGoal: false,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
      </>
    );

    // Health panel: amber
    expect(screen.getByText('AT RISK')).toBeInTheDocument();

    // Modal: strategies available
    expect(screen.getByText('Push Harder')).toBeInTheDocument();
    expect(screen.getByText('Extend Timeline')).toBeInTheDocument();
    expect(screen.queryByText('No adjustments needed')).not.toBeInTheDocument();
  });

  it('post-recalibration: health ON TRACK, modal shows cooldown', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 92.0,
      actualWeightKg: 92.0,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: false,
      planProjection: [],
      landingPoint: {
        weightKg: 85.5, // 0.5kg from goal — ON TRACK
        date: '2026-03-12',
        varianceFromGoalKg: 0.5,
        onTrackForGoal: true,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal
          isOpen={true}
          onClose={noop}
          plan={plan}
          analysis={analysis}
          onApply={noop}
          recentlyRecalibrated={true}
        />
      </>
    );

    // Health panel: green
    expect(screen.getByText('ON TRACK')).toBeInTheDocument();

    // Modal: cooldown message
    expect(screen.getByText('Strategy Updated')).toBeInTheDocument();
    expect(screen.queryByText('No adjustments needed')).not.toBeInTheDocument();
  });

  it('CRITICAL DEVIATION: health red, modal shows options when recalibrationNeeded', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 92.0,
      varianceKg: 3.5,
      variancePercent: 3.95,
      tolerancePercent: 3,
      recalibrationNeeded: true,
      trendDiverging: true, // Trend opposes goal
      trendDivergingMsg: 'Weight trending +0.6 kg/wk, plan requires -0.5 kg/wk',
      options: offTrackOptions,
      planProjection: [],
      landingPoint: {
        weightKg: 125.0,
        date: '2026-03-12',
        varianceFromGoalKg: 40.0,
        onTrackForGoal: false,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
      </>
    );

    // Health panel: CRITICAL DEVIATION (trendDiverging takes priority)
    expect(screen.getByText('CRITICAL DEVIATION')).toBeInTheDocument();

    // Modal: options available (recalibrationNeeded is true)
    expect(screen.getByText('Push Harder')).toBeInTheDocument();
    expect(screen.getByText('Extend Timeline')).toBeInTheDocument();
  });

  it('AT RISK at exactly 3.0kg boundary: modal still has options', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 91.0,
      varianceKg: 2.5,
      variancePercent: 2.82,
      tolerancePercent: 3,
      recalibrationNeeded: true,
      options: offTrackOptions,
      planProjection: [],
      landingPoint: {
        weightKg: 88.0, // Exactly 3.0kg from goal
        date: '2026-03-12',
        varianceFromGoalKg: 3.0,
        onTrackForGoal: false,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
      </>
    );

    // Health panel: AT RISK (3.0kg is the boundary)
    expect(screen.getByText('AT RISK')).toBeInTheDocument();

    // Modal: options present
    expect(screen.getByText('Push Harder')).toBeInTheDocument();
    expect(screen.getByText('Extend Timeline')).toBeInTheDocument();
  });

  it('CRITICAL DEVIATION with trendDiverging but recalibrationNeeded false: modal shows options', () => {
    // Key scenario: variance is within tolerance but trend is going wrong direction.
    // Backend now generates options when trendDiverging is true.
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 89.9, // 1.4kg variance - within 3% tolerance
      varianceKg: 1.4,
      variancePercent: 1.58,
      tolerancePercent: 3,
      recalibrationNeeded: false, // Variance within tolerance
      trendDiverging: true, // But trend is going wrong direction!
      trendDivergingMsg: 'Weight trending +0.6 kg/wk, plan requires -0.5 kg/wk',
      options: offTrackOptions, // Backend generates options when trendDiverging
      planProjection: [],
      landingPoint: {
        weightKg: 125.0,
        date: '2026-03-12',
        varianceFromGoalKg: 40.0,
        onTrackForGoal: false,
      },
    };

    render(
      <>
        <PlanHealthPanel plan={plan} analysis={analysis} />
        <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
      </>
    );

    // Health panel: CRITICAL DEVIATION (trendDiverging takes priority)
    expect(screen.getByText('CRITICAL DEVIATION')).toBeInTheDocument();

    // Modal: options available even though recalibrationNeeded is false
    // (because backend generates them when trendDiverging is true)
    expect(screen.getByText('Push Harder')).toBeInTheDocument();
    expect(screen.getByText('Extend Timeline')).toBeInTheDocument();
  });

  it('modal fallback when recalibrationNeeded but options missing', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2026-01-22',
      currentWeek: 3,
      plannedWeightKg: 88.5,
      actualWeightKg: 91.0,
      varianceKg: 2.5,
      variancePercent: 2.82,
      tolerancePercent: 3,
      recalibrationNeeded: true,
      // options intentionally absent
      planProjection: [],
      landingPoint: {
        weightKg: 87.5,
        date: '2026-03-12',
        varianceFromGoalKg: 2.5,
        onTrackForGoal: false,
      },
    };

    render(
      <AdjustStrategyModal isOpen={true} onClose={noop} plan={plan} analysis={analysis} onApply={noop} />
    );

    // Modal: off track waiting message
    expect(screen.getByText('Plan is Off Track')).toBeInTheDocument();
    expect(screen.getByText(/Recalibration options will be available/)).toBeInTheDocument();
  });
});
