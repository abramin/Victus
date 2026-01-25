import { useEffect, useMemo, useState, useCallback } from 'react';
import type { DayType, MealTargets, UserProfile, TrainingSession, ActualTrainingSession, DailyTargetsRangePoint } from '../../api/types';
import { getDailyTargetsRange, upsertPlannedDay } from '../../api/client';
import { DayTargetsPanel } from '../day-view';
import { calculateMealTargets } from '../targets/mealTargets';
import { CalendarDayCell, EmptyCalendarCell, type CalendarDayData } from './CalendarDayCell';
import { CalendarLegend } from './CalendarLegend';
import {
  CARB_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
  FAT_KCAL_PER_G,
  TRAINING_LABELS,
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
  breakfastCal: number;
  lunchCal: number;
  dinnerCal: number;
  mealGrams?: MealGrams;
  hasData: boolean;
  hasTraining: boolean;
  fruitG?: number;
  veggiesG?: number;
  waterL?: number;
  // Training sessions from API
  plannedSessions?: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
}

export function PlanCalendar({ profile }: PlanCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'All Days' | 'Performance' | 'Fatburner' | 'Metabolize'>('All Days');
  const [showStats, setShowStats] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rangeData, setRangeData] = useState<DailyTargetsRangePoint[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Drag-and-drop state
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Today's date key for isPast comparison
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    let isActive = true;
    const startDate = toDateKey(new Date(year, month, 1));
    const endDate = toDateKey(new Date(year, month + 1, 0));

    setRangeLoading(true);
    setRangeError(null);

    getDailyTargetsRange(startDate, endDate)
      .then((response) => {
        if (!isActive) return;
        setRangeData(response.days);
      })
      .catch((err) => {
        if (!isActive) return;
        setRangeData([]);
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

  // Build lookup map from range data
  const dataByDate = useMemo(() => {
    const map = new Map<string, DailyTargetsRangePoint>();
    for (const day of rangeData) {
      map.set(day.date, day);
    }
    return map;
  }, [rangeData]);

  // Get first day of month and generate calendar grid
  const startingDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthData = useMemo(() => {
    const data: DayData[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = toDateKey(date);
      const dayPoint = dataByDate.get(dateKey);

      if (!dayPoint) {
        data.push({
          date,
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          totalCalories: 0,
          breakfastCal: 0,
          lunchCal: 0,
          dinnerCal: 0,
          hasData: false,
          hasTraining: false,
        });
        continue;
      }

      const targets = dayPoint.calculatedTargets;
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

      // Calculate per-meal calories
      const breakfastCal = Math.round(
        mealGrams.breakfast.carbsG * CARB_KCAL_PER_G +
        mealGrams.breakfast.proteinG * PROTEIN_KCAL_PER_G +
        mealGrams.breakfast.fatsG * FAT_KCAL_PER_G
      );
      const lunchCal = Math.round(
        mealGrams.lunch.carbsG * CARB_KCAL_PER_G +
        mealGrams.lunch.proteinG * PROTEIN_KCAL_PER_G +
        mealGrams.lunch.fatsG * FAT_KCAL_PER_G
      );
      const dinnerCal = Math.round(
        mealGrams.dinner.carbsG * CARB_KCAL_PER_G +
        mealGrams.dinner.proteinG * PROTEIN_KCAL_PER_G +
        mealGrams.dinner.fatsG * FAT_KCAL_PER_G
      );

      // Calculate total calories
      const totalCalories = Math.round(
        targets.totalCarbsG * CARB_KCAL_PER_G +
        targets.totalProteinG * PROTEIN_KCAL_PER_G +
        targets.totalFatsG * FAT_KCAL_PER_G
      );

      // Determine if this has actual training (from sessions, not just day type)
      const sessions = dayPoint.actualSessions?.length ? dayPoint.actualSessions : dayPoint.plannedSessions;
      const hasTraining = sessions ? sessions.some(s => s.type !== 'rest') : false;

      data.push({
        date,
        dayType: targets.dayType,
        mealTargets,
        breakfast,
        lunch,
        dinner,
        totalCalories,
        breakfastCal,
        lunchCal,
        dinnerCal,
        mealGrams,
        hasData: true,
        hasTraining,
        fruitG: targets.fruitG,
        veggiesG: targets.veggiesG,
        waterL: targets.waterL,
        plannedSessions: dayPoint.plannedSessions,
        actualSessions: dayPoint.actualSessions,
      });
    }
    return data;
  }, [daysInMonth, month, profile.mealRatios, profile.pointsConfig, profile.supplementConfig, dataByDate, year]);

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

  const isPast = (date: Date) => {
    return toDateKey(date) < todayKey;
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

  // Generate training context string for the modal
  const getTrainingContext = (dayData: DayData): string | undefined => {
    const sessions = dayData.actualSessions?.length ? dayData.actualSessions : dayData.plannedSessions;
    if (!sessions || sessions.length === 0) return undefined;

    const nonRestSessions = sessions.filter(s => s.type !== 'rest');
    if (nonRestSessions.length === 0) return undefined;

    const totalDuration = nonRestSessions.reduce((sum, s) => sum + s.durationMin, 0);
    const primaryType = nonRestSessions[0].type;
    const label = TRAINING_LABELS[primaryType];

    if (nonRestSessions.length === 1) {
      return `${label} (${totalDuration}min)`;
    }
    return `${label} +${nonRestSessions.length - 1} (${totalDuration}min total)`;
  };

  // Drag source handlers for visual feedback
  const handleDragStart = useCallback((date: string) => {
    setDragSource(date);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDropTarget(null);
  }, []);

  // Handle drag-and-drop day type swap between two days
  const handleDayTypeSwap = useCallback(async (
    targetDate: string,
    sourceData: { date: string; dayType: DayType }
  ) => {
    const sourceDate = sourceData.date;
    if (sourceDate === targetDate) return;

    const targetDay = rangeData.find(d => d.date === targetDate);
    const sourceDayType = sourceData.dayType;
    const targetDayType = targetDay?.calculatedTargets.dayType;

    if (!targetDayType) return;

    // Optimistic update: swap both day types in local state
    setRangeData((prev) =>
      prev.map((day) => {
        if (day.date === sourceDate) {
          return {
            ...day,
            calculatedTargets: {
              ...day.calculatedTargets,
              dayType: targetDayType,
            },
          };
        }
        if (day.date === targetDate) {
          return {
            ...day,
            calculatedTargets: {
              ...day.calculatedTargets,
              dayType: sourceDayType,
            },
          };
        }
        return day;
      })
    );

    // Persist both changes to backend
    try {
      await Promise.all([
        upsertPlannedDay(sourceDate, targetDayType),
        upsertPlannedDay(targetDate, sourceDayType),
      ]);
    } catch (error) {
      // Revert on error - refetch data
      console.error('Failed to swap day types:', error);
      const startDate = toDateKey(new Date(year, month, 1));
      const endDate = toDateKey(new Date(year, month + 1, 0));
      const response = await getDailyTargetsRange(startDate, endDate);
      setRangeData(response.days);
    }
  }, [rangeData, year, month]);

  // Handle day type change from the quick selector
  const handleDayTypeChange = useCallback(async (date: string, newDayType: DayType) => {
    // Optimistic update: update local state immediately
    setRangeData((prev) =>
      prev.map((day) =>
        day.date === date
          ? {
              ...day,
              calculatedTargets: {
                ...day.calculatedTargets,
                dayType: newDayType,
              },
            }
          : day
      )
    );

    try {
      // Persist to backend
      await upsertPlannedDay(date, newDayType);
    } catch (error) {
      // Revert on error - refetch data
      console.error('Failed to update day type:', error);
      const startDate = toDateKey(new Date(year, month, 1));
      const endDate = toDateKey(new Date(year, month + 1, 0));
      const response = await getDailyTargetsRange(startDate, endDate);
      setRangeData(response.days);
    }
  }, [year, month]);

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
        <h1 className="text-2xl font-semibold text-white">Schedule</h1>

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
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              showStats
                ? 'bg-slate-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
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
              return <EmptyCalendarCell key={`empty-${index}`} />;
            }

            const isSelected = selectedDay?.date.getDate() === dayData.date.getDate()
              && selectedDay?.date.getMonth() === dayData.date.getMonth()
              && selectedDay?.date.getFullYear() === dayData.date.getFullYear();
            const isFiltered = !matchesViewFilter(dayData);

            // Convert DayData to CalendarDayData for the cell component
            const cellData: CalendarDayData = {
              date: dayData.date,
              dayType: dayData.dayType,
              totalCalories: dayData.totalCalories,
              mealGrams: dayData.mealGrams,
              hasData: dayData.hasData,
              plannedSessions: dayData.plannedSessions,
              actualSessions: dayData.actualSessions,
            };

            const cellDateKey = toDateKey(dayData.date);
            const cellIsPast = isPast(dayData.date);

            return (
              <CalendarDayCell
                key={cellDateKey}
                dayData={cellData}
                isToday={isToday(dayData.date)}
                isSelected={isSelected}
                isFiltered={isFiltered}
                isPast={cellIsPast}
                showStats={showStats}
                onClick={() => openDayDialog(dayData)}
                onDayTypeChange={handleDayTypeChange}
                isDropTarget={dropTarget === cellDateKey}
                isValidDropTarget={!cellIsPast && dayData.hasData}
                onDragEnter={setDropTarget}
                onDragLeave={() => setDropTarget(null)}
                onDrop={handleDayTypeSwap}
                isDragSource={dragSource === cellDateKey}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </div>
      </div>

      {/* Collapsible Legend */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-gray-300 transition-colors select-none">
          <svg
            className="w-4 h-4 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Show Legend
        </summary>
        <div className="mt-3">
          <CalendarLegend />
        </div>
      </details>

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
            className={`relative z-10 w-full max-w-4xl mx-4 transition-all duration-300 ${
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
                trainingContext={getTrainingContext(selectedDay)}
                mealGrams={selectedDay.mealGrams}
                totalCalories={selectedDay.totalCalories}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
