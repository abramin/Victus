import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ReferenceDot,
} from 'recharts';
import type { DualTrackAnalysis } from '../../api/types';
import { Card } from '../common/Card';

interface DualTrackChartProps {
  analysis: DualTrackAnalysis;
  /** Tolerance percentage for "Cone of Uncertainty" (default: 0.03 = 3%) */
  tolerancePercent?: number;
}

interface ChartDataPoint {
  weekNumber: number;
  date: string;
  planWeight?: number;
  trendWeight?: number;
  actualWeight?: number;
  /** Upper and lower bounds for cone of uncertainty */
  toleranceZone?: [number, number];
}

export function DualTrackChart({ analysis, tolerancePercent = 0.03 }: DualTrackChartProps) {
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];

    // Add plan projection points
    for (const point of analysis.planProjection) {
      const existing = data.find(d => d.weekNumber === point.weekNumber);
      // Calculate tolerance zone bounds (±tolerancePercent)
      const lower = point.weightKg * (1 - tolerancePercent);
      const upper = point.weightKg * (1 + tolerancePercent);
      
      if (existing) {
        existing.planWeight = point.weightKg;
        existing.date = formatDate(point.date);
        existing.toleranceZone = [lower, upper];
      } else {
        data.push({
          weekNumber: point.weekNumber,
          date: formatDate(point.date),
          planWeight: point.weightKg,
          toleranceZone: [lower, upper],
        });
      }
    }

    // Add trend projection points
    if (analysis.trendProjection) {
      for (const point of analysis.trendProjection) {
        const existing = data.find(d => d.weekNumber === point.weekNumber);
        if (existing) {
          existing.trendWeight = point.weightKg;
        } else {
          data.push({
            weekNumber: point.weekNumber,
            date: formatDate(point.date),
            trendWeight: point.weightKg,
          });
        }
      }
    }

    // Sort by week number
    data.sort((a, b) => a.weekNumber - b.weekNumber);

    // Mark current actual weight
    const currentWeekData = data.find(d => d.weekNumber === analysis.currentWeek);
    if (currentWeekData) {
      currentWeekData.actualWeight = analysis.actualWeightKg;
    }

    return data;
  }, [analysis, tolerancePercent]);

  // Calculate Y-axis domain - include tolerance zone bounds and landing point
  const yDomain = useMemo(() => {
    const allWeights = chartData.flatMap(d =>
      [
        d.planWeight,
        d.trendWeight,
        d.actualWeight,
        d.toleranceZone?.[0],
        d.toleranceZone?.[1]
      ].filter((w): w is number => w !== undefined)
    );

    // Include landing point in y-axis calculation
    if (analysis.landingPoint) {
      allWeights.push(analysis.landingPoint.weightKg);
    }

    if (allWeights.length === 0) return [60, 100];

    const min = Math.min(...allWeights);
    const max = Math.max(...allWeights);
    const padding = (max - min) * 0.1 || 2;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData, analysis.landingPoint]);

  // Find the last week number for landing point placement
  const lastWeekNumber = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => d.weekNumber));
  }, [chartData]);

  return (
    <Card title="Plan vs Reality">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="toleranceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="weekNumber"
              tickFormatter={(week) => `W${week}`}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
              tickFormatter={(v) => `${v}kg`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number | [number, number], name: string) => {
                if (Array.isArray(value)) {
                  return [`${value[0].toFixed(1)} - ${value[1].toFixed(1)} kg`, 'Tolerance Zone'];
                }
                return [
                  `${value.toFixed(1)} kg`,
                  name === 'planWeight' ? 'Plan Projection' :
                  name === 'trendWeight' ? 'Current Trend' :
                  'Actual Weight'
                ];
              }}
              labelFormatter={(week) => `Week ${week}`}
            />
            <Legend
              formatter={(value) =>
                value === 'planWeight' ? 'Plan Projection' :
                value === 'trendWeight' ? 'Current Trend' :
                value === 'toleranceZone' ? 'Tolerance Zone (±3%)' :
                'Actual Weight'
              }
            />

            {/* Cone of Uncertainty - Tolerance Zone */}
            <Area
              type="linear"
              dataKey="toleranceZone"
              fill="url(#toleranceGradient)"
              stroke="none"
              name="toleranceZone"
              legendType="square"
            />

            {/* Plan projection line (grey dashed per UX spec) */}
            <Line
              type="linear"
              dataKey="planWeight"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name="planWeight"
            />

            {/* Trend projection line (blue solid - actual smoothed weight trend) */}
            {analysis.trendProjection && analysis.trendProjection.length > 0 && (
              <Line
                type="linear"
                dataKey="trendWeight"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                name="trendWeight"
              />
            )}

            {/* Actual weight point */}
            <ReferenceDot
              x={analysis.currentWeek}
              y={analysis.actualWeightKg}
              r={6}
              fill="#10b981"
              stroke="white"
              strokeWidth={2}
            />

            {/* Landing point marker (where user will end up at current pace) */}
            {analysis.landingPoint && (
              <ReferenceDot
                x={lastWeekNumber}
                y={analysis.landingPoint.weightKg}
                r={8}
                fill="#f97316"
                stroke="white"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explanation */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-blue-100 border border-blue-200 rounded-sm" />
          <span className="text-gray-600">Tolerance Zone (±3%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-gray-400" style={{ borderTop: '2px dashed #9ca3af' }} />
          <span className="text-gray-600">Plan Projection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span className="text-gray-600">Actual Trend</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Current Weight</span>
        </div>
        {analysis.landingPoint && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600">
              Projected Landing ({analysis.landingPoint.weightKg.toFixed(1)} kg)
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
