import { useState, useCallback, useMemo, useEffect } from 'react';
import type { DayType, TrainingConfig, TrainingType } from '../../api/types';
import { upsertPlannedDay } from '../../api/client';
import { calculateSessionLoad } from './loadCalculations';
import type { PlannedSessionDraft } from './DayDropZone';

/**
 * Infer day type from training sessions.
 * - Strength/calisthenics/hiit → performance
 * - Cardio (run/row/cycle/walking) → fatburner
 * - Other (qigong/mobility/gmb) → metabolize
 * - Mixed sessions → performance (default to higher intensity)
 */
function inferDayType(sessions: PlannedSessionDraft[]): DayType {
  if (sessions.length === 0) return 'metabolize';

  const hasStrength = sessions.some(s =>
    ['strength', 'calisthenics', 'hiit', 'mixed'].includes(s.trainingType)
  );
  if (hasStrength) return 'performance';

  const hasCardio = sessions.some(s =>
    ['run', 'row', 'cycle', 'walking'].includes(s.trainingType)
  );
  if (hasCardio) return 'fatburner';

  return 'metabolize';
}

/**
 * A day's planned sessions in draft state.
 */
export interface PlannedDayData {
  date: string;
  dayType: DayType | null;
  sessions: PlannedSessionDraft[];
}

/**
 * State for the session being configured after a drop.
 */
export interface ConfiguringSession {
  trainingType: TrainingType;
  config: TrainingConfig;
  targetDate: string;
}

/**
 * Generate a unique ID for draft sessions.
 */
function generateSessionId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a Date as YYYY-MM-DD in local timezone.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hook to manage the workout planner state.
 * Handles draft sessions, week navigation, and drag state.
 */
export function usePlannerState() {
  // Week selection - default to current week's Monday
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return formatLocalDate(monday);
  });

  // Draft sessions for each day
  const [draftDays, setDraftDays] = useState<Map<string, PlannedDayData>>(new Map());

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragType, setActiveDragType] = useState<TrainingType | null>(null);
  const [activeDragConfig, setActiveDragConfig] = useState<TrainingConfig | null>(null);
  const [hoveredDropDate, setHoveredDropDate] = useState<string | null>(null);

  // Click-to-select state
  const [selectedSession, setSelectedSession] = useState<{
    type: TrainingType;
    config: TrainingConfig;
  } | null>(null);

  // Configuration modal state
  const [configuringSession, setConfiguringSession] = useState<ConfiguringSession | null>(null);

  // Save status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Week dates calculation
  const weekDates = useMemo(() => {
    const dates: string[] = [];
    const monday = new Date(weekStartDate + 'T00:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(formatLocalDate(d));
    }
    return dates;
  }, [weekStartDate]);

  // Navigation
  const goToPreviousWeek = useCallback(() => {
    const current = new Date(weekStartDate + 'T00:00:00');
    current.setDate(current.getDate() - 7);
    setWeekStartDate(formatLocalDate(current));
  }, [weekStartDate]);

  const goToNextWeek = useCallback(() => {
    const current = new Date(weekStartDate + 'T00:00:00');
    current.setDate(current.getDate() + 7);
    setWeekStartDate(formatLocalDate(current));
  }, [weekStartDate]);

  const goToCurrentWeek = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    setWeekStartDate(formatLocalDate(monday));
  }, []);

  // Session management
  const addSession = useCallback((date: string, session: Omit<PlannedSessionDraft, 'id'>) => {
    setDraftDays((prev) => {
      const updated = new Map(prev);
      const day = updated.get(date) || { date, dayType: null, sessions: [] };
      updated.set(date, {
        ...day,
        sessions: [...day.sessions, { ...session, id: generateSessionId() }],
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const removeSession = useCallback((date: string, sessionId: string) => {
    setDraftDays((prev) => {
      const updated = new Map(prev);
      const day = updated.get(date);
      if (day) {
        const newSessions = day.sessions.filter((s) => s.id !== sessionId);
        if (newSessions.length === 0 && !day.dayType) {
          updated.delete(date);
        } else {
          updated.set(date, { ...day, sessions: newSessions });
        }
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const setDayType = useCallback((date: string, dayType: DayType | null) => {
    setDraftDays((prev) => {
      const updated = new Map(prev);
      const day = updated.get(date) || { date, dayType: null, sessions: [] };
      updated.set(date, { ...day, dayType });
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const clearDay = useCallback((date: string) => {
    setDraftDays((prev) => {
      const updated = new Map(prev);
      updated.delete(date);
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Calculate load for a day
  const getDayLoad = useCallback(
    (date: string): number => {
      const day = draftDays.get(date);
      if (!day) return 0;
      return day.sessions.reduce(
        (sum, s) => sum + calculateSessionLoad(s.loadScore, s.durationMin, s.rpe),
        0
      );
    },
    [draftDays]
  );

  // Get week loads for chart
  const weekLoads = useMemo(() => {
    return weekDates.map((date) => ({
      date,
      load: getDayLoad(date),
    }));
  }, [weekDates, getDayLoad]);

  // Drag handlers
  const handleDragStart = useCallback((trainingType: TrainingType, config: TrainingConfig) => {
    setIsDragging(true);
    setActiveDragType(trainingType);
    setActiveDragConfig(config);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setActiveDragType(null);
    setActiveDragConfig(null);
    setHoveredDropDate(null);
  }, []);

  const handleDayDragEnter = useCallback((date: string) => {
    setHoveredDropDate(date);
  }, []);

  const handleDayDragLeave = useCallback(() => {
    setHoveredDropDate(null);
  }, []);

  // Click-to-select handlers
  const handleSelectSession = useCallback((type: TrainingType, config: TrainingConfig) => {
    setSelectedSession((prev) => (prev?.type === type ? null : { type, config }));
  }, []);

  const handlePlaceSession = useCallback((date: string) => {
    if (!selectedSession) return;
    setConfiguringSession({
      trainingType: selectedSession.type,
      config: selectedSession.config,
      targetDate: date,
    });
    setSelectedSession(null);
  }, [selectedSession]);

  const clearSelection = useCallback(() => {
    setSelectedSession(null);
  }, []);

  // ESC key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSession(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset draft
  const resetDraft = useCallback(() => {
    setDraftDays(new Map());
    setHasUnsavedChanges(false);
  }, []);

  // Save plan to backend
  const savePlan = useCallback(async () => {
    if (draftDays.size === 0) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Get all dates in the current week
      const datesWithSessions = new Set(draftDays.keys());

      // Save each day that has sessions
      const savePromises: Promise<void>[] = [];

      for (const [date, dayData] of draftDays) {
        if (dayData.sessions.length > 0) {
          // Infer day type from sessions or use explicit day type
          const dayType = dayData.dayType || inferDayType(dayData.sessions);
          savePromises.push(
            upsertPlannedDay(date, dayType).then(() => {})
          );
        }
      }

      // Also delete planned days for dates that had sessions removed
      for (const date of weekDates) {
        if (!datesWithSessions.has(date)) {
          // Only delete if there were changes (we don't track original state yet)
          // For now, skip deletion to avoid removing existing plans
        }
      }

      await Promise.all(savePromises);
      setHasUnsavedChanges(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save plan');
      throw err; // Re-throw so caller can handle
    } finally {
      setIsSaving(false);
    }
  }, [draftDays, weekDates]);

  return {
    // Week state
    weekStartDate,
    weekDates,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,

    // Draft state
    draftDays,
    hasUnsavedChanges,

    // Session management
    addSession,
    removeSession,
    setDayType,
    clearDay,
    getDayLoad,
    weekLoads,
    resetDraft,
    savePlan,
    isSaving,
    saveError,

    // Drag state
    isDragging,
    activeDragType,
    activeDragConfig,
    hoveredDropDate,
    handleDragStart,
    handleDragEnd,
    handleDayDragEnter,
    handleDayDragLeave,

    // Click-to-select state
    selectedSession,
    handleSelectSession,
    handlePlaceSession,
    clearSelection,

    // Configuration modal
    configuringSession,
    setConfiguringSession,
  };
}
