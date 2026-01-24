import { useState, useEffect, useCallback } from 'react';
import { getDailyTargetsRange, getPlannedDays, upsertPlannedDay, deletePlannedDay } from '../api/client';
import type { DayType } from '../api/types';

export interface WeeklyDayData {
  date: string;         // YYYY-MM-DD format
  dayOfWeek: string;    // M, T, W, T, F, S, S
  dayType?: DayType;    // The day type if available
  hasLog: boolean;      // Whether a log exists for this day
  isPlanned: boolean;   // Whether this is a planned (future) day type
  isToday: boolean;     // Whether this is today
  isPast: boolean;      // Whether this day is in the past
}

export interface UseWeeklyDayTypesReturn {
  days: WeeklyDayData[];
  loading: boolean;
  error: string | null;
  setPlannedDayType: (date: string, dayType: DayType) => Promise<void>;
  clearPlannedDayType: (date: string) => Promise<void>;
  refetch: () => void;
}

const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Get the Monday of the week containing the given date.
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to make Monday = 0, Sunday = 6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a date as YYYY-MM-DD.
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Hook to fetch and manage weekly day types for the Cockpit Dashboard.
 * Combines historical logs with planned future day types.
 */
export function useWeeklyDayTypes(currentDate: string): UseWeeklyDayTypesReturn {
  const [days, setDays] = useState<WeeklyDayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const fetchWeekData = async () => {
      setLoading(true);
      setError(null);

      try {
        const today = new Date(currentDate);
        const monday = getMonday(today);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startDate = formatDate(monday);
        const endDate = formatDate(sunday);

        // Fetch both historical logs and planned day types in parallel
        const [logsResponse, plannedResponse] = await Promise.all([
          getDailyTargetsRange(startDate, endDate),
          getPlannedDays(startDate, endDate),
        ]);

        // Create maps for quick lookup
        const logsMap = new Map(
          logsResponse.days.map(d => [d.date, d.calculatedTargets.dayType])
        );
        const plannedMap = new Map(
          plannedResponse.days.map(d => [d.date, d.dayType])
        );

        // Build the 7-day array
        const weekDays: WeeklyDayData[] = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          const dateStr = formatDate(date);
          const dayOfWeek = DAY_ABBREVIATIONS[date.getDay()];

          const hasLog = logsMap.has(dateStr);
          const logDayType = logsMap.get(dateStr);
          const plannedDayType = plannedMap.get(dateStr);

          const isToday = dateStr === currentDate;
          const isPast = dateStr < currentDate;

          // Use log day type if available, otherwise use planned day type
          const dayType = logDayType ?? plannedDayType;
          const isPlanned = !hasLog && plannedDayType !== undefined;

          weekDays.push({
            date: dateStr,
            dayOfWeek,
            dayType,
            hasLog,
            isPlanned,
            isToday,
            isPast,
          });
        }

        setDays(weekDays);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weekly data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [currentDate, refreshKey]);

  const setPlannedDayType = useCallback(async (date: string, dayType: DayType) => {
    await upsertPlannedDay(date, dayType);
    refetch();
  }, [refetch]);

  const clearPlannedDayType = useCallback(async (date: string) => {
    await deletePlannedDay(date);
    refetch();
  }, [refetch]);

  return {
    days,
    loading,
    error,
    setPlannedDayType,
    clearPlannedDayType,
    refetch,
  };
}
