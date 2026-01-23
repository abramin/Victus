import { useCallback, useEffect, useState, useRef } from 'react';
import { ApiError, getWeightTrend } from '../api/client';
import type { WeightTrendRange, WeightTrendResponse } from '../api/types';

interface UseWeightTrendReturn {
  data: WeightTrendResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWeightTrend(range: WeightTrendRange): UseWeightTrendReturn {
  const [data, setData] = useState<WeightTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await getWeightTrend(range);
      if (controller.signal.aborted) return;
      setData(response);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load weight trend');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [range]);

  useEffect(() => {
    refresh();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
