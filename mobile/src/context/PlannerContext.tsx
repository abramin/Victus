import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { DropProvider, DropProviderRef, DroppedItemsMap } from 'react-native-reanimated-dnd';
import type { TrainingType, TrainingConfig, DayType } from '../api/types';

/**
 * A planned session in the draft state (not yet persisted).
 */
export interface PlannedSessionDraft {
  id: string; // Unique ID for this draft session
  trainingType: TrainingType;
  durationMin: number;
  rpe: number;
  loadScore: number; // Cached from config
}

/**
 * A day's planned sessions in the draft state.
 */
export interface PlannedDayDraft {
  date: string; // YYYY-MM-DD
  dayType: DayType | null;
  sessions: PlannedSessionDraft[];
}

/**
 * Drag data passed to Draggable components.
 */
export interface SessionDragData {
  trainingType: TrainingType;
  config: TrainingConfig;
}

/**
 * State for the session being configured after a drop.
 */
export interface ConfiguringSession {
  trainingType: TrainingType;
  config: TrainingConfig;
  targetDate: string;
}

interface PlannerContextValue {
  // Week selection
  weekStartDate: string;
  setWeekStartDate: (date: string) => void;

  // Draft sessions for each day
  draftDays: Map<string, PlannedDayDraft>;

  // Session management
  addSession: (date: string, session: PlannedSessionDraft) => void;
  removeSession: (date: string, sessionId: string) => void;
  updateSession: (date: string, sessionId: string, updates: Partial<PlannedSessionDraft>) => void;
  clearDay: (date: string) => void;
  setDayType: (date: string, dayType: DayType | null) => void;

  // Drag state
  isDragging: boolean;
  activeDragData: SessionDragData | null;
  hoveredDate: string | null;

  // Configuration sheet state
  configuringSession: ConfiguringSession | null;
  setConfiguringSession: (session: ConfiguringSession | null) => void;

  // Helpers
  getDayLoad: (date: string) => number;
  getWeekDates: () => string[];
  hasUnsavedChanges: boolean;
  resetDraft: () => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function usePlannerContext(): PlannerContextValue {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlannerContext must be used within a PlannerProvider');
  }
  return context;
}

interface PlannerProviderProps {
  children: React.ReactNode;
  initialWeekStart?: string;
}

/**
 * Get the Monday of the week containing the given date.
 */
function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get an array of 7 dates for the week starting at the given Monday.
 */
function getWeekDatesFromMonday(mondayStr: string): string[] {
  const dates: string[] = [];
  const monday = new Date(mondayStr + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Generate a unique ID for draft sessions.
 */
function generateSessionId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function PlannerProvider({ children, initialWeekStart }: PlannerProviderProps) {
  const dropProviderRef = useRef<DropProviderRef>(null);

  // Week selection - default to current week
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    if (initialWeekStart) return initialWeekStart;
    return getWeekMonday(new Date());
  });

  // Draft sessions for the week
  const [draftDays, setDraftDays] = useState<Map<string, PlannedDayDraft>>(new Map());

  // Track if we have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragData, setActiveDragData] = useState<SessionDragData | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Configuration sheet state
  const [configuringSession, setConfiguringSession] = useState<ConfiguringSession | null>(null);

  // Get dates for current week
  const getWeekDates = useCallback(() => {
    return getWeekDatesFromMonday(weekStartDate);
  }, [weekStartDate]);

  // Session management
  const addSession = useCallback((date: string, session: PlannedSessionDraft) => {
    setDraftDays((prev) => {
      const updated = new Map(prev);
      const day = updated.get(date) || { date, dayType: null, sessions: [] };
      updated.set(date, {
        ...day,
        sessions: [...day.sessions, { ...session, id: session.id || generateSessionId() }],
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
        updated.set(date, {
          ...day,
          sessions: day.sessions.filter((s) => s.id !== sessionId),
        });
      }
      return updated;
    });
    setHasUnsavedChanges(true);
  }, []);

  const updateSession = useCallback(
    (date: string, sessionId: string, updates: Partial<PlannedSessionDraft>) => {
      setDraftDays((prev) => {
        const updated = new Map(prev);
        const day = updated.get(date);
        if (day) {
          updated.set(date, {
            ...day,
            sessions: day.sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)),
          });
        }
        return updated;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  const clearDay = useCallback((date: string) => {
    setDraftDays((prev) => {
      const updated = new Map(prev);
      updated.delete(date);
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

  // Calculate load for a day
  const getDayLoad = useCallback(
    (date: string): number => {
      const day = draftDays.get(date);
      if (!day) return 0;
      return day.sessions.reduce((sum, s) => {
        const durationFactor = s.durationMin / 60;
        const rpeFactor = s.rpe / 3;
        return sum + s.loadScore * durationFactor * rpeFactor;
      }, 0);
    },
    [draftDays]
  );

  // Reset draft to initial state
  const resetDraft = useCallback(() => {
    setDraftDays(new Map());
    setHasUnsavedChanges(false);
  }, []);

  // Drag event handlers
  const handleDragStart = useCallback((data: SessionDragData) => {
    setIsDragging(true);
    setActiveDragData(data);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setActiveDragData(null);
    setHoveredDate(null);
  }, []);

  const handleDragging = useCallback(
    (payload: { x: number; y: number; tx: number; ty: number; itemData: SessionDragData }) => {
      // The library handles hover detection via onActiveChange on Droppable
      // We track hoveredDate separately in DayDropZone
    },
    []
  );

  const contextValue = useMemo<PlannerContextValue>(
    () => ({
      weekStartDate,
      setWeekStartDate,
      draftDays,
      addSession,
      removeSession,
      updateSession,
      clearDay,
      setDayType,
      isDragging,
      activeDragData,
      hoveredDate,
      configuringSession,
      setConfiguringSession,
      getDayLoad,
      getWeekDates,
      hasUnsavedChanges,
      resetDraft,
    }),
    [
      weekStartDate,
      draftDays,
      addSession,
      removeSession,
      updateSession,
      clearDay,
      setDayType,
      isDragging,
      activeDragData,
      hoveredDate,
      configuringSession,
      getDayLoad,
      getWeekDates,
      hasUnsavedChanges,
      resetDraft,
    ]
  );

  return (
    <PlannerContext.Provider value={contextValue}>
      <DropProvider
        ref={dropProviderRef}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragging={handleDragging}
      >
        {children}
      </DropProvider>
    </PlannerContext.Provider>
  );
}

export { generateSessionId };
