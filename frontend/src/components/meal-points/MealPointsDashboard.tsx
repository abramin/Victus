import { useState, useMemo } from 'react';
import type { DailyLog, DayType, UserProfile } from '../../api/types';
import { MealCard } from './MealCard';
import { SupplementsPanel } from './SupplementsPanel';

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

const DEFAULT_SUPPLEMENTS = [
  { id: 'whey', label: 'Whey', sublabel: 'Protein', value: 30, enabled: false },
  { id: 'collagen', label: 'Collagen', sublabel: 'Protein', value: 20, enabled: false },
  { id: 'eaa_morning', label: 'EAA Morning', sublabel: 'Protein', value: 10, enabled: false },
  { id: 'eaa_evening', label: 'EAA Evening', sublabel: 'Protein', value: 10, enabled: false },
  { id: 'intra_carbs', label: 'Intra-workout', sublabel: 'Carbs', value: 50, enabled: false },
];

export function MealPointsDashboard({ log, profile, onDayTypeChange }: MealPointsDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayType, setSelectedDayType] = useState<DayType>(log?.dayType || 'fatburner');
  const [supplements, setSupplements] = useState(DEFAULT_SUPPLEMENTS);
  const [trendPeriod, setTrendPeriod] = useState<'7d' | '14d' | '30d'>('7d');

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

  // Get meal data from log - null if no log exists for today
  const mealData = useMemo(() => {
    if (log?.calculatedTargets?.meals) {
      return {
        breakfast: log.calculatedTargets.meals.breakfast,
        lunch: log.calculatedTargets.meals.lunch,
        dinner: log.calculatedTargets.meals.dinner,
        hasData: true,
      };
    }
    // No log exists - show placeholder
    return {
      breakfast: { carbs: 0, protein: 0, fats: 0 },
      lunch: { carbs: 0, protein: 0, fats: 0 },
      dinner: { carbs: 0, protein: 0, fats: 0 },
      hasData: false,
    };
  }, [log]);

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
              <p className="text-gray-400 mb-4">No daily log for today yet.</p>
              <p className="text-gray-500 text-sm">Complete your Daily Update to see your meal points.</p>
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
                <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option>Total Points</option>
                  <option>Carb Points</option>
                  <option>Protein Points</option>
                  <option>Fat Points</option>
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

            {/* Placeholder Chart Area */}
            <div className="h-48 bg-gray-800/50 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">Trend chart will appear here</span>
            </div>
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
