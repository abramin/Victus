import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HistoryPoint } from '../../../api/types';
import { formatShortDate } from '../../../utils';

interface MetabolicHealthChartProps {
  points: HistoryPoint[];
}

interface ChartDataPoint {
  date: string;
  rawTDEE: number;
  smoothedTDEE: number;
  confidenceBandUpper: number;
  confidenceBandLower: number;
  confidence: number;
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

export function MetabolicHealthChart({ points }: MetabolicHealthChartProps) {
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
      };
    });
  }, [points]);

  const { yDomain, latestTDEE, avgTDEE, avgConfidence } = useMemo(() => {
    if (chartData.length === 0) {
      return { yDomain: [1800, 2800] as [number, number], latestTDEE: 0, avgTDEE: 0, avgConfidence: 0 };
    }

    const allValues = chartData.flatMap((d) => [
      d.confidenceBandUpper,
      d.confidenceBandLower,
      d.rawTDEE,
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

    return {
      yDomain: [Math.floor(min - padding), Math.ceil(max + padding)] as [number, number],
      latestTDEE,
      avgTDEE,
      avgConfidence,
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
                if (name === 'smoothedTDEE') return [formatKcal(value), '7-Day Avg'];
                if (name === 'rawTDEE') return [formatKcal(value), 'Daily TDEE'];
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
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-1 rounded bg-sky-500"></span>
          <span>7-Day Moving Avg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-500 opacity-40"></span>
          <span>Daily TDEE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-2 rounded bg-sky-500/20"></span>
          <span>Confidence Band</span>
        </div>
      </div>
    </div>
  );
}
