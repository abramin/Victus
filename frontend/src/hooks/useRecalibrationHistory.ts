import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlanRecalibrations, ApiError } from '../api/client';
import type { RecalibrationRecord } from '../api/types';

interface UseRecalibrationHistoryReturn {
  records: RecalibrationRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecalibrationHistory(planId: number | undefined): UseRecalibrationHistoryReturn {
  const [records, setRecords] = useState<RecalibrationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!planId) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await getPlanRecalibrations(planId, controller.signal);
      if (controller.signal.aborted) return;
      setRecords(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        if (err.code === 'not_found') {
          setRecords([]);
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load recalibration history');
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

  return { records, loading, error, refresh };
}
