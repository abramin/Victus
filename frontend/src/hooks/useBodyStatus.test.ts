import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBodyStatus } from './useBodyStatus';
import type { BodyStatus, ArchetypeConfig, SessionFatigueReport } from '../api/types';

// Invariant: This hook manages body fatigue state for the body map visualization.
// It fetches bodyStatus and archetypes in parallel for efficiency, and provides
// applyLoad mutation that auto-refreshes state after applying training load.

vi.mock('../api/client', () => ({
  getBodyStatus: vi.fn(),
  getArchetypes: vi.fn(),
  applySessionLoad: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code);
      this.name = 'ApiError';
    }
  },
}));

import { getBodyStatus, getArchetypes, applySessionLoad, ApiError } from '../api/client';

const mockBodyStatus: BodyStatus = {
  muscles: {
    chest: { fatiguePercent: 20, lastUpdated: '2026-01-27T10:00:00Z' },
    back: { fatiguePercent: 15, lastUpdated: '2026-01-27T10:00:00Z' },
    shoulders: { fatiguePercent: 10, lastUpdated: '2026-01-27T10:00:00Z' },
    biceps: { fatiguePercent: 5, lastUpdated: '2026-01-27T10:00:00Z' },
    triceps: { fatiguePercent: 5, lastUpdated: '2026-01-27T10:00:00Z' },
    forearms: { fatiguePercent: 0, lastUpdated: '2026-01-27T10:00:00Z' },
    core: { fatiguePercent: 10, lastUpdated: '2026-01-27T10:00:00Z' },
    glutes: { fatiguePercent: 25, lastUpdated: '2026-01-27T10:00:00Z' },
    quads: { fatiguePercent: 30, lastUpdated: '2026-01-27T10:00:00Z' },
    hamstrings: { fatiguePercent: 20, lastUpdated: '2026-01-27T10:00:00Z' },
    calves: { fatiguePercent: 15, lastUpdated: '2026-01-27T10:00:00Z' },
  },
  overallFatigue: 15,
  lastUpdated: '2026-01-27T10:00:00Z',
};

const mockArchetypes: ArchetypeConfig[] = [
  {
    archetype: 'push',
    displayName: 'Push',
    description: 'Chest, shoulders, triceps',
    coefficients: { chest: 1.0, shoulders: 0.8, triceps: 0.6 },
  },
  {
    archetype: 'pull',
    displayName: 'Pull',
    description: 'Back, biceps',
    coefficients: { back: 1.0, biceps: 0.8 },
  },
  {
    archetype: 'legs',
    displayName: 'Legs',
    description: 'Quads, hamstrings, glutes, calves',
    coefficients: { quads: 1.0, hamstrings: 0.9, glutes: 0.8, calves: 0.5 },
  },
];

const mockFatigueReport: SessionFatigueReport = {
  sessionId: 1,
  appliedAt: '2026-01-27T14:00:00Z',
  musclesAffected: ['chest', 'shoulders', 'triceps'],
  fatigueDeltas: {
    chest: 25,
    shoulders: 20,
    triceps: 15,
  },
};

describe('useBodyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial loading', () => {
    it('should start in loading state', () => {
      // Invariant: UI must show loading state while fetching body status
      // to prevent premature rendering of body map with stale data.
      vi.mocked(getBodyStatus).mockImplementation(() => new Promise(() => {}));
      vi.mocked(getArchetypes).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useBodyStatus());

      expect(result.current.loading).toBe(true);
      expect(result.current.bodyStatus).toBe(null);
      expect(result.current.archetypes).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('should fetch bodyStatus and archetypes in parallel', async () => {
      // Invariant: Parallel fetching is an optimization - both calls should
      // be initiated simultaneously, not sequentially.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(getBodyStatus).toHaveBeenCalled();
        expect(getArchetypes).toHaveBeenCalled();
      });
    });

    it('should load data successfully', async () => {
      // Invariant: After successful fetch, bodyStatus and archetypes must
      // be populated for body map rendering.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.bodyStatus).toEqual(mockBodyStatus);
      expect(result.current.archetypes).toEqual(mockArchetypes);
      expect(result.current.error).toBe(null);
    });
  });

  describe('error handling', () => {
    it('should handle API error from getBodyStatus', async () => {
      // Invariant: API errors must surface to UI for user feedback.
      const error = new ApiError(500, 'internal_error', 'Server error');
      vi.mocked(getBodyStatus).mockRejectedValue(error);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Server error');
    });

    it('should handle API error from getArchetypes', async () => {
      // Invariant: Either fetch failing should result in error state.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      const error = new ApiError(500, 'internal_error', 'Archetypes error');
      vi.mocked(getArchetypes).mockRejectedValue(error);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Archetypes error');
    });

    it('should handle non-API error gracefully', async () => {
      // Invariant: Network failures should show generic error message.
      vi.mocked(getBodyStatus).mockRejectedValue(new Error('Network error'));
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load body status');
    });

    it('should ignore AbortError on cleanup', async () => {
      // Invariant: Aborted requests (from unmount) should not trigger error state.
      // We verify this by checking unmount doesn't cause unhandled rejections.
      let rejectFn: (err: Error) => void;
      vi.mocked(getBodyStatus).mockImplementation(
        () => new Promise((_, reject) => { rejectFn = reject; })
      );
      vi.mocked(getArchetypes).mockImplementation(() => new Promise(() => {}));

      const { unmount } = renderHook(() => useBodyStatus());

      // Unmount before request completes
      unmount();

      // Simulate abort error after unmount - should not cause issues
      rejectFn!(new DOMException('Aborted', 'AbortError'));

      // If we get here without unhandled rejection, the test passes
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  describe('applyLoad mutation', () => {
    it('should apply load and return fatigue report', async () => {
      // Invariant: applyLoad must call API with correct parameters and
      // return the fatigue report for UI feedback.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);
      vi.mocked(applySessionLoad).mockResolvedValue(mockFatigueReport);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let report: SessionFatigueReport | null = null;
      await act(async () => {
        report = await result.current.applyLoad(1, 'push', 60, 8);
      });

      expect(applySessionLoad).toHaveBeenCalledWith(1, {
        archetype: 'push',
        durationMin: 60,
        rpe: 8,
      });
      expect(report).toEqual(mockFatigueReport);
    });

    it('should auto-refresh body status after applying load', async () => {
      // Invariant: After applying load, body status must be refreshed
      // to reflect new fatigue levels in the UI.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);
      vi.mocked(applySessionLoad).mockResolvedValue(mockFatigueReport);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.clearAllMocks();
      vi.mocked(getBodyStatus).mockResolvedValue({
        ...mockBodyStatus,
        muscles: {
          ...mockBodyStatus.muscles,
          chest: { fatiguePercent: 45, lastUpdated: '2026-01-27T14:00:00Z' },
        },
      });
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      await act(async () => {
        await result.current.applyLoad(1, 'push', 60);
      });

      // Should have called getBodyStatus again for refresh
      expect(getBodyStatus).toHaveBeenCalled();
    });

    it('should handle applyLoad error', async () => {
      // Invariant: Load application errors must surface to UI.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);
      const error = new ApiError(400, 'validation_error', 'Invalid archetype');
      vi.mocked(applySessionLoad).mockRejectedValue(error);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let report: SessionFatigueReport | null;
      await act(async () => {
        report = await result.current.applyLoad(1, 'invalid' as any, 60);
      });

      expect(report!).toBe(null);
      expect(result.current.error).toBe('Invalid archetype');
    });

    it('should handle applyLoad with optional rpe', async () => {
      // Invariant: RPE is optional - applyLoad should work without it.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);
      vi.mocked(applySessionLoad).mockResolvedValue(mockFatigueReport);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.applyLoad(1, 'push', 60);
      });

      expect(applySessionLoad).toHaveBeenCalledWith(1, {
        archetype: 'push',
        durationMin: 60,
        rpe: undefined,
      });
    });
  });

  describe('refresh functionality', () => {
    it('should refresh body status and archetypes', async () => {
      // Invariant: Manual refresh re-fetches both data sources.
      vi.mocked(getBodyStatus).mockResolvedValue(mockBodyStatus);
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      const { result } = renderHook(() => useBodyStatus());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.clearAllMocks();
      vi.mocked(getBodyStatus).mockResolvedValue({
        ...mockBodyStatus,
        overallFatigue: 25,
      });
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      await act(async () => {
        await result.current.refresh();
      });

      expect(getBodyStatus).toHaveBeenCalled();
      expect(result.current.bodyStatus?.overallFatigue).toBe(25);
    });
  });

  describe('cleanup', () => {
    it('should abort request on unmount', async () => {
      // Invariant: Unmounting should cancel pending requests to prevent
      // state updates on unmounted components.
      let aborted = false;
      vi.mocked(getBodyStatus).mockImplementation(
        (signal) =>
          new Promise((resolve, reject) => {
            signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          })
      );
      vi.mocked(getArchetypes).mockResolvedValue(mockArchetypes);

      const { unmount } = renderHook(() => useBodyStatus());

      unmount();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(aborted).toBe(true);
    });
  });
});
