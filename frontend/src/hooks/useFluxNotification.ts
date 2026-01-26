import { useState, useEffect, useCallback, useRef } from 'react';
import { getMetabolicNotification, dismissMetabolicNotification } from '../api/client';
import type { FluxNotification } from '../api/types';

/**
 * Hook to manage Flux Engine weekly strategy notifications.
 * Fetches pending notifications and provides dismiss functionality.
 */
interface UseFluxNotificationReturn {
  /** The pending notification, or null if none */
  notification: FluxNotification | null;
  /** Loading state for initial fetch */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Dismiss the notification (calls API and updates local state) */
  dismiss: (id: number) => Promise<void>;
  /** Manually check for pending notifications */
  checkPending: () => Promise<void>;
}

export function useFluxNotification(): UseFluxNotificationReturn {
  const [notification, setNotification] = useState<FluxNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkPending = useCallback(async () => {
    // Abort any previous request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setError(null);
      const result = await getMetabolicNotification(controller.signal);
      setNotification(result);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Failed to fetch notification');
    } finally {
      setLoading(false);
    }
  }, []);

  const dismiss = useCallback(async (id: number) => {
    try {
      await dismissMetabolicNotification(id);
      setNotification(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to dismiss notification');
      throw err;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    checkPending();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [checkPending]);

  return {
    notification,
    loading,
    error,
    dismiss,
    checkPending,
  };
}
