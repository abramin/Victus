import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePlanAnalysis } from './usePlanAnalysis';
import type { DualTrackAnalysis } from '../api/types';

// Invariant: This hook fetches dual-track variance analysis for nutrition plans.
// It must correctly classify certain API errors (not_found, insufficient_data,
// plan_not_started) as "no data" states rather than errors.

vi.mock('../api/client', () => ({
  getActivePlanAnalysis: vi.fn(),
  getPlanAnalysis: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code);
      this.name = 'ApiError';
    }
  },
}));

import { getActivePlanAnalysis, getPlanAnalysis, ApiError } from '../api/client';

const mockAnalysis: DualTrackAnalysis = {
  planId: 1,
  analysisDate: '2026-01-27',
  daysElapsed: 14,
  weightTrack: {
    startWeight: 80,
    currentWeight: 79,
    targetWeight: 75,
    expectedWeight: 79.5,
    variance: -0.5,
    variancePercent: -0.63,
    onTrack: true,
  },
  calorieTrack: {
    targetDeficit: 500,
    actualDeficit: 450,
    variance: 50,
    variancePercent: 10,
    avgDailyCalories: 2000,
    onTrack: true,
  },
  combinedStatus: 'on_track',
  recalibrationOptions: [],
};

describe('usePlanAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading states', () => {
    it('should start in loading state', () => {
      // Invariant: UI must show loading indicator during fetch to prevent
      // premature rendering of "no data" states.
      vi.mocked(getActivePlanAnalysis).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePlanAnalysis());

      expect(result.current.loading).toBe(true);
      expect(result.current.analysis).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should exit loading state after successful fetch', async () => {
      // Invariant: loading must transition to false regardless of success/failure.
      vi.mocked(getActivePlanAnalysis).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analysis).toEqual(mockAnalysis);
    });
  });

  describe('API routing', () => {
    it('should call getActivePlanAnalysis when no planId provided', async () => {
      // Invariant: Omitting planId means "fetch active plan analysis".
      vi.mocked(getActivePlanAnalysis).mockResolvedValue(mockAnalysis);

      renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(getActivePlanAnalysis).toHaveBeenCalled();
      });

      expect(getPlanAnalysis).not.toHaveBeenCalled();
    });

    it('should call getPlanAnalysis when planId provided', async () => {
      // Invariant: Providing planId fetches analysis for that specific plan.
      vi.mocked(getPlanAnalysis).mockResolvedValue(mockAnalysis);

      renderHook(() => usePlanAnalysis(123));

      await waitFor(() => {
        expect(getPlanAnalysis).toHaveBeenCalledWith(123, undefined, expect.any(AbortSignal));
      });

      expect(getActivePlanAnalysis).not.toHaveBeenCalled();
    });

    it('should refetch when planId changes', async () => {
      // Invariant: Hook must react to planId prop changes.
      vi.mocked(getPlanAnalysis).mockResolvedValue(mockAnalysis);

      const { rerender } = renderHook(({ planId }) => usePlanAnalysis(planId), {
        initialProps: { planId: 1 },
      });

      await waitFor(() => {
        expect(getPlanAnalysis).toHaveBeenCalledWith(1, undefined, expect.any(AbortSignal));
      });

      rerender({ planId: 2 });

      await waitFor(() => {
        expect(getPlanAnalysis).toHaveBeenCalledWith(2, undefined, expect.any(AbortSignal));
      });
    });
  });

  describe('error classification', () => {
    it('should treat not_found as null analysis (not error)', async () => {
      // Invariant: 404 "not_found" means no plan exists - not an error condition.
      // UI should show "no plan" state, not error banner.
      const error = new ApiError(404, 'not_found', 'Plan not found');
      vi.mocked(getActivePlanAnalysis).mockRejectedValue(error);

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analysis).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should treat insufficient_data as null analysis (not error)', async () => {
      // Invariant: "insufficient_data" means plan exists but not enough data
      // for analysis. UI should show "need more data" state, not error.
      const error = new ApiError(400, 'insufficient_data', 'Not enough data');
      vi.mocked(getActivePlanAnalysis).mockRejectedValue(error);

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analysis).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should treat plan_not_started as null analysis (not error)', async () => {
      // Invariant: "plan_not_started" means plan exists but hasn't begun yet.
      // UI should show appropriate "plan starts on X" state.
      const error = new ApiError(400, 'plan_not_started', 'Plan has not started');
      vi.mocked(getActivePlanAnalysis).mockRejectedValue(error);

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.analysis).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should surface other API errors', async () => {
      // Invariant: Actual errors (500, validation, etc.) must surface to UI.
      const error = new ApiError(500, 'internal_error', 'Server error');
      vi.mocked(getActivePlanAnalysis).mockRejectedValue(error);

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.analysis).toBe(null);
    });

    it('should handle non-API errors gracefully', async () => {
      // Invariant: Network failures should show generic error message.
      vi.mocked(getActivePlanAnalysis).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load analysis');
    });
  });

  describe('refresh functionality', () => {
    it('should refresh with optional date parameter', async () => {
      // Invariant: refresh(date) allows fetching analysis as of a specific date.
      vi.mocked(getActivePlanAnalysis).mockResolvedValue(mockAnalysis);

      const { result } = renderHook(() => usePlanAnalysis());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.refresh('2026-01-20');
      });

      expect(getActivePlanAnalysis).toHaveBeenCalledWith('2026-01-20', expect.any(AbortSignal));
    });

    it('should abort in-flight request on refresh', async () => {
      // Invariant: Rapid refresh calls should not cause race conditions.
      vi.mocked(getActivePlanAnalysis).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockAnalysis), 100))
      );

      const { result } = renderHook(() => usePlanAnalysis());

      // Start first refresh
      act(() => {
        result.current.refresh();
      });

      // Immediately start second refresh (should abort first)
      await act(async () => {
        await result.current.refresh();
      });

      // Should complete without error
      expect(result.current.analysis).toEqual(mockAnalysis);
    });
  });

  describe('cleanup', () => {
    it('should abort request on unmount', async () => {
      // Invariant: Unmounting should cancel pending requests to prevent
      // state updates on unmounted components.
      let aborted = false;
      vi.mocked(getActivePlanAnalysis).mockImplementation(
        (date, signal) =>
          new Promise((resolve, reject) => {
            signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          })
      );

      const { unmount } = renderHook(() => usePlanAnalysis());

      unmount();

      // Give time for abort to propagate
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(aborted).toBe(true);
    });
  });
});
