import { useMemo, useRef, useState } from 'react';
import type {
  DailyLog,
  HistoryPoint,
  UserProfile,
  WeightTrendRange,
  WeightTrendSummary,
} from '../../api/types';
import { ApiError, getLogByDate } from '../../api/client';
import { useHistorySummary } from '../../hooks/useHistorySummary';
import { Card } from '../common/Card';
import { HistoryLogModal } from './HistoryLogModal';
import { formatShortDate } from '../../utils';
import { buildSvgPath } from '../../utils/math';

const RANGE_OPTIONS: { label: string; value: WeightTrendRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

const RECENT_LOG_LIMIT = 8;
const ROLLING_AVERAGE_WINDOW = 7;

/** Compute 7-day rolling average for TDEE values to smooth the curve */
function computeRollingAverage(points: HistoryPoint[], window: number = ROLLING_AVERAGE_WINDOW): number[] {
  return points.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const windowPoints = points.slice(start, index + 1);
    const sum = windowPoints.reduce((acc, p) => acc + p.estimatedTDEE, 0);
    return sum / windowPoints.length;
  });
}

/** Get trend confidence label and color based on R² value */
function getTrendConfidence(rSquared: number): { label: string; color: string; emoji: string } {
  if (rSquared >= 0.7) {
    return { label: 'Strong', color: 'text-emerald-400', emoji: '🟢' };
  } else if (rSquared >= 0.3) {
    return { label: 'Moderate', color: 'text-amber-400', emoji: '🟡' };
  } else {
    return { label: 'Weak', color: 'text-slate-400', emoji: '🔴' };
  }
}

function formatWeight(value: number, digits = 1): string {
  return `${value.toFixed(digits)} kg`;
}

function formatWeeklyChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)} kg/wk`;
}

function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

function formatConfidence(value: number): string {
  if (!value) {
    return '--';
  }
  return `${Math.round(value * 100)}%`;
}

interface WeightTrendChartProps {
  points: HistoryPoint[];
  trend?: WeightTrendSummary;
  onSelectDate?: (date: string) => void;
  selectedDate?: string | null;
}

function WeightTrendChart({ points, trend, onSelectDate, selectedDate }: WeightTrendChartProps) {
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

  const weightPath = buildSvgPath(points, toX, toY, (point) => point.weightKg);
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
          {/* Training markers on x-axis */}
          {points.map((point, index) => {
            if (!point.hasTraining) return null;
            return (
              <g key={`training-${point.date}`}>
                {/* Training indicator dot at bottom of chart */}
                <circle
                  cx={toX(index)}
                  cy={97}
                  r="1.8"
                  fill="rgba(34, 197, 94, 0.9)"
                />
                {/* Vertical dashed line connecting to weight point */}
                <line
                  x1={toX(index)}
                  y1={95}
                  x2={toX(index)}
                  y2={toY(point.weightKg) + 4}
                  stroke="rgba(34, 197, 94, 0.3)"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
              </g>
            );
          })}
          {points.map((point, index) => {
            const isSelected = selectedDate === point.date;
            return (
              <circle
                key={point.date}
                cx={toX(index)}
                cy={toY(point.weightKg)}
                r={isSelected ? 3.4 : 2.2}
                fill={isSelected ? 'rgba(56, 189, 248, 0.95)' : 'rgba(255, 255, 255, 0.9)'}
                className={onSelectDate ? 'cursor-pointer' : undefined}
                onClick={onSelectDate ? () => onSelectDate(point.date) : undefined}
              />
            );
          })}
        </svg>
        <div className="absolute left-0 top-0 text-xs text-slate-500">
          {formatWeight(maxWeight)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-slate-500">
          {formatWeight(minWeight)}
        </div>
      </div>
      {/* Training legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-500">
          <span>{formatShortDate(points[0].date)}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500/90"></span>
            <span>Training day</span>
          </div>
        </div>
        <span className="text-slate-500">{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

interface TDEETrendChartProps {
  points: HistoryPoint[];
}

function TDEETrendChart({ points }: TDEETrendChartProps) {
  const rollingAverage = useMemo(() => computeRollingAverage(points), [points]);

  if (points.length === 0) {
    return (
      <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
        No TDEE data yet. Add daily updates to see the trend.
      </div>
    );
  }

  // Use both raw values and smoothed values to determine chart bounds
  const rawValues = points.map((point) => point.estimatedTDEE);
  const allValues = [...rawValues, ...rollingAverage];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range === 0 ? 100 : range * 0.15;
  const minY = minValue - padding;
  const maxY = maxValue + padding;

  const toX = (index: number) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const toY = (value: number) => ((maxY - value) / (maxY - minY)) * 100;

  // Build smoothed TDEE path (the main trend line)
  const smoothedPath = rollingAverage
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`)
    .join(' ');

  // Build confidence band path (area around the smoothed line)
  const bandPoints = points.map((point, index) => {
    const avg = rollingAverage[index];
    const confidence = point.tdeeConfidence || 0.1;
    // Spread is inversely proportional to confidence (low confidence = wider band)
    const spread = (1 - confidence) * 150;
    return {
      x: toX(index),
      upper: toY(avg + spread),
      lower: toY(avg - spread),
    };
  });

  const bandPath = bandPoints.length > 0
    ? `M ${bandPoints[0].x} ${bandPoints[0].upper} ` +
      bandPoints.map((p) => `L ${p.x} ${p.upper}`).join(' ') +
      ` L ${bandPoints[bandPoints.length - 1].x} ${bandPoints[bandPoints.length - 1].lower} ` +
      [...bandPoints].reverse().map((p) => `L ${p.x} ${p.lower}`).join(' ') +
      ' Z'
    : '';

  return (
    <div className="space-y-3">
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
          {/* Confidence band (the "cloud") */}
          <path
            d={bandPath}
            fill="rgba(14, 165, 233, 0.15)"
            stroke="none"
          />
          {/* Faint raw daily dots in background */}
          {points.map((point, index) => (
            <circle
              key={`raw-${point.date}`}
              cx={toX(index)}
              cy={toY(point.estimatedTDEE)}
              r="1.5"
              fill="rgba(148, 163, 184, 0.25)"
            />
          ))}
          {/* Smoothed rolling average line (the "truth") */}
          <path
            d={smoothedPath}
            fill="none"
            stroke="rgba(14, 165, 233, 0.9)"
            strokeWidth="2.5"
          />
        </svg>
        <div className="absolute left-0 top-0 text-xs text-slate-500">
          {formatKcal(maxValue)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-slate-500">
          {formatKcal(minValue)}
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Confidence</span>
          <span>{points.length ? formatConfidence(points[points.length - 1].tdeeConfidence) : '--'}</span>
        </div>
        <div className="flex items-end gap-0.5 h-12">
          {points.map((point) => (
            <div
              key={point.date}
              className="flex-1 rounded-sm bg-emerald-500/30"
              style={{ height: `${Math.round(point.tdeeConfidence * 100)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeightHistory({ profile }: { profile: UserProfile }) {
  const [range, setRange] = useState<WeightTrendRange>('30d');
  const { data, loading, error } = useHistorySummary(range);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const activeDateRef = useRef<string | null>(null);

  const points = data?.points ?? [];
  const trend = data?.trend;
  const trainingSummary = data?.trainingSummary;

  const latest = points[points.length - 1];
  const earliest = points[0];
  const rangeChange = latest && earliest ? latest.weightKg - earliest.weightKg : 0;

  const weightStats = useMemo(() => {
    const trendConfidence = trend ? getTrendConfidence(trend.rSquared) : null;
    return {
      latestWeight: latest ? formatWeight(latest.weightKg) : '--',
      rangeChange: points.length > 1 ? `${rangeChange >= 0 ? '+' : ''}${rangeChange.toFixed(1)} kg` : '--',
      weeklyChange: trend ? formatWeeklyChange(trend.weeklyChangeKg) : '--',
      trendConfidence,
      dataPoints: points.length,
    };
  }, [latest, points.length, rangeChange, trend]);

  const tdeeStats = useMemo(() => {
    if (points.length === 0) {
      return {
        latest: '--',
        average: '--',
        confidence: '--',
        dataPoints: 0,
      };
    }

    const latestPoint = points[points.length - 1];
    const averageTdee = points.reduce((sum, point) => sum + point.estimatedTDEE, 0) / points.length;
    const confidenceValues = points
      .map((point) => point.tdeeConfidence)
      .filter((value) => value > 0);
    const averageConfidence = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
      : 0;

    return {
      latest: formatKcal(latestPoint.estimatedTDEE),
      average: formatKcal(averageTdee),
      confidence: formatConfidence(averageConfidence),
      dataPoints: points.length,
    };
  }, [points]);

  const plannedSummary = trainingSummary?.planned;
  const actualSummary = trainingSummary?.actual;
  const durationDelta = (actualSummary?.totalDurationMin ?? 0) - (plannedSummary?.totalDurationMin ?? 0);
  const plannedLoad = plannedSummary ? plannedSummary.totalLoadScore.toFixed(1) : '0.0';
  const actualLoad = actualSummary ? actualSummary.totalLoadScore.toFixed(1) : '0.0';

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setLogLoading(true);
    setLogError(null);
    activeDateRef.current = date;
    try {
      const log = await getLogByDate(date);
      // Ignore response if user selected a different date while loading
      if (activeDateRef.current !== date) return;
      setSelectedLog(log);
    } catch (err) {
      if (activeDateRef.current !== date) return;
      if (err instanceof ApiError) {
        setLogError(err.message);
      } else {
        setLogError('Failed to load log details');
      }
      setSelectedLog(null);
    } finally {
      if (activeDateRef.current === date) {
        setLogLoading(false);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedLog(null);
    setLogError(null);
    setLogLoading(false);
  };

  const recentPoints = points.slice(-RECENT_LOG_LIMIT);

  return (
    <div className="p-6 space-y-6" data-testid="weight-history">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">History</h1>
          <p className="text-sm text-slate-500">Weight, TDEE, and training summaries over time.</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800" data-testid="range-selector">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              data-testid={`range-${option.value}`}
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
            <p className="text-lg font-semibold text-white">{weightStats.latestWeight}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Range Change</p>
            <p className="text-lg font-semibold text-white">{weightStats.rangeChange}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Weekly Trend</p>
            <p className="text-lg font-semibold text-white">{weightStats.weeklyChange}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Trend Confidence</p>
            <p className={`text-lg font-semibold ${weightStats.trendConfidence?.color ?? 'text-slate-400'}`}>
              {weightStats.trendConfidence ? `${weightStats.trendConfidence.emoji} ${weightStats.trendConfidence.label}` : '--'}
            </p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Data Points</p>
            <p className="text-lg font-semibold text-white">{weightStats.dataPoints}</p>
          </div>
        </div>

        {loading && (
          <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm" data-testid="loading-indicator">
            Loading trend...
          </div>
        )}
        {!loading && error && (
          <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm" data-testid="error-message">
            {error}
          </div>
        )}
        {!loading && !error && (
          <div data-testid="weight-chart">
            <WeightTrendChart
              points={points}
              trend={trend}
              onSelectDate={handleSelectDate}
              selectedDate={selectedDate}
            />
            {recentPoints.length > 0 && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500 font-medium">Recent Daily Logs</p>
                <p className="text-xs text-slate-600 mt-0.5">Tap a date to view details</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {recentPoints.map((point) => (
                    <button
                      key={point.date}
                      onClick={() => handleSelectDate(point.date)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        selectedDate === point.date
                          ? 'bg-slate-700 text-white border-slate-600'
                          : 'text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {formatShortDate(point.date)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Estimated TDEE">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Latest</p>
            <p className="text-lg font-semibold text-white">{tdeeStats.latest}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Average</p>
            <p className="text-lg font-semibold text-white">{tdeeStats.average}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Avg Confidence</p>
            <p className="text-lg font-semibold text-white">{tdeeStats.confidence}</p>
          </div>
          <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Data Points</p>
            <p className="text-lg font-semibold text-white">{tdeeStats.dataPoints}</p>
          </div>
        </div>

        {loading && (
          <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Loading TDEE...
          </div>
        )}
        {!loading && error && (
          <div className="h-56 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (
          <TDEETrendChart points={points} />
        )}
      </Card>

      <Card title="Training Summary">
        {loading && (
          <div className="h-32 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Loading training summary...
          </div>
        )}
        {!loading && error && (
          <div className="h-32 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Planned Sessions</p>
                <p className="text-lg font-semibold text-white">{plannedSummary?.sessionCount ?? 0}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {plannedSummary?.totalDurationMin ?? 0} min · Load {plannedLoad}
                </p>
              </div>
              <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
                <p className="text-xs text-slate-500 mb-1">Actual Sessions</p>
                <p className="text-lg font-semibold text-white">{actualSummary?.sessionCount ?? 0}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {actualSummary?.totalDurationMin ?? 0} min · Load {actualLoad}
                </p>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              {durationDelta === 0
                ? 'On plan for total duration.'
                : `${durationDelta > 0 ? '+' : ''}${durationDelta} min vs planned total.`}
            </div>
          </>
        )}
      </Card>

      <HistoryLogModal
        isOpen={selectedDate !== null}
        onClose={handleCloseModal}
        log={selectedLog}
        loading={logLoading}
        error={logError}
        profile={profile}
      />
    </div>
  );
}
