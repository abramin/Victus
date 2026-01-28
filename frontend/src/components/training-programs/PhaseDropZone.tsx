import { useState, useMemo } from 'react';
import type { SessionPhase } from '../../api/types';
import type { ExerciseDef } from './exerciseLibrary';
import { ExerciseNode, parseSessionExerciseDragData } from './ExerciseNode';

export interface PlacedExercise {
  exerciseDef: ExerciseDef;
  order: number;
}

interface PhaseDropZoneProps {
  phase: SessionPhase;
  exercises: PlacedExercise[];
  onDrop: (phase: SessionPhase, exerciseDef: ExerciseDef) => void;
  onRemove: (phase: SessionPhase, order: number) => void;
  onMoveUp: (phase: SessionPhase, order: number) => void;
  onMoveDown: (phase: SessionPhase, order: number) => void;
  onMoveToPhase: (fromPhase: SessionPhase, toPhase: SessionPhase, order: number) => void;
  /** When true, renders as a full-height column for horizontal layout */
  horizontal?: boolean;
}

const PHASE_CONFIG: Record<SessionPhase, { label: string; accent: string; glowBorder: string; glowBg: string; dotColor: string }> = {
  prepare: {
    label: 'PREPARE',
    accent: 'Mobility & Activation',
    glowBorder: 'border-amber-500',
    glowBg: 'bg-amber-500/10',
    dotColor: 'bg-amber-500',
  },
  practice: {
    label: 'PRACTICE',
    accent: 'Skill & Transitions',
    glowBorder: 'border-teal-500',
    glowBg: 'bg-teal-500/10',
    dotColor: 'bg-teal-500',
  },
  push: {
    label: 'PUSH',
    accent: 'Strength & Conditioning',
    glowBorder: 'border-violet-500',
    glowBg: 'bg-violet-500/10',
    dotColor: 'bg-violet-500',
  },
};

const PHASES_FOR_MOVE: SessionPhase[] = ['prepare', 'practice', 'push'];

function estimateDurationSec(exercises: PlacedExercise[]): number {
  return exercises.reduce((sum, { exerciseDef }) => {
    if (exerciseDef.defaultDurationSec > 0) return sum + exerciseDef.defaultDurationSec;
    // Rep-based: estimate ~3s per rep
    return sum + exerciseDef.defaultReps * 3;
  }, 0);
}

function formatDuration(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.round(totalSec / 60);
  return `~${min} min`;
}

/**
 * A drop zone for a single phase segment in the Block Constructor.
 * Accepts dragged ExerciseNode chips and displays placed exercises.
 */
export function PhaseDropZone({
  phase,
  exercises,
  onDrop,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToPhase,
  horizontal = false,
}: PhaseDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const config = PHASE_CONFIG[phase];

  const durationEstimate = useMemo(() => estimateDurationSec(exercises), [exercises]);
  const otherPhases = PHASES_FOR_MOVE.filter((p) => p !== phase);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const dragData = parseSessionExerciseDragData(e);
    if (dragData) {
      onDrop(phase, dragData.exerciseDef);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-lg border transition-all duration-200
        ${horizontal ? 'flex-1 flex flex-col min-h-full' : ''}
        ${isDragOver
          ? `${config.glowBorder} ${config.glowBg} shadow-lg`
          : 'border-slate-700 bg-slate-800/30'
        }
      `}
    >
      {/* Phase Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
        <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
        <span className="text-xs font-bold tracking-wider text-slate-300">{config.label}</span>
        {exercises.length > 0 && (
          <>
            <span className="text-xs text-slate-600">({exercises.length})</span>
            <span className="text-xs text-slate-600">{formatDuration(durationEstimate)}</span>
          </>
        )}
        <span className="text-xs text-slate-500 ml-auto">{config.accent}</span>
      </div>

      {/* Exercise List */}
      <div className={`p-2 space-y-1.5 overflow-y-auto ${horizontal ? 'flex-1' : 'min-h-[60px]'}`}>
        {exercises.map((placed, idx) => (
          <ExerciseNode
            key={`${placed.exerciseDef.id}-${placed.order}`}
            exerciseDef={placed.exerciseDef}
            inCanvas
            onRemove={() => onRemove(phase, placed.order)}
            onMoveUp={idx > 0 ? () => onMoveUp(phase, placed.order) : undefined}
            onMoveDown={idx < exercises.length - 1 ? () => onMoveDown(phase, placed.order) : undefined}
            moveToPhaseOptions={otherPhases}
            onMoveToPhase={(targetPhase) => onMoveToPhase(phase, targetPhase, placed.order)}
          />
        ))}

        {/* Empty state / drop hint */}
        {exercises.length === 0 && (
          <div
            className={`
              flex items-center justify-center rounded border border-dashed
              text-xs transition-colors
              ${horizontal ? 'flex-1 min-h-[100px]' : 'h-10'}
              ${isDragOver
                ? `${config.glowBorder} text-slate-300`
                : 'border-slate-700 text-slate-600'
              }
            `}
          >
            {isDragOver ? 'Drop here' : 'Drag exercises here'}
          </div>
        )}
      </div>

      {/* Glow ring on drag over */}
      {isDragOver && (
        <div className={`absolute inset-0 pointer-events-none rounded-lg ring-1 ${config.glowBorder} ring-inset opacity-50`} />
      )}
    </div>
  );
}
