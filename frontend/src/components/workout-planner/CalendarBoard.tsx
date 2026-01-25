import type { DayType, TrainingType } from '../../api/types';
import { DayDropZone, type PlannedSessionDraft } from './DayDropZone';
import { calculateSessionLoad } from './loadCalculations';
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
  isDragging: boolean;
  activeDragType: TrainingType | null;
  onSessionDrop: (date: string, data: SessionDragData) => void;
  onRemoveSession: (date: string, sessionId: string) => void;
}

/**
 * The "Board" - a 7-day calendar grid where sessions can be dropped.
 */
export function CalendarBoard({
  weekDates,
  plannedDays,
  isDragging,
  activeDragType,
  onSessionDrop,
  onRemoveSession,
}: CalendarBoardProps) {
  const today = new Date().toISOString().split('T')[0];

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
          <DayDropZone
            key={date}
            date={date}
            dayName={DAY_NAMES[index]}
            dayNumber={dayNumber}
            sessions={sessions}
            dayType={dayType}
            totalLoad={totalLoad}
            isToday={isToday}
            isPast={isPast}
            isDragging={isDragging}
            activeDragType={activeDragType}
            onDrop={onSessionDrop}
            onRemoveSession={onRemoveSession}
          />
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
  return d.toISOString().split('T')[0];
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
    dates.push(d.toISOString().split('T')[0]);
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
