import { useMemo, useRef, useState } from 'react';
import type {
  DailyLog,
  UserProfile,
  WeightTrendRange,
} from '../../api/types';
import { ApiError, getLogByDate } from '../../api/client';
import { useHistorySummary } from '../../hooks/useHistorySummary';
import { Card } from '../common/Card';
import { HistoryLogModal } from './HistoryLogModal';
import { formatShortDate } from '../../utils';
import {
  WeightTrendChart,
  MetabolicHealthChart,
  TrainingCalendarHeatmap,
  TrainingVolumeChart,
} from './charts';

const RANGE_OPTIONS: { label: string; value: WeightTrendRange }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

const RECENT_LOG_LIMIT = 8;

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
      {/* Header with range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">History</h1>
          <p className="text-sm text-slate-500">Weight trends, training consistency, and metabolic insights.</p>
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

      {/* Weight Trend Card (Hero Chart) */}
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
          <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm" data-testid="loading-indicator">
            Loading trend...
          </div>
        )}
        {!loading && error && (
          <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm" data-testid="error-message">
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

      {/* Training Consistency (Calendar Heatmap) */}
      <Card title="Training Consistency">
        <p className="text-xs text-slate-500 mb-4">
          6-month training activity. Color intensity shows training load. Click a day to view details.
        </p>
        {loading && (
          <div className="h-48 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Loading training data...
          </div>
        )}
        {!loading && error && (
          <div className="h-48 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (
          <TrainingCalendarHeatmap
            points={points}
            onSelectDate={handleSelectDate}
            selectedDate={selectedDate}
          />
        )}
      </Card>

      {/* Training Volume (Planned vs Actual) */}
      <Card title="Training Volume">
        {loading && (
          <div className="h-48 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Loading training volume...
          </div>
        )}
        {!loading && error && (
          <div className="h-48 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && (
          <TrainingVolumeChart points={points} trainingSummary={trainingSummary} />
        )}
      </Card>

      {/* Metabolic Health (TDEE - moved to bottom) */}
      <Card title="Metabolic Health">
        <p className="text-xs text-slate-500 mb-4">
          Long-term TDEE trends. Useful for detecting metabolic adaptation during extended dieting phases.
        </p>
        {loading && (
          <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Loading metabolic data...
          </div>
        )}
        {!loading && error && (
          <div className="h-64 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-center text-rose-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && <MetabolicHealthChart points={points} />}
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
