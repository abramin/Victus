import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivePlanAnalysis, getPlanAnalysis, ApiError } from '../api/client';
import type { DualTrackAnalysis } from '../api/types';

interface UsePlanAnalysisReturn {
  analysis: DualTrackAnalysis | null;
  loading: boolean;
  error: string | null;
  refresh: (date?: string) => Promise<void>;
}

export function usePlanAnalysis(planId?: number): UsePlanAnalysisReturn {
  const [analysis, setAnalysis] = useState<DualTrackAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (date?: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = planId
        ? await getPlanAnalysis(planId, date, controller.signal)
        : await getActivePlanAnalysis(date, controller.signal);
      if (controller.signal.aborted) return;
      setAnalysis(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        // Don't set error for common non-error cases
        if (err.code === 'not_found' || err.code === 'insufficient_data' || err.code === 'plan_not_started') {
          setAnalysis(null);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load analysis');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [planId]);

  useEffect(() => {
    refresh();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [refresh]);

  return { analysis, loading, error, refresh };
}
