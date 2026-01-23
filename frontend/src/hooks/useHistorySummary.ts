import { useCallback, useEffect, useState } from 'react';
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getHistorySummary(range);
      setData(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load history');
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
