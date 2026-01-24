import { useMemo } from 'react';
import {
  LineChart,
  Line,
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
}

interface ChartDataPoint {
  weekNumber: number;
  date: string;
  planWeight?: number;
  trendWeight?: number;
  actualWeight?: number;
}

export function DualTrackChart({ analysis }: DualTrackChartProps) {
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = [];

    // Add plan projection points
    for (const point of analysis.planProjection) {
      const existing = data.find(d => d.weekNumber === point.weekNumber);
      if (existing) {
        existing.planWeight = point.weightKg;
        existing.date = formatDate(point.date);
      } else {
        data.push({
          weekNumber: point.weekNumber,
          date: formatDate(point.date),
          planWeight: point.weightKg,
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
  }, [analysis]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    const allWeights = chartData.flatMap(d =>
      [d.planWeight, d.trendWeight, d.actualWeight].filter((w): w is number => w !== undefined)
    );
    if (allWeights.length === 0) return [60, 100];

    const min = Math.min(...allWeights);
    const max = Math.max(...allWeights);
    const padding = (max - min) * 0.1 || 2;

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  return (
    <Card title="Plan vs Trend Projection">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
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
              formatter={(value: number, name: string) => [
                `${value.toFixed(1)} kg`,
                name === 'planWeight' ? 'Plan Projection' :
                name === 'trendWeight' ? 'Current Trend' :
                'Actual Weight'
              ]}
              labelFormatter={(week) => `Week ${week}`}
            />
            <Legend
              formatter={(value) =>
                value === 'planWeight' ? 'Plan Projection' :
                value === 'trendWeight' ? 'Current Trend Projection' :
                'Actual Weight'
              }
            />

            {/* Plan projection line */}
            <Line
              type="linear"
              dataKey="planWeight"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="planWeight"
            />

            {/* Trend projection line */}
            {analysis.trendProjection && analysis.trendProjection.length > 0 && (
              <Line
                type="linear"
                dataKey="trendWeight"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
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
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explanation */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span className="text-gray-600">Plan Projection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-amber-500" style={{ borderTop: '2px dashed #f59e0b' }} />
          <span className="text-gray-600">Current Trend Projection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Current Weight</span>
        </div>
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
