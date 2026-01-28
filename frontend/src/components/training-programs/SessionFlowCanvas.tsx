import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionPhase, SessionExercise } from '../../api/types';
import { PhaseDropZone, PlacedExercise } from './PhaseDropZone';
import { getExerciseById, EXERCISES_BY_PHASE } from './exerciseLibrary';
import type { ExerciseDef } from './exerciseLibrary';
import { ExerciseNode } from './ExerciseNode';

const PHASES: SessionPhase[] = ['prepare', 'practice', 'push'];

interface SessionFlowCanvasProps {
  initialExercises?: SessionExercise[];
  onChange: (exercises: SessionExercise[]) => void;
  /** Layout mode: vertical (default) stacks phases, horizontal places them side-by-side */
  layout?: 'vertical' | 'horizontal';
  /** When true, hides the built-in exercise library (for use with ExerciseSearchPanel) */
  hideLibrary?: boolean;
}

/**
 * The Block Constructor canvas: three phase drop-zones connected by a Signal Line.
 * Manages placed exercises state and serializes back to SessionExercise[].
 */
export function SessionFlowCanvas({
  initialExercises,
  onChange,
  layout = 'vertical',
  hideLibrary = false,
}: SessionFlowCanvasProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [phaseExercises, setPhaseExercises] = useState<Record<SessionPhase, PlacedExercise[]>>(() => {
    const initial: Record<SessionPhase, PlacedExercise[]> = { prepare: [], practice: [], push: [] };
    if (initialExercises) {
      for (const se of initialExercises) {
        const def = getExerciseById(se.exerciseId);
        if (def) {
          initial[se.phase].push({ exerciseDef: def, order: se.order });
        }
      }
      // Sort by order within each phase
      for (const phase of PHASES) {
        initial[phase].sort((a, b) => a.order - b.order);
      }
    }
    return initial;
  });

  // Serialize to SessionExercise[] whenever state changes
  useEffect(() => {
    const exercises: SessionExercise[] = [];
    for (const phase of PHASES) {
      for (const placed of phaseExercises[phase]) {
        exercises.push({
          exerciseId: placed.exerciseDef.id,
          phase,
          order: placed.order,
          durationSec: placed.exerciseDef.defaultDurationSec || undefined,
          reps: placed.exerciseDef.defaultReps || undefined,
        });
      }
    }
    onChangeRef.current(exercises);
  }, [phaseExercises]);

  const handleDrop = useCallback((phase: SessionPhase, exerciseDef: ExerciseDef) => {
    setPhaseExercises((prev) => {
      const existing = prev[phase];
      const nextOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.order)) + 1 : 1;
      return {
        ...prev,
        [phase]: [...existing, { exerciseDef, order: nextOrder }],
      };
    });
  }, []);

  const handleRemove = useCallback((phase: SessionPhase, order: number) => {
    setPhaseExercises((prev) => ({
      ...prev,
      [phase]: prev[phase].filter((e) => e.order !== order),
    }));
  }, []);

  const reorderPhase = useCallback((phase: SessionPhase, order: number, direction: 1 | -1) => {
    setPhaseExercises((prev) => {
      const list = [...prev[phase]].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((e) => e.order === order);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= list.length) return prev;
      [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
      const reordered = list.map((e, i) => ({ ...e, order: i + 1 }));
      return { ...prev, [phase]: reordered };
    });
  }, []);

  const handleMoveUp = useCallback((phase: SessionPhase, order: number) => {
    reorderPhase(phase, order, -1);
  }, [reorderPhase]);

  const handleMoveDown = useCallback((phase: SessionPhase, order: number) => {
    reorderPhase(phase, order, 1);
  }, [reorderPhase]);

  const handleMoveToPhase = useCallback((fromPhase: SessionPhase, toPhase: SessionPhase, order: number) => {
    setPhaseExercises((prev) => {
      const exercise = prev[fromPhase].find((e) => e.order === order);
      if (!exercise) return prev;
      const remaining = prev[fromPhase].filter((e) => e.order !== order);
      const reorderedRemaining = remaining.map((e, i) => ({ ...e, order: i + 1 }));
      const targetList = prev[toPhase];
      const nextOrder = targetList.length > 0 ? Math.max(...targetList.map((e) => e.order)) + 1 : 1;
      return {
        ...prev,
        [fromPhase]: reorderedRemaining,
        [toPhase]: [...targetList, { ...exercise, order: nextOrder }],
      };
    });
  }, []);

  const isHorizontal = layout === 'horizontal';

  return (
    <div className="relative">
      {/* Signal Line - vertical or horizontal based on layout */}
      {isHorizontal ? (
        <>
          {/* Horizontal signal line */}
          <div
            className="absolute top-4 left-0 right-0 h-0.5 pointer-events-none"
            style={{ background: 'linear-gradient(to right, #f59e0b 0%, #14b8a6 50%, #8b5cf6 100%)' }}
          />
          {/* Phase marker dots - horizontal */}
          <div className="absolute left-0 top-4 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 pointer-events-none z-10" />
          <div className="absolute left-1/2 -translate-x-1/2 top-4 -translate-y-1/2 w-3 h-3 rounded-full bg-teal-500 pointer-events-none z-10" />
          <div className="absolute right-0 top-4 -translate-y-1/2 w-3 h-3 rounded-full bg-violet-500 pointer-events-none z-10" />
        </>
      ) : (
        <>
          {/* Vertical signal line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, #f59e0b 0%, #14b8a6 50%, #8b5cf6 100%)' }}
          />
          {/* Phase marker dots - vertical */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-500 pointer-events-none" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-teal-500 pointer-events-none" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 w-3 h-3 rounded-full bg-violet-500 pointer-events-none" />
        </>
      )}

      {/* Phase drop zones */}
      <div
        className={`relative z-10 ${
          isHorizontal
            ? 'flex flex-row gap-4 pt-8 min-h-[300px]'
            : 'flex flex-col gap-3'
        }`}
      >
        {PHASES.map((phase) => (
          <PhaseDropZone
            key={phase}
            phase={phase}
            exercises={phaseExercises[phase]}
            onDrop={handleDrop}
            onRemove={handleRemove}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onMoveToPhase={handleMoveToPhase}
            horizontal={isHorizontal}
          />
        ))}
      </div>

      {/* Exercise Library Panel (hidden when using external ExerciseSearchPanel) */}
      {!hideLibrary && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-2">Drag exercises into a phase above</p>
          <div className="flex flex-col gap-3">
            {PHASES.map((phase) => (
              <div key={phase}>
                <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{phase}</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXERCISES_BY_PHASE[phase].map((ex) => (
                    <ExerciseNode key={ex.id} exerciseDef={ex} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
