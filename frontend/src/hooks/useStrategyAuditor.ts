import { useState, useEffect, useCallback } from 'react';
import { getAuditStatus } from '../api/client';
import type { AuditStatus } from '../api/types';

interface UseStrategyAuditorResult {
  status: AuditStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook to fetch and manage the strategy audit status.
 * Used by the Check Engine light feature to detect mismatches.
 *
 * @param autoRefreshMs - Auto-refresh interval in milliseconds (0 to disable)
 */
export function useStrategyAuditor(autoRefreshMs = 60000): UseStrategyAuditorResult {
  const [status, setStatus] = useState<AuditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAuditStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshMs <= 0) return;

    const interval = setInterval(fetchStatus, autoRefreshMs);
    return () => clearInterval(interval);
  }, [autoRefreshMs, fetchStatus]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
  };
}
