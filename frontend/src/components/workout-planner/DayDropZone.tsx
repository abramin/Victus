import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DayType, TrainingType, TrainingConfig, MuscleGroup, ScheduledSession } from '../../api/types';
import { DAY_TYPE_COLORS, TRAINING_ICONS, TRAINING_LABELS } from '../../constants';
import { getSessionCategory } from './sessionCategories';
import { formatLoad } from './loadCalculations';
import { parseSessionDragData, type SessionDragData } from './DraggableSessionCard';

/**
 * Recovery warning for a specific day.
 */
export interface DayRecoveryWarning {
  severity: 'caution' | 'warning';
  conflictingMuscles: MuscleGroup[];
  maxFatigue: number;
}

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
  programSessions?: ScheduledSession[];
  dayType: DayType | null;
  totalLoad: number;
  isToday: boolean;
  isPast: boolean;
  isDragging: boolean;
  activeDragType: TrainingType | null;
  selectedSession?: { type: TrainingType; config: TrainingConfig } | null;
  recoveryWarning?: DayRecoveryWarning | null;
  onDrop: (date: string, data: SessionDragData) => void;
  onRemoveSession: (date: string, sessionId: string) => void;
  onRemoveProgramSession?: (session: ScheduledSession) => void;
  onDragEnterZone?: (date: string) => void;
  onDragLeaveZone?: () => void;
  onClickToPlace?: (date: string) => void;
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
  programSessions,
  dayType,
  totalLoad,
  isToday,
  isPast,
  isDragging,
  activeDragType,
  selectedSession,
  recoveryWarning,
  onDrop,
  onRemoveSession,
  onRemoveProgramSession,
  onDragEnterZone,
  onDragLeaveZone,
  onClickToPlace,
}: DayDropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<ScheduledSession | null>(null);
  const canClickToPlace = selectedSession && !isPast;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isPast) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [isPast]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (isPast) return;
    e.preventDefault();
    setIsOver(true);
    onDragEnterZone?.(date);
  }, [isPast, date, onDragEnterZone]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if leaving the container itself
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
    onDragLeaveZone?.();
  }, [onDragLeaveZone]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    if (isPast) return;

    const data = parseSessionDragData(e);
    if (data) {
      onDrop(date, data);
    }
  }, [isPast, date, onDrop]);

  const handleClick = useCallback(() => {
    if (isPast || !selectedSession) return;
    onClickToPlace?.(date);
  }, [isPast, selectedSession, date, onClickToPlace]);

  // Get category color for glow effect
  const activeCategory = activeDragType ? getSessionCategory(activeDragType) : null;
  const dayTypeColors = dayType ? DAY_TYPE_COLORS[dayType] : null;

  // Get selected session category for styling
  const selectedCategory = selectedSession ? getSessionCategory(selectedSession.type) : null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      data-planner-interactive="true"
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
        ${canClickToPlace ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-500/5' : ''}
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

      {/* Recovery warning icon */}
      <AnimatePresence>
        {recoveryWarning && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`
              absolute -top-1.5 -right-1.5 z-10
              w-5 h-5 rounded-full
              flex items-center justify-center
              text-[10px] font-bold
              shadow-lg cursor-help
              ${recoveryWarning.severity === 'warning'
                ? 'bg-red-500 text-white shadow-red-500/50'
                : 'bg-amber-500 text-gray-900 shadow-amber-500/50'
              }
            `}
            title={`${recoveryWarning.conflictingMuscles.length} muscle group(s) at ${Math.round(recoveryWarning.maxFatigue)}% fatigue`}
          >
            {recoveryWarning.severity === 'warning' ? '!' : '⚠'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions list */}
      <div className="flex-1 p-2 space-y-1 overflow-auto">
        {sessions.length === 0 && (!programSessions || programSessions.length === 0) ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-gray-600 text-xs">
              {isDragging ? 'Drop here' : canClickToPlace ? 'Click to place' : 'No sessions'}
            </span>
          </div>
        ) : (
          <>
            {/* Program sessions (locked) */}
            {programSessions?.map((session, idx) => (
              <ProgramSessionChip
                key={`program-${session.date}-${idx}`}
                session={session}
                onRemove={() => setConfirmingRemove(session)}
                isPast={isPast}
              />
            ))}
            {/* Manual sessions */}
            {sessions.map((session) => (
              <SessionChip
                key={session.id}
                session={session}
                onRemove={() => onRemoveSession(date, session.id)}
                isPast={isPast}
              />
            ))}
          </>
        )}
      </div>

      {/* Confirmation dialog for removing program session */}
      {confirmingRemove && (
        <div className="absolute inset-0 z-20 bg-black/70 rounded-xl flex items-center justify-center p-2">
          <div className="bg-gray-800 rounded-lg p-3 text-center max-w-[180px]">
            <p className="text-xs text-gray-300 mb-3">
              This session is part of your active program. Override it?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setConfirmingRemove(null)}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemoveProgramSession?.(confirmingRemove);
                  setConfirmingRemove(null);
                }}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Override
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Click-to-place overlay */}
      {canClickToPlace && !isDragging && (
        <div
          className={`
            absolute inset-1 border-2 border-dashed rounded-lg
            flex items-end justify-center pb-3
            pointer-events-none opacity-40 hover:opacity-70
            ${selectedCategory?.borderClass || 'border-blue-500'}
            ${selectedCategory?.bgClass || 'bg-blue-500/10'}
          `}
        >
          <span className="text-xs text-gray-400">
            + {TRAINING_LABELS[selectedSession.type]}
          </span>
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

interface ProgramSessionChipProps {
  session: ScheduledSession;
  onRemove: () => void;
  isPast: boolean;
}

function ProgramSessionChip({ session, onRemove, isPast }: ProgramSessionChipProps) {
  const emoji = TRAINING_ICONS[session.trainingType];
  const label = TRAINING_LABELS[session.trainingType];

  return (
    <div
      className={`
        flex items-center justify-between gap-1
        px-2 py-1 rounded-md
        bg-blue-900/30 border-l-2 border-blue-500
        group
      `}
      title="Part of active program"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Lock icon */}
        <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm flex-shrink-0">{emoji}</span>
        <span className="text-xs text-white font-medium truncate">{label}</span>
        <span className="text-[10px] text-gray-500">{session.durationMin}m</span>
      </div>
      {!isPast && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-0.5"
          title="Override this session"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
