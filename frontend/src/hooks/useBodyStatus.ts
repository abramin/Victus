import { useState, useEffect, useCallback } from 'react';
import { getBodyStatus, getArchetypes, applySessionLoad, ApiError } from '../api/client';
import type { BodyStatus, ArchetypeConfig, SessionFatigueReport, Archetype } from '../api/types';

interface UseBodyStatusReturn {
  bodyStatus: BodyStatus | null;
  archetypes: ArchetypeConfig[];
  loading: boolean;
  error: string | null;
  applyLoad: (
    sessionId: number,
    archetype: Archetype,
    durationMin: number,
    rpe?: number
  ) => Promise<SessionFatigueReport | null>;
  refresh: () => Promise<void>;
}

export function useBodyStatus(): UseBodyStatusReturn {
  const [bodyStatus, setBodyStatus] = useState<BodyStatus | null>(null);
  const [archetypes, setArchetypes] = useState<ArchetypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const [status, archetypeList] = await Promise.all([
        getBodyStatus(signal),
        getArchetypes(signal),
      ]);

      setBodyStatus(status);
      setArchetypes(archetypeList);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load body status');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const applyLoad = useCallback(
    async (
      sessionId: number,
      archetype: Archetype,
      durationMin: number,
      rpe?: number
    ): Promise<SessionFatigueReport | null> => {
      try {
        const report = await applySessionLoad(sessionId, {
          archetype,
          durationMin,
          rpe,
        });

        // Refresh body status after applying load
        await refresh();

        return report;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to apply session load');
        }
        return null;
      }
    },
    [refresh]
  );

  return {
    bodyStatus,
    archetypes,
    loading,
    error,
    applyLoad,
    refresh,
  };
}
