import { useState, useMemo } from 'react';
import type { DayType, MacroPoints, MealTargets, UserProfile } from '../../api/types';
import { DayTargetsPanel } from '../day-view';

interface PlanCalendarProps {
  profile: UserProfile;
}

interface DayData {
  date: Date;
  dayType: DayType;
  breakfast: number;
  lunch: number;
  dinner: number;
  total: number;
}

const DAY_TYPE_COLORS: Record<DayType, { bg: string; text: string }> = {
  performance: { bg: 'bg-blue-600', text: 'text-blue-400' },
  fatburner: { bg: 'bg-orange-600', text: 'text-orange-400' },
  metabolize: { bg: 'bg-purple-600', text: 'text-purple-400' },
};

const DAY_TYPE_LABELS: Record<DayType, string> = {
  performance: 'Perf',
  fatburner: 'Fatb',
  metabolize: 'Meta',
};

// Generate placeholder data using profile meal ratios
function generateMockData(
  year: number,
  month: number,
  mealRatios: { breakfast: number; lunch: number; dinner: number }
): DayData[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayTypes: DayType[] = ['performance', 'fatburner', 'metabolize'];
  const data: DayData[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayType = dayTypes[Math.floor(Math.random() * dayTypes.length)];
    // Base total points varies by day type
    const baseTotal = dayType === 'performance' ? 300 : dayType === 'fatburner' ? 270 : 285;

    // Apply actual meal ratios from profile
    const breakfast = Math.round((baseTotal * mealRatios.breakfast) / 100);
    const lunch = Math.round((baseTotal * mealRatios.lunch) / 100);
    const dinner = Math.round((baseTotal * mealRatios.dinner) / 100);

    data.push({
      date: new Date(year, month, day),
      dayType,
      breakfast,
      lunch,
      dinner,
      total: breakfast + lunch + dinner,
    });
  }

  return data;
}

export function PlanCalendar({ profile }: PlanCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'All Days' | 'Performance' | 'Fatburner' | 'Metabolize'>('All Days');
  const [displayMode, setDisplayMode] = useState<'Points' | 'Grams'>('Points');
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get meal ratios from profile (convert to percentages)
  const mealRatioPercents = useMemo(() => ({
    breakfast: Math.round(profile.mealRatios.breakfast * 100),
    lunch: Math.round(profile.mealRatios.lunch * 100),
    dinner: Math.round(profile.mealRatios.dinner * 100),
  }), [profile.mealRatios]);

  // Get first day of month and generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthData = useMemo(() => generateMockData(year, month, mealRatioPercents), [year, month, mealRatioPercents]);

  const navigateMonth = (delta: number) => {
    const newDate = new Date(year, month + delta, 1);
    setCurrentDate(newDate);
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

  const macroRatios = useMemo(() => ({
    carbs: profile.carbRatio,
    protein: profile.proteinRatio,
    fats: profile.fatRatio,
  }), [profile.carbRatio, profile.proteinRatio, profile.fatRatio]);

  const splitMacroPoints = (total: number): MacroPoints => {
    const carbs = Math.round(total * macroRatios.carbs);
    const protein = Math.round(total * macroRatios.protein);
    const fats = Math.max(0, total - carbs - protein);
    return { carbs, protein, fats };
  };

  const selectedMealTargets: MealTargets | null = selectedDay
    ? {
      breakfast: splitMacroPoints(selectedDay.breakfast),
      lunch: splitMacroPoints(selectedDay.lunch),
      dinner: splitMacroPoints(selectedDay.dinner),
    }
    : null;

  const selectedDateLabel = selectedDay
    ? selectedDay.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    : 'Select a day';

  const openDayDialog = (dayData: DayData) => {
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
            onChange={(e) => setDisplayMode(e.target.value as typeof displayMode)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option>Points</option>
            <option>Grams</option>
          </select>
        </div>
      </div>

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

            return (
              <button
                key={dayData.date.toISOString().split('T')[0]}
                type="button"
                onClick={() => openDayDialog(dayData)}
                className={`min-h-[120px] p-2 border-t border-r border-gray-800 last:border-r-0 text-left transition ${
                  isToday(dayData.date) ? 'bg-gray-800/30' : 'bg-transparent'
                } ${isSelected ? 'ring-2 ring-white/20' : 'hover:bg-gray-800/40'}`}
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
                <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${
                  DAY_TYPE_COLORS[dayData.dayType].bg
                } text-white`}>
                  {DAY_TYPE_LABELS[dayData.dayType]}
                </div>

                {/* Points Breakdown */}
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">B:</span>
                    <span className="text-gray-300">{dayData.breakfast}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">L:</span>
                    <span className="text-gray-300">{dayData.lunch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">D:</span>
                    <span className="text-gray-300">{dayData.dinner}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-700">
                    <span className="text-gray-500">Tot:</span>
                    <span className="text-white font-medium">{dayData.total}</span>
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
                dayType={selectedDay.dayType}
                mealTargets={selectedMealTargets}
                mealRatios={profile.mealRatios}
                totalFruitG={profile.fruitTargetG}
                totalVeggiesG={profile.veggieTargetG}
                helperText="Calendar targets use your profile ratios."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
