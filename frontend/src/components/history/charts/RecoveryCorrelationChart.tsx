import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HistoryPoint } from '../../../api/types';
import { formatShortDate } from '../../../utils';

interface RecoveryCorrelationChartProps {
  points: HistoryPoint[];
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

interface ChartDataPoint {
  date: string;
  restingHeartRate?: number;
  sleepHours?: number;
}

/**
 * Recovery correlation chart showing RHR (line) vs Sleep (bars).
 * Helps visualize stress/recovery patterns over time.
 */
export function RecoveryCorrelationChart({
  points,
  onSelectDate,
}: RecoveryCorrelationChartProps) {
  const chartData = useMemo(() => {
    // Filter to only points with recovery data
    const pointsWithRecovery = points.filter(
      (p) => p.restingHeartRate !== undefined || p.sleepHours !== undefined
    );

    return pointsWithRecovery.map((point) => ({
      date: point.date,
      restingHeartRate: point.restingHeartRate,
      sleepHours: point.sleepHours,
    }));
  }, [points]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload && onSelectDate) {
      onSelectDate(data.activePayload[0].payload.date);
    }
  };

  // Check if we have any recovery data at all
  const hasRhrData = chartData.some((d) => d.restingHeartRate !== undefined);
  const hasSleepData = chartData.some((d) => d.sleepHours !== undefined);

  if (chartData.length === 0 || (!hasRhrData && !hasSleepData)) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm text-center px-4">
        <div>
          <p>No recovery data available.</p>
          <p className="text-xs mt-1">
            Log resting heart rate and sleep hours in your daily updates to track recovery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          onClick={handleChartClick}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(date) => formatShortDate(date)}
            stroke="#475569"
          />

          {/* Left Y-axis: RHR (bpm) */}
          <YAxis
            yAxisId="rhr"
            orientation="left"
            domain={[40, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `${v}`}
            stroke="#475569"
            label={{
              value: 'bpm',
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />

          {/* Right Y-axis: Sleep (hours) */}
          <YAxis
            yAxisId="sleep"
            orientation="right"
            domain={[0, 12]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `${v}h`}
            stroke="#475569"
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelFormatter={(date) => formatShortDate(date as string)}
            formatter={(value: number, name: string) => {
              if (name === 'restingHeartRate') {
                return [`${value} bpm`, 'Resting HR'];
              }
              if (name === 'sleepHours') {
                return [`${value.toFixed(1)} hours`, 'Sleep'];
              }
              return [value, name];
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => {
              if (value === 'restingHeartRate') return 'Resting HR';
              if (value === 'sleepHours') return 'Sleep';
              return value;
            }}
          />

          {/* Sleep bars (blue) */}
          {hasSleepData && (
            <Bar
              yAxisId="sleep"
              dataKey="sleepHours"
              fill="#3b82f6"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
              name="sleepHours"
            />
          )}

          {/* RHR line (red) */}
          {hasRhrData && (
            <Line
              yAxisId="rhr"
              type="monotone"
              dataKey="restingHeartRate"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
              activeDot={{ r: 5, fill: '#ef4444' }}
              name="restingHeartRate"
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
