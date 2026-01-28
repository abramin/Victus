import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanHealthPanel } from './PlanHealthPanel';
import type { NutritionPlan, DualTrackAnalysis } from '../../api/types';

describe('PlanHealthPanel - Plan Health Status', () => {
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

  it('shows ON TRACK when projected to land within 1kg of goal', () => {
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
        weightKg: 40.5, // Within 1kg of goal (40kg)
        date: '2024-03-25',
        varianceFromGoalKg: 0.5,
        onTrackForGoal: true,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('ON TRACK')).toBeInTheDocument();
    expect(screen.getByText(/At this pace, you reach 40.5kg/)).toBeInTheDocument();
  });

  it('shows SLIGHT DELAY when projected to land within 3kg of goal', () => {
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
        weightKg: 42.5, // Within 3kg of goal (40kg)
        date: '2024-03-25',
        varianceFromGoalKg: 2.5,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('SLIGHT DELAY')).toBeInTheDocument();
    expect(screen.getByText(/Current velocity puts you at 42.5kg/)).toBeInTheDocument();
    expect(screen.getByText(/Increase deficit by.*kcal to correct/)).toBeInTheDocument();
  });

  it('shows OFF TRACK when projected to land more than 3kg from goal', () => {
    const analysis: DualTrackAnalysis = {
      planId: 1,
      analysisDate: '2024-01-15',
      currentWeek: 2,
      plannedWeightKg: 74,
      actualWeightKg: 74,
      varianceKg: 0,
      variancePercent: 0,
      tolerancePercent: 3,
      recalibrationNeeded: true,
      planProjection: [],
      landingPoint: {
        weightKg: 68.3, // More than 3kg from goal (40kg)
        date: '2024-03-25',
        varianceFromGoalKg: 28.3,
        onTrackForGoal: false,
      },
    };

    render(<PlanHealthPanel plan={mockPlan} analysis={analysis} />);

    expect(screen.getByText('OFF TRACK')).toBeInTheDocument();
    expect(screen.getByText(/Current velocity puts you at 68.3kg/)).toBeInTheDocument();
    expect(screen.getByText(/Increase deficit by.*kcal to correct/)).toBeInTheDocument();
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
      recalibrationNeeded: true,
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

  it('handles weight gain plans correctly', () => {
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
      recalibrationNeeded: true,
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
});
