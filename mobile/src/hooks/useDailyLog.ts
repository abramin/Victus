import { useState, useEffect, useCallback } from 'react';
import {
  getTodayLog,
  getLogByDate,
  createDailyLog,
  deleteTodayLog,
  updateActualTraining,
  updateActiveCalories,
  ApiError,
} from '../api/client';
import type {
  DailyLog,
  CreateDailyLogRequest,
  UpdateActualTrainingRequest,
  UpdateActiveCaloriesRequest,
  ActualTrainingSession,
} from '../api/types';

interface UseDailyLogReturn {
  log: DailyLog | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  refresh: () => Promise<void>;
  create: (request: CreateDailyLogRequest) => Promise<DailyLog | null>;
  replace: (request: CreateDailyLogRequest) => Promise<DailyLog | null>;
  updateActual: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
  updateCalories: (calories: number | null) => Promise<DailyLog | null>;
}

export function useDailyLog(date?: string): UseDailyLogReturn {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = date ? await getLogByDate(date) : await getTodayLog();
      setLog(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load daily log';
      setError(message);
      console.error('useDailyLog refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (request: CreateDailyLogRequest): Promise<DailyLog | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createDailyLog(request);
      setLog(created);
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create daily log';
      setSaveError(message);
      console.error('useDailyLog create error:', err);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const replace = useCallback(async (request: CreateDailyLogRequest): Promise<DailyLog | null> => {
    setSaving(true);
    setSaveError(null);
    try {
      // Delete existing log first, then create new one
      await deleteTodayLog();
      const created = await createDailyLog(request);
      setLog(created);
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to replace daily log';
      setSaveError(message);
      console.error('useDailyLog replace error:', err);
      // Refresh to get current state
      await refresh();
      return null;
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const updateActual = useCallback(
    async (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]): Promise<DailyLog | null> => {
      if (!log) {
        setSaveError('No log exists to update');
        return null;
      }

      setSaving(true);
      setSaveError(null);
      try {
        const request: UpdateActualTrainingRequest = { actualSessions: sessions };
        const updated = await updateActualTraining(log.date, request);
        setLog(updated);
        return updated;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to update actual training';
        setSaveError(message);
        console.error('useDailyLog updateActual error:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [log]
  );

  const updateCalories = useCallback(
    async (calories: number | null): Promise<DailyLog | null> => {
      if (!log) {
        setSaveError('No log exists to update');
        return null;
      }

      setSaving(true);
      setSaveError(null);
      try {
        const request: UpdateActiveCaloriesRequest = { activeCaloriesBurned: calories };
        const updated = await updateActiveCalories(log.date, request);
        setLog(updated);
        return updated;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Failed to update active calories';
        setSaveError(message);
        console.error('useDailyLog updateCalories error:', err);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [log]
  );

  return {
    log,
    loading,
    saving,
    error,
    saveError,
    refresh,
    create,
    replace,
    updateActual,
    updateCalories,
  };
}
