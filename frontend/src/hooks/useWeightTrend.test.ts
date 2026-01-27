import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWeightTrend } from './useWeightTrend';
import type { WeightTrendResponse, WeightTrendRange } from '../api/types';

// Invariant: This hook fetches weight trend data for chart visualization.
// It must refetch when the range parameter changes and properly handle
// request cancellation to prevent race conditions.

vi.mock('../api/client', () => ({
  getWeightTrend: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code);
      this.name = 'ApiError';
    }
  },
}));

import { getWeightTrend, ApiError } from '../api/client';

const mockTrendData: WeightTrendResponse = {
  points: [
    { date: '2026-01-20', weightKg: 81.0 },
    { date: '2026-01-21', weightKg: 80.5 },
    { date: '2026-01-22', weightKg: 80.8 },
    { date: '2026-01-23', weightKg: 80.2 },
    { date: '2026-01-24', weightKg: 80.0 },
    { date: '2026-01-25', weightKg: 79.8 },
    { date: '2026-01-26', weightKg: 79.5 },
    { date: '2026-01-27', weightKg: 79.2 },
  ],
  trend: {
    direction: 'losing',
    weeklyChangeKg: -0.8,
    totalChangeKg: -1.8,
    rSquared: 0.92,
    startWeight: 81.0,
    endWeight: 79.2,
    projectedWeight: 78.5,
  },
  range: '7d',
};

describe('useWeightTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial loading', () => {
    it('should start in loading state', () => {
      // Invariant: UI must show loading indicator during fetch to prevent
      // chart from rendering with no data.
      vi.mocked(getWeightTrend).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useWeightTrend('7d'));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should load data successfully', async () => {
      // Invariant: After fetch, data must include points and trend for chart.
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData);

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTrendData);
      expect(result.current.error).toBe(null);
    });
  });

  describe('range parameter handling', () => {
    it('should pass range to API call', async () => {
      // Invariant: Range parameter determines data window (7d, 30d, 90d, all).
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData);

      renderHook(() => useWeightTrend('30d'));

      await waitFor(() => {
        expect(getWeightTrend).toHaveBeenCalledWith('30d');
      });
    });

    it('should refetch when range changes', async () => {
      // Invariant: Changing range must trigger new API call for fresh data.
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData);

      const { rerender } = renderHook(
        ({ range }: { range: WeightTrendRange }) => useWeightTrend(range),
        { initialProps: { range: '7d' as WeightTrendRange } }
      );

      await waitFor(() => {
        expect(getWeightTrend).toHaveBeenCalledWith('7d');
      });

      vi.clearAllMocks();

      rerender({ range: '30d' });

      await waitFor(() => {
        expect(getWeightTrend).toHaveBeenCalledWith('30d');
      });
    });

    it('should support all valid range values', async () => {
      // Invariant: All range values (7d, 30d, 90d, all) must be supported.
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData);

      const ranges: WeightTrendRange[] = ['7d', '30d', '90d', 'all'];

      for (const range of ranges) {
        vi.clearAllMocks();
        const { unmount } = renderHook(() => useWeightTrend(range));

        await waitFor(() => {
          expect(getWeightTrend).toHaveBeenCalledWith(range);
        });

        unmount();
      }
    });
  });

  describe('error handling', () => {
    it('should handle API error', async () => {
      // Invariant: API errors must surface to UI for user feedback.
      const error = new ApiError(500, 'internal_error', 'Server error');
      vi.mocked(getWeightTrend).mockRejectedValue(error);

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.data).toBe(null);
    });

    it('should handle non-API error gracefully', async () => {
      // Invariant: Network failures should show generic error message.
      vi.mocked(getWeightTrend).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load weight trend');
    });

    it('should clear error on successful retry', async () => {
      // Invariant: Successful refresh should clear previous error state.
      const error = new ApiError(500, 'internal_error', 'Server error');
      vi.mocked(getWeightTrend).mockRejectedValue(error);

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.error).toBe('Server error');
      });

      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual(mockTrendData);
    });
  });

  describe('refresh functionality', () => {
    it('should refresh data on demand', async () => {
      // Invariant: Manual refresh re-fetches data for current range.
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData);

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.clearAllMocks();
      const updatedData = {
        ...mockTrendData,
        points: [...mockTrendData.points, { date: '2026-01-28', weightKg: 79.0 }],
      };
      vi.mocked(getWeightTrend).mockResolvedValue(updatedData);

      await act(async () => {
        await result.current.refresh();
      });

      expect(getWeightTrend).toHaveBeenCalledWith('7d');
      expect(result.current.data?.points.length).toBe(9);
    });

    it('should abort previous request on refresh', async () => {
      // Invariant: Rapid refresh calls should not cause race conditions.
      vi.mocked(getWeightTrend).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTrendData), 100))
      );

      const { result } = renderHook(() => useWeightTrend('7d'));

      // Start first refresh
      act(() => {
        result.current.refresh();
      });

      // Immediately start second refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Should complete without error
      expect(result.current.data).toEqual(mockTrendData);
    });
  });

  describe('cleanup', () => {
    it('should abort request on unmount', async () => {
      // Invariant: Unmounting should cancel pending requests to prevent
      // state updates on unmounted components.
      let requestStarted = false;
      vi.mocked(getWeightTrend).mockImplementation(
        () =>
          new Promise((resolve) => {
            requestStarted = true;
            // Never resolves - simulates long request
          })
      );

      const { unmount, result } = renderHook(() => useWeightTrend('7d'));

      // Wait for request to start
      await waitFor(() => {
        expect(requestStarted).toBe(true);
      });

      unmount();

      // Should not cause errors (no state update after unmount)
      expect(result.current.loading).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty data points', async () => {
      // Invariant: Empty data (new user) should not cause errors.
      const emptyData: WeightTrendResponse = {
        points: [],
        trend: null,
        range: '7d',
      };
      vi.mocked(getWeightTrend).mockResolvedValue(emptyData);

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.points).toEqual([]);
      expect(result.current.data?.trend).toBe(null);
    });

    it('should handle single data point', async () => {
      // Invariant: Single point (no trend possible) should work without error.
      const singlePoint: WeightTrendResponse = {
        points: [{ date: '2026-01-27', weightKg: 80 }],
        trend: null,
        range: '7d',
      };
      vi.mocked(getWeightTrend).mockResolvedValue(singlePoint);

      const { result } = renderHook(() => useWeightTrend('7d'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.points.length).toBe(1);
    });
  });
});
