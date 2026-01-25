import { useState, useCallback } from 'react';
import { HealthPayload } from '../api/types';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime?: Date;
  errorMessage?: string;
  payload?: HealthPayload;
}

/**
 * Hook for managing sync state machine.
 */
export function useSyncState() {
  const [state, setState] = useState<SyncState>({
    status: 'idle',
  });

  const setIdle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'idle',
      errorMessage: undefined,
    }));
  }, []);

  const setSyncing = useCallback((payload: HealthPayload) => {
    setState({
      status: 'syncing',
      payload,
    });
  }, []);

  const setSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'success',
      lastSyncTime: new Date(),
      errorMessage: undefined,
    }));
  }, []);

  const setError = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      status: 'error',
      errorMessage: message,
    }));
  }, []);

  const setPayload = useCallback((payload: HealthPayload) => {
    setState((prev) => ({
      ...prev,
      payload,
    }));
  }, []);

  return {
    ...state,
    setIdle,
    setSyncing,
    setSuccess,
    setError,
    setPayload,
  };
}
