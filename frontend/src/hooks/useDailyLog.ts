import { useState, useEffect, useCallback } from 'react';
import { getTodayLog, createDailyLog, updateActualTraining, deleteTodayLog, ApiError } from '../api/client';
import type { DailyLog, CreateDailyLogRequest, ActualTrainingSession } from '../api/types';

interface UseDailyLogReturn {
  log: DailyLog | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  hasLogToday: boolean;
  create: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  replace: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  updateActual: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
  refresh: () => Promise<void>;
}

export function useDailyLog(): UseDailyLogReturn {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodayLog();
      if (signal?.aborted) return;
      setLog(data);
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load daily log');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const create = useCallback(async (newLog: CreateDailyLogRequest): Promise<DailyLog | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await createDailyLog(newLog);
      setLog(saved);
      return saved;
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to create daily log');
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const replace = useCallback(
    async (newLog: CreateDailyLogRequest): Promise<DailyLog | null> => {
      if (!log?.date) {
        return create(newLog);
      }
      setSaving(true);
      setSaveError(null);
      const actualSessions = log.actualTrainingSessions?.map(({ sessionOrder, ...rest }) => rest) ?? [];
      try {
        await deleteTodayLog();
        const saved = await createDailyLog({ ...newLog, date: log.date });
        setLog(saved);
        if (actualSessions.length > 0) {
          try {
            const restored = await updateActualTraining(saved.date, { actualSessions });
            setLog(restored);
            return restored;
          } catch (err) {
            if (err instanceof ApiError) {
              setSaveError(err.message);
            } else {
              setSaveError('Updated log, but failed to restore actual training');
            }
            return saved;
          }
        }
        return saved;
      } catch (err) {
        if (err instanceof ApiError) {
          setSaveError(err.message);
        } else {
          setSaveError('Failed to update daily log');
        }
        return null;
      } finally {
        setSaving(false);
      }
    },
    [create, log]
  );

  const updateActual = useCallback(
    async (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]): Promise<DailyLog | null> => {
      if (!log?.date) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const saved = await updateActualTraining(log.date, { actualSessions: sessions });
        setLog(saved);
        return saved;
      } catch (err) {
        if (err instanceof ApiError) {
          setSaveError(err.message);
        } else {
          setSaveError('Failed to update actual training');
        }
        return null;
      } finally {
        setSaving(false);
      }
    },
    [log?.date]
  );

  return {
    log,
    loading,
    saving,
    error,
    saveError,
    hasLogToday: log !== null,
    create,
    replace,
    updateActual,
    refresh,
  };
}
