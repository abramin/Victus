import { useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { DayType, TrainingType, TrainingConfig, ScheduledSession } from '../../api/types';
import { DayDropZone, type PlannedSessionDraft, type DayRecoveryWarning } from './DayDropZone';
import { calculateSessionLoad } from './loadCalculations';
import { shiverAnimation } from '../../lib/animations';
import type { SessionDragData } from './DraggableSessionCard';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PlannedDayData {
  date: string;
  dayType: DayType | null;
  sessions: PlannedSessionDraft[];
}

interface CalendarBoardProps {
  weekDates: string[];
  plannedDays: Map<string, PlannedDayData>;
  programSessionsByDate?: Map<string, ScheduledSession[]>;
  isDragging: boolean;
  activeDragType: TrainingType | null;
  selectedSession?: { type: TrainingType; config: TrainingConfig } | null;
  recoveryWarnings?: Map<string, DayRecoveryWarning>;
  onSessionDrop: (date: string, data: SessionDragData) => void;
  onRemoveSession: (date: string, sessionId: string) => void;
  onDayDragEnter?: (date: string) => void;
  onDayDragLeave?: () => void;
  onClickToPlace?: (date: string) => void;
}

/**
 * The "Board" - a 7-day calendar grid where sessions can be dropped.
 */
/**
 * Format a Date as YYYY-MM-DD in local timezone.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CalendarBoard({
  weekDates,
  plannedDays,
  programSessionsByDate,
  isDragging,
  activeDragType,
  selectedSession,
  recoveryWarnings,
  onSessionDrop,
  onRemoveSession,
  onDayDragEnter,
  onDayDragLeave,
  onClickToPlace,
}: CalendarBoardProps) {
  const today = formatLocalDate(new Date());

  // Animation controls for each day (for shiver effect)
  // Using individual useAnimation calls for each day
  const day0 = useAnimation();
  const day1 = useAnimation();
  const day2 = useAnimation();
  const day3 = useAnimation();
  const day4 = useAnimation();
  const day5 = useAnimation();
  const day6 = useAnimation();
  const dayControls = [day0, day1, day2, day3, day4, day5, day6];

  // Trigger shiver on adjacent days when a session is dropped
  const handleDropWithShiver = useCallback(
    (date: string, data: SessionDragData) => {
      const dropIndex = weekDates.indexOf(date);

      // Shiver adjacent days (within 2 positions)
      [-2, -1, 1, 2].forEach((offset, i) => {
        const targetIndex = dropIndex + offset;
        if (targetIndex >= 0 && targetIndex < 7) {
          setTimeout(() => {
            dayControls[targetIndex].start('shiver').then(() => {
              dayControls[targetIndex].start('idle');
            });
          }, i * 50); // Staggered timing for ripple effect
        }
      });

      onSessionDrop(date, data);
    },
    [weekDates, onSessionDrop, dayControls]
  );

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, index) => {
        const dayData = plannedDays.get(date);
        const sessions = dayData?.sessions ?? [];
        const dayType = dayData?.dayType ?? null;

        // Calculate total load for the day
        const totalLoad = sessions.reduce(
          (sum, s) => sum + calculateSessionLoad(s.loadScore, s.durationMin, s.rpe),
          0
        );

        // Parse date for display
        const dateObj = new Date(date + 'T00:00:00');
        const dayNumber = dateObj.getDate();
        const isToday = date === today;
        const isPast = date < today;

        return (
          <motion.div
            key={date}
            variants={shiverAnimation}
            initial="idle"
            animate={dayControls[index]}
          >
            <DayDropZone
              date={date}
              dayName={DAY_NAMES[index]}
              dayNumber={dayNumber}
              sessions={sessions}
              programSessions={programSessionsByDate?.get(date)}
              dayType={dayType}
              totalLoad={totalLoad}
              isToday={isToday}
              isPast={isPast}
              isDragging={isDragging}
              activeDragType={activeDragType}
              selectedSession={selectedSession}
              recoveryWarning={recoveryWarnings?.get(date)}
              onDrop={handleDropWithShiver}
              onRemoveSession={onRemoveSession}
              onDragEnterZone={onDayDragEnter}
              onDragLeaveZone={onDayDragLeave}
              onClickToPlace={onClickToPlace}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return formatLocalDate(d);
}

/**
 * Get an array of 7 dates for the week starting at the given Monday.
 */
export function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const monday = new Date(mondayStr + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatLocalDate(d));
  }
  return dates;
}

/**
 * Format a week range for display (e.g., "Jan 20 - 26").
 */
export function formatWeekRange(mondayStr: string): string {
  const monday = new Date(mondayStr + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monMonth = monthNames[monday.getMonth()];
  const sunMonth = monthNames[sunday.getMonth()];

  if (monMonth === sunMonth) {
    return `${monMonth} ${monday.getDate()} - ${sunday.getDate()}`;
  }
  return `${monMonth} ${monday.getDate()} - ${sunMonth} ${sunday.getDate()}`;
}
