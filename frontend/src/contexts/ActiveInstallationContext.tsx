import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { getActiveInstallation, getScheduledSessions, abandonInstallation, ApiError } from '../api/client';
import type { ProgramInstallation, ScheduledSession } from '../api/types';

interface ActiveInstallationContextValue {
  installation: ProgramInstallation | null;
  scheduledSessions: ScheduledSession[];
  loading: boolean;
  error: string | null;
  /** Map of date string (YYYY-MM-DD) to scheduled sessions for that date */
  sessionsByDate: Map<string, ScheduledSession[]>;
  abandon: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const ActiveInstallationContext = createContext<ActiveInstallationContextValue | null>(null);

export function ActiveInstallationProvider({ children }: { children: ReactNode }) {
  const [installation, setInstallation] = useState<ProgramInstallation | null>(null);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await getActiveInstallation(controller.signal);
      if (controller.signal.aborted) return;
      setInstallation(data);

      // If there's an active installation, fetch its scheduled sessions
      if (data) {
        const sessions = await getScheduledSessions(data.id, controller.signal);
        if (controller.signal.aborted) return;
        setScheduledSessions(sessions);
      } else {
        setScheduledSessions([]);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load active installation');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [refresh]);

  const abandon = useCallback(async (): Promise<boolean> => {
    if (!installation) return false;
    try {
      await abandonInstallation(installation.id);
      await refresh();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to abandon installation');
      }
      return false;
    }
  }, [installation, refresh]);

  // Build a map of date -> sessions for efficient lookup
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, ScheduledSession[]>();
    for (const session of scheduledSessions) {
      const existing = map.get(session.date) || [];
      existing.push(session);
      map.set(session.date, existing);
    }
    return map;
  }, [scheduledSessions]);

  const value = useMemo(
    () => ({
      installation,
      scheduledSessions,
      loading,
      error,
      sessionsByDate,
      abandon,
      refresh,
    }),
    [installation, scheduledSessions, loading, error, sessionsByDate, abandon, refresh]
  );

  return (
    <ActiveInstallationContext.Provider value={value}>
      {children}
    </ActiveInstallationContext.Provider>
  );
}

export function useActiveInstallation(): ActiveInstallationContextValue {
  const context = useContext(ActiveInstallationContext);
  if (!context) {
    throw new Error('useActiveInstallation must be used within ActiveInstallationProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if used outside provider (for components that may or may not have the context)
 */
export function useActiveInstallationOptional(): ActiveInstallationContextValue | null {
  return useContext(ActiveInstallationContext);
}
