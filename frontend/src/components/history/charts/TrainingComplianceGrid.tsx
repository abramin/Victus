import { useMemo } from 'react';
import type { HistoryPoint } from '../../../api/types';

interface TrainingComplianceGridProps {
  /** History points - uses extended fields if available, falls back to hasTraining */
  points: HistoryPoint[];
  /** Callback when a day cell is clicked */
  onSelectDate?: (date: string) => void;
  /** Currently selected date */
  selectedDate?: string | null;
}

type ComplianceStatus = 'rest' | 'completed' | 'partial' | 'missed' | 'no-data';

interface DayCell {
  date: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  weekIndex: number;
  status: ComplianceStatus;
  hasData: boolean;
}

const COMPLIANCE_COLORS: Record<ComplianceStatus, string> = {
  rest: '#374151', // Gray-700
  completed: '#22c55e', // Green-500
  partial: '#f97316', // Orange-500
  missed: '#ef4444', // Red-500
  'no-data': '#1e293b', // Slate-800
};

const COMPLIANCE_LABELS: Record<ComplianceStatus, string> = {
  rest: 'Rest Day',
  completed: 'Completed',
  partial: 'Partial',
  missed: 'Missed',
  'no-data': 'No Data',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE_PX = 32;
const GRID_STYLE = { gridTemplateColumns: `repeat(7, ${CELL_SIZE_PX}px)` };
const CELL_STYLE = { width: CELL_SIZE_PX, height: CELL_SIZE_PX };

/**
 * Generate array of dates for the last N days, organized by week.
 */
function generateDateGrid(endDate: Date, days: number): string[] {
  const dates: string[] = [];
  const current = new Date(endDate);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(current);
    date.setDate(current.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Determine compliance status from training data.
 * Uses plannedDurationMin and actualDurationMin for detailed compliance tracking.
 */
function getComplianceStatus(point: HistoryPoint | undefined): ComplianceStatus {
  if (!point) return 'no-data';

  const planned = point.plannedDurationMin;
  const actual = point.actualDurationMin;

  // No planned training = rest day
  if (planned === 0) return 'rest';

  // Had planned training but no actual = missed
  if (actual === 0) return 'missed';

  // Calculate compliance ratio
  const ratio = actual / planned;
  if (ratio >= 0.9) return 'completed';
  if (ratio >= 0.5) return 'partial';
  return 'missed';
}

/**
 * Build a map of date -> HistoryPoint for quick lookup.
 */
function buildPointsMap(points: HistoryPoint[]): Map<string, HistoryPoint> {
  const map = new Map<string, HistoryPoint>();
  for (const point of points) {
    map.set(point.date, point);
  }
  return map;
}

export function TrainingComplianceGrid({
  points,
  onSelectDate,
  selectedDate,
}: TrainingComplianceGridProps) {
  const { cells, weeks, statusCounts } = useMemo(() => {
    const today = new Date();
    const dates = generateDateGrid(today, 90); // Fixed 90-day window
    const pointsMap = buildPointsMap(points);

    const cells: DayCell[] = [];
    let currentWeek = -1;

    for (const dateStr of dates) {
      const date = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = date.getDay();

      // Start a new week on Sunday
      if (dayOfWeek === 0) {
        currentWeek++;
      } else if (currentWeek === -1) {
        // Handle partial first week
        currentWeek = 0;
      }

      const point = pointsMap.get(dateStr);
      const status = getComplianceStatus(point);

      cells.push({
        date: dateStr,
        dayOfWeek,
        weekIndex: currentWeek,
        status,
        hasData: point !== undefined,
      });
    }

    const weeks = currentWeek + 1;

    // Count statuses for legend
    const statusCounts: Record<ComplianceStatus, number> = {
      rest: 0,
      completed: 0,
      partial: 0,
      missed: 0,
      'no-data': 0,
    };
    for (const cell of cells) {
      statusCounts[cell.status]++;
    }

    return { cells, weeks, statusCounts };
  }, [points]);

  // Group cells by week for grid rendering
  const weekGroups = useMemo(() => {
    const groups: DayCell[][] = Array.from({ length: weeks }, () => []);
    for (const cell of cells) {
      groups[cell.weekIndex].push(cell);
    }
    return groups;
  }, [cells, weeks]);

  return (
    <div className="space-y-3">
      {/* Day labels */}
      <div className="flex">
        <div className="w-8" /> {/* Spacer for week column */}
        <div className="grid gap-1 text-xs text-slate-500" style={GRID_STYLE}>
          {DAY_LABELS.map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1">
        {weekGroups.map((week, weekIndex) => (
          <div key={weekIndex} className="flex items-center gap-1">
            {/* Week number */}
            <div className="w-8 text-xs text-slate-600 text-right pr-2">
              {weekIndex === 0 || weekIndex === weekGroups.length - 1
                ? `W${weekGroups.length - weekIndex}`
                : ''}
            </div>

            {/* Day cells */}
            <div className="grid gap-1" style={GRID_STYLE}>
              {DAY_LABELS.map((_, dayIndex) => {
                const cell = week.find((c) => c.dayOfWeek === dayIndex);
                if (!cell) {
                  // Empty cell for partial weeks
                  return <div key={dayIndex} className="rounded-sm" style={CELL_STYLE} />;
                }

                const isSelected = cell.date === selectedDate;
                const isFuture = new Date(cell.date) > new Date();

                return (
                  <button
                    key={cell.date}
                    onClick={() => cell.hasData && onSelectDate?.(cell.date)}
                    disabled={!cell.hasData || isFuture}
                    className={`
                      rounded-sm transition-all
                      ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
                      ${cell.hasData && !isFuture ? 'cursor-pointer hover:ring-1 hover:ring-slate-500' : 'cursor-default'}
                    `}
                    style={{
                      ...CELL_STYLE,
                      backgroundColor: isFuture ? '#0f172a' : COMPLIANCE_COLORS[cell.status],
                      opacity: isFuture ? 0.3 : 1,
                    }}
                    title={`${cell.date}: ${COMPLIANCE_LABELS[cell.status]}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
        {statusCounts.completed > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: COMPLIANCE_COLORS.completed }}
            />
            <span>Completed ({statusCounts.completed})</span>
          </div>
        )}
        {statusCounts.partial > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: COMPLIANCE_COLORS.partial }}
            />
            <span>Partial ({statusCounts.partial})</span>
          </div>
        )}
        {statusCounts.missed > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: COMPLIANCE_COLORS.missed }}
            />
            <span>Missed ({statusCounts.missed})</span>
          </div>
        )}
        {statusCounts.rest > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: COMPLIANCE_COLORS.rest }}
            />
            <span>Rest ({statusCounts.rest})</span>
          </div>
        )}
      </div>
    </div>
  );
}
