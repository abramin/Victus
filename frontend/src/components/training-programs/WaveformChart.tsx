import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { WaveformPoint } from '../../api/types';
import { getProgramWaveform } from '../../api/client';

interface WaveformChartProps {
  programId: number;
  height?: number;
  currentWeek?: number;
}

/**
 * Visualizes the periodization model using an area chart.
 * Shows volume/intensity scaling across weeks with deload dips highlighted.
 */
export function WaveformChart({ programId, height = 180, currentWeek }: WaveformChartProps) {
  const [data, setData] = useState<WaveformPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchWaveform() {
      try {
        setLoading(true);
        setError(null);
        const waveform = await getProgramWaveform(programId, controller.signal);
        setData(waveform);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to load waveform data');
      } finally {
        setLoading(false);
      }
    }

    fetchWaveform();

    return () => controller.abort();
  }, [programId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-pulse bg-slate-800 rounded-lg w-full h-full" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-500 text-sm"
        style={{ height }}
      >
        {error || 'No periodization data'}
      </div>
    );
  }

  // Transform data for chart (multiply scales for better visualization)
  const chartData = data.map((point) => ({
    ...point,
    volume: point.volume * 100, // Convert to percentage
    intensity: point.intensity * 100,
  }));

  return (
    <div className="bg-slate-800/30 rounded-lg p-4">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {/* Volume gradient (purple) */}
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
            </linearGradient>
            {/* Intensity gradient (blue) */}
            <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="weekNumber"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `W${value}`}
          />

          <YAxis
            domain={[30, 200]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
            width={40}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(label) => {
              const point = chartData.find((p) => p.weekNumber === label);
              return point ? `${point.label}${point.isDeload ? ' (Deload)' : ''}` : `Week ${label}`;
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(0)}%`,
              name === 'volume' ? 'Volume' : 'Intensity',
            ]}
          />

          {/* Current week marker */}
          {currentWeek && (
            <ReferenceLine
              x={currentWeek}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: 'Now',
                fill: '#22c55e',
                fontSize: 10,
                position: 'top',
              }}
            />
          )}

          {/* Volume area */}
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#volumeGradient)"
            name="volume"
          />

          {/* Intensity line */}
          <Area
            type="monotone"
            dataKey="intensity"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#intensityGradient)"
            name="intensity"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Intensity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-emerald-500" />
          <span>Deload</span>
        </div>
      </div>
    </div>
  );
}
