import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  ReferenceDot,
  Scatter,
} from 'recharts';
import type { HistoryPoint, WeightTrendSummary } from '../../../api/types';
import { formatShortDate } from '../../../utils';

interface WeightTrendChartProps {
  points: HistoryPoint[];
  trend?: WeightTrendSummary;
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

interface ChartDataPoint {
  date: string;
  index: number;
  weight: number;
  weightDisplay: number | null;
  isOutlier: boolean;
  hasTraining: boolean;
  trendWeight?: number;
  notes?: string;
}

/**
 * Calculate P5/P95 percentile bounds for Y-axis to prevent outlier distortion.
 * Outliers beyond these bounds are shown at the edge of the chart.
 */
function calculatePercentileBounds(
  weights: number[],
  lowerPercentile = 0.05,
  upperPercentile = 0.95,
  paddingFactor = 0.15
): { min: number; max: number; p5: number; p95: number } {
  if (weights.length === 0) return { min: 70, max: 90, p5: 70, p95: 90 };
  if (weights.length === 1) {
    const w = weights[0];
    return { min: w - 2, max: w + 2, p5: w, p95: w };
  }

  const sorted = [...weights].sort((a, b) => a - b);
  const p5Index = Math.floor(sorted.length * lowerPercentile);
  const p95Index = Math.floor(sorted.length * upperPercentile);
  const p5 = sorted[p5Index] ?? sorted[0];
  const p95 = sorted[p95Index] ?? sorted[sorted.length - 1];

  const range = p95 - p5;
  const padding = range === 0 ? 2 : range * paddingFactor;

  return {
    min: p5 - padding,
    max: p95 + padding,
    p5,
    p95,
  };
}

/**
 * Calculate trend line points using regression coefficients.
 */
function calculateTrendLine(
  points: HistoryPoint[],
  trend: WeightTrendSummary
): { startWeight: number; endWeight: number } {
  return {
    startWeight: trend.startWeightKg,
    endWeight: trend.endWeightKg,
  };
}

export function WeightTrendChart({
  points,
  trend,
  onSelectDate,
  selectedDate,
}: WeightTrendChartProps) {
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(
    null
  );

  const { chartData, bounds, outliers } = useMemo(() => {
    if (points.length === 0) {
      return { chartData: [], bounds: { min: 70, max: 90, p5: 70, p95: 90 }, outliers: [] };
    }

    const weights = points.map((p) => p.weightKg);
    const bounds = calculatePercentileBounds(weights);

    const outlierPoints: ChartDataPoint[] = [];
    const data: ChartDataPoint[] = points.map((point, index) => {
      const isOutlier = point.weightKg < bounds.p5 || point.weightKg > bounds.p95;

      if (isOutlier) {
        outlierPoints.push({
          date: point.date,
          index,
          weight: point.weightKg,
          weightDisplay: null,
          isOutlier: true,
          hasTraining: point.hasTraining,
        });
      }

      // Calculate trend weight at this index
      let trendWeight: number | undefined;
      if (trend && points.length > 1) {
        const trendLine = calculateTrendLine(points, trend);
        const progress = index / (points.length - 1);
        trendWeight = trendLine.startWeight + progress * (trendLine.endWeight - trendLine.startWeight);
      }

      return {
        date: point.date,
        index,
        weight: point.weightKg,
        weightDisplay: isOutlier ? null : point.weightKg,
        isOutlier,
        hasTraining: point.hasTraining,
        trendWeight,
        notes: point.notes,
      };
    });

    return { chartData: data, bounds, outliers: outlierPoints };
  }, [points, trend]);

  const handleBrushChange = useCallback(
    (brushData: { startIndex?: number; endIndex?: number }) => {
      if (brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
        setBrushRange({ startIndex: brushData.startIndex, endIndex: brushData.endIndex });
      }
    },
    []
  );

  const handleChartClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
      if (data?.activePayload?.[0]?.payload && onSelectDate) {
        onSelectDate(data.activePayload[0].payload.date);
      }
    },
    [onSelectDate]
  );

  if (points.length === 0) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        No weight logs yet. Add a daily update to start tracking.
      </div>
    );
  }

  const selectedPoint = chartData.find((d) => d.date === selectedDate);

  return (
    <div className="space-y-2">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            onClick={handleChartClick}
          >
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
              domain={[bounds.min, bounds.max]}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
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
                if (name === 'weightDisplay') return [`${value.toFixed(1)} kg`, 'Weight'];
                if (name === 'trendWeight') return [`${value.toFixed(1)} kg`, 'Trend'];
                return [value, name];
              }}
              labelFormatter={(date: string) => formatShortDate(date)}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0]?.payload as ChartDataPoint | undefined;
                if (!data) return null;

                return (
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      padding: '8px 12px',
                    }}
                  >
                    <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                      {formatShortDate(label)}
                    </p>
                    <p style={{ color: '#f1f5f9', fontSize: 13 }}>
                      Weight: {data.weight.toFixed(1)} kg
                    </p>
                    {data.trendWeight && (
                      <p style={{ color: '#f97316', fontSize: 13 }}>
                        Trend: {data.trendWeight.toFixed(1)} kg
                      </p>
                    )}
                    {data.notes && (
                      <p
                        style={{
                          color: '#f97316',
                          fontSize: 12,
                          fontStyle: 'italic',
                          marginTop: 6,
                          maxWidth: 200,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        📝 {data.notes}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {/* Trend line */}
            {trend && (
              <Line
                type="linear"
                dataKey="trendWeight"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="trendWeight"
                isAnimationActive={false}
              />
            )}

            {/* Weight line */}
            <Line
              type="monotone"
              dataKey="weightDisplay"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload || payload.weightDisplay === null) return null;
                const isSelected = payload.date === selectedDate;
                const hasNotes = !!payload.notes;

                // Pulsing marker for days with notes
                if (hasNotes) {
                  return (
                    <g key={payload.date}>
                      {/* Pulsing outer ring */}
                      <motion.circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth={2}
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                      {/* Main dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 5}
                        fill={isSelected ? '#f97316' : '#fff'}
                        stroke="#f97316"
                        strokeWidth={2}
                        style={{ cursor: onSelectDate ? 'pointer' : 'default' }}
                      />
                      {/* Note indicator */}
                      <circle
                        cx={cx}
                        cy={cy - 10}
                        r={3}
                        fill="#f97316"
                      />
                    </g>
                  );
                }

                return (
                  <circle
                    key={payload.date}
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#38bdf8' : '#fff'}
                    stroke={isSelected ? '#fff' : '#38bdf8'}
                    strokeWidth={2}
                    style={{ cursor: onSelectDate ? 'pointer' : 'default' }}
                  />
                );
              }}
              activeDot={{
                r: 6,
                fill: '#38bdf8',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              name="weightDisplay"
              connectNulls
              isAnimationActive={false}
            />

            {/* Training day markers */}
            <Scatter
              data={chartData.filter((d) => d.hasTraining && !d.isOutlier)}
              dataKey={() => bounds.min + (bounds.max - bounds.min) * 0.02}
              fill="#22c55e"
              shape={(props) => {
                const { cx } = props;
                return <circle cx={cx} cy={props.cy} r={4} fill="#22c55e" opacity={0.9} />;
              }}
              isAnimationActive={false}
            />

            {/* Outlier indicators at top edge */}
            {outliers.map((outlier) => (
              <ReferenceDot
                key={`outlier-${outlier.date}`}
                x={outlier.date}
                y={outlier.weight > bounds.p95 ? bounds.max : bounds.min}
                r={5}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth={2}
                onClick={() => onSelectDate?.(outlier.date)}
                style={{ cursor: 'pointer' }}
              />
            ))}

            {/* Selected point highlight */}
            {selectedPoint && !selectedPoint.isOutlier && (
              <ReferenceLine x={selectedPoint.date} stroke="#38bdf8" strokeDasharray="3 3" />
            )}

            {/* Brush for zoom */}
            <Brush
              dataKey="date"
              height={30}
              stroke="#475569"
              fill="#1e293b"
              tickFormatter={(date: string) => formatShortDate(date)}
              onChange={handleBrushChange}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Training day</span>
          </div>
          {outliers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Outlier ({outliers.length})</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed #f97316' }}></span>
            <span>Trend</span>
          </div>
          {chartData.some((d) => d.notes) && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span>Notes</span>
            </div>
          )}
        </div>
        {brushRange && (
          <span className="text-slate-500">
            Viewing {brushRange.endIndex - brushRange.startIndex + 1} of {points.length} days
          </span>
        )}
      </div>
    </div>
  );
}
