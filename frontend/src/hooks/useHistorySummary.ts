import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getHistorySummary } from '../api/client';
import type { HistoryResponse, WeightTrendRange } from '../api/types';

interface UseHistorySummaryReturn {
  data: HistoryResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHistorySummary(range: WeightTrendRange): UseHistorySummaryReturn {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const maxAttempts = 3;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await getHistorySummary(range, signal);
          if (signal?.aborted) return;
          setData(response);
          return;
        } catch (err) {
          if (signal?.aborted) return;

          const retryable = !(err instanceof ApiError) || err.status >= 500;
          const hasMoreAttempts = attempt < maxAttempts;

          if (retryable && hasMoreAttempts) {
            await new Promise<void>((resolve) => setTimeout(resolve, attempt * 250));
            continue;
          }

          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load history');
          }
          return;
        }
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [range]);

  useEffect(() => {
    // Abort any in-flight request when range changes
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
