import { useState, useRef } from 'react';
import type { SessionPhase } from '../../api/types';
import type { ExerciseDef } from './exerciseLibrary';

const PHASE_DOT_COLOR: Record<SessionPhase, string> = {
  prepare: 'bg-amber-500',
  practice: 'bg-teal-500',
  push: 'bg-violet-500',
};

interface ExerciseNodeProps {
  exerciseDef: ExerciseDef;
  inCanvas?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveToPhaseOptions?: SessionPhase[];
  onMoveToPhase?: (phase: SessionPhase) => void;
}

/**
 * A draggable exercise chip for the Block Constructor session flow.
 * In the library panel: effectAllowed='copy' (reusable palette).
 * In the canvas: shows reorder arrows, move-to-phase picker, and remove button.
 */
export function ExerciseNode({
  exerciseDef,
  inCanvas = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  moveToPhaseOptions,
  onMoveToPhase,
}: ExerciseNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPhasePicker, setShowPhasePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const hint = exerciseDef.defaultDurationSec > 0
    ? `${exerciseDef.defaultDurationSec}s`
    : exerciseDef.defaultReps > 0
      ? `${exerciseDef.defaultReps} reps`
      : '';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'session-exercise', exerciseDef })
    );
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative group">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`
          flex items-center gap-2 px-2.5 py-1.5 rounded-lg
          bg-slate-800 border border-slate-700
          cursor-grab active:cursor-grabbing
          transition-all duration-200
          hover:border-slate-500 hover:shadow-md hover:shadow-black/20
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${inCanvas ? 'bg-slate-700/60' : ''}
        `}
      >
        {/* Reorder arrows (canvas mode, visible on hover) */}
        {inCanvas && (onMoveUp || onMoveDown) && (
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
              disabled={!onMoveUp}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-0 transition-colors"
              aria-label="Move up"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
              disabled={!onMoveDown}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-0 transition-colors"
              aria-label="Move down"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        <span className="text-base">{exerciseDef.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{exerciseDef.name}</p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>

        {inCanvas ? (
          <div className="flex items-center gap-1">
            {/* Move-to-phase toggle button */}
            {moveToPhaseOptions && onMoveToPhase && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowPhasePicker(!showPhasePicker); }}
                className="p-0.5 text-slate-500 hover:text-blue-400 transition-colors"
                aria-label="Move to phase"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            )}
            {/* Remove button */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-0.5 text-slate-500 hover:text-red-400 transition-colors"
                aria-label="Remove exercise"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <svg className="w-3.5 h-3.5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        )}
      </div>

      {/* Phase picker dropdown */}
      {showPhasePicker && moveToPhaseOptions && onMoveToPhase && (
        <div
          ref={pickerRef}
          className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-lg shadow-black/30 py-1 min-w-[120px]"
        >
          <p className="text-xs text-slate-500 px-2 py-0.5">Move to</p>
          {moveToPhaseOptions.map((targetPhase) => (
            <button
              key={targetPhase}
              type="button"
              onClick={() => { onMoveToPhase(targetPhase); setShowPhasePicker(false); }}
              className="w-full text-left flex items-center gap-2 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${PHASE_DOT_COLOR[targetPhase]}`} />
              {targetPhase.charAt(0).toUpperCase() + targetPhase.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SessionExerciseDragData {
  type: 'session-exercise';
  exerciseDef: ExerciseDef;
}

export function parseSessionExerciseDragData(e: React.DragEvent): SessionExerciseDragData | null {
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data?.type === 'session-exercise') {
      return data as SessionExerciseDragData;
    }
  } catch {
    // Invalid JSON or no data
  }
  return null;
}
