import { useState, useEffect, useCallback } from 'react';
import { getTodayLog, createDailyLog, ApiError } from '../api/client';
import type { DailyLog, CreateDailyLogRequest } from '../api/types';

interface UseDailyLogReturn {
  log: DailyLog | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  hasLogToday: boolean;
  create: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  refresh: () => Promise<void>;
}

export function useDailyLog(): UseDailyLogReturn {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTodayLog();
      setLog(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load daily log');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
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

  return {
    log,
    loading,
    saving,
    error,
    saveError,
    hasLogToday: log !== null,
    create,
    refresh,
  };
}
