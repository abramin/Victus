import { useMemo, useState } from 'react';
import type { WeightTrendPoint, WeightTrendRange, WeightTrendSummary } from '../../api/types';
import { useWeightTrend } from '../../hooks/useWeightTrend';
import { Card } from '../common/Card';

const RANGE_OPTIONS: { label: string; value: WeightTrendRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

function formatShortDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeight(value: number, digits = 1): string {
  return `${value.toFixed(digits)} kg`;
}

function formatWeeklyChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)} kg/wk`;
}

function buildPath(points: WeightTrendPoint[], toX: (index: number) => number, toY: (value: number) => number) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(point.weightKg)}`)
    .join(' ');
}

interface WeightTrendChartProps {
  points: WeightTrendPoint[];
  trend?: WeightTrendSummary;
}

function WeightTrendChart({ points, trend }: WeightTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        No weight logs yet. Add a daily update to start tracking.
      </div>
    );
  }

  const weights = points.map((point) => point.weightKg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight;
  const padding = range === 0 ? 1 : range * 0.15;
  const minY = minWeight - padding;
  const maxY = maxWeight + padding;

  const toX = (index: number) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const toY = (value: number) => ((maxY - value) / (maxY - minY)) * 100;

  const weightPath = buildPath(points, toX, toY);
  const trendPath =
    trend && points.length > 1
      ? `M ${toX(0)} ${toY(trend.startWeightKg)} L ${toX(points.length - 1)} ${toY(trend.endWeightKg)}`
      : null;

  return (
    <div className="space-y-2">
      <div className="relative h-56">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
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
          <path
            d={weightPath}
            fill="none"
            stroke="rgba(56, 189, 248, 0.9)"
            strokeWidth="2"
          />
          {trendPath && (
            <path
              d={trendPath}
              fill="none"
              stroke="rgba(249, 115, 22, 0.9)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}
          {points.map((point, index) => (
            <circle
              key={point.date}
              cx={toX(index)}
              cy={toY(point.weightKg)}
              r="2.2"
              fill="rgba(255, 255, 255, 0.9)"
            />
          ))}
        </svg>
        <div className="absolute left-0 top-0 text-xs text-slate-500">
          {formatWeight(maxWeight)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-slate-500">
          {formatWeight(minWeight)}
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

export function WeightHistory() {
  const [range, setRange] = useState<WeightTrendRange>('30d');
  const { data, loading, error } = useWeightTrend(range);

  const points = data?.points ?? [];
  const trend = data?.trend;

  const latest = points[points.length - 1];
  const earliest = points[0];
  const rangeChange = latest && earliest ? latest.weightKg - earliest.weightKg : 0;

  const stats = useMemo(() => {
    return {
      latestWeight: latest ? formatWeight(latest.weightKg) : '--',
      rangeChange: points.length > 1 ? `${rangeChange >= 0 ? '+' : ''}${rangeChange.toFixed(1)} kg` : '--',
      weeklyChange: trend ? formatWeeklyChange(trend.weeklyChangeKg) : '--',
      rSquared: trend ? trend.rSquared.toFixed(2) : '--',
      dataPoints: points.length,
    };
  }, [latest, points.length, rangeChange, trend]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">History</h1>
          <p className="text-sm text-slate-500">Weight trend and progress over time.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                range === option.value
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Card title="Weight Trend">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Latest</p>
            <p className="text-lg font-semibold text-white">{stats.latestWeight}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Range Change</p>
            <p className="text-lg font-semibold text-white">{stats.rangeChange}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Weekly Trend</p>
            <p className="text-lg font-semibold text-white">{stats.weeklyChange}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Fit (R2)</p>
            <p className="text-lg font-semibold text-white">{stats.rSquared}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Data Points</p>
            <p className="text-lg font-semibold text-white">{stats.dataPoints}</p>
          </div>
        </div>

        {loading && (
          <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Loading trend...
          </div>
        )}
        {!loading && error && (
          <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (
          <WeightTrendChart points={points} trend={trend} />
        )}
      </Card>
    </div>
  );
}
