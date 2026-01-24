import { useMemo, useState } from 'react';
import type { HistoryPoint } from '../../../api/types';

interface TrainingCalendarHeatmapProps {
  /** History points - uses extended fields if available */
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
  monthIndex: number;
  status: ComplianceStatus;
  hasData: boolean;
  loadIntensity: 'none' | 'low' | 'medium' | 'high';
  actualDurationMin: number;
  plannedDurationMin: number;
}

interface MonthLabel {
  month: string;
  startColumn: number;
  colSpan: number;
}

// Intensity thresholds based on duration (approximate load proxy)
const INTENSITY_THRESHOLDS = {
  low: 30, // < 30 min
  medium: 60, // 30-60 min
  high: 90, // > 60 min (displayed as 90+ effectively)
};

// Color palette for the heatmap - GitHub-style greens with intensity
const INTENSITY_COLORS = {
  'no-data': '#1e293b', // Slate-800 - neutral empty
  rest: '#374151', // Gray-700 - rest days
  missed: '#7f1d1d', // Red-900 - only for actual missed planned sessions
  low: '#166534', // Green-800
  medium: '#15803d', // Green-700
  high: '#22c55e', // Green-500 (brightest)
};

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Determine compliance status from training data.
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
 * Determine load intensity from actual duration.
 */
function getLoadIntensity(point: HistoryPoint | undefined): 'none' | 'low' | 'medium' | 'high' {
  if (!point || point.actualDurationMin === 0) return 'none';

  const duration = point.actualDurationMin;
  if (duration >= INTENSITY_THRESHOLDS.high) return 'high';
  if (duration >= INTENSITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

/**
 * Get color for a cell based on status and intensity.
 */
function getCellColor(status: ComplianceStatus, intensity: 'none' | 'low' | 'medium' | 'high'): string {
  if (status === 'no-data') return INTENSITY_COLORS['no-data'];
  if (status === 'rest') return INTENSITY_COLORS.rest;
  if (status === 'missed') return INTENSITY_COLORS.missed;

  // For completed/partial, use intensity-based greens
  if (intensity === 'none') return INTENSITY_COLORS.low;
  return INTENSITY_COLORS[intensity];
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

/**
 * Get the Monday of the week for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1, Sunday = 0 (we want Monday first)
  d.setDate(d.getDate() + diff);
  return d;
}

export function TrainingCalendarHeatmap({
  points,
  onSelectDate,
  selectedDate,
}: TrainingCalendarHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<DayCell | null>(null);

  const { cells, weeks, monthLabels, stats } = useMemo(() => {
    const today = new Date();
    const pointsMap = buildPointsMap(points);

    // Generate 6 months of data (approximately 26 weeks)
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 6);

    // Adjust to start from Monday
    const gridStart = getWeekStart(startDate);

    const cells: DayCell[] = [];
    const weeksSet = new Set<number>();
    const monthsMap = new Map<string, { startWeek: number; endWeek: number }>();

    let currentDate = new Date(gridStart);
    let weekIndex = 0;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      // Convert Sunday (0) to position 6, Monday (1) to position 0, etc.
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      // Start a new week on Monday
      if (adjustedDayOfWeek === 0 && cells.length > 0) {
        weekIndex++;
      }

      const point = pointsMap.get(dateStr);
      const status = getComplianceStatus(point);
      const intensity = getLoadIntensity(point);

      // Track month labels
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, { startWeek: weekIndex, endWeek: weekIndex });
      } else {
        const existing = monthsMap.get(monthKey)!;
        existing.endWeek = weekIndex;
      }

      cells.push({
        date: dateStr,
        dayOfWeek: adjustedDayOfWeek,
        monthIndex: currentDate.getMonth(),
        status,
        hasData: point !== undefined,
        loadIntensity: intensity,
        actualDurationMin: point?.actualDurationMin ?? 0,
        plannedDurationMin: point?.plannedDurationMin ?? 0,
      });

      weeksSet.add(weekIndex);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate month labels
    const monthLabels: MonthLabel[] = [];
    monthsMap.forEach((value, key) => {
      const [, monthNum] = key.split('-');
      monthLabels.push({
        month: MONTH_NAMES[parseInt(monthNum)],
        startColumn: value.startWeek,
        colSpan: value.endWeek - value.startWeek + 1,
      });
    });

    // Calculate stats
    const completedDays = cells.filter((c) => c.status === 'completed' || c.status === 'partial').length;
    const missedDays = cells.filter((c) => c.status === 'missed').length;
    const plannedDays = cells.filter((c) => c.status !== 'no-data' && c.status !== 'rest').length;
    const completionRate = plannedDays > 0 ? Math.round((completedDays / plannedDays) * 100) : 0;

    // Calculate current streak
    let currentStreak = 0;
    const reversedCells = [...cells].reverse();
    for (const cell of reversedCells) {
      if (cell.status === 'rest' || cell.status === 'no-data') continue;
      if (cell.status === 'completed' || cell.status === 'partial') {
        currentStreak++;
      } else {
        break;
      }
    }

    const totalSessions = cells.reduce(
      (sum, c) => sum + (c.hasData && (c.status === 'completed' || c.status === 'partial') ? 1 : 0),
      0
    );

    return {
      cells,
      weeks: weeksSet.size,
      monthLabels,
      stats: {
        currentStreak,
        completionRate,
        totalSessions,
        missedDays,
      },
    };
  }, [points]);

  // Group cells by day of week (row) and week (column)
  const grid = useMemo(() => {
    // Create 7 rows (Mon-Sun), each with columns for each week
    const rows: (DayCell | null)[][] = Array.from({ length: 7 }, () => Array(weeks).fill(null));

    for (const cell of cells) {
      // Find which week column this cell belongs to
      const firstDate = cells[0]?.date;
      if (!firstDate) continue;

      const daysSinceStart = Math.floor(
        (new Date(cell.date).getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const weekColumn = Math.floor(daysSinceStart / 7);

      if (weekColumn >= 0 && weekColumn < weeks) {
        rows[cell.dayOfWeek][weekColumn] = cell;
      }
    }

    return rows;
  }, [cells, weeks]);

  const cellSize = 12;
  const cellGap = 3;
  const dayLabelWidth = 32;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-fit">
            {/* Month labels */}
            <div className="flex mb-1" style={{ marginLeft: dayLabelWidth }}>
              {monthLabels.map((label, i) => (
                <div
                  key={`${label.month}-${i}`}
                  className="text-xs text-slate-500"
                  style={{
                    width: label.colSpan * (cellSize + cellGap),
                    flexShrink: 0,
                  }}
                >
                  {label.month}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="flex flex-col" style={{ gap: cellGap }}>
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center" style={{ gap: cellGap }}>
                  {/* Day label */}
                  <div
                    className="text-xs text-slate-500 flex-shrink-0"
                    style={{ width: dayLabelWidth, textAlign: 'right', paddingRight: 8 }}
                  >
                    {DAY_LABELS[rowIndex]}
                  </div>

                  {/* Week cells */}
                  {row.map((cell, colIndex) => {
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${colIndex}`}
                          className="rounded-sm"
                          style={{
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: INTENSITY_COLORS['no-data'],
                            opacity: 0.3,
                          }}
                        />
                      );
                    }

                    const isSelected = cell.date === selectedDate;
                    const isHovered = hoveredCell?.date === cell.date;
                    const isFuture = new Date(cell.date) > new Date();
                    const color = getCellColor(cell.status, cell.loadIntensity);

                    return (
                      <button
                        key={cell.date}
                        onClick={() => cell.hasData && onSelectDate?.(cell.date)}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        disabled={!cell.hasData || isFuture}
                        className={`
                          rounded-sm transition-all
                          ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
                          ${cell.hasData && !isFuture ? 'cursor-pointer hover:ring-1 hover:ring-slate-400' : 'cursor-default'}
                        `}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: isFuture ? '#0f172a' : color,
                          opacity: isFuture ? 0.2 : isHovered ? 1 : 0.9,
                          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                        }}
                        aria-label={`${cell.date}: ${cell.status}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Intensity legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500" style={{ marginLeft: dayLabelWidth }}>
              <span>Less</span>
              <div
                className="rounded-sm"
                style={{ width: cellSize, height: cellSize, backgroundColor: INTENSITY_COLORS.rest }}
              />
              <div
                className="rounded-sm"
                style={{ width: cellSize, height: cellSize, backgroundColor: INTENSITY_COLORS.low }}
              />
              <div
                className="rounded-sm"
                style={{ width: cellSize, height: cellSize, backgroundColor: INTENSITY_COLORS.medium }}
              />
              <div
                className="rounded-sm"
                style={{ width: cellSize, height: cellSize, backgroundColor: INTENSITY_COLORS.high }}
              />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="w-full md:w-48 flex-shrink-0 space-y-3">
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔥</span>
              <span className="text-xs text-slate-500">Current Streak</span>
            </div>
            <p className="text-xl font-semibold text-white">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
            </p>
          </div>

          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏆</span>
              <span className="text-xs text-slate-500">Completion Rate</span>
            </div>
            <p className="text-xl font-semibold text-white">{stats.completionRate}%</p>
          </div>

          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏋️</span>
              <span className="text-xs text-slate-500">Total Sessions</span>
            </div>
            <p className="text-xl font-semibold text-white">{stats.totalSessions}</p>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredCell && (
        <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
          <span className="text-slate-400">
            {new Date(hoveredCell.date + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            :
          </span>
          <span className="text-white ml-2">
            {hoveredCell.status === 'no-data' && 'No data logged'}
            {hoveredCell.status === 'rest' && 'Rest day'}
            {hoveredCell.status === 'missed' && `Missed • Planned ${hoveredCell.plannedDurationMin} min`}
            {(hoveredCell.status === 'completed' || hoveredCell.status === 'partial') &&
              `${hoveredCell.actualDurationMin} min trained`}
          </span>
          {hoveredCell.loadIntensity !== 'none' && (
            <span className="text-slate-400 ml-2">
              • Load: {hoveredCell.loadIntensity.charAt(0).toUpperCase() + hoveredCell.loadIntensity.slice(1)}
            </span>
          )}
        </div>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: INTENSITY_COLORS.high }}
          />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: INTENSITY_COLORS.missed }}
          />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: INTENSITY_COLORS.rest }}
          />
          <span>Rest Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: INTENSITY_COLORS['no-data'] }}
          />
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
}
