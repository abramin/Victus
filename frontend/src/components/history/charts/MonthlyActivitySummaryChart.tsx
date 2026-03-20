import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlySummary, TrainingType } from '../../../api/types';

interface MonthlyActivitySummaryChartProps {
  summaries: MonthlySummary[];
}

interface ChartRow {
  month: string;
  monthKey: string;
  [activityType: string]: number | string;
}

const ACTIVITY_COLORS: Partial<Record<TrainingType, string>> = {
  run: '#38bdf8',
  cycle: '#22c55e',
  strength: '#f97316',
  walking: '#a3e635',
  mixed: '#c084fc',
  hiit: '#ef4444',
  row: '#14b8a6',
  mobility: '#f59e0b',
  calisthenics: '#eab308',
  qigong: '#10b981',
  gmb: '#34d399',
  rest: '#64748b',
};

const ACTIVITY_ORDER: TrainingType[] = [
  'run',
  'cycle',
  'strength',
  'walking',
  'mixed',
  'hiit',
  'row',
  'calisthenics',
  'mobility',
  'qigong',
  'gmb',
  'rest',
];

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatActivityLabel(activityType: string): string {
  return activityType.charAt(0).toUpperCase() + activityType.slice(1);
}

export function MonthlyActivitySummaryChart({
  summaries,
}: MonthlyActivitySummaryChartProps) {
  const { data, activityKeys, totalSessions, monthCount } = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    const keySet = new Set<string>();
    let total = 0;

    for (const summary of summaries) {
      if (!summary.yearMonth || summary.sessionCount <= 0) {
        continue;
      }
      if (!monthMap.has(summary.yearMonth)) {
        monthMap.set(summary.yearMonth, {});
      }
      const monthBucket = monthMap.get(summary.yearMonth)!;
      const current = monthBucket[summary.activityType] ?? 0;
      monthBucket[summary.activityType] = current + summary.sessionCount;
      keySet.add(summary.activityType);
      total += summary.sessionCount;
    }

    const sortedMonths = Array.from(monthMap.keys()).sort();
    const orderedActivityKeys = Array.from(keySet).sort((a, b) => {
      const aIdx = ACTIVITY_ORDER.indexOf(a as TrainingType);
      const bIdx = ACTIVITY_ORDER.indexOf(b as TrainingType);
      const left = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
      const right = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
      if (left === right) return a.localeCompare(b);
      return left - right;
    });

    const rows: ChartRow[] = sortedMonths.map((monthKey) => {
      const monthData = monthMap.get(monthKey) ?? {};
      const row: ChartRow = {
        month: formatMonthLabel(monthKey),
        monthKey,
      };
      for (const key of orderedActivityKeys) {
        row[key] = monthData[key] ?? 0;
      }
      return row;
    });

    return {
      data: rows,
      activityKeys: orderedActivityKeys,
      totalSessions: total,
      monthCount: sortedMonths.length,
    };
  }, [summaries]);

  if (data.length === 0) {
    return (
      <div className="h-48 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        No monthly activity summaries yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Imported Sessions</p>
          <p className="text-lg font-semibold text-white">{totalSessions}</p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Months Covered</p>
          <p className="text-lg font-semibold text-white">{monthCount}</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              allowDecimals={false}
              width={32}
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
              formatter={(value: number, key: string) => [
                `${value} sessions`,
                formatActivityLabel(key),
              ]}
            />
            <Legend
              formatter={(value) => formatActivityLabel(value)}
              wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
            />
            {activityKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="sessions"
                fill={ACTIVITY_COLORS[key as TrainingType] ?? '#64748b'}
                name={key}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
