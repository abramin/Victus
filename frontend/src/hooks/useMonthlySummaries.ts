import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, getMonthlySummaries } from '../api/client';
import type { MonthlySummary, WeightTrendRange } from '../api/types';

interface UseMonthlySummariesReturn {
  data: MonthlySummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function toYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getRangeWindow(range: WeightTrendRange, now: Date): { from?: string; to?: string } {
  if (range === 'all') {
    return {};
  }

  const start = new Date(now);
  if (range === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (range === '30d') {
    start.setDate(start.getDate() - 29);
  } else {
    start.setDate(start.getDate() - 89);
  }

  return {
    from: toYearMonth(start),
    to: toYearMonth(now),
  };
}

export function useMonthlySummaries(range: WeightTrendRange): UseMonthlySummariesReturn {
  const [data, setData] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getRangeWindow(range, new Date());
      const response = await getMonthlySummaries(from, to, signal);
      if (signal?.aborted) return;
      setData(response);
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load monthly activity summaries');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [range]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const manualRefresh = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    await refresh(controller.signal);
  }, [refresh]);

  return { data, loading, error, refresh: manualRefresh };
}
