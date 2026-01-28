import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { SessionExercise, SessionPhase } from '../../api/types';
import { getExerciseById } from './exerciseLibrary';
import type { ExerciseDef } from './exerciseLibrary';
import { ExerciseCard } from './ExerciseCard';
import { RestInterventionScreen, DEFAULT_REST_SEC } from './RestInterventionScreen';
import { SessionCompleteScreen } from './SessionCompleteScreen';
import type { CompletedExercise } from './SessionCompleteScreen';

interface ResolvedExercise {
  sessionExercise: SessionExercise;
  def: ExerciseDef;
}

type SessionState = 'exercising' | 'resting' | 'complete';

export interface SessionResult {
  exercises: CompletedExercise[];
  totalDurationSec: number;
  completedAt: string;
}

interface ActiveSessionViewProps {
  exercises: SessionExercise[];
  onComplete: (result: SessionResult) => void;
  onAbort: () => void;
}

const PHASE_ORDER: Record<SessionPhase, number> = { prepare: 0, practice: 1, push: 2 };

/**
 * Session state machine orchestrator.
 * Drives the active session flow: exercising → resting → exercising → ... → complete.
 */
export function ActiveSessionView({ exercises, onComplete, onAbort }: ActiveSessionViewProps) {
  const [sessionState, setSessionState] = useState<SessionState>('exercising');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_SEC);
  const [currentRep, setCurrentRep] = useState(0);
  const [rpeValues, setRpeValues] = useState<Record<string, number>>({});
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [sessionStartTime] = useState(Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve exercises: sort by phase order then by order within phase
  const resolved = useMemo<ResolvedExercise[]>(() => {
    return exercises
      .map((se) => {
        const def = getExerciseById(se.exerciseId);
        if (!def) return null;
        return { sessionExercise: se, def };
      })
      .filter((r): r is ResolvedExercise => r !== null)
      .sort((a, b) => {
        const phaseDiff = PHASE_ORDER[a.sessionExercise.phase] - PHASE_ORDER[b.sessionExercise.phase];
        if (phaseDiff !== 0) return phaseDiff;
        return a.sessionExercise.order - b.sessionExercise.order;
      });
  }, [exercises]);

  // Handle empty exercises
  useEffect(() => {
    if (resolved.length === 0) {
      setSessionState('complete');
    }
  }, [resolved.length]);

  // Exercise timer (counts up)
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (sessionState === 'exercising' && currentIndex < resolved.length) {
      setElapsedSec(0);
      setCurrentRep(0);
      timerRef.current = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionState, currentIndex, resolved.length]);

  // Rest countdown timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (sessionState === 'resting') {
      setRestRemaining(DEFAULT_REST_SEC);
      timerRef.current = setInterval(() => {
        setRestRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            advanceToNext();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState]);

  const advanceToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= resolved.length) {
      setSessionState('complete');
    } else {
      setCurrentIndex(nextIndex);
      setSessionState('exercising');
    }
  }, [currentIndex, resolved.length]);

  const handleDone = useCallback(() => {
    if (currentIndex >= resolved.length) return;
    const current = resolved[currentIndex];

    // Record completion
    setCompletedExercises((prev) => [
      ...prev,
      {
        exerciseId: current.def.id,
        phase: current.sessionExercise.phase,
        actualDurationSec: elapsedSec,
        rpe: rpeValues[current.def.id] ?? 5,
      },
    ]);

    // Transition
    const nextIndex = currentIndex + 1;
    if (nextIndex >= resolved.length) {
      setSessionState('complete');
    } else {
      setSessionState('resting');
    }
  }, [currentIndex, resolved, elapsedSec, rpeValues]);

  const handleSkipRest = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

  const handleRpeChange = useCallback((rpe: number) => {
    if (currentIndex >= resolved.length) return;
    setRpeValues((prev) => ({
      ...prev,
      [resolved[currentIndex].def.id]: rpe,
    }));
  }, [currentIndex, resolved]);

  const handleRepIncrement = useCallback(() => {
    setCurrentRep((prev) => prev + 1);
  }, []);

  const handleFinish = useCallback(() => {
    const totalDurationSec = Math.round((Date.now() - sessionStartTime) / 1000);
    onComplete({
      exercises: completedExercises,
      totalDurationSec,
      completedAt: new Date().toISOString(),
    });
  }, [completedExercises, sessionStartTime, onComplete]);

  // Render routing
  if (sessionState === 'complete') {
    const totalDurationSec = Math.round((Date.now() - sessionStartTime) / 1000);
    return (
      <SessionCompleteScreen
        completedExercises={completedExercises}
        totalDurationSec={totalDurationSec}
        onFinish={handleFinish}
      />
    );
  }

  if (sessionState === 'resting') {
    const nextExercise = currentIndex + 1 < resolved.length ? resolved[currentIndex + 1].def : undefined;
    return (
      <RestInterventionScreen
        remainingSeconds={restRemaining}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={handleSkipRest}
        nextExercise={nextExercise}
      />
    );
  }

  // Default: exercising
  if (currentIndex >= resolved.length) return null;
  const current = resolved[currentIndex];
  const targetDurationSec = current.sessionExercise.durationSec ?? current.def.defaultDurationSec;
  const targetReps = current.sessionExercise.reps ?? current.def.defaultReps;

  return (
    <AnimatePresence mode="wait">
      <ExerciseCard
        key={`exercise-${currentIndex}`}
        exerciseDef={current.def}
        phase={current.sessionExercise.phase}
        index={currentIndex}
        total={resolved.length}
        targetDurationSec={targetDurationSec}
        targetReps={targetReps}
        elapsedSec={elapsedSec}
        currentRep={currentRep}
        rpe={rpeValues[current.def.id] ?? 5}
        onDone={handleDone}
        onRpeChange={handleRpeChange}
        onRepIncrement={handleRepIncrement}
        onAbort={onAbort}
      />
    </AnimatePresence>
  );
}
