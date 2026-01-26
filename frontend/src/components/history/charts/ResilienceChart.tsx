import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { HistoryPoint } from '../../../api/types';
import { formatShortDate } from '../../../utils';

interface ResilienceChartProps {
  points: HistoryPoint[];
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

interface ChartDataPoint {
  date: string;
  hrvMs?: number;
  trainingLoad?: number;
  baselineUpper?: number;
  baselineLower?: number;
  baseline?: number;
  status?: 'optimized' | 'strained' | 'depleted';
}

// CNS deviation thresholds (matching backend)
const CNS_OPTIMIZED_THRESHOLD = -0.10;
const CNS_STRAINED_THRESHOLD = -0.20;
const HRV_BASELINE_WINDOW = 7;

function calculateBaseline(hrvValues: (number | undefined)[], index: number): number | undefined {
  // Get the previous 7 days (not including current)
  const start = Math.max(0, index - HRV_BASELINE_WINDOW);
  const validValues = hrvValues.slice(start, index).filter((v): v is number => v !== undefined);

  if (validValues.length < 3) return undefined;

  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}

function getCNSStatus(current: number, baseline: number): 'optimized' | 'strained' | 'depleted' {
  const deviation = (current - baseline) / baseline;
  if (deviation < CNS_STRAINED_THRESHOLD) return 'depleted';
  if (deviation < CNS_OPTIMIZED_THRESHOLD) return 'strained';
  return 'optimized';
}

function getHrvColor(status?: 'optimized' | 'strained' | 'depleted'): string {
  switch (status) {
    case 'depleted': return '#ef4444'; // red
    case 'strained': return '#eab308'; // yellow
    case 'optimized': return '#22c55e'; // green
    default: return '#94a3b8'; // gray
  }
}

/**
 * Resilience chart showing HRV (line) vs Training Load (bars).
 * Visualizes CNS stress and recovery patterns with baseline river band.
 */
export function ResilienceChart({
  points,
  onSelectDate,
}: ResilienceChartProps) {
  const chartData = useMemo(() => {
    // Extract HRV values for baseline calculation
    const hrvValues = points.map((p) => p.hrvMs);

    return points.map((point, index): ChartDataPoint => {
      const baseline = calculateBaseline(hrvValues, index);
      const status = point.hrvMs !== undefined && baseline !== undefined
        ? getCNSStatus(point.hrvMs, baseline)
        : undefined;

      return {
        date: point.date,
        hrvMs: point.hrvMs,
        trainingLoad: point.trainingLoad,
        baseline,
        baselineUpper: baseline !== undefined ? baseline * 1.1 : undefined,
        baselineLower: baseline !== undefined ? baseline * 0.9 : undefined,
        status,
      };
    });
  }, [points]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload && onSelectDate) {
      onSelectDate(data.activePayload[0].payload.date);
    }
  };

  // Check if we have any HRV data
  const hasHrvData = chartData.some((d) => d.hrvMs !== undefined);
  const hasTrainingLoad = chartData.some((d) => d.trainingLoad !== undefined);

  if (chartData.length === 0 || !hasHrvData) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm text-center px-4">
        <div>
          <p>No HRV data available.</p>
          <p className="text-xs mt-1">
            Log HRV from your wearable in your morning check-in to track CNS resilience.
          </p>
        </div>
      </div>
    );
  }

  // Calculate y-axis domain for HRV
  const hrvValues = chartData.map((d) => d.hrvMs).filter((v): v is number => v !== undefined);
  const minHrv = Math.min(...hrvValues);
  const maxHrv = Math.max(...hrvValues);
  const hrvPadding = (maxHrv - minHrv) * 0.2 || 20;
  const hrvDomain = [Math.floor(minHrv - hrvPadding), Math.ceil(maxHrv + hrvPadding)];

  // Calculate average baseline for reference line
  const baselines = chartData.map((d) => d.baseline).filter((v): v is number => v !== undefined);
  const avgBaseline = baselines.length > 0 ? baselines.reduce((a, b) => a + b, 0) / baselines.length : undefined;

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

          {/* Left Y-axis: HRV (ms) */}
          <YAxis
            yAxisId="hrv"
            orientation="left"
            domain={hrvDomain}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `${v}`}
            stroke="#475569"
            label={{
              value: 'ms',
              angle: -90,
              position: 'insideLeft',
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />

          {/* Right Y-axis: Training Load */}
          {hasTrainingLoad && (
            <YAxis
              yAxisId="load"
              orientation="right"
              domain={[0, 'auto']}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              stroke="#475569"
              label={{
                value: 'Load',
                angle: 90,
                position: 'insideRight',
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
          )}

          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelFormatter={(date) => formatShortDate(date as string)}
            formatter={(value: number, name: string) => {
              if (name === 'hrvMs') {
                return [`${value} ms`, 'HRV'];
              }
              if (name === 'trainingLoad') {
                return [value.toFixed(0), 'Training Load'];
              }
              if (name === 'baseline') {
                return [`${value.toFixed(0)} ms`, 'Baseline'];
              }
              return [value, name];
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => {
              if (value === 'hrvMs') return 'HRV';
              if (value === 'trainingLoad') return 'Training Load';
              if (value === 'baseline') return '7-Day Baseline';
              return value;
            }}
          />

          {/* Baseline reference line */}
          {avgBaseline !== undefined && (
            <ReferenceLine
              yAxisId="hrv"
              y={avgBaseline}
              stroke="#6366f1"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}

          {/* Training Load bars (blue) */}
          {hasTrainingLoad && (
            <Bar
              yAxisId="load"
              dataKey="trainingLoad"
              fill="#3b82f6"
              fillOpacity={0.4}
              radius={[2, 2, 0, 0]}
              name="trainingLoad"
            />
          )}

          {/* Baseline line (dashed purple) */}
          <Line
            yAxisId="hrv"
            type="monotone"
            dataKey="baseline"
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            name="baseline"
            connectNulls
          />

          {/* HRV line with dynamic color based on status */}
          <Line
            yAxisId="hrv"
            type="monotone"
            dataKey="hrvMs"
            stroke="#22c55e"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (cx === undefined || cy === undefined) return null;
              const color = getHrvColor(payload.status);
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={color}
                  stroke={color}
                  strokeWidth={1}
                />
              );
            }}
            activeDot={{ r: 6, fill: '#22c55e' }}
            name="hrvMs"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
