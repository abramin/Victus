import { useEffect, useMemo, useState } from 'react';
import type { DayType, DailyTargets, MealTargets, UserProfile } from '../../api/types';
import { getDailyTargetsRange } from '../../api/client';
import { DayTargetsPanel } from '../day-view';
import { calculateMealTargets } from '../targets/mealTargets';
import { useDisplayMode } from '../../contexts/DisplayModeContext';
import {
  CARB_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
  FAT_KCAL_PER_G,
  DAY_TYPE_COLORS,
  DAY_TYPE_LABELS,
} from '../../constants';
import { toDateKey } from '../../utils';

interface PlanCalendarProps {
  profile: UserProfile;
}

interface MacroGrams {
  carbsG: number;
  proteinG: number;
  fatsG: number;
}

interface MealGrams {
  breakfast: MacroGrams;
  lunch: MacroGrams;
  dinner: MacroGrams;
}

interface DayData {
  date: Date;
  dayType?: DayType;
  mealTargets?: MealTargets;
  breakfast: number;
  lunch: number;
  dinner: number;
  totalCalories: number;
  // Grams for each meal (proportional based on points ratio)
  breakfastG: number;
  lunchG: number;
  dinnerG: number;
  totalG: number;
  // Per-macro grams for each meal
  mealGrams?: MealGrams;
  hasData: boolean;
  fruitG?: number;
  veggiesG?: number;
  waterL?: number;
}

export function PlanCalendar({ profile }: PlanCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'All Days' | 'Performance' | 'Fatburner' | 'Metabolize'>('All Days');
  const { displayMode, setDisplayMode } = useDisplayMode();
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetsByDate, setTargetsByDate] = useState<Record<string, DailyTargets>>({});
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    let isActive = true;
    const startDate = toDateKey(new Date(year, month, 1));
    const endDate = toDateKey(new Date(year, month + 1, 0));

    setRangeLoading(true);
    setRangeError(null);

    getDailyTargetsRange(startDate, endDate)
      .then((response) => {
        if (!isActive) return;
        const map: Record<string, DailyTargets> = {};
        for (const day of response.days) {
          map[day.date] = day.calculatedTargets;
        }
        setTargetsByDate(map);
      })
      .catch((err) => {
        if (!isActive) return;
        setTargetsByDate({});
        setRangeError(err instanceof Error ? err.message : 'Failed to load plan data');
      })
      .finally(() => {
        if (!isActive) return;
        setRangeLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [year, month]);

  useEffect(() => {
    setSelectedDay(null);
    setIsDialogOpen(false);
  }, [year, month]);

  // Get first day of month and generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthData = useMemo(() => {
    const data: DayData[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const targets = targetsByDate[toDateKey(date)];
      if (!targets) {
        data.push({
          date,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          totalCalories: 0,
          breakfastG: 0,
          lunchG: 0,
          dinnerG: 0,
          totalG: 0,
          hasData: false,
        });
        continue;
      }
      const mealTargets = calculateMealTargets(
        targets.totalCarbsG,
        targets.totalProteinG,
        targets.totalFatsG,
        targets.fruitG,
        targets.veggiesG,
        profile.mealRatios,
        profile.pointsConfig,
        targets.dayType,
        profile.supplementConfig
      );

      // Calculate points per meal
      const breakfast = mealTargets.breakfast.carbs + mealTargets.breakfast.protein + mealTargets.breakfast.fats;
      const lunch = mealTargets.lunch.carbs + mealTargets.lunch.protein + mealTargets.lunch.fats;
      const dinner = mealTargets.dinner.carbs + mealTargets.dinner.protein + mealTargets.dinner.fats;
      const totalPoints = breakfast + lunch + dinner;
      
      // Calculate total grams and distribute proportionally
      const totalGrams = targets.totalCarbsG + targets.totalProteinG + targets.totalFatsG;
      const breakfastG = totalPoints > 0 ? Math.round((breakfast / totalPoints) * totalGrams) : 0;
      const lunchG = totalPoints > 0 ? Math.round((lunch / totalPoints) * totalGrams) : 0;
      const dinnerG = totalPoints > 0 ? Math.round((dinner / totalPoints) * totalGrams) : 0;
      
      // Calculate per-macro grams for each meal (proportional based on meal ratio)
      const bRatio = totalPoints > 0 ? breakfast / totalPoints : 0;
      const lRatio = totalPoints > 0 ? lunch / totalPoints : 0;
      const dRatio = totalPoints > 0 ? dinner / totalPoints : 0;
      const mealGrams: MealGrams = {
        breakfast: {
          carbsG: Math.round(targets.totalCarbsG * bRatio),
          proteinG: Math.round(targets.totalProteinG * bRatio),
          fatsG: Math.round(targets.totalFatsG * bRatio),
        },
        lunch: {
          carbsG: Math.round(targets.totalCarbsG * lRatio),
          proteinG: Math.round(targets.totalProteinG * lRatio),
          fatsG: Math.round(targets.totalFatsG * lRatio),
        },
        dinner: {
          carbsG: Math.round(targets.totalCarbsG * dRatio),
          proteinG: Math.round(targets.totalProteinG * dRatio),
          fatsG: Math.round(targets.totalFatsG * dRatio),
        },
      };
      
      // Calculate total calories (the only valid cross-macro aggregate)
      const totalCalories = Math.round(
        targets.totalCarbsG * CARB_KCAL_PER_G +
        targets.totalProteinG * PROTEIN_KCAL_PER_G +
        targets.totalFatsG * FAT_KCAL_PER_G
      );
      
      data.push({
        date,
        dayType: targets.dayType,
        mealTargets,
        breakfast,
        lunch,
        dinner,
        totalCalories,
        breakfastG,
        lunchG,
        dinnerG,
        totalG: Math.round(totalGrams),
        mealGrams,
        hasData: true,
        fruitG: targets.fruitG,
        veggiesG: targets.veggiesG,
        waterL: targets.waterL,
      });
    }
    return data;
  }, [daysInMonth, month, profile.mealRatios, profile.pointsConfig, profile.supplementConfig, targetsByDate, year]);

  const navigateMonth = (delta: number) => {
    const newDate = new Date(year, month + delta, 1);
    setCurrentDate(newDate);
  };

  // Check if a day matches the current viewMode filter
  const matchesViewFilter = (dayData: DayData): boolean => {
    if (viewMode === 'All Days') return true;
    if (!dayData.dayType) return false;
    const viewToType: Record<string, DayType> = {
      'Performance': 'performance',
      'Fatburner': 'fatburner',
      'Metabolize': 'metabolize',
    };
    return dayData.dayType === viewToType[viewMode];
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: (DayData | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = monthData.find(d => d.date.getDate() === day);
      days.push(dayData || null);
    }

    return days;
  }, [monthData, startingDayOfWeek, daysInMonth]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const selectedMealTargets: MealTargets | null = selectedDay?.mealTargets ?? null;

  const selectedDateLabel = selectedDay
    ? selectedDay.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : 'Select a day';

  const openDayDialog = (dayData: DayData) => {
    if (!dayData.hasData) {
      return;
    }
    setSelectedDay(dayData);
    setIsDialogOpen(true);
  };

  const closeDayDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Plan</h1>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-white font-medium min-w-[160px] text-center">
            {formatMonth(currentDate)}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option>All Days</option>
            <option>Performance</option>
            <option>Fatburner</option>
            <option>Metabolize</option>
          </select>
          <select
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'Points' | 'Grams')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option>Points</option>
            <option>Grams</option>
          </select>
        </div>
      </div>
      {rangeError && (
        <p className="text-sm text-red-400">Unable to load plan data.</p>
      )}
      {rangeLoading && !rangeError && (
        <p className="text-sm text-gray-500">Loading plan data...</p>
      )}

      {/* Calendar Grid */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-800/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[120px] p-2 border-t border-r border-gray-800 last:border-r-0"
                />
              );
            }

            const isSelected = selectedDay?.date.getDate() === dayData.date.getDate()
              && selectedDay?.date.getMonth() === dayData.date.getMonth()
              && selectedDay?.date.getFullYear() === dayData.date.getFullYear();
            const isDisabled = !dayData.hasData;
            const isFiltered = !matchesViewFilter(dayData);

            // Choose values based on displayMode
            const showGrams = displayMode === 'Grams';
            const bValue = showGrams ? dayData.breakfastG : dayData.breakfast;
            const lValue = showGrams ? dayData.lunchG : dayData.lunch;
            const dValue = showGrams ? dayData.dinnerG : dayData.dinner;
            const unit = showGrams ? 'g' : '';

            return (
              <button
                key={toDateKey(dayData.date)}
                type="button"
                onClick={() => openDayDialog(dayData)}
                disabled={isDisabled}
                className={`min-h-[120px] p-2 border-t border-r border-gray-800 last:border-r-0 text-left transition ${
                  isToday(dayData.date) ? 'bg-gray-800/30' : 'bg-transparent'
                } ${isSelected ? 'ring-2 ring-white/20' : ''} ${
                  isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-800/40'
                } ${isFiltered && dayData.hasData ? 'opacity-30' : ''}`}
              >
                {/* Day Number & Today Indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    isToday(dayData.date) ? 'text-white' : 'text-gray-400'
                  }`}>
                    {dayData.date.getDate()}
                  </span>
                  {isToday(dayData.date) && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>

                {/* Day Type Badge */}
                {dayData.dayType && dayData.hasData && (
                  <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                    DAY_TYPE_COLORS[dayData.dayType].bg
                  } text-white`}>
                    {DAY_TYPE_LABELS[dayData.dayType]}
                  </div>
                )}

                {/* Points/Grams Breakdown */}
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">B:</span>
                    <span className={dayData.hasData ? 'text-gray-300' : 'text-gray-600'}>
                      {dayData.hasData ? `${bValue}${unit}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">L:</span>
                    <span className={dayData.hasData ? 'text-gray-300' : 'text-gray-600'}>
                      {dayData.hasData ? `${lValue}${unit}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">D:</span>
                    <span className={dayData.hasData ? 'text-gray-300' : 'text-gray-600'}>
                      {dayData.hasData ? `${dValue}${unit}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-700">
                    <span className="text-gray-500">Cal:</span>
                    <span className={dayData.hasData ? 'text-white font-medium' : 'text-gray-600'}>
                      {dayData.hasData ? `${dayData.totalCalories}` : '--'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && selectedMealTargets && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition ${
            isDialogOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          aria-hidden={!isDialogOpen}
        >
          <button
            type="button"
            aria-label="Close day view"
            onClick={closeDayDialog}
            className={`absolute inset-0 z-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
              isDialogOpen ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Day view"
            className={`relative z-10 w-full max-w-2xl mx-4 transition-all duration-300 ${
              isDialogOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
            }`}
          >
            <div className="flex justify-end mb-3">
              <button
                type="button"
                aria-label="Close day view"
                onClick={closeDayDialog}
                className="p-2 rounded-full bg-gray-900/80 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <div className="relative">
              <DayTargetsPanel
                title="Day View"
                dateLabel={selectedDateLabel}
                dayType={selectedDay.dayType ?? 'fatburner'}
                mealTargets={selectedMealTargets}
                mealRatios={profile.mealRatios}
                totalFruitG={selectedDay.fruitG ?? profile.fruitTargetG}
                totalVeggiesG={selectedDay.veggiesG ?? profile.veggieTargetG}
                waterL={selectedDay.waterL}
                helperText="Adjusted to your current meal distribution."
                displayMode={displayMode}
                mealGrams={selectedDay.mealGrams}
                totalGrams={selectedDay.totalG}
                totalCalories={selectedDay.totalCalories}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
