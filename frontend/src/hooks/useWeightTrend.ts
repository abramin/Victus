import { useCallback, useEffect, useState } from 'react';
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getWeightTrend(range);
      setData(response);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load weight trend');
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
