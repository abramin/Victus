import { useState, useEffect } from 'react';
import { getCalendarSummary, ApiError } from '../api/client';
import type { CalendarSummaryResponse } from '../api/types';

interface UseCalendarSummaryReturn {
  summary: CalendarSummaryResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches calendar summary data for a given date range.
 * Provides normalized load/calorie data and heatmap intensities for visualization.
 *
 * @param start - Start date in YYYY-MM-DD format
 * @param end - End date in YYYY-MM-DD format
 */
export function useCalendarSummary(start: string, end: string): UseCalendarSummaryReturn {
  const [summary, setSummary] = useState<CalendarSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCalendarSummary(start, end, controller.signal);
        // Check abort signal before updating state to prevent updates on unmounted components
        if (!controller.signal.aborted) {
          setSummary(data);
        }
      } catch (err) {
        // Only update error state if component is still mounted
        // This check happens in the catch block to handle both fetch errors
        // and abort errors gracefully
        if (!controller.signal.aborted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load calendar summary');
          }
          setSummary(null);
        }
      } finally {
        // Final state cleanup only if not aborted
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      controller.abort();
    };
  }, [start, end]);

  return { summary, loading, error };
}
