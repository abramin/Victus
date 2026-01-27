import type { DayType, TrainingSession, ActualTrainingSession } from '../../api/types';
import { MacroDonutChart } from '../charts';
import { TrainingBadge } from './TrainingBadge';
import { DayTypeQuickSelector } from './DayTypeQuickSelector';
import { AdherenceIndicator, calculateAdherenceStatus } from './AdherenceIndicator';
import { MacroCell } from './MacroCell';
import { MesoCell } from './MesoCell';
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS } from '../../constants';
import { toDateKey } from '../../utils';

// Heatmap background colors for day types (faint tints)
const DAY_TYPE_HEATMAP: Record<DayType, string> = {
  fatburner: 'bg-orange-500/10',
  performance: 'bg-blue-500/10',
  metabolize: 'bg-emerald-500/10',
};

interface MacroGrams {
  carbsG: number;
  proteinG: number;
  fatsG: number;
}

export interface CalendarDayData {
  date: Date;
  dayType?: DayType;
  totalCalories: number;
  mealGrams?: {
    breakfast: MacroGrams;
    lunch: MacroGrams;
    dinner: MacroGrams;
  };
  hasData: boolean;
  plannedSessions?: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
}

interface DragSourceData {
  date: string;
  dayType: DayType;
}

interface CalendarDayCellProps {
  dayData: CalendarDayData;
  isToday: boolean;
  isSelected: boolean;
  isFiltered: boolean;
  isPast: boolean;
  showStats?: boolean;
  onClick: () => void;
  onDayTypeChange?: (date: string, dayType: DayType) => void;
  isDropTarget?: boolean;
  isValidDropTarget?: boolean;
  onDragEnter?: (date: string) => void;
  onDragLeave?: () => void;
  onDrop?: (targetDate: string, sourceData: DragSourceData) => void;
  isDragSource?: boolean;
  onDragStart?: (date: string) => void;
  onDragEnd?: () => void;
  // Semantic zoom props
  zoomMode?: 'macro' | 'meso' | 'micro';
  heatmapIntensity?: number;
  loadScore?: number;
  avgRpe?: number;
  onHover?: () => void;
  onHoverLeave?: () => void;
}

/**
 * Calendar cell component with new layout showing training + nutrition correlation.
 *
 * Layout:
 * ┌────────────────────────────────────┐
 * │ 12 (Mon)              [mini donut]│
 * ├────────────────────────────────────┤
 * │ 🏋️ Strength (45min)               │
 * │ [⚡ Performance]  2,505 kcal       │
 * └────────────────────────────────────┘
 */
export function CalendarDayCell({
  dayData,
  isToday,
  isSelected,
  isFiltered,
  isPast,
  showStats = false,
  onClick,
  onDayTypeChange,
  isDropTarget = false,
  isValidDropTarget = true,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragSource = false,
  onDragStart,
  onDragEnd,
  // Semantic zoom props
  zoomMode = 'micro',
  heatmapIntensity = 0,
  loadScore,
  avgRpe,
  onHover,
  onHoverLeave,
}: CalendarDayCellProps) {
  const isDisabled = !dayData.hasData;
  const sessions = (dayData.actualSessions?.length ?? 0) > 0
    ? dayData.actualSessions
    : dayData.plannedSessions;
  const hasTraining = (sessions?.length ?? 0) > 0 && sessions!.some(s => s.type !== 'rest');
  const dateKey = toDateKey(dayData.date);

  // Calculate adherence status for past days
  const adherenceStatus = calculateAdherenceStatus(
    dayData.plannedSessions,
    dayData.actualSessions,
    isPast
  );

  // Determine cell background and styling based on state
  const cellClasses = [
    'min-h-[140px] p-2 border-t border-r border-gray-800 last:border-r-0 text-left transition flex flex-col relative',
    isToday && 'ring-2 ring-blue-500/50',
    isSelected && 'ring-2 ring-white/30',
    isDisabled && 'cursor-not-allowed opacity-60',
    !isDisabled && 'hover:bg-gray-800/40 cursor-pointer',
    isFiltered && dayData.hasData && 'opacity-30',
    isPast && dayData.hasData && 'bg-gray-900/30',
    dayData.dayType && !isPast ? DAY_TYPE_HEATMAP[dayData.dayType] : '',
    // Drop target styling
    isDropTarget && isValidDropTarget && 'ring-2 ring-blue-400/50 bg-blue-500/10',
    isDropTarget && !isValidDropTarget && 'ring-2 ring-red-400/30 bg-red-500/5',
    // Drag source styling - reduce opacity while dragging
    isDragSource && 'opacity-50 ring-2 ring-blue-400/30',
  ].filter(Boolean).join(' ');

  const handleDayTypeSelect = (newDayType: DayType) => {
    onDayTypeChange?.(dateKey, newDayType);
  };

  // Drag-and-drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    // Only allow drop on future days with data
    if (!isPast && dayData.hasData) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (dayData.hasData) {
      onDragEnter?.(dateKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the cell (not entering a child)
    if (e.currentTarget === e.target) {
      onDragLeave?.();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeave?.(); // Clear drop target highlight

    if (isPast || !dayData.hasData) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as DragSourceData;
      onDrop?.(dateKey, data);
    } catch {
      // Invalid drag data, ignore
    }
  };

  return (
    <div
      onClick={isDisabled ? undefined : onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
      className={cellClasses}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Conditional rendering based on zoom mode */}
      {zoomMode === 'macro' && (
        <MacroCell
          date={dayData.date}
          isToday={isToday}
          heatmapIntensity={heatmapIntensity}
          hasData={dayData.hasData}
        />
      )}

      {zoomMode === 'meso' && (
        <MesoCell
          date={dayData.date}
          isToday={isToday}
          heatmapIntensity={heatmapIntensity}
          hasData={dayData.hasData}
          plannedSessions={dayData.plannedSessions}
          actualSessions={dayData.actualSessions}
          loadScore={loadScore}
          avgRpe={avgRpe}
        />
      )}

      {zoomMode === 'micro' && (
        <>
          {/* Row 1: Day Number + Adherence + Mini Donut */}
          <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium ${isToday ? 'text-white' : 'text-gray-400'}`}>
            {dayData.date.getDate()}
          </span>
          {isToday && (
            <span className="text-[10px] text-blue-400 font-medium">TODAY</span>
          )}
          {/* Adherence indicator for past days - only when showStats is enabled */}
          {showStats && isPast && dayData.hasData && (
            <AdherenceIndicator status={adherenceStatus} compact />
          )}
        </div>

        {/* Mini Macro Donut Chart (24px) - only when showStats is enabled */}
        {showStats && dayData.hasData && dayData.mealGrams && (
          <MacroDonutChart
            carbs={dayData.mealGrams.dinner.carbsG}
            protein={dayData.mealGrams.dinner.proteinG}
            fat={dayData.mealGrams.dinner.fatsG}
            size={24}
          />
        )}
      </div>

      {/* Row 2: Training Section (The "Why") */}
      {dayData.hasData && (
        <div className="flex-1 flex flex-col justify-center gap-1.5">
          {hasTraining && sessions ? (
            <TrainingBadge sessions={sessions} compact />
          ) : (
            <div className="text-[10px] text-gray-500 px-1">Rest day</div>
          )}

          {/* Row 3: Nutrition Section (The "What") */}
          <div className="flex items-center justify-between gap-1">
            {dayData.dayType && (
              onDayTypeChange && !isPast ? (
                <DayTypeQuickSelector
                  currentType={dayData.dayType}
                  date={dateKey}
                  onSelect={handleDayTypeSelect}
                  disabled={isPast}
                  onDragStart={onDragStart ? () => onDragStart(dateKey) : undefined}
                  onDragEnd={onDragEnd}
                />
              ) : (
                <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  DAY_TYPE_COLORS[dayData.dayType].bg
                } text-white ${isPast ? 'opacity-70' : ''}`}>
                  {DAY_TYPE_LABELS[dayData.dayType]}
                </div>
              )
            )}
            {/* Calories - only when showStats is enabled */}
            {showStats && (
              <div className="text-right">
                <span className="text-xs font-medium text-white">
                  {dayData.totalCalories}
                </span>
                <span className="text-[10px] text-gray-500 ml-0.5">kcal</span>
              </div>
            )}
          </div>
        </div>
      )}

          {/* Empty state for days without data */}
          {!dayData.hasData && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs text-gray-600">--</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Empty cell placeholder for calendar grid padding.
 */
export function EmptyCalendarCell() {
  return (
    <div className="min-h-[140px] p-2 border-t border-r border-gray-800 last:border-r-0" />
  );
}
