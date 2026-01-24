import { useState, useEffect, useMemo } from 'react';
import { Panel } from '../common/Panel';
import { getDailyTargetsRange } from '../../api/client';
import { toDateKey, formatShortDate } from '../../utils';
import { buildSvgPath } from '../../utils/math';

type TrendPeriod = '7d' | '14d' | '30d';

interface ActivityPoint {
  date: string;
  calories: number;
}

const PERIOD_DAYS: Record<TrendPeriod, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
};

interface ActivityTrendChartProps {
  selectedDate: Date;
}

export function ActivityTrendChart({ selectedDate }: ActivityTrendChartProps) {
  const [period, setPeriod] = useState<TrendPeriod>('7d');
  const [points, setPoints] = useState<ActivityPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const rangeDays = PERIOD_DAYS[period];
    const endDate = toDateKey(selectedDate);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));
    const startKey = toDateKey(startDate);

    setLoading(true);
    setError(null);

    getDailyTargetsRange(startKey, endDate)
      .then((response) => {
        if (!isActive) return;
        const activityPoints = response.days
          .filter(day => day.activeCaloriesBurned !== undefined)
          .map((day) => ({
            date: day.date,
            calories: day.activeCaloriesBurned!,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setPoints(activityPoints);
      })
      .catch((err) => {
        if (!isActive) return;
        setPoints([]);
        setError(err instanceof Error ? err.message : 'Failed to load activity data');
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedDate, period]);

  const chartData = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map(p => p.calories);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const padding = range === 0 ? 50 : range * 0.15;
    const minY = Math.max(0, minValue - padding);
    const maxY = maxValue + padding;

    const toX = (index: number) =>
      points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const toY = (value: number) =>
      maxY === minY ? 50 : ((maxY - value) / (maxY - minY)) * 100;

    const path = buildSvgPath(
      points,
      toX,
      toY,
      (point) => point.calories
    );

    return { path, toX, toY, minY, maxY, minValue, maxValue };
  }, [points]);

  const formatCalories = (value: number) => `${Math.round(value)} kcal`;

  return (
    <Panel title="Activity Trend">
      {/* Period Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {(['7d', '14d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                period === p
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading && (
        <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading activity data...</span>
        </div>
      )}

      {!loading && error && (
        <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {!loading && !error && points.length === 0 && (
        <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
          <span className="text-gray-600 text-sm">No activity data logged yet.</span>
        </div>
      )}

      {!loading && !error && points.length > 0 && chartData && (
        <div className="space-y-2">
          <div className="relative h-48">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.12)"
                  strokeDasharray="2 2"
                />
              ))}
              {/* Line */}
              <path
                d={chartData.path}
                fill="none"
                stroke="rgba(52, 211, 153, 0.9)"
                strokeWidth="2"
              />
              {/* Points */}
              {points.map((point, index) => (
                <circle
                  key={point.date}
                  cx={chartData.toX(index)}
                  cy={chartData.toY(point.calories)}
                  r="2.2"
                  fill="rgba(255, 255, 255, 0.9)"
                />
              ))}
            </svg>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 text-xs text-gray-500">
              {formatCalories(chartData.maxValue)}
            </div>
            <div className="absolute left-0 bottom-0 text-xs text-gray-500">
              {formatCalories(chartData.minValue)}
            </div>
          </div>
          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatShortDate(points[0].date)}</span>
            <span>{formatShortDate(points[points.length - 1].date)}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}
