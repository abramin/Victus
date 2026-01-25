import { useState, useCallback, useMemo } from 'react';

/**
 * Hook to manage the Morning Check-In modal state.
 * Determines when to show the modal based on whether a log exists for today
 * and whether the user has dismissed the modal in this session.
 */
interface UseCheckinStateOptions {
  hasLogToday: boolean;
  loading: boolean;
}

interface UseCheckinStateReturn {
  /** Whether the check-in modal should be displayed */
  shouldShowModal: boolean;
  /** Dismiss the modal for this session */
  dismissModal: () => void;
  /** Reset dismissal (for testing or manual re-trigger) */
  resetDismissal: () => void;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function useCheckinState({
  hasLogToday,
  loading,
}: UseCheckinStateOptions): UseCheckinStateReturn {
  // Session-based dismissal (persists in localStorage for current day)
  const [dismissed, setDismissed] = useState(() => {
    const today = getTodayKey();
    const storedDate = localStorage.getItem('checkin-dismissed-date');
    return storedDate === today;
  });

  const dismissModal = useCallback(() => {
    const today = getTodayKey();
    localStorage.setItem('checkin-dismissed-date', today);
    setDismissed(true);
  }, []);

  const resetDismissal = useCallback(() => {
    localStorage.removeItem('checkin-dismissed-date');
    setDismissed(false);
  }, []);

  const shouldShowModal = useMemo(() => {
    // Don't show while loading
    if (loading) return false;
    // Don't show if already logged today
    if (hasLogToday) return false;
    // Don't show if dismissed this session
    if (dismissed) return false;
    return true;
  }, [loading, hasLogToday, dismissed]);

  return {
    shouldShowModal,
    dismissModal,
    resetDismissal,
  };
}
