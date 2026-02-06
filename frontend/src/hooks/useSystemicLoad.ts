import { useState, useEffect, useCallback } from 'react';
import { getSystemicLoad, ApiError } from '../api/client';
import type { SystemicLoad, SystemicPrescription, SystemicLoadResponse } from '../api/types';

interface UseSystemicLoadReturn {
  load: SystemicLoad | null;
  prescription: SystemicPrescription | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSystemicLoad(withPrescription = false): UseSystemicLoadReturn {
  const [load, setLoad] = useState<SystemicLoad | null>(null);
  const [prescription, setPrescription] = useState<SystemicPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getSystemicLoad(withPrescription, signal);

      if (withPrescription) {
        const resp = result as SystemicLoadResponse;
        setLoad(resp.load);
        setPrescription(resp.prescription ?? null);
      } else {
        setLoad(result as SystemicLoad);
        setPrescription(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        // No daily log today — not an error, just no data
        setLoad(null);
        setPrescription(null);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load systemic status');
      }
    } finally {
      setLoading(false);
    }
  }, [withPrescription]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { load, prescription, loading, error, refresh };
}
