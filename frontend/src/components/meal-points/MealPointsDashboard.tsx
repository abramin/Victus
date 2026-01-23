import { useEffect, useMemo, useState } from 'react';
import { ApiError, getDailyTargetsRange, getLogByDate } from '../../api/client';
import type { DailyLog, DayType, MealTargets, UserProfile } from '../../api/types';
import { MealCard } from './MealCard';
import { SupplementsPanel } from './SupplementsPanel';
import {
  FRUIT_CARBS_PERCENT_WEIGHT,
  VEGGIE_CARBS_PERCENT_WEIGHT,
  MALTODEXTRIN_CARB_PERCENT,
  WHEY_PROTEIN_PERCENT,
  COLLAGEN_PROTEIN_PERCENT,
} from '../../constants';

interface MealPointsDashboardProps {
  log: DailyLog | null;
  profile: UserProfile;
  onDayTypeChange?: (dayType: DayType) => void;
}

const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: 'performance', label: 'Performance' },
  { value: 'fatburner', label: 'Fatburner' },
  { value: 'metabolize', label: 'Metabolize' },
];

type TrendPeriod = '7d' | '14d' | '30d';

type TrendMetric = 'total' | 'carbs' | 'protein' | 'fats';

interface TrendPoint {
  date: string;
  carbs: number;
  protein: number;
  fats: number;
  total: number;
}

const TREND_METRICS: { value: TrendMetric; label: string }[] = [
  { value: 'carbs', label: 'Carb Points' },
  { value: 'protein', label: 'Protein Points' },
  { value: 'fats', label: 'Fat Points' },
];

const TREND_PERIOD_DAYS: Record<TrendPeriod, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
};

type SupplementState = {
  id: 'whey' | 'collagen' | 'intra_carbs';
  label: string;
  sublabel: string;
  value: number;
  enabled: boolean;
};

const DEFAULT_SUPPLEMENTS: SupplementState[] = [
  { id: 'whey', label: 'Whey', sublabel: 'Protein', value: 30, enabled: false },
  { id: 'collagen', label: 'Collagen', sublabel: 'Protein', value: 20, enabled: false },
  { id: 'intra_carbs', label: 'Intra-workout', sublabel: 'Carbs', value: 50, enabled: false },
];

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const toDateKey = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const formatShortDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const roundToNearest5 = (value: number) => Math.round(value / 5) * 5;

const buildTrendPath = (
  points: TrendPoint[],
  toX: (index: number) => number,
  toY: (value: number) => number,
  getValue: (point: TrendPoint) => number
) =>
  points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(getValue(point))}`)
    .join(' ');

const getMetricValue = (point: TrendPoint, metric: TrendMetric) => {
  switch (metric) {
    case 'carbs':
      return point.carbs;
    case 'protein':
      return point.protein;
    case 'fats':
      return point.fats;
    default:
      return point.total;
  }
};

const metricColor = (metric: TrendMetric) => {
  switch (metric) {
    case 'carbs':
      return 'rgba(249, 115, 22, 0.9)';
    case 'protein':
      return 'rgba(168, 85, 247, 0.9)';
    case 'fats':
      return 'rgba(148, 163, 184, 0.9)';
    default:
      return 'rgba(56, 189, 248, 0.9)';
  }
};

const formatPoints = (value: number) => `${Math.round(value)} pts`;

const buildSupplementsFromProfile = (profile: UserProfile): SupplementState[] => {
  const defaults = DEFAULT_SUPPLEMENTS;
  const supplementConfig = profile.supplementConfig ?? { maltodextrinG: 0, wheyG: 0, collagenG: 0 };
  return [
    {
      ...defaults[0],
      value: supplementConfig.wheyG || defaults[0].value,
      enabled: supplementConfig.wheyG > 0,
    },
    {
      ...defaults[1],
      value: supplementConfig.collagenG || defaults[1].value,
      enabled: supplementConfig.collagenG > 0,
    },
    {
      ...defaults[2],
      value: supplementConfig.maltodextrinG || defaults[2].value,
      enabled: supplementConfig.maltodextrinG > 0,
    },
  ];
};

const calculateMealTargets = (
  totalCarbsG: number,
  totalProteinG: number,
  totalFatsG: number,
  fruitG: number,
  veggiesG: number,
  mealRatios: UserProfile['mealRatios'],
  pointsConfig: UserProfile['pointsConfig'],
  dayType: DayType,
  supplements: UserProfile['supplementConfig']
): MealTargets => {
  const fruitCarbs = fruitG * FRUIT_CARBS_PERCENT_WEIGHT;
  const veggieCarbs = veggiesG * VEGGIE_CARBS_PERCENT_WEIGHT;
  let availableCarbs = totalCarbsG - veggieCarbs - fruitCarbs;

  if (dayType === 'performance') {
    availableCarbs -= supplements.maltodextrinG * MALTODEXTRIN_CARB_PERCENT;
  }
  if (availableCarbs < 0) {
    availableCarbs = 0;
  }

  let availableProtein = totalProteinG - supplements.collagenG * COLLAGEN_PROTEIN_PERCENT;
  if (dayType === 'performance') {
    availableProtein -= supplements.wheyG * WHEY_PROTEIN_PERCENT;
  }
  if (availableProtein < 0) {
    availableProtein = 0;
  }

  return {
    breakfast: {
      carbs: roundToNearest5(availableCarbs * pointsConfig.carbMultiplier * mealRatios.breakfast),
      protein: roundToNearest5(availableProtein * pointsConfig.proteinMultiplier * mealRatios.breakfast),
      fats: roundToNearest5(totalFatsG * pointsConfig.fatMultiplier * mealRatios.breakfast),
    },
    lunch: {
      carbs: roundToNearest5(availableCarbs * pointsConfig.carbMultiplier * mealRatios.lunch),
      protein: roundToNearest5(availableProtein * pointsConfig.proteinMultiplier * mealRatios.lunch),
      fats: roundToNearest5(totalFatsG * pointsConfig.fatMultiplier * mealRatios.lunch),
    },
    dinner: {
      carbs: roundToNearest5(availableCarbs * pointsConfig.carbMultiplier * mealRatios.dinner),
      protein: roundToNearest5(availableProtein * pointsConfig.proteinMultiplier * mealRatios.dinner),
      fats: roundToNearest5(totalFatsG * pointsConfig.fatMultiplier * mealRatios.dinner),
    },
  };
};

function MealPointsTrendChart({ points, metric }: { points: TrendPoint[]; metric: TrendMetric }) {
  const values = points.map((point) => getMetricValue(point, metric));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  const padding = range === 0 ? 10 : range * 0.15;
  const minY = minValue - padding;
  const maxY = maxValue + padding;
  const stroke = metricColor(metric);

  const toX = (index: number) => (points.length === 1 ? 50 : (index / (points.length - 1)) * 100);
  const toY = (value: number) => ((maxY - value) / (maxY - minY)) * 100;

  const path = buildTrendPath(points, toX, toY, (point) => getMetricValue(point, metric));

  return (
    <div className="space-y-2">
      <div className="relative h-48">
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
          <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
          {points.map((point, index) => (
            <circle
              key={point.date}
              cx={toX(index)}
              cy={toY(getMetricValue(point, metric))}
              r="2.2"
              fill="rgba(255, 255, 255, 0.9)"
            />
          ))}
        </svg>
        <div className="absolute left-0 top-0 text-xs text-gray-500">
          {formatPoints(maxValue)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-gray-500">
          {formatPoints(minValue)}
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

export function MealPointsDashboard({ log, profile, onDayTypeChange }: MealPointsDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayType, setSelectedDayType] = useState<DayType>(log?.dayType || 'fatburner');
  const [supplements, setSupplements] = useState<SupplementState[]>(() => buildSupplementsFromProfile(profile));
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('7d');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('total');
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(log);
  const [loadingLog, setLoadingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const isSelectedToday = isSameDay(selectedDate, new Date());

  // Get meal ratios from profile (convert to percentages)
  const mealRatios = useMemo(() => ({
    breakfast: Math.round(profile.mealRatios.breakfast * 100),
    lunch: Math.round(profile.mealRatios.lunch * 100),
    dinner: Math.round(profile.mealRatios.dinner * 100),
  }), [profile.mealRatios]);

  const handleDayTypeSelect = (dayType: DayType) => {
    setSelectedDayType(dayType);
    onDayTypeChange?.(dayType);
  };

  const handleSupplementChange = (id: string, enabled: boolean, value: number) => {
    setSupplements(prev =>
      prev.map(s => s.id === id ? { ...s, enabled, value } : s)
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  useEffect(() => {
    let isActive = true;
    if (isSelectedToday) {
      setSelectedLog(log);
      setLoadingLog(false);
      setLogError(null);
      return () => {
        isActive = false;
      };
    }

    setLoadingLog(true);
    setLogError(null);
    getLogByDate(toDateKey(selectedDate))
      .then((data) => {
        if (!isActive) return;
        setSelectedLog(data);
      })
      .catch((err) => {
        if (!isActive) return;
        if (err instanceof ApiError && err.status === 404) {
          setSelectedLog(null);
          return;
        }
        setSelectedLog(null);
        setLogError('Failed to load daily log');
      })
      .finally(() => {
        if (!isActive) return;
        setLoadingLog(false);
      });

    return () => {
      isActive = false;
    };
  }, [isSelectedToday, log, selectedDate]);

  useEffect(() => {
    if (selectedLog?.dayType) {
      setSelectedDayType(selectedLog.dayType);
    }
  }, [selectedLog?.dayType]);

  useEffect(() => {
    setSupplements(buildSupplementsFromProfile(profile));
  }, [
    profile.supplementConfig.maltodextrinG,
    profile.supplementConfig.wheyG,
    profile.supplementConfig.collagenG,
  ]);

  useEffect(() => {
    let isActive = true;
    const rangeDays = TREND_PERIOD_DAYS[trendPeriod];
    const endDate = toDateKey(selectedDate);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - (rangeDays - 1));
    const startKey = toDateKey(startDate);

    setTrendLoading(true);
    setTrendError(null);

    getDailyTargetsRange(startKey, endDate)
      .then((response) => {
        if (!isActive) return;
        const points = response.days
          .map((day) => {
            const meals = day.calculatedTargets.meals;
            const carbs = meals.breakfast.carbs + meals.lunch.carbs + meals.dinner.carbs;
            const protein = meals.breakfast.protein + meals.lunch.protein + meals.dinner.protein;
            const fats = meals.breakfast.fats + meals.lunch.fats + meals.dinner.fats;
            return {
              date: day.date,
              carbs,
              protein,
              fats,
              total: carbs + protein + fats,
            };
          })
          .sort((left, right) => left.date.localeCompare(right.date));
        setTrendPoints(points);
      })
      .catch((err) => {
        if (!isActive) return;
        setTrendPoints([]);
        setTrendError(err instanceof Error ? err.message : 'Failed to load trend data');
      })
      .finally(() => {
        if (!isActive) return;
        setTrendLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [log?.date, selectedDate, trendPeriod]);

  const supplementConfig = useMemo(() => {
    const config = { maltodextrinG: 0, wheyG: 0, collagenG: 0 };
    for (const supplement of supplements) {
      if (!supplement.enabled) continue;
      const value = Math.max(0, supplement.value);
      if (supplement.id === 'whey') {
        config.wheyG = value;
      } else if (supplement.id === 'collagen') {
        config.collagenG = value;
      } else if (supplement.id === 'intra_carbs') {
        config.maltodextrinG = value;
      }
    }
    return config;
  }, [supplements]);

  const isDefaultSupplements = useMemo(() => (
    supplementConfig.maltodextrinG === profile.supplementConfig.maltodextrinG &&
    supplementConfig.wheyG === profile.supplementConfig.wheyG &&
    supplementConfig.collagenG === profile.supplementConfig.collagenG
  ), [profile.supplementConfig, supplementConfig]);

  // Get meal data from selected log
  const mealData = useMemo(() => {
    if (selectedLog?.calculatedTargets) {
      const targets = selectedLog.calculatedTargets;
      const useStoredTargets = selectedLog.dayType === selectedDayType && isDefaultSupplements;
      const calculated = useStoredTargets
        ? targets.meals
        : calculateMealTargets(
            targets.totalCarbsG,
            targets.totalProteinG,
            targets.totalFatsG,
            targets.fruitG,
            targets.veggiesG,
            profile.mealRatios,
            profile.pointsConfig,
            selectedDayType,
            supplementConfig
          );

      return {
        breakfast: calculated.breakfast,
        lunch: calculated.lunch,
        dinner: calculated.dinner,
        hasData: true,
      };
    }

    return {
      breakfast: { carbs: 0, protein: 0, fats: 0 },
      lunch: { carbs: 0, protein: 0, fats: 0 },
      dinner: { carbs: 0, protein: 0, fats: 0 },
      hasData: false,
    };
  }, [
    isDefaultSupplements,
    profile.mealRatios,
    profile.pointsConfig,
    selectedDayType,
    selectedLog,
    supplementConfig,
  ]);

  const emptyTitle = loadingLog
    ? 'Loading daily log...'
    : logError ?? 'No daily log for this date.';
  const emptySubtitle = loadingLog
    ? 'Fetching your meal points.'
    : logError
      ? 'Please try again shortly.'
      : 'Complete your Daily Update to see your meal points.';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Meal Points</h1>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-medium min-w-[140px] text-center">
            {formatDate(selectedDate)}
          </span>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Type Tabs */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
          {DAY_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => handleDayTypeSelect(dt.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedDayType === dt.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Meal Cards - Left Side */}
        <div className="col-span-8 space-y-4">
          {!mealData.hasData ? (
            <div className="col-span-3 bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
              <p className="text-gray-400 mb-4">
                {emptyTitle}
              </p>
              <p className="text-gray-500 text-sm">
                {emptySubtitle}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <MealCard
                meal="Breakfast"
                carbPoints={mealData.breakfast.carbs}
                proteinPoints={mealData.breakfast.protein}
                fatPoints={mealData.breakfast.fats}
                sharePercent={mealRatios.breakfast}
              />
              <MealCard
                meal="Lunch"
                carbPoints={mealData.lunch.carbs}
                proteinPoints={mealData.lunch.protein}
                fatPoints={mealData.lunch.fats}
                sharePercent={mealRatios.lunch}
              />
              <MealCard
                meal="Dinner"
                carbPoints={mealData.dinner.carbs}
                proteinPoints={mealData.dinner.protein}
                fatPoints={mealData.dinner.fats}
                sharePercent={mealRatios.dinner}
              />
            </div>
          )}

          {/* Trend Chart */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Trend</h3>
              <div className="flex items-center gap-4">
                <select
                  value={trendMetric}
                  onChange={(event) => setTrendMetric(event.target.value as TrendMetric)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  {TREND_METRICS.map((metric) => (
                    <option key={metric.value} value={metric.value}>
                      {metric.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                  {(['7d', '14d', '30d'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTrendPeriod(period)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${trendPeriod === period
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-white'
                        }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {trendLoading && (
              <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">Loading trend...</span>
              </div>
            )}
            {!trendLoading && trendError && (
              <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <span className="text-red-400 text-sm">{trendError}</span>
              </div>
            )}
            {!trendLoading && !trendError && trendPoints.length === 0 && (
              <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">No meal points logged yet.</span>
              </div>
            )}
            {!trendLoading && !trendError && trendPoints.length > 0 && (
              <MealPointsTrendChart points={trendPoints} metric={trendMetric} />
            )}
          </div>
        </div>

        {/* Supplements Panel - Right Side */}
        <div className="col-span-4">
          <SupplementsPanel
            supplements={supplements}
            onSupplementChange={handleSupplementChange}
            onApplyDefaults={() => {
              setSupplements(DEFAULT_SUPPLEMENTS.map(s => ({ ...s, enabled: true })));
            }}
            onReset={() => {
              setSupplements(DEFAULT_SUPPLEMENTS);
            }}
          />
        </div>
      </div>
    </div>
  );
}
