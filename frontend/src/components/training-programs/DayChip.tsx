import { useState } from 'react';
import type { ProgramDay } from '../../api/types';
import { TRAINING_LABELS, TRAINING_ICONS } from '../../constants';

interface DayChipProps {
  day: ProgramDay;
  onDragStart?: (day: ProgramDay) => void;
  onDragEnd?: () => void;
  isPlaced?: boolean;
  onRemove?: () => void;
}

/**
 * A draggable chip representing a program training day.
 * Used in the ProgramInstaller for drag-and-drop day mapping.
 */
export function DayChip({
  day,
  onDragStart,
  onDragEnd,
  isPlaced = false,
  onRemove,
}: DayChipProps) {
  const [isDragging, setIsDragging] = useState(false);

  const emoji = TRAINING_ICONS[day.trainingType] || '🏋️';
  const trainingLabel = TRAINING_LABELS[day.trainingType] || day.trainingType;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'program-day',
        day,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onDragStart?.(day);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-slate-800 border border-slate-700
        cursor-grab active:cursor-grabbing
        transition-all duration-200
        hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isPlaced ? 'bg-slate-700/50' : ''}
      `}
    >
      <span className="text-lg">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{day.label}</p>
        <p className="text-xs text-slate-400">{trainingLabel} • {day.durationMin}min</p>
      </div>
      {isPlaced && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 text-slate-400 hover:text-red-400 transition-colors"
          aria-label="Remove"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {!isPlaced && (
        <svg
          className="w-4 h-4 text-slate-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      )}
    </div>
  );
}

/**
 * Drag data type for program day chips.
 */
export interface DayChipDragData {
  type: 'program-day';
  day: ProgramDay;
}

/**
 * Parse day chip drag data from a drag event.
 */
export function parseDayChipDragData(e: React.DragEvent): DayChipDragData | null {
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data?.type === 'program-day') {
      return data as DayChipDragData;
    }
  } catch {
    // Invalid JSON or no data
  }
  return null;
}
