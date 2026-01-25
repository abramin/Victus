import { useMemo, useRef, useEffect } from 'react';
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

interface DayPill {
  date: string;
  label: string;
  dayOfWeek: string;
  status: ComplianceStatus;
  loadIntensity: 'none' | 'low' | 'medium' | 'high';
  isToday: boolean;
  hasData: boolean;
  actualDurationMin: number;
  plannedDurationMin: number;
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
 * Format date as "Jan 24" style label.
 */
function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Convert Date to YYYY-MM-DD string in local timezone.
 */
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same calendar day.
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Generate the day strip pills for the last N days + today.
 */
function generateDayStrip(points: HistoryPoint[], daysBack = 14): DayPill[] {
  const today = new Date();
  const pointsMap = buildPointsMap(points);
  const pills: DayPill[] = [];

  // Generate from (today - daysBack) to today (inclusive)
  for (let offset = -daysBack; offset <= 0; offset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    const dateStr = toDateKey(date);
    const point = pointsMap.get(dateStr);
    const isToday = offset === 0;

    pills.push({
      date: dateStr,
      label: isToday ? 'Today' : formatDayLabel(date),
      dayOfWeek: DAY_NAMES[date.getDay()],
      status: getComplianceStatus(point),
      loadIntensity: getLoadIntensity(point),
      isToday,
      hasData: point !== undefined,
      actualDurationMin: point?.actualDurationMin ?? 0,
      plannedDurationMin: point?.plannedDurationMin ?? 0,
    });
  }
  return pills;
}

export function TrainingCalendarHeatmap({
  points,
  onSelectDate,
  selectedDate,
}: TrainingCalendarHeatmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { pills, stats } = useMemo(() => {
    const pills = generateDayStrip(points, 14);

    // Calculate stats from all available points (not just visible strip)
    const allPointsMap = buildPointsMap(points);
    const today = new Date();

    // Calculate current streak by walking backwards from today
    let currentStreak = 0;
    for (let offset = 0; offset <= 365; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const dateStr = toDateKey(date);
      const point = allPointsMap.get(dateStr);
      const status = getComplianceStatus(point);

      if (status === 'rest' || status === 'no-data') continue;
      if (status === 'completed' || status === 'partial') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate completion rate and total sessions from all points
    let completedDays = 0;
    let plannedDays = 0;
    let totalSessions = 0;

    for (const point of points) {
      const status = getComplianceStatus(point);
      if (status !== 'no-data' && status !== 'rest') {
        plannedDays++;
        if (status === 'completed' || status === 'partial') {
          completedDays++;
          totalSessions++;
        }
      }
    }

    const completionRate = plannedDays > 0 ? Math.round((completedDays / plannedDays) * 100) : 0;

    return {
      pills,
      stats: {
        currentStreak,
        completionRate,
        totalSessions,
      },
    };
  }, [points]);

  // Auto-scroll to show "Today" (rightmost) on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [pills]);

  return (
    <div className="space-y-4">
      {/* Inline Stats Badges */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 rounded-full border border-slate-800">
          <span className="text-base">🔥</span>
          <span className="text-sm text-white font-medium">{stats.currentStreak}</span>
          <span className="text-xs text-slate-500">day streak</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 rounded-full border border-slate-800">
          <span className="text-base">🏆</span>
          <span className="text-sm text-white font-medium">{stats.completionRate}%</span>
          <span className="text-xs text-slate-500">completion</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 rounded-full border border-slate-800">
          <span className="text-base">🏋️</span>
          <span className="text-sm text-white font-medium">{stats.totalSessions}</span>
          <span className="text-xs text-slate-500">sessions</span>
        </div>
      </div>

      {/* Horizontal Day Strip */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {pills.map((pill) => {
          const isSelected = pill.date === selectedDate;
          const color = getCellColor(pill.status, pill.loadIntensity);

          return (
            <button
              key={pill.date}
              onClick={() => pill.hasData && onSelectDate?.(pill.date)}
              disabled={!pill.hasData}
              className={`
                flex flex-col items-center min-w-[56px] py-2.5 px-3 rounded-xl transition-all
                ${pill.isToday ? 'ring-2 ring-emerald-500/70 bg-slate-800' : 'bg-slate-900/50'}
                ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
                ${pill.hasData ? 'cursor-pointer hover:bg-slate-800/70' : 'cursor-default opacity-60'}
              `}
              aria-label={`${pill.date}: ${pill.status}`}
            >
              {/* Day of week */}
              <span className="text-[10px] text-slate-500 mb-1">{pill.dayOfWeek}</span>

              {/* Status dot */}
              <div
                className="w-3 h-3 rounded-full mb-1.5"
                style={{ backgroundColor: color }}
              />

              {/* Date label */}
              <span
                className={`text-xs whitespace-nowrap ${
                  pill.isToday ? 'text-emerald-400 font-medium' : 'text-slate-400'
                }`}
              >
                {pill.label}
              </span>

              {/* Duration indicator (only if has training) */}
              {pill.actualDurationMin > 0 && (
                <span className="text-[10px] text-slate-500 mt-0.5">{pill.actualDurationMin}m</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENSITY_COLORS.high }} />
          <span>Trained</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENSITY_COLORS.missed }} />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENSITY_COLORS.rest }} />
          <span>Rest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: INTENSITY_COLORS['no-data'] }} />
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
}
