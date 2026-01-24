import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { HistoryPoint, TrainingSummaryRange } from '../../../api/types';

interface TrainingVolumeChartProps {
  /** History points with training data */
  points: HistoryPoint[];
  /** Aggregate training summary for the period */
  trainingSummary?: TrainingSummaryRange;
}

interface WeeklyData {
  weekLabel: string;
  weekStart: string;
  plannedMin: number;
  actualMin: number;
  compliancePercent: number;
}

/**
 * Group points by ISO week and aggregate training duration.
 * Uses plannedDurationMin and actualDurationMin from each HistoryPoint.
 */
function groupByWeek(points: HistoryPoint[]): WeeklyData[] {
  if (points.length === 0) return [];

  const weeks = new Map<string, { planned: number; actual: number; startDate: string }>();

  for (const point of points) {
    const date = new Date(point.date + 'T00:00:00');
    // Get ISO week start (Monday)
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, { planned: 0, actual: 0, startDate: weekKey });
    }

    const week = weeks.get(weekKey)!;
    week.planned += point.plannedDurationMin;
    week.actual += point.actualDurationMin;
  }

  // Convert to array and sort by date
  const weekArray = Array.from(weeks.entries())
    .map(([_, data]) => data)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Format for chart
  return weekArray.map((week) => {
    const weekDate = new Date(week.startDate);
    const month = weekDate.toLocaleDateString('en-US', { month: 'short' });
    const day = weekDate.getDate();

    return {
      weekLabel: `${month} ${day}`,
      weekStart: week.startDate,
      plannedMin: week.planned,
      actualMin: week.actual,
      compliancePercent: week.planned > 0 ? Math.round((week.actual / week.planned) * 100) : 100,
    };
  });
}

/**
 * Get color based on compliance percentage.
 */
function getComplianceColor(percent: number): string {
  if (percent >= 90) return '#22c55e'; // Green
  if (percent >= 70) return '#84cc16'; // Lime
  if (percent >= 50) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

export function TrainingVolumeChart({ points, trainingSummary }: TrainingVolumeChartProps) {
  const weeklyData = useMemo(() => groupByWeek(points), [points]);

  const totals = useMemo(() => {
    if (trainingSummary) {
      return {
        plannedSessions: trainingSummary.planned.sessionCount,
        actualSessions: trainingSummary.actual.sessionCount,
        plannedMin: trainingSummary.planned.totalDurationMin,
        actualMin: trainingSummary.actual.totalDurationMin,
        plannedLoad: trainingSummary.planned.totalLoadScore,
        actualLoad: trainingSummary.actual.totalLoadScore,
      };
    }

    // Calculate from weekly data if no summary
    const planned = weeklyData.reduce((sum, w) => sum + w.plannedMin, 0);
    const actual = weeklyData.reduce((sum, w) => sum + w.actualMin, 0);
    return {
      plannedSessions: 0,
      actualSessions: 0,
      plannedMin: planned,
      actualMin: actual,
      plannedLoad: 0,
      actualLoad: 0,
    };
  }, [trainingSummary, weeklyData]);

  const durationDelta = totals.actualMin - totals.plannedMin;
  const overallCompliance =
    totals.plannedMin > 0 ? Math.round((totals.actualMin / totals.plannedMin) * 100) : 100;

  if (points.length === 0) {
    return (
      <div className="h-48 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        No training data yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Planned Sessions</p>
          <p className="text-lg font-semibold text-white">{totals.plannedSessions}</p>
          <p className="text-xs text-slate-400 mt-1">{totals.plannedMin} min</p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Actual Sessions</p>
          <p className="text-lg font-semibold text-white">{totals.actualSessions}</p>
          <p className="text-xs text-slate-400 mt-1">{totals.actualMin} min</p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Compliance</p>
          <p
            className="text-lg font-semibold"
            style={{ color: getComplianceColor(overallCompliance) }}
          >
            {overallCompliance}%
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Duration Delta</p>
          <p
            className={`text-lg font-semibold ${durationDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {durationDelta >= 0 ? '+' : ''}
            {durationDelta} min
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v: number) => `${v}m`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: 12 }}
              itemStyle={{ color: '#f1f5f9', fontSize: 13 }}
              formatter={(value: number, name: string) => [
                `${value} min`,
                name === 'plannedMin' ? 'Planned' : 'Actual',
              ]}
            />
            <Legend
              formatter={(value) => (value === 'plannedMin' ? 'Planned' : 'Actual')}
              wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
            />

            {/* Planned bar (ghost/outline style) */}
            <Bar
              dataKey="plannedMin"
              fill="none"
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="4 2"
              radius={[4, 4, 0, 0]}
              name="plannedMin"
            />

            {/* Actual bar (solid, colored by compliance) */}
            <Bar dataKey="actualMin" radius={[4, 4, 0, 0]} name="actualMin">
              {weeklyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getComplianceColor(entry.compliancePercent)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compliance indicator */}
      <div className="text-xs text-slate-500">
        {durationDelta === 0 ? (
          'On plan for total duration.'
        ) : durationDelta > 0 ? (
          <span className="text-emerald-400">
            +{durationDelta} min above plan ({overallCompliance}% compliance)
          </span>
        ) : (
          <span className="text-amber-400">
            {durationDelta} min below plan ({overallCompliance}% compliance)
          </span>
        )}
      </div>
    </div>
  );
}
