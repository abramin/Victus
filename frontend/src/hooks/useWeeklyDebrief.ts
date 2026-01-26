import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getWeeklyDebrief, getCurrentWeekDebrief } from '../api/client';
import type { WeeklyDebrief } from '../api/types';

interface UseWeeklyDebriefReturn {
  data: WeeklyDebrief | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch the weekly debrief (Mission Report).
 * @param current - If true, fetches the in-progress current week instead of most recent complete week.
 */
export function useWeeklyDebrief(current: boolean = false): UseWeeklyDebriefReturn {
  const [data, setData] = useState<WeeklyDebrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = current
        ? await getCurrentWeekDebrief(signal)
        : await getWeeklyDebrief(signal);
      if (signal?.aborted) return;
      setData(response);
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load weekly debrief');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [current]);

  useEffect(() => {
    // Abort any in-flight request when current changes
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  // Public refresh without signal for manual calls
  const manualRefresh = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    await refresh(controller.signal);
  }, [refresh]);

  return { data, loading, error, refresh: manualRefresh };
}
