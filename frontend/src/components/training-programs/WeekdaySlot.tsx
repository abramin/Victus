import { useState } from 'react';
import type { ProgramDay } from '../../api/types';
import { DayChip, parseDayChipDragData } from './DayChip';

interface WeekdaySlotProps {
  weekday: number; // 0=Mon, 1=Tue, ..., 6=Sun
  assignedDay: ProgramDay | null;
  onDrop: (weekday: number, day: ProgramDay) => void;
  onRemove: (weekday: number) => void;
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A drop zone for a weekday that accepts dragged program days.
 * Shows assigned day or empty state with glow effect on drag-over.
 */
export function WeekdaySlot({ weekday, assignedDay, onDrop, onRemove }: WeekdaySlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const dragData = parseDayChipDragData(e);
    if (dragData) {
      onDrop(weekday, dragData.day);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative p-3 rounded-lg border-2 border-dashed
        transition-all duration-200
        ${isDragOver
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : assignedDay
            ? 'border-slate-600 bg-slate-800/50'
            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
        }
      `}
    >
      {/* Weekday label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-300">
          {WEEKDAY_NAMES[weekday]}
        </span>
        <span className="text-xs text-slate-500 uppercase">
          {WEEKDAY_SHORT[weekday]}
        </span>
      </div>

      {/* Content */}
      {assignedDay ? (
        <DayChip
          day={assignedDay}
          isPlaced
          onRemove={() => onRemove(weekday)}
        />
      ) : (
        <div
          className={`
            flex items-center justify-center h-14 rounded-lg
            border border-dashed border-slate-700
            text-slate-500 text-sm
            ${isDragOver ? 'border-blue-500/50 text-blue-400' : ''}
          `}
        >
          {isDragOver ? 'Drop here' : 'Rest day'}
        </div>
      )}

      {/* Glow effect on drag over */}
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none rounded-lg ring-2 ring-blue-500/50 ring-inset" />
      )}
    </div>
  );
}
