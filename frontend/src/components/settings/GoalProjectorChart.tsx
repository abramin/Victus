import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from 'recharts';

interface GoalProjectorChartProps {
  currentWeight: number;
  targetWeight: number;
  timeframeWeeks: number;
  onTargetWeightChange: (weight: number) => void;
  onTimeframeChange: (weeks: number) => void;
  minWeight?: number;
  maxWeight?: number;
  minWeeks?: number;
  maxWeeks?: number;
}

// Weekly change thresholds for color coding (kg/week)
const SUSTAINABLE_THRESHOLD = 0.5;
const AGGRESSIVE_THRESHOLD = 1.0;

function getWeeklyChangeColor(weeklyChange: number): string {
  const absChange = Math.abs(weeklyChange);
  if (absChange <= SUSTAINABLE_THRESHOLD) return '#4ade80'; // green
  if (absChange <= AGGRESSIVE_THRESHOLD) return '#fb923c'; // orange
  return '#f87171'; // red
}

function getWeeklyChangeLabel(weeklyChange: number): string {
  const absChange = Math.abs(weeklyChange);
  if (absChange <= SUSTAINABLE_THRESHOLD) return 'Sustainable';
  if (absChange <= AGGRESSIVE_THRESHOLD) return 'Moderate';
  return 'Aggressive';
}

export function GoalProjectorChart({
  currentWeight,
  targetWeight,
  timeframeWeeks,
  onTargetWeightChange,
  onTimeframeChange,
  minWeight = 30,
  maxWeight = 200,
  minWeeks = 4,
  maxWeeks = 104,
}: GoalProjectorChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'weight' | 'time' | null>(null);

  // Calculate weekly change
  const weeklyChange = useMemo(() => {
    if (timeframeWeeks <= 0) return 0;
    return (targetWeight - currentWeight) / timeframeWeeks;
  }, [currentWeight, targetWeight, timeframeWeeks]);

  const lineColor = getWeeklyChangeColor(weeklyChange);
  const changeLabel = getWeeklyChangeLabel(weeklyChange);

  // Chart data points: start and end
  const chartData = useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + timeframeWeeks * 7);

    return [
      {
        week: 0,
        weight: currentWeight,
        label: 'Now',
        date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
      {
        week: timeframeWeeks,
        weight: targetWeight,
        label: 'Goal',
        date: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      },
    ];
  }, [currentWeight, targetWeight, timeframeWeeks]);

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    const weights = [currentWeight, targetWeight];
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const padding = (maxW - minW) * 0.2 || 5;
    return [Math.max(minWeight, Math.floor(minW - padding)), Math.min(maxWeight, Math.ceil(maxW + padding))];
  }, [currentWeight, targetWeight, minWeight, maxWeight]);

  // Handle drag on the goal point
  const handleMouseDown = useCallback(
    (type: 'weight' | 'time') => {
      setIsDragging(true);
      setDragType(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const chartPadding = { left: 40, right: 20, top: 20, bottom: 30 };
      const chartWidth = rect.width - chartPadding.left - chartPadding.right;
      const chartHeight = rect.height - chartPadding.top - chartPadding.bottom;

      if (dragType === 'weight') {
        // Map Y position to weight
        const y = e.clientY - rect.top - chartPadding.top;
        const yRatio = 1 - y / chartHeight;
        const [minY, maxY] = yDomain;
        const newWeight = minY + yRatio * (maxY - minY);
        const clampedWeight = Math.round(Math.max(minWeight, Math.min(maxWeight, newWeight)) * 10) / 10;
        if (clampedWeight !== targetWeight) {
          onTargetWeightChange(clampedWeight);
        }
      } else if (dragType === 'time') {
        // Map X position to weeks
        const x = e.clientX - rect.left - chartPadding.left;
        const xRatio = x / chartWidth;
        const newWeeks = Math.round(xRatio * maxWeeks);
        const clampedWeeks = Math.max(minWeeks, Math.min(maxWeeks, newWeeks));
        if (clampedWeeks !== timeframeWeeks) {
          onTimeframeChange(clampedWeeks);
        }
      }
    },
    [isDragging, dragType, yDomain, targetWeight, timeframeWeeks, minWeight, maxWeight, minWeeks, maxWeeks, onTargetWeightChange, onTimeframeChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Format projected end date
  const endDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + timeframeWeeks * 7);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [timeframeWeeks]);

  return (
    <div className="space-y-3">
      {/* Header with metrics */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-400">Goal Trajectory</div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: `${lineColor}20`, color: lineColor }}
          >
            {weeklyChange >= 0 ? '+' : ''}{weeklyChange.toFixed(2)} kg/week
          </span>
          <span className="text-xs text-slate-500">({changeLabel})</span>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative h-48 select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 30, left: 40 }}>
            <XAxis
              dataKey="date"
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              domain={yDomain}
              axisLine={{ stroke: '#475569' }}
              tickLine={{ stroke: '#475569' }}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v) => `${v}kg`}
            />
            <ReferenceLine y={currentWeight} stroke="#64748b" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: lineColor }}
              formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Weight']}
            />
            <Line
              type="linear"
              dataKey="weight"
              stroke={lineColor}
              strokeWidth={3}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Draggable goal point overlay */}
        <div
          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10"
          style={{
            right: '20px',
            top: `${20 + (1 - (targetWeight - yDomain[0]) / (yDomain[1] - yDomain[0])) * (192 - 50)}px`,
          }}
          onMouseDown={() => handleMouseDown('weight')}
        >
          <div
            className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
            style={{ backgroundColor: lineColor }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Adjustment controls */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Target Weight</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTargetWeightChange(Math.max(minWeight, targetWeight - 0.5))}
              className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold"
            >
              −
            </button>
            <span className="flex-1 text-center text-lg font-semibold text-white">
              {targetWeight.toFixed(1)} kg
            </span>
            <button
              type="button"
              onClick={() => onTargetWeightChange(Math.min(maxWeight, targetWeight + 0.5))}
              className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">End Date ({timeframeWeeks} weeks)</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTimeframeChange(Math.max(minWeeks, timeframeWeeks - 1))}
              className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold"
            >
              −
            </button>
            <span className="flex-1 text-center text-lg font-semibold text-white">{endDate}</span>
            <button
              type="button"
              onClick={() => onTimeframeChange(Math.min(maxWeeks, timeframeWeeks + 1))}
              className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
