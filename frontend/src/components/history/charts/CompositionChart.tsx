import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HistoryPoint } from '../../../api/types';
import { formatShortDate } from '../../../utils';

interface CompositionChartProps {
  points: HistoryPoint[];
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

interface ChartDataPoint {
  date: string;
  leanMassKg: number;
  fatMassKg: number;
  totalWeightKg: number;
  bodyFatPercent: number;
}

export function CompositionChart({
  points,
  onSelectDate,
  selectedDate,
}: CompositionChartProps) {
  const { chartData, bounds } = useMemo(() => {
    // Filter to only points with body fat data
    const pointsWithBodyFat = points.filter(
      (p) => p.bodyFatPercent !== undefined && p.leanMassKg !== undefined && p.fatMassKg !== undefined
    );

    if (pointsWithBodyFat.length === 0) {
      return { chartData: [], bounds: { min: 0, max: 100 } };
    }

    const data: ChartDataPoint[] = pointsWithBodyFat.map((point) => ({
      date: point.date,
      leanMassKg: point.leanMassKg!,
      fatMassKg: point.fatMassKg!,
      totalWeightKg: point.weightKg,
      bodyFatPercent: point.bodyFatPercent!,
    }));

    // Calculate Y-axis bounds based on total weight
    const weights = data.map((d) => d.totalWeightKg);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = (maxWeight - minWeight) * 0.1 || 2;

    return {
      chartData: data,
      bounds: {
        min: Math.max(0, minWeight - padding - 10), // Extra buffer for stacked view
        max: maxWeight + padding,
      },
    };
  }, [points]);

  const handleChartClick = (data: { activePayload?: Array<{ payload: ChartDataPoint }> }) => {
    if (data?.activePayload?.[0]?.payload && onSelectDate) {
      onSelectDate(data.activePayload[0].payload.date);
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm text-center px-4">
        <div>
          <p>No body composition data available.</p>
          <p className="text-xs mt-1">Log body fat % in your daily updates to track composition.</p>
        </div>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm text-center px-4">
        <div>
          <p>Need at least 2 data points with body fat.</p>
          <p className="text-xs mt-1">Currently have {chartData.length} point.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            onClick={handleChartClick}
          >
            <defs>
              {/* Lean mass gradient - deep blue/purple */}
              <linearGradient id="leanMassGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
              </linearGradient>
              {/* Fat mass gradient - orange */}
              <linearGradient id="fatMassGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#fb923c" stopOpacity={0.3} />
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
              domain={[bounds.min, bounds.max]}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
              width={45}
              label={{
                value: 'kg',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#64748b', fontSize: 11 },
              }}
            />

            <Tooltip
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
                      padding: '10px 14px',
                    }}
                  >
                    <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>
                      {formatShortDate(label)}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500 }}>
                        Total: {data.totalWeightKg.toFixed(1)} kg
                      </p>
                      <p style={{ color: '#6366f1', fontSize: 13 }}>
                        Lean: {data.leanMassKg.toFixed(1)} kg ({(100 - data.bodyFatPercent).toFixed(1)}%)
                      </p>
                      <p style={{ color: '#f97316', fontSize: 13 }}>
                        Fat: {data.fatMassKg.toFixed(1)} kg ({data.bodyFatPercent.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              }}
            />

            {/* Stacked areas - lean mass on bottom, fat mass on top */}
            <Area
              type="monotone"
              dataKey="leanMassKg"
              stackId="composition"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#leanMassGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="fatMassKg"
              stackId="composition"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#fatMassGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-indigo-500 to-blue-500"></span>
            <span>Lean Mass</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-orange-500 to-orange-400"></span>
            <span>Fat Mass</span>
          </div>
        </div>
        <span className="text-slate-500">
          {chartData.length} measurements
        </span>
      </div>
    </div>
  );
}
