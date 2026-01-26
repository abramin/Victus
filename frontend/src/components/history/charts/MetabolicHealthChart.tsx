import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HistoryPoint, MetabolicTrend } from '../../../api/types';
import { formatShortDate } from '../../../utils';

interface MetabolicHealthChartProps {
  points: HistoryPoint[];
  /** Optional: Average intake data by date for the intake line */
  intakeByDate?: Record<string, number>;
  /** Optional: Insight text to display below the chart */
  insightText?: string;
  /** Optional: Metabolic trend direction */
  trend?: MetabolicTrend;
}

interface ChartDataPoint {
  date: string;
  rawTDEE: number;
  smoothedTDEE: number;
  confidenceBandUpper: number;
  confidenceBandLower: number;
  confidence: number;
  averageIntake?: number;
}

const ROLLING_AVERAGE_WINDOW = 7;
const MAX_CONFIDENCE_SPREAD = 150; // kcal spread at 0% confidence

/**
 * Compute 7-day rolling average for TDEE values to smooth the curve.
 */
function computeRollingAverage(values: number[], window: number = ROLLING_AVERAGE_WINDOW): number[] {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const windowValues = values.slice(start, index + 1);
    const sum = windowValues.reduce((acc, v) => acc + v, 0);
    return sum / windowValues.length;
  });
}

/**
 * Calculate confidence band spread based on TDEE confidence.
 * Low confidence = wider band, high confidence = narrower band.
 */
function calculateConfidenceSpread(confidence: number): number {
  // Spread is inversely proportional to confidence
  // At 0% confidence: 150 kcal spread
  // At 100% confidence: 0 kcal spread
  return (1 - confidence) * MAX_CONFIDENCE_SPREAD;
}

function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

export function MetabolicHealthChart({ points, intakeByDate, insightText, trend }: MetabolicHealthChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    if (points.length === 0) return [];

    const rawTDEEValues = points.map((p) => p.estimatedTDEE);
    const smoothedValues = computeRollingAverage(rawTDEEValues);

    return points.map((point, index) => {
      const smoothed = smoothedValues[index];
      const confidence = point.tdeeConfidence || 0.1;
      const spread = calculateConfidenceSpread(confidence);

      return {
        date: point.date,
        rawTDEE: point.estimatedTDEE,
        smoothedTDEE: smoothed,
        confidenceBandUpper: smoothed + spread,
        confidenceBandLower: smoothed - spread,
        confidence,
        averageIntake: intakeByDate?.[point.date],
      };
    });
  }, [points, intakeByDate]);

  const hasIntakeData = useMemo(() => {
    return chartData.some((d) => d.averageIntake !== undefined && d.averageIntake > 0);
  }, [chartData]);

  const { yDomain, latestTDEE, avgTDEE, avgConfidence, avgIntake } = useMemo(() => {
    if (chartData.length === 0) {
      return { yDomain: [1800, 2800] as [number, number], latestTDEE: 0, avgTDEE: 0, avgConfidence: 0, avgIntake: 0 };
    }

    const allValues = chartData.flatMap((d) => [
      d.confidenceBandUpper,
      d.confidenceBandLower,
      d.rawTDEE,
      ...(d.averageIntake ? [d.averageIntake] : []),
    ]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 100;

    const latestTDEE = chartData[chartData.length - 1].smoothedTDEE;
    const avgTDEE = chartData.reduce((sum, d) => sum + d.smoothedTDEE, 0) / chartData.length;
    const confidenceValues = chartData.map((d) => d.confidence).filter((c) => c > 0);
    const avgConfidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
        : 0;

    const intakeValues = chartData.map((d) => d.averageIntake).filter((v): v is number => v !== undefined && v > 0);
    const avgIntake = intakeValues.length > 0 ? intakeValues.reduce((sum, v) => sum + v, 0) / intakeValues.length : 0;

    return {
      yDomain: [Math.floor(min - padding), Math.ceil(max + padding)] as [number, number],
      latestTDEE,
      avgTDEE,
      avgConfidence,
      avgIntake,
    };
  }, [chartData]);

  if (points.length === 0) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        No TDEE data yet. Add daily updates to see metabolic trends.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Latest TDEE</p>
          <p className="text-lg font-semibold text-white">{formatKcal(latestTDEE)}</p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Average</p>
          <p className="text-lg font-semibold text-white">{formatKcal(avgTDEE)}</p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Avg Confidence</p>
          <p className="text-lg font-semibold text-white">
            {avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : '--'}
          </p>
        </div>
        <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
          <p className="text-xs text-slate-500 mb-1">Data Points</p>
          <p className="text-lg font-semibold text-white">{points.length}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              tickFormatter={(date: string) => formatShortDate(date)}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v: number) => `${v}`}
              width={45}
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
              formatter={(value: number, name: string) => {
                if (name === 'smoothedTDEE') return [formatKcal(value), '7-Day Avg TDEE'];
                if (name === 'rawTDEE') return [formatKcal(value), 'Daily TDEE'];
                if (name === 'averageIntake') return [formatKcal(value), 'Avg Intake'];
                return [value, name];
              }}
              labelFormatter={(date: string) => formatShortDate(date)}
            />

            {/* Confidence band (the "cloud") */}
            <Area
              type="monotone"
              dataKey="confidenceBandUpper"
              stroke="none"
              fill="url(#confidenceGradient)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="confidenceBandLower"
              stroke="none"
              fill="#0f172a"
              fillOpacity={1}
              isAnimationActive={false}
            />

            {/* Raw daily dots (faint) */}
            <Line
              type="monotone"
              dataKey="rawTDEE"
              stroke="none"
              dot={{ fill: '#64748b', r: 2, fillOpacity: 0.4 }}
              isAnimationActive={false}
              name="rawTDEE"
            />

            {/* Smoothed rolling average line (the "truth") */}
            <Line
              type="monotone"
              dataKey="smoothedTDEE"
              stroke="#0ea5e9"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              name="smoothedTDEE"
            />

            {/* Average Intake line (dashed grey) - only if data is available */}
            {hasIntakeData && (
              <Line
                type="monotone"
                dataKey="averageIntake"
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                name="averageIntake"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Confidence bar chart */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Daily Confidence</span>
          <span>
            {chartData.length > 0
              ? `${Math.round(chartData[chartData.length - 1].confidence * 100)}%`
              : '--'}
          </span>
        </div>
        <div className="flex items-end gap-0.5 h-10">
          {chartData.map((point) => (
            <div
              key={point.date}
              className="flex-1 rounded-sm transition-all"
              style={{
                height: `${Math.max(4, Math.round(point.confidence * 100))}%`,
                backgroundColor:
                  point.confidence >= 0.6
                    ? 'rgba(34, 197, 94, 0.6)'
                    : point.confidence >= 0.3
                      ? 'rgba(250, 204, 21, 0.6)'
                      : 'rgba(148, 163, 184, 0.4)',
              }}
              title={`${formatShortDate(point.date)}: ${Math.round(point.confidence * 100)}%`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>{chartData.length > 0 ? formatShortDate(chartData[0].date) : ''}</span>
          <span>
            {chartData.length > 0 ? formatShortDate(chartData[chartData.length - 1].date) : ''}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-1 rounded bg-sky-500"></span>
          <span>7-Day Moving Avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500 opacity-40"></span>
          <span>Daily TDEE</span>
        </div>
        {hasIntakeData && (
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-gray-500"></span>
            <span>Avg Intake</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-2 rounded bg-sky-500/20"></span>
          <span>Confidence Band</span>
        </div>
      </div>

      {/* Insight Text */}
      {insightText && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-start gap-2">
            {trend === 'upregulated' && (
              <span className="text-emerald-400 text-lg">↑</span>
            )}
            {trend === 'downregulated' && (
              <span className="text-orange-400 text-lg">↓</span>
            )}
            {trend === 'stable' && (
              <span className="text-slate-400 text-lg">→</span>
            )}
            <p className="text-sm text-slate-300">{insightText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
