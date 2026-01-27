import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePlan } from './usePlan';
import type { NutritionPlan, CreatePlanRequest } from '../api/types';

// Invariant: This hook manages the full nutrition plan lifecycle:
// create, complete, abandon, pause, resume, recalibrate.
// All mutations auto-refresh state after success.

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
  createPlan,
  completePlan,
  abandonPlan,
  pausePlan,
  resumePlan,
  recalibratePlan,
  ApiError,
} from '../api/client';

const mockPlan: NutritionPlan = {
  id: 1,
  startDate: '2026-01-01',
  endDate: '2026-03-26',
  startWeight: 85,
  targetWeight: 80,
  targetWeeklyChangeKg: -0.5,
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-27T00:00:00Z',
  weeklyTargets: [
    {
      weekNumber: 1,
      startDate: '2026-01-01',
      endDate: '2026-01-07',
      expectedWeightKg: 84.5,
      targetDeficitKcal: 500,
    },
  ],
};

const mockCreateRequest: CreatePlanRequest = {
  startWeight: 85,
  targetWeight: 80,
  targetWeeklyChangeKg: -0.5,
};

describe('usePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial loading', () => {
    it('should start in loading state', () => {
      // Invariant: UI must show loading indicator during fetch.
      vi.mocked(getActivePlan).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePlan());

      expect(result.current.loading).toBe(true);
      expect(result.current.plan).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should load active plan successfully', async () => {
      // Invariant: Active plan must be available for dashboard display.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.plan).toEqual(mockPlan);
      expect(result.current.error).toBe(null);
    });

    it('should handle no active plan (null)', async () => {
      // Invariant: null plan means no active plan exists - not an error.
      // UI should show "create plan" prompt.
      vi.mocked(getActivePlan).mockResolvedValue(null);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.plan).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('error handling', () => {
    it('should handle API error on load', async () => {
      // Invariant: Load errors must surface to UI.
      const error = new ApiError(500, 'internal_error', 'Server error');
      vi.mocked(getActivePlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
    });

    it('should handle non-API error gracefully', async () => {
      // Invariant: Network failures should show generic error.
      vi.mocked(getActivePlan).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load plan');
    });
  });

  describe('create operation', () => {
    it('should create plan successfully', async () => {
      // Invariant: create() returns new plan and updates local state.
      vi.mocked(getActivePlan).mockResolvedValue(null);
      vi.mocked(createPlan).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let newPlan: NutritionPlan | null = null;
      await act(async () => {
        newPlan = await result.current.create(mockCreateRequest);
      });

      expect(newPlan).toEqual(mockPlan);
      expect(result.current.plan).toEqual(mockPlan);
      expect(result.current.createError).toBe(null);
    });

    it('should set creating state during create', async () => {
      // Invariant: creating flag prevents double-submission.
      vi.mocked(getActivePlan).mockResolvedValue(null);

      let resolveCreate: (plan: NutritionPlan) => void;
      vi.mocked(createPlan).mockImplementation(
        () => new Promise((resolve) => { resolveCreate = resolve; })
      );

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createPromise: Promise<NutritionPlan | null>;
      act(() => {
        createPromise = result.current.create(mockCreateRequest);
      });

      expect(result.current.creating).toBe(true);

      await act(async () => {
        resolveCreate!(mockPlan);
        await createPromise;
      });

      expect(result.current.creating).toBe(false);
    });

    it('should handle create error', async () => {
      // Invariant: Create errors go to createError (separate from load error).
      vi.mocked(getActivePlan).mockResolvedValue(null);
      const error = new ApiError(400, 'validation_error', 'Invalid plan');
      vi.mocked(createPlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let newPlan: NutritionPlan | null = mockPlan; // Should become null
      await act(async () => {
        newPlan = await result.current.create(mockCreateRequest);
      });

      expect(newPlan).toBe(null);
      expect(result.current.createError).toBe('Invalid plan');
    });
  });

  describe('complete operation', () => {
    it('should complete plan and refresh', async () => {
      // Invariant: complete() marks plan as completed and refreshes state.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      vi.mocked(completePlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // After complete, getActivePlan returns null (no active plan)
      vi.mocked(getActivePlan).mockResolvedValue(null);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.complete();
      });

      expect(success).toBe(true);
      expect(completePlan).toHaveBeenCalledWith(mockPlan.id);
      expect(getActivePlan).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    it('should return false when no plan exists', async () => {
      // Invariant: Cannot complete non-existent plan.
      vi.mocked(getActivePlan).mockResolvedValue(null);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.complete();
      });

      expect(success).toBe(false);
      expect(completePlan).not.toHaveBeenCalled();
    });

    it('should handle complete error', async () => {
      // Invariant: Complete errors must surface to UI.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      const error = new ApiError(400, 'already_completed', 'Plan already completed');
      vi.mocked(completePlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.complete();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Plan already completed');
    });
  });

  describe('abandon operation', () => {
    it('should abandon plan and refresh', async () => {
      // Invariant: abandon() marks plan as abandoned and refreshes.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      vi.mocked(abandonPlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.mocked(getActivePlan).mockResolvedValue(null);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.abandon();
      });

      expect(success).toBe(true);
      expect(abandonPlan).toHaveBeenCalledWith(mockPlan.id);
    });

    it('should handle abandon error', async () => {
      // Invariant: Abandon errors must surface to UI.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      const error = new ApiError(500, 'internal_error', 'Abandon failed');
      vi.mocked(abandonPlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.abandon();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Abandon failed');
    });
  });

  describe('pause operation', () => {
    it('should pause plan and refresh', async () => {
      // Invariant: pause() marks plan as paused and refreshes.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      vi.mocked(pausePlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const pausedPlan = { ...mockPlan, status: 'paused' as const };
      vi.mocked(getActivePlan).mockResolvedValue(pausedPlan);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.pause();
      });

      expect(success).toBe(true);
      expect(pausePlan).toHaveBeenCalledWith(mockPlan.id);
      expect(result.current.plan?.status).toBe('paused');
    });

    it('should handle pause error', async () => {
      // Invariant: Pause errors must surface to UI.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      const error = new ApiError(400, 'already_paused', 'Plan already paused');
      vi.mocked(pausePlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.pause();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Plan already paused');
    });
  });

  describe('resume operation', () => {
    it('should resume plan and refresh', async () => {
      // Invariant: resume() unpauses plan and refreshes.
      const pausedPlan = { ...mockPlan, status: 'paused' as const };
      vi.mocked(getActivePlan).mockResolvedValue(pausedPlan);
      vi.mocked(resumePlan).mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.resume();
      });

      expect(success).toBe(true);
      expect(resumePlan).toHaveBeenCalledWith(pausedPlan.id);
      expect(result.current.plan?.status).toBe('active');
    });

    it('should handle resume error', async () => {
      // Invariant: Resume errors must surface to UI.
      const pausedPlan = { ...mockPlan, status: 'paused' as const };
      vi.mocked(getActivePlan).mockResolvedValue(pausedPlan);
      const error = new ApiError(400, 'not_paused', 'Plan is not paused');
      vi.mocked(resumePlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.resume();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Plan is not paused');
    });
  });

  describe('recalibrate operation', () => {
    it('should recalibrate plan and refresh', async () => {
      // Invariant: recalibrate() applies strategy and refreshes.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      vi.mocked(recalibratePlan).mockResolvedValue({
        ...mockPlan,
        targetWeeklyChangeKg: -0.6,
      });

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.recalibrate('increase_deficit');
      });

      expect(success).toBe(true);
      expect(recalibratePlan).toHaveBeenCalledWith(mockPlan.id, 'increase_deficit');
    });

    it('should support all recalibration options', async () => {
      // Invariant: All option types must be passable to API.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      vi.mocked(recalibratePlan).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const options = ['increase_deficit', 'extend_timeline', 'revise_goal', 'keep_current'] as const;

      for (const option of options) {
        vi.clearAllMocks();
        vi.mocked(recalibratePlan).mockResolvedValue(mockPlan);
        vi.mocked(getActivePlan).mockResolvedValue(mockPlan);

        await act(async () => {
          await result.current.recalibrate(option);
        });

        expect(recalibratePlan).toHaveBeenCalledWith(mockPlan.id, option);
      }
    });

    it('should handle recalibrate error', async () => {
      // Invariant: Recalibrate errors must surface to UI.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);
      const error = new ApiError(400, 'invalid_option', 'Invalid recalibration');
      vi.mocked(recalibratePlan).mockRejectedValue(error);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.recalibrate('increase_deficit');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Invalid recalibration');
    });
  });

  describe('refresh functionality', () => {
    it('should refresh plan on demand', async () => {
      // Invariant: Manual refresh re-fetches active plan.
      vi.mocked(getActivePlan).mockResolvedValue(mockPlan);

      const { result } = renderHook(() => usePlan());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.clearAllMocks();
      const updatedPlan = { ...mockPlan, updatedAt: '2026-01-28T00:00:00Z' };
      vi.mocked(getActivePlan).mockResolvedValue(updatedPlan);

      await act(async () => {
        await result.current.refresh();
      });

      expect(getActivePlan).toHaveBeenCalled();
      expect(result.current.plan?.updatedAt).toBe('2026-01-28T00:00:00Z');
    });
  });

  describe('cleanup', () => {
    it('should abort request on unmount', async () => {
      // Invariant: Unmounting should cancel pending requests.
      let aborted = false;
      vi.mocked(getActivePlan).mockImplementation(
        (signal) =>
          new Promise((resolve, reject) => {
            signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          })
      );

      const { unmount } = renderHook(() => usePlan());

      unmount();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(aborted).toBe(true);
    });
  });
});
