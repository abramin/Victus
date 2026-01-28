import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { PlanProvider, usePlanContext } from './PlanContext';
import type { NutritionPlan } from '../api/types';

// Mock the client module
vi.mock('../api/client', () => ({
  getActivePlan: vi.fn(),
  createPlan: vi.fn(),
  completePlan: vi.fn(),
  abandonPlan: vi.fn(),
  pausePlan: vi.fn(),
  resumePlan: vi.fn(),
  recalibratePlan: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code);
      this.name = 'ApiError';
    }
  },
}));

import {
  getActivePlan,
  recalibratePlan,
} from '../api/client';

const mockGetActivePlan = vi.mocked(getActivePlan);
const mockRecalibratePlan = vi.mocked(recalibratePlan);

// Minimal consumer to capture context value
let contextValue: ReturnType<typeof usePlanContext>;
function Consumer() {
  contextValue = usePlanContext();
  return null;
}

const initialPlan: NutritionPlan = {
  id: 42,
  startDate: '2024-01-01',
  startWeightKg: 90,
  goalWeightKg: 85,
  durationWeeks: 10,
  requiredWeeklyChangeKg: -0.5,
  requiredDailyDeficitKcal: -550,
  status: 'active',
  currentWeek: 3,
  weeklyTargets: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const recalibratedPlan: NutritionPlan = {
  ...initialPlan,
  requiredDailyDeficitKcal: -750,
  requiredWeeklyChangeKg: -0.7,
  updatedAt: '2024-03-01T12:00:00Z',
};

describe('PlanContext.recalibrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivePlan.mockResolvedValue(initialPlan);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates plan state from API response without a second fetch', async () => {
    mockRecalibratePlan.mockResolvedValue(recalibratedPlan);

    render(
      <PlanProvider>
        <Consumer />
      </PlanProvider>
    );

    // Wait for initial plan load
    await waitFor(() => {
      expect(contextValue.plan).not.toBeNull();
    });

    expect(contextValue.plan?.requiredDailyDeficitKcal).toBe(-550);

    // Reset the mock to track calls after initial load
    mockGetActivePlan.mockClear();

    // Call recalibrate
    let success: boolean | undefined;
    await act(async () => {
      success = await contextValue.recalibrate('increase_deficit');
    });

    expect(success).toBe(true);
    expect(mockRecalibratePlan).toHaveBeenCalledWith(42, 'increase_deficit');

    // Plan should be updated from the API response directly
    expect(contextValue.plan?.requiredDailyDeficitKcal).toBe(-750);
    expect(contextValue.plan?.requiredWeeklyChangeKg).toBe(-0.7);
    expect(contextValue.plan?.updatedAt).toBe('2024-03-01T12:00:00Z');

    // Must NOT have called getActivePlan again — state came from the recalibrate response
    expect(mockGetActivePlan).not.toHaveBeenCalled();
  });

  it('returns false and preserves plan when API call fails', async () => {
    const { ApiError } = await import('../api/client');
    mockRecalibratePlan.mockRejectedValue(new ApiError(500, 'internal_error', 'Server error'));

    render(
      <PlanProvider>
        <Consumer />
      </PlanProvider>
    );

    await waitFor(() => {
      expect(contextValue.plan).not.toBeNull();
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await contextValue.recalibrate('increase_deficit');
    });

    expect(success).toBe(false);
    // Plan should remain unchanged
    expect(contextValue.plan?.requiredDailyDeficitKcal).toBe(-550);
  });

  it('returns false immediately when plan is null', async () => {
    mockGetActivePlan.mockResolvedValue(null);

    render(
      <PlanProvider>
        <Consumer />
      </PlanProvider>
    );

    await waitFor(() => {
      expect(contextValue.loading).toBe(false);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await contextValue.recalibrate('extend_timeline');
    });

    expect(success).toBe(false);
    expect(mockRecalibratePlan).not.toHaveBeenCalled();
  });
});
