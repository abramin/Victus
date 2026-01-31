import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { SessionExercise, SessionPhase } from '../../api/types';
import { getExerciseById } from './exerciseLibrary';
import type { ExerciseDef } from './exerciseLibrary';
import { ExerciseCard } from './ExerciseCard';
import { RestInterventionScreen, DEFAULT_REST_SEC } from './RestInterventionScreen';
import { SessionCompleteScreen } from './SessionCompleteScreen';
import type { CompletedExercise } from './SessionCompleteScreen';
import { playCountdownBeeps, playWarningBeep } from './audioBeep';

interface ResolvedExercise {
  sessionExercise: SessionExercise;
  def: ExerciseDef;
}

type SessionState = 'preparing' | 'exercising' | 'resting' | 'complete';

const PREPARE_COUNTDOWN_SEC = 3;

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
  const [sessionState, setSessionState] = useState<SessionState>('preparing');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST_SEC);
  const [prepareRemaining, setPrepareRemaining] = useState(PREPARE_COUNTDOWN_SEC);
  const [currentRep, setCurrentRep] = useState(0);
  const [rpeValues, setRpeValues] = useState<Record<string, number>>({});
  const [weightValues, setWeightValues] = useState<Record<string, number>>({});
  const [targetRepsValues, setTargetRepsValues] = useState<Record<string, number>>({});
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);
  const [sessionStartTime] = useState(Date.now());

  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prepareTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (exerciseTimerRef.current) {
      clearInterval(exerciseTimerRef.current);
      exerciseTimerRef.current = null;
    }

    if (sessionState === 'exercising' && currentIndex < resolved.length) {
      setElapsedSec(0);
      setCurrentRep(0);

      const current = resolved[currentIndex];
      const targetDuration = current.sessionExercise.durationSec ?? current.def.defaultDurationSec;
      const isTimed = targetDuration > 0;

      exerciseTimerRef.current = setInterval(() => {
        setElapsedSec((s) => {
          const newElapsed = s + 1;

          // For timed exercises, play warning beeps at 3, 2, 1 seconds remaining
          if (isTimed && targetDuration - newElapsed <= 3 && targetDuration - newElapsed > 0) {
            playWarningBeep();
          }

          return newElapsed;
        });
      }, 1000);
    }

    return () => {
      if (exerciseTimerRef.current) {
        clearInterval(exerciseTimerRef.current);
        exerciseTimerRef.current = null;
      }
    };
  }, [sessionState, currentIndex, resolved]);

  // Rest countdown timer
  useEffect(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }

    if (sessionState === 'resting') {
      setRestRemaining(DEFAULT_REST_SEC);
      restTimerRef.current = setInterval(() => {
        setRestRemaining((prev) => {
          // Play warning beeps at 3, 2, 1 seconds remaining
          if (prev <= 3 && prev > 0) {
            playWarningBeep();
          }
          if (prev <= 1) {
            clearInterval(restTimerRef.current!);
            restTimerRef.current = null;
            setSessionState('preparing');
            setCurrentIndex((idx) => idx + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    };
  }, [sessionState]);

  // Preparing countdown timer (ready, set, go!)
  useEffect(() => {
    if (prepareTimerRef.current) {
      clearInterval(prepareTimerRef.current);
      prepareTimerRef.current = null;
    }

    if (sessionState === 'preparing' && currentIndex < resolved.length) {
      setPrepareRemaining(PREPARE_COUNTDOWN_SEC);
      // Play initial countdown beeps
      playCountdownBeeps();

      prepareTimerRef.current = setInterval(() => {
        setPrepareRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(prepareTimerRef.current!);
            prepareTimerRef.current = null;
            setSessionState('exercising');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (prepareTimerRef.current) {
        clearInterval(prepareTimerRef.current);
        prepareTimerRef.current = null;
      }
    };
  }, [sessionState, currentIndex, resolved.length]);

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

  const handleWeightChange = useCallback((weight: number) => {
    if (currentIndex >= resolved.length) return;
    setWeightValues((prev) => ({
      ...prev,
      [resolved[currentIndex].def.id]: weight,
    }));
  }, [currentIndex, resolved]);

  const handleTargetRepsChange = useCallback((reps: number) => {
    if (currentIndex >= resolved.length) return;
    setTargetRepsValues((prev) => ({
      ...prev,
      [resolved[currentIndex].def.id]: reps,
    }));
  }, [currentIndex, resolved]);

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

  // Support live adjustment of target reps via slider
  const initialTargetReps = current.sessionExercise.reps ?? current.def.defaultReps;
  const targetReps = targetRepsValues[current.def.id] ?? initialTargetReps;

  // Support weight tracking
  const initialWeight = current.sessionExercise.weightKg ?? current.def.defaultWeightKg ?? 0;
  const currentWeight = weightValues[current.def.id] ?? initialWeight;

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
        currentWeight={currentWeight}
        elapsedSec={elapsedSec}
        currentRep={currentRep}
        rpe={rpeValues[current.def.id] ?? 5}
        onDone={handleDone}
        onRpeChange={handleRpeChange}
        onRepIncrement={handleRepIncrement}
        onWeightChange={handleWeightChange}
        onTargetRepsChange={handleTargetRepsChange}
        onAbort={onAbort}
      />
    </AnimatePresence>
  );
}
