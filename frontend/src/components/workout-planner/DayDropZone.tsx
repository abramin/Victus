import { useState, useCallback } from 'react';
import type { DayType, TrainingType } from '../../api/types';
import { DAY_TYPE_COLORS, TRAINING_ICONS, TRAINING_LABELS } from '../../constants';
import { getSessionCategory } from './sessionCategories';
import { formatLoad } from './loadCalculations';
import { parseSessionDragData, type SessionDragData } from './DraggableSessionCard';

/**
 * A planned session in draft state.
 */
export interface PlannedSessionDraft {
  id: string;
  trainingType: TrainingType;
  durationMin: number;
  rpe: number;
  loadScore: number;
}

interface DayDropZoneProps {
  date: string;
  dayName: string; // "Mon", "Tue", etc.
  dayNumber: number; // 12, 13, etc.
  sessions: PlannedSessionDraft[];
  dayType: DayType | null;
  totalLoad: number;
  isToday: boolean;
  isPast: boolean;
  isDragging: boolean;
  activeDragType: TrainingType | null;
  onDrop: (date: string, data: SessionDragData) => void;
  onRemoveSession: (date: string, sessionId: string) => void;
}

/**
 * A droppable zone representing a single day on the calendar.
 * Shows planned sessions and lights up when a card is dragged over it.
 */
export function DayDropZone({
  date,
  dayName,
  dayNumber,
  sessions,
  dayType,
  totalLoad,
  isToday,
  isPast,
  isDragging,
  activeDragType,
  onDrop,
  onRemoveSession,
}: DayDropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isPast) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [isPast]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (isPast) return;
    e.preventDefault();
    setIsOver(true);
  }, [isPast]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if leaving the container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    if (isPast) return;

    const data = parseSessionDragData(e);
    if (data) {
      onDrop(date, data);
    }
  }, [isPast, date, onDrop]);

  // Get category color for glow effect
  const activeCategory = activeDragType ? getSessionCategory(activeDragType) : null;
  const dayTypeColors = dayType ? DAY_TYPE_COLORS[dayType] : null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col
        min-h-[180px] rounded-xl
        border transition-all duration-200
        ${isPast ? 'opacity-50 cursor-not-allowed' : ''}
        ${isOver && !isPast
          ? `border-2 ${activeCategory?.borderClass || 'border-blue-500'} bg-blue-500/10`
          : 'border-gray-700 bg-gray-800'
        }
        ${isToday ? 'ring-2 ring-blue-500/50' : ''}
      `}
    >
      {/* Day header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-baseline gap-1">
          <span className={`text-xs font-medium ${isToday ? 'text-blue-400' : 'text-gray-500'}`}>
            {dayName}
          </span>
          <span className={`text-lg font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>
            {dayNumber}
          </span>
        </div>
        {dayType && dayTypeColors && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${dayTypeColors.bg} text-white`}>
            {dayType === 'performance' ? 'Perf' : dayType === 'fatburner' ? 'Fatb' : 'Meta'}
          </span>
        )}
      </div>

      {/* Sessions list */}
      <div className="flex-1 p-2 space-y-1 overflow-auto">
        {sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-gray-600 text-xs">
              {isDragging ? 'Drop here' : 'No sessions'}
            </span>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionChip
              key={session.id}
              session={session}
              onRemove={() => onRemoveSession(date, session.id)}
              isPast={isPast}
            />
          ))
        )}
      </div>

      {/* Load indicator */}
      {totalLoad > 0 && (
        <div className="absolute bottom-1 right-2 text-[10px] text-gray-500">
          Load: {formatLoad(totalLoad)}
        </div>
      )}

      {/* Drop preview overlay */}
      {isDragging && !isPast && (
        <div
          className={`
            absolute inset-1 border-2 border-dashed rounded-lg
            flex items-end justify-center pb-3
            pointer-events-none transition-opacity
            ${isOver ? 'opacity-100' : 'opacity-40'}
            ${activeCategory?.borderClass || 'border-blue-500'}
            ${activeCategory?.bgClass || 'bg-blue-500/10'}
          `}
        >
          {activeDragType && (
            <span className="text-xs text-gray-400">
              + {TRAINING_LABELS[activeDragType]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface SessionChipProps {
  session: PlannedSessionDraft;
  onRemove: () => void;
  isPast: boolean;
}

function SessionChip({ session, onRemove, isPast }: SessionChipProps) {
  const category = getSessionCategory(session.trainingType);
  const emoji = TRAINING_ICONS[session.trainingType];
  const label = TRAINING_LABELS[session.trainingType];

  return (
    <div
      className={`
        flex items-center justify-between gap-1
        px-2 py-1 rounded-md
        bg-gray-700/50 border-l-2 ${category.borderClass}
        group
      `}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm flex-shrink-0">{emoji}</span>
        <span className="text-xs text-white font-medium truncate">{label}</span>
        <span className="text-[10px] text-gray-500">{session.durationMin}m</span>
      </div>
      {!isPast && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-0.5"
          title="Remove session"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
