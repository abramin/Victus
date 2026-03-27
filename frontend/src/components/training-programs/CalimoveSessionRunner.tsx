import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { CalisthenicsSession, CalisthenicsExercise } from '../../api/types';
import { applyMuscleFatigue } from '../../api/client';
import { calculateSessionMuscleFatigue } from '../../utils/calculateSessionMuscleFatigue';
import type { CalimoveCheckpoint } from './calimoveCheckpoint';
import { saveCalimoveCheckpoint, clearCalimoveCheckpoint } from './calimoveCheckpoint';

// ── Types ────────────────────────────────────────────────────────────────────

type CalimoveState =
  | 'pre_session'
  | 'exercising'
  | 'set_rest'
  | 'resting'
  | 'paused'
  | 'complete';

interface CompletedExerciseRecord {
  exerciseIndex: number;
  name: string;
  setsCompleted: number;
  exerciseId: string;
}

interface CalimoveSessionRunnerProps {
  session: CalisthenicsSession;
  onComplete: () => void;
  onAbort: () => void;
  resumeFrom?: CalimoveCheckpoint;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function nameToCalimoveId(name: string): string {
  return (
    'calimove_' +
    name
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
  );
}

function parseRestSeconds(rest: string): number {
  // "90 sec" → 90, "3 min" → 180, "60 sec" → 60
  const minMatch = rest.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  const secMatch = rest.match(/(\d+)\s*sec/);
  if (secMatch) return parseInt(secMatch[1]);
  return 90;
}

const PATTERN_EMOJI: Record<string, string> = {
  push: '💪',
  pull: '🏋️',
  squat: '🦵',
  hinge: '🍑',
  core: '🎯',
  isometric_upper: '🤲',
  isometric_lower: '🧘',
  isometric_core: '⬜',
};

function getPatternEmoji(pattern: string): string {
  return PATTERN_EMOJI[pattern] ?? '🤸';
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── RPE Complete Screen ──────────────────────────────────────────────────────

function CalimoveCompleteScreen({
  completed,
  totalSec,
  onFinish,
}: {
  completed: CompletedExerciseRecord[];
  totalSec: number;
  onFinish: (rpe: number) => void;
}) {
  const [rpe, setRpe] = useState(6);
  const totalMin = Math.round(totalSec / 60);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 px-6">
      <motion.div
        className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-6"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <motion.h1
        className="text-2xl font-semibold text-white mb-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Session Complete
      </motion.h1>
      <motion.p
        className="text-slate-400 text-sm mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {completed.length} exercises · {totalMin}m
      </motion.p>

      <motion.div
        className="w-full max-w-sm space-y-2 max-h-48 overflow-y-auto mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {completed.map((ex, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-lg">
            <span className="text-lg">{getPatternEmoji(ex.name)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{ex.name}</p>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{ex.setsCompleted} sets</span>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="w-full max-w-sm mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <p className="text-sm text-slate-400 text-center mb-3">How hard was that?</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-8 text-right">{rpe}</span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-xs text-slate-500 w-4">10</span>
        </div>
        <div className="flex justify-between mt-1 px-8">
          <span className="text-xs text-slate-600">Easy</span>
          <span className="text-xs text-slate-600">Max</span>
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => onFinish(rpe)}
        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
      >
        Finish
      </button>
    </div>
  );
}

// ── Exercise Hero ────────────────────────────────────────────────────────────

function ExerciseHero({
  exercise,
  exerciseIndex,
  totalExercises,
  currentSet,
  elapsedSec,
  onSetDone,
  onBack,
  onSkip,
  onPause,
  onAbort,
}: {
  exercise: CalisthenicsExercise;
  exerciseIndex: number;
  totalExercises: number;
  currentSet: number;
  elapsedSec: number;
  onSetDone: () => void;
  onBack: () => void;
  onSkip: () => void;
  onPause: () => void;
  onAbort: () => void;
}) {
  const sets = exercise.sets ?? null;
  const isIsometric = exercise.type === 'isometric';
  const emoji = getPatternEmoji(exercise.pattern);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
        <button type="button" onClick={onAbort} className="p-2 text-white/40 hover:text-white/80 text-2xl leading-none">
          ×
        </button>
        <div className="flex items-center gap-2">
          {sets && (
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-emerald-900/40 text-emerald-400 border border-emerald-500/40">
              SET {currentSet}/{sets}
            </span>
          )}
          {isIsometric && (
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-blue-900/40 text-blue-400 border border-blue-500/40">
              HOLD
            </span>
          )}
        </div>
        <button type="button" onClick={onPause} className="p-2 text-slate-400 hover:text-white" aria-label="Pause">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 flex-shrink-0">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((exerciseIndex) / totalExercises) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 overflow-hidden">
        {/* Exercise counter */}
        <span className="text-xs text-white/25 tracking-widest">
          {exerciseIndex + 1} / {totalExercises}
        </span>

        {/* Emoji */}
        <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl">
          {emoji}
        </div>

        {/* Name */}
        <h1 className="text-3xl font-black tracking-widest text-white uppercase text-center leading-tight">
          {exercise.name}
        </h1>

        {/* Reps target */}
        <div className="text-center">
          <span className="text-2xl font-bold text-emerald-400">{exercise.reps}</span>
          <span className="text-slate-400 ml-2 text-sm">{exercise.rep_type}</span>
        </div>

        {/* Muscles */}
        <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
          {exercise.muscles.primary.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-200">
              {m.replace(/_/g, ' ')}
            </span>
          ))}
          {exercise.muscles.secondary.map((m) => (
            <span key={m} className="px-2 py-0.5 rounded-full text-xs text-slate-500 bg-slate-800 border border-slate-700">
              {m.replace(/_/g, ' ')}
            </span>
          ))}
          {exercise.assisted && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-900/30 text-amber-400 border border-amber-600/30">
              assisted
            </span>
          )}
        </div>

        {/* Stopwatch */}
        <div className="text-3xl font-mono text-slate-400 tabular-nums">
          {formatElapsed(elapsedSec)}
        </div>
      </div>

      {/* Navigation + action */}
      <div className="flex-shrink-0 px-6 pb-8 pt-4 flex flex-col gap-4">
        <button
          type="button"
          onClick={onSetDone}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-xl transition-colors"
        >
          {isIsometric ? 'Done' : (sets && currentSet < sets ? 'Set Complete' : 'Exercise Done')}
        </button>

        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={onBack}
            disabled={exerciseIndex === 0}
            className="p-3 text-white/30 hover:text-white/70 disabled:opacity-10 transition-colors"
            aria-label="Previous exercise"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-xs text-slate-500">
            {exercise.pattern.replace(/_/g, ' ')}
          </span>

          <button
            type="button"
            onClick={onSkip}
            disabled={exerciseIndex >= totalExercises - 1}
            className="p-3 text-white/30 hover:text-white/70 disabled:opacity-10 transition-colors"
            aria-label="Skip exercise"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rest Screen ──────────────────────────────────────────────────────────────

function RestScreen({
  secondsRemaining,
  label,
  onSkip,
}: {
  secondsRemaining: number;
  label: string;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 gap-6">
      <p className="text-slate-400 text-sm tracking-wider uppercase">{label}</p>
      <p className="text-7xl font-bold tabular-nums text-white">{secondsRemaining}</p>
      <p className="text-slate-500 text-sm">seconds</p>
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 px-8 py-4 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500
                   rounded-xl text-base font-semibold transition-colors"
      >
        Skip Rest
      </button>
    </div>
  );
}

// ── Pre-session Preview ──────────────────────────────────────────────────────

function PreSessionScreen({
  session,
  onStart,
  onAbort,
}: {
  session: CalisthenicsSession;
  onStart: () => void;
  onAbort: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center px-5 h-14 border-b border-slate-800">
        <button type="button" onClick={onAbort} className="p-1 text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="ml-3 font-medium text-white">Session Preview</span>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold border ${
          session.sessionType === 'isometric'
            ? 'bg-blue-900/40 text-blue-400 border-blue-500/40'
            : 'bg-emerald-900/40 text-emerald-400 border-emerald-500/40'
        }`}>
          {session.sessionType === 'isometric' ? 'ISOMETRIC' : 'STRENGTH'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/60 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">Level {session.level}</p>
            <p className="text-xs text-slate-500 mt-0.5">Level</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{session.exerciseCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Exercises</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{session.restBetweenExercises}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rest</p>
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-3">
          {session.exercises.map((ex) => (
            <div
              key={ex.order}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-700/40 bg-slate-800/50"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 text-xl">
                {getPatternEmoji(ex.pattern)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-200">{ex.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ex.sets && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 font-mono">
                        {ex.sets}×
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">
                      {ex.reps}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ex.muscles.primary.map((m) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                      {m.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {ex.assisted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">
                      assisted
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 pb-8 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold
                     rounded-xl shadow-lg shadow-emerald-900/30 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Start Session
        </button>
      </div>
    </div>
  );
}

// ── Main Runner ──────────────────────────────────────────────────────────────

export function CalimoveSessionRunner({ session, onComplete, onAbort, resumeFrom }: CalimoveSessionRunnerProps) {
  const [state, setState] = useState<CalimoveState>(resumeFrom ? 'exercising' : 'pre_session');
  const [exerciseIndex, setExerciseIndex] = useState(resumeFrom?.currentExerciseIndex ?? 0);
  const [currentSet, setCurrentSet] = useState(resumeFrom?.currentSet ?? 1);
  const [completedExercises, setCompletedExercises] = useState<CompletedExerciseRecord[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [sessionStartTime] = useState(resumeFrom?.sessionStartTime ?? Date.now());
  const prevStateRef = useRef<CalimoveState>('exercising');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const exercises = session.exercises;
  const currentExercise = exerciseIndex < exercises.length ? exercises[exerciseIndex] : null;
  const restBetweenExercisesSec = parseRestSeconds(session.restBetweenExercises);
  const setRestSec = 60; // rest between sets of same exercise

  // Stopwatch for exercising state
  useEffect(() => {
    clearTimer();
    if (state === 'exercising') {
      setElapsedSec(0);
      timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, exerciseIndex, currentSet]);

  // Countdown for rest states
  useEffect(() => {
    clearTimer();
    if (state === 'set_rest' || state === 'resting') {
      timerRef.current = setInterval(() => {
        setRestRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setState('exercising');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Auto-save checkpoint
  useEffect(() => {
    if (state === 'pre_session' || state === 'complete') return;
    saveCalimoveCheckpoint({
      savedAt: new Date().toISOString(),
      session,
      currentExerciseIndex: exerciseIndex,
      currentSet,
      completedSets: completedExercises.map((ex) => ({
        exerciseOrder: ex.exerciseIndex + 1,
        exerciseName: ex.name,
        setsCompleted: ex.setsCompleted,
      })),
      sessionStartTime,
    });
  }, [state, exerciseIndex, currentSet, completedExercises, session, sessionStartTime]);

  const handleSetDone = useCallback(() => {
    if (!currentExercise) return;
    clearTimer();

    const sets = currentExercise.sets;
    const isIsometric = currentExercise.type === 'isometric';

    if (!isIsometric && sets && currentSet < sets) {
      // More sets remain for this exercise → set_rest
      setCurrentSet((s) => s + 1);
      setRestRemaining(setRestSec);
      setState('set_rest');
    } else {
      // Exercise done → record completion
      const exId = nameToCalimoveId(currentExercise.name);
      setCompletedExercises((prev) => [
        ...prev,
        {
          exerciseIndex,
          name: currentExercise.name,
          setsCompleted: isIsometric ? 1 : (sets ?? 1),
          exerciseId: exId,
        },
      ]);

      const nextIndex = exerciseIndex + 1;
      if (nextIndex >= exercises.length) {
        setState('complete');
      } else {
        setExerciseIndex(nextIndex);
        setCurrentSet(1);
        setRestRemaining(restBetweenExercisesSec);
        setState('resting');
      }
    }
  }, [currentExercise, currentSet, exerciseIndex, exercises.length, restBetweenExercisesSec, clearTimer]);

  const handleSkipRest = useCallback(() => {
    clearTimer();
    setState('exercising');
  }, [clearTimer]);

  const handleBack = useCallback(() => {
    if (exerciseIndex === 0) return;
    clearTimer();
    setCompletedExercises((prev) => prev.filter((ex) => ex.exerciseIndex < exerciseIndex - 1));
    setExerciseIndex((i) => i - 1);
    setCurrentSet(1);
    setState('exercising');
  }, [exerciseIndex, clearTimer]);

  const handleSkip = useCallback(() => {
    if (!currentExercise) return;
    clearTimer();
    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      setState('complete');
    } else {
      setExerciseIndex(nextIndex);
      setCurrentSet(1);
      setState('exercising');
    }
  }, [currentExercise, exerciseIndex, exercises.length, clearTimer]);

  const handlePause = useCallback(() => {
    clearTimer();
    prevStateRef.current = state === 'paused' ? 'exercising' : state;
    setState('paused');
  }, [state, clearTimer]);

  const handleResume = useCallback(() => {
    setState(prevStateRef.current);
  }, []);

  const handleAbort = useCallback(() => {
    clearTimer();
    if (state !== 'pre_session') {
      saveCalimoveCheckpoint({
        savedAt: new Date().toISOString(),
        session,
        currentExerciseIndex: exerciseIndex,
        currentSet,
        completedSets: completedExercises.map((ex) => ({
          exerciseOrder: ex.exerciseIndex + 1,
          exerciseName: ex.name,
          setsCompleted: ex.setsCompleted,
        })),
        sessionStartTime,
      });
    }
    onAbort();
  }, [clearTimer, state, session, exerciseIndex, currentSet, completedExercises, sessionStartTime, onAbort]);

  const handleFinish = useCallback(async (rpe: number) => {
    clearCalimoveCheckpoint();

    // Convert completed records to the shape calculateSessionMuscleFatigue expects.
    // Calimove exercises are strength work (phase='push', phaseScale=1.0).
    // repsPerSet uses 8 as a proxy since the rep range is a string ("6-10", "AMRAP").
    const CALIMOVE_REPS_PROXY = 8;
    const completedForFatigue = completedExercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      phase: 'push' as const,
      actualDurationSec: 0,
      rpe,
      setsCompleted: ex.setsCompleted,
      repsPerSet: CALIMOVE_REPS_PROXY,
    }));

    const fatigue = calculateSessionMuscleFatigue(completedForFatigue, rpe);
    if (Object.keys(fatigue).length > 0) {
      try {
        await applyMuscleFatigue(fatigue);
      } catch {
        // Non-fatal: fatigue apply failed silently
      }
    }

    onComplete();
  }, [completedExercises, onComplete]);

  // ── States ──────────────────────────────────────────────────────────────────

  if (state === 'pre_session') {
    return (
      <PreSessionScreen
        session={session}
        onStart={() => setState('exercising')}
        onAbort={onAbort}
      />
    );
  }

  if (state === 'complete') {
    const totalSec = Math.round((Date.now() - sessionStartTime) / 1000);
    return (
      <CalimoveCompleteScreen
        completed={completedExercises}
        totalSec={totalSec}
        onFinish={handleFinish}
      />
    );
  }

  if (state === 'set_rest') {
    return (
      <RestScreen
        secondsRemaining={restRemaining}
        label={`Rest between sets · ${currentExercise?.name ?? ''}`}
        onSkip={handleSkipRest}
      />
    );
  }

  if (state === 'resting') {
    const next = exercises[exerciseIndex];
    return (
      <RestScreen
        secondsRemaining={restRemaining}
        label={`Next: ${next?.name ?? 'Next exercise'}`}
        onSkip={handleSkipRest}
      />
    );
  }

  if (state === 'paused') {
    const elapsedSessionSec = Math.round((Date.now() - sessionStartTime) / 1000);
    const m = Math.floor(elapsedSessionSec / 60);
    const s = elapsedSessionSec % 60;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/98 gap-8 px-6">
        <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white mb-1">Paused</p>
          <p className="text-slate-500 text-sm">
            {m}:{s.toString().padStart(2, '0')} elapsed
          </p>
        </div>
        <button
          type="button"
          onClick={handleResume}
          className="w-full max-w-xs py-5 bg-emerald-500 hover:bg-emerald-600 text-white
                     rounded-2xl text-lg font-bold transition-colors"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={handleAbort}
          className="text-slate-500 hover:text-slate-300 text-sm underline underline-offset-4 transition-colors"
        >
          End session
        </button>
      </div>
    );
  }

  // exercising
  if (!currentExercise) return null;

  return (
    <ExerciseHero
      exercise={currentExercise}
      exerciseIndex={exerciseIndex}
      totalExercises={exercises.length}
      currentSet={currentSet}
      elapsedSec={elapsedSec}
      onSetDone={handleSetDone}
      onBack={handleBack}
      onSkip={handleSkip}
      onPause={handlePause}
      onAbort={handleAbort}
    />
  );
}
