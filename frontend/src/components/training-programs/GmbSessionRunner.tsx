import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SessionExercise, SessionPhase } from '../../api/types';
import { getExerciseById } from './exerciseLibrary';
import type { ExerciseDef } from './exerciseLibrary';
import type { SessionResult } from './ActiveSessionView';
import type { CompletedExercise } from './SessionCompleteScreen';
import { PhaseProgressBar } from './PhaseProgressBar';
import { GmbExerciseHero } from './GmbExerciseHero';
import { ExerciseQueueRail } from './ExerciseQueueRail';
import { playCountdownBeeps, playWarningBeep } from './audioBeep';
import type { GmbCheckpoint } from './gmbCheckpoint';
import { saveCheckpoint, clearCheckpoint } from './gmbCheckpoint';

interface ResolvedExercise {
  sessionExercise: SessionExercise;
  def: ExerciseDef;
}

type GmbState =
  | 'pre_session'
  | 'staged'
  | 'preparing'
  | 'exercising'
  | 'phase_transition'
  | 'paused'
  | 'complete';

type DurationChoice = '15' | '30' | '45';

const PHASE_ORDER: Record<SessionPhase, number> = { prepare: 0, practice: 1, play: 2, push: 3, ponder: 4 };
const AUTO_ADVANCE_PHASES: Set<SessionPhase> = new Set(['prepare', 'ponder']);
const PREPARE_COUNTDOWN_SEC = 3;
const PHASE_TRANSITION_SEC = 15;

const PHASE_COLORS: Record<SessionPhase, { bg: string; text: string; border: string }> = {
  prepare:  { bg: 'bg-amber-900/40',  text: 'text-amber-400',  border: 'border-amber-500/40' },
  practice: { bg: 'bg-teal-900/40',   text: 'text-teal-400',   border: 'border-teal-500/40' },
  play:     { bg: 'bg-teal-900/40',   text: 'text-teal-400',   border: 'border-teal-500/40' },
  push:     { bg: 'bg-violet-900/40', text: 'text-violet-400', border: 'border-violet-500/40' },
  ponder:   { bg: 'bg-blue-900/40',   text: 'text-blue-400',   border: 'border-blue-500/40' },
};

const PHASE_NAMES: Record<SessionPhase, string> = {
  prepare: 'PREPARE', practice: 'PRACTICE', play: 'PLAY', push: 'PUSH', ponder: 'PONDER',
};

const DURATION_SCALE: Record<DurationChoice, number> = { '15': 0.5, '30': 1.0, '45': 1.5 };

interface GmbSessionRunnerProps {
  exercises: SessionExercise[];
  onComplete: (result: SessionResult) => void;
  onAbort: () => void;
  resumeFrom?: GmbCheckpoint;
  disableCheckpoint?: boolean;
}

/** Overall RPE picker shown at session complete */
function GmbCompleteScreen({ completedExercises, totalDurationSec, onFinish }: {
  completedExercises: CompletedExercise[];
  totalDurationSec: number;
  onFinish: (rpe: number) => void;
}) {
  const [rpe, setRpe] = useState(6);
  const totalMin = Math.round(totalDurationSec / 60);

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

      <motion.h1 className="text-2xl font-semibold text-white mb-1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        Session Complete
      </motion.h1>
      <motion.p className="text-slate-400 text-sm mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {completedExercises.length} exercises · {totalMin}m
      </motion.p>

      <motion.div className="w-full max-w-sm mb-8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <p className="text-sm text-slate-400 text-center mb-3">How hard was that?</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 w-8 text-right">{rpe}</span>
          <input
            type="range"
            min={1} max={10} step={1}
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
        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium
                   transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        Finish
      </button>
    </div>
  );
}

/**
 * GMB session runner orchestrator.
 * Hybrid mode: PREPARE/PONDER auto-advance on countdown, PRACTICE/PUSH wait for manual Done.
 */
export function GmbSessionRunner({ exercises, onComplete, onAbort, resumeFrom, disableCheckpoint }: GmbSessionRunnerProps) {
  const [gmbState, setGmbState] = useState<GmbState>(resumeFrom ? 'preparing' : 'pre_session');
  const [durationChoice, setDurationChoice] = useState<DurationChoice>(resumeFrom?.durationChoice ?? '30');
  const [currentIndex, setCurrentIndex] = useState(resumeFrom?.currentIndex ?? 0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [prepareRemaining, setPrepareRemaining] = useState(PREPARE_COUNTDOWN_SEC);
  const [transitionRemaining, setTransitionRemaining] = useState(PHASE_TRANSITION_SEC);
  const [transitionPhase, setTransitionPhase] = useState<SessionPhase>('practice');
  const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>(resumeFrom?.completedExercises ?? []);
  const [sessionStartTime] = useState(resumeFrom?.sessionStartTime ?? Date.now());

  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prepareTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStateRef = useRef<GmbState>('exercising');
  const isResumingRef = useRef(false);
  const isResumingTransitionRef = useRef(false);
  // Mutable elapsed counter — read inside setInterval callbacks to avoid side effects in state updaters
  const elapsedRef = useRef(0);
  const transitionRef = useRef(PHASE_TRANSITION_SEC);

  // Resolve and sort exercises by phase order then order within phase
  const resolved = useMemo<ResolvedExercise[]>(() => {
    return exercises
      .map((se) => {
        const def = getExerciseById(se.exerciseId);
        return def ? { sessionExercise: se, def } : null;
      })
      .filter((r): r is ResolvedExercise => r !== null)
      .sort((a, b) => {
        const pd = PHASE_ORDER[a.sessionExercise.phase] - PHASE_ORDER[b.sessionExercise.phase];
        return pd !== 0 ? pd : a.sessionExercise.order - b.sessionExercise.order;
      });
  }, [exercises]);

  // Duration-scaled exercises
  const scale = DURATION_SCALE[durationChoice];
  const scaledDuration = useCallback((se: SessionExercise): number => {
    const base = se.durationSec > 0 ? se.durationSec : 0;
    return Math.max(10, Math.round(base * scale));
  }, [scale]);

  // Phase segment counts for progress bar
  const phaseSegments = useMemo(() => {
    const counts = new Map<SessionPhase, number>();
    for (const r of resolved) {
      const p = r.sessionExercise.phase;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([phase, count]) => ({ phase, count }));
  }, [resolved]);

  // Current exercise
  const current = currentIndex < resolved.length ? resolved[currentIndex] : null;
  const currentPhase = current?.sessionExercise.phase ?? 'ponder';

  // Derive completed phases from current position — phases strictly before currentPhase are done
  const completedPhases = useMemo(() => {
    const done = new Set<SessionPhase>();
    if (gmbState === 'complete') {
      for (const p of Object.keys(PHASE_ORDER) as SessionPhase[]) done.add(p);
      return done;
    }
    const currentOrder = PHASE_ORDER[currentPhase];
    for (const [p, ord] of Object.entries(PHASE_ORDER) as [SessionPhase, number][]) {
      if (ord < currentOrder) done.add(p);
    }
    return done;
  }, [currentPhase, gmbState]);
  const targetDuration = current ? scaledDuration(current.sessionExercise) : 0;
  const remainingSec = Math.max(0, targetDuration - elapsedSec);
  const isAutoAdvance = AUTO_ADVANCE_PHASES.has(currentPhase);

  // Upcoming exercises for queue rail (next 4)
  const upcoming = useMemo(() => {
    return resolved.slice(currentIndex + 1, currentIndex + 5).map((r) => ({
      exerciseDef: r.def,
      phase: r.sessionExercise.phase,
      durationSec: scaledDuration(r.sessionExercise),
    }));
  }, [resolved, currentIndex, scaledDuration]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (exerciseTimerRef.current) { clearInterval(exerciseTimerRef.current); exerciseTimerRef.current = null; }
    if (prepareTimerRef.current) { clearInterval(prepareTimerRef.current); prepareTimerRef.current = null; }
    if (transitionTimerRef.current) { clearInterval(transitionTimerRef.current); transitionTimerRef.current = null; }
  }, []);

  // Record current exercise and advance to next
  const advanceToNext = useCallback((fromIndex: number, elapsed: number, staged = false) => {
    const r = resolved[fromIndex];
    if (r) {
      const completedEx: CompletedExercise = {
        exerciseId: r.def.id,
        phase: r.sessionExercise.phase,
        actualDurationSec: elapsed,
        rpe: 5, // placeholder; overridden with overall RPE at finish
      };
      setCompletedExercises((prev) => [...prev, completedEx]);
    }

    const nextIndex = fromIndex + 1;
    if (nextIndex >= resolved.length) {
      setCurrentIndex(nextIndex);
      setGmbState('complete');
      return;
    }

    const currPhase = r?.sessionExercise.phase;
    const nextPhaseVal = resolved[nextIndex].sessionExercise.phase;

    setCurrentIndex(nextIndex);

    if (currPhase && nextPhaseVal !== currPhase) {
      // Phase boundary → show interstitial
      setTransitionPhase(nextPhaseVal);
      setTransitionRemaining(PHASE_TRANSITION_SEC);
      setGmbState('phase_transition');
    } else {
      setGmbState(staged ? 'staged' : 'preparing');
    }
  }, [resolved]);

  // Exercise timer (counts up)
  useEffect(() => {
    clearAllTimers();

    if (gmbState === 'exercising' && current) {
      if (!isResumingRef.current) {
        setElapsedSec(0);
        elapsedRef.current = 0;
      }
      isResumingRef.current = false;

      exerciseTimerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        const newS = elapsedRef.current;
        setElapsedSec(newS);
        // Side effects outside state updater — safe to call unconditionally
        if (isAutoAdvance && targetDuration > 0) {
          const remaining = targetDuration - newS;
          if (remaining <= 3 && remaining > 0) playWarningBeep();
          if (remaining <= 0) {
            clearInterval(exerciseTimerRef.current!);
            exerciseTimerRef.current = null;
            advanceToNext(currentIndex, newS);
          }
        }
      }, 1000);
    }

    return clearAllTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmbState, currentIndex]);

  // Preparing countdown (3s "get ready")
  useEffect(() => {
    if (gmbState !== 'preparing') return;
    clearAllTimers();
    setPrepareRemaining(PREPARE_COUNTDOWN_SEC);
    playCountdownBeeps();

    prepareTimerRef.current = setInterval(() => {
      setPrepareRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(prepareTimerRef.current!);
          prepareTimerRef.current = null;
          setGmbState('exercising');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearAllTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmbState, currentIndex]);

  // Phase transition countdown
  useEffect(() => {
    if (gmbState !== 'phase_transition') return;
    clearAllTimers();
    if (!isResumingTransitionRef.current) {
      setTransitionRemaining(PHASE_TRANSITION_SEC);
      transitionRef.current = PHASE_TRANSITION_SEC;
    }
    isResumingTransitionRef.current = false;

    transitionTimerRef.current = setInterval(() => {
      transitionRef.current -= 1;
      const next = transitionRef.current;
      setTransitionRemaining(next);
      if (next <= 3 && next > 0) playWarningBeep();
      if (next <= 0) {
        clearInterval(transitionTimerRef.current!);
        transitionTimerRef.current = null;
        setGmbState('preparing');
      }
    }, 1000);

    return clearAllTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmbState]);

  // Auto-save checkpoint on state changes
  useEffect(() => {
    if (disableCheckpoint) return;
    if (gmbState === 'pre_session' || gmbState === 'complete') return;
    saveCheckpoint({
      savedAt: new Date().toISOString(),
      exercises,
      currentIndex,
      completedExercises,
      durationChoice,
      sessionStartTime,
    });
  }, [disableCheckpoint, gmbState, currentIndex, completedExercises, durationChoice, exercises, sessionStartTime]);

  // Save checkpoint then abort (for mid-session aborts)
  const handleAbortWithCheckpoint = useCallback(() => {
    if (!disableCheckpoint && gmbState !== 'pre_session') {
      saveCheckpoint({
        savedAt: new Date().toISOString(),
        exercises,
        currentIndex,
        completedExercises,
        durationChoice,
        sessionStartTime,
      });
    }
    onAbort();
  }, [disableCheckpoint, gmbState, exercises, currentIndex, completedExercises, durationChoice, sessionStartTime, onAbort]);

  // Handlers
  const handleNext = useCallback(() => {
    if (gmbState !== 'exercising' || !current) return;
    clearAllTimers();
    advanceToNext(currentIndex, elapsedSec, true);
  }, [gmbState, current, currentIndex, elapsedSec, advanceToNext, clearAllTimers]);

  const handleSkip = useCallback(() => {
    if (gmbState !== 'staged' && gmbState !== 'preparing') return;
    if (!current) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= resolved.length) return;
    clearAllTimers();
    const currPhase = resolved[currentIndex].sessionExercise.phase;
    const nextPhase = resolved[nextIndex].sessionExercise.phase;
    setCurrentIndex(nextIndex);
    if (nextPhase !== currPhase) {
      setTransitionPhase(nextPhase);
      setTransitionRemaining(PHASE_TRANSITION_SEC);
      setGmbState('phase_transition');
    } else {
      setGmbState('staged');
    }
  }, [gmbState, current, currentIndex, resolved, clearAllTimers]);

  const handleBack = useCallback(() => {
    if (currentIndex === 0) return;
    if (gmbState !== 'exercising' && gmbState !== 'staged' && gmbState !== 'preparing') return;
    clearAllTimers();
    setCurrentIndex((i) => i - 1);
    if (gmbState === 'exercising') {
      setCompletedExercises((prev) => prev.slice(0, -1));
    }
    setGmbState('staged');
  }, [gmbState, currentIndex, clearAllTimers]);

  const handleStartExercise = useCallback(() => {
    if (gmbState !== 'staged') return;
    setGmbState('preparing');
  }, [gmbState]);

  const handleSkipTransition = useCallback(() => {
    clearAllTimers();
    setGmbState('preparing');
  }, [clearAllTimers]);

  const handlePause = useCallback(() => {
    if (gmbState !== 'exercising' && gmbState !== 'phase_transition') return;
    clearAllTimers();
    prevStateRef.current = gmbState;
    if (gmbState === 'phase_transition') isResumingTransitionRef.current = true;
    else isResumingRef.current = true;
    setGmbState('paused');
  }, [gmbState, clearAllTimers]);

  const handleResume = useCallback(() => {
    if (gmbState !== 'paused') return;
    setGmbState(prevStateRef.current);
  }, [gmbState]);

  const handleComplete = useCallback((overallRpe: number) => {
    clearCheckpoint();
    const total = Math.round((Date.now() - sessionStartTime) / 1000);
    const exercisesWithRpe = completedExercises.map((e) => ({ ...e, rpe: overallRpe }));
    onComplete({ exercises: exercisesWithRpe, totalDurationSec: total, completedAt: new Date().toISOString() });
  }, [completedExercises, sessionStartTime, onComplete]);

  // ── PRE_SESSION: Duration picker ───────────────────────────────────────
  if (gmbState === 'pre_session') {
    const phaseCounts = phaseSegments.reduce((acc, s) => ({ ...acc, [s.phase]: s.count }), {} as Record<string, number>);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
        {/* Header */}
        <div className="flex items-center px-5 h-14 border-b border-slate-800">
          <button type="button" onClick={onAbort} className="p-1 text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="ml-3 font-medium text-white">Session Preview</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          {/* Exercise count */}
          <div className="text-center">
            <p className="text-4xl font-bold text-white">{resolved.length}</p>
            <p className="text-slate-400 text-sm">
              exercises across {phaseSegments.length} {phaseSegments.length === 1 ? 'phase' : 'phases'}
            </p>
          </div>

          {/* Phase breakdown */}
          <div className="flex gap-3 flex-wrap justify-center">
            {(['prepare', 'practice', 'push', 'ponder'] as SessionPhase[]).map((p) => {
              const count = phaseCounts[p] ?? 0;
              if (!count) return null;
              const colors = PHASE_COLORS[p];
              return (
                <div key={p} className={`px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} text-center min-w-[70px]`}>
                  <p className={`text-lg font-bold ${colors.text}`}>{count}</p>
                  <p className="text-xs text-slate-500">{PHASE_NAMES[p]}</p>
                </div>
              );
            })}
          </div>

          {/* Duration toggle */}
          <div>
            <p className="text-sm text-slate-400 text-center mb-3">Session duration</p>
            <div className="flex gap-1 p-1 bg-slate-800 rounded-lg border border-slate-700">
              {(['15', '30', '45'] as DurationChoice[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationChoice(d)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                    durationChoice === d
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            type="button"
            onClick={() => setGmbState('preparing')}
            className="px-10 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg
                       font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            Start Session
          </button>
        </div>
      </div>
    );
  }

  // ── COMPLETE ────────────────────────────────────────────────────────────
  if (gmbState === 'complete') {
    const total = Math.round((Date.now() - sessionStartTime) / 1000);
    return (
      <GmbCompleteScreen
        completedExercises={completedExercises}
        totalDurationSec={total}
        onFinish={handleComplete}
      />
    );
  }

  // ── PHASE TRANSITION INTERSTITIAL ────────────────────────────────────
  if (gmbState === 'phase_transition') {
    const colors = PHASE_COLORS[transitionPhase];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 gap-6">
        {/* Top bar with pause */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-end px-4 h-14">
          <button type="button" onClick={handlePause} className="p-2 text-slate-400 hover:text-white" aria-label="Pause session">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
          </button>
        </div>

        <motion.div
          className={`px-8 py-6 rounded-2xl border ${colors.bg} ${colors.border} text-center`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <p className="text-slate-400 text-sm mb-2">Next phase</p>
          <p className={`text-3xl font-bold tracking-wider ${colors.text}`}>{PHASE_NAMES[transitionPhase]}</p>
        </motion.div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl font-bold text-white tabular-nums">{transitionRemaining}s</p>
          <p className="text-slate-500 text-sm">rest before continuing</p>
        </div>

        <button
          type="button"
          onClick={handleSkipTransition}
          className="px-8 py-4 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500
                     rounded-xl text-base font-semibold transition-colors"
        >
          Skip Rest
        </button>
      </div>
    );
  }

  // ── STAGED: exercise shown, user decides when to start ─────────────────
  if (gmbState === 'staged' && current) {
    const colors = PHASE_COLORS[current.sessionExercise.phase];
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
        <div className="flex items-center justify-between px-4 h-14">
          <button type="button" onClick={handleAbortWithCheckpoint} className="p-2 text-white/40 hover:text-white/80 text-2xl leading-none">×</button>
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${colors.bg} ${colors.text}`}>
            {PHASE_NAMES[current.sessionExercise.phase]}
          </span>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <span className="text-xs text-white/25 tracking-widest">{currentIndex + 1} / {resolved.length}</span>
          <h1 className="text-5xl font-black tracking-widest text-white uppercase text-center leading-none">
            {current.def.name}
          </h1>
          <p className="text-slate-500 text-sm">Ready when you are</p>

          <div className="flex items-center gap-8">
            <button type="button" onClick={handleBack} disabled={currentIndex === 0}
              className="p-3 text-white/30 hover:text-white/70 disabled:opacity-10 transition-colors"
              aria-label="Previous exercise">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button type="button" onClick={handleStartExercise} aria-label="Start exercise"
              className={`w-20 h-20 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center
                         hover:opacity-80 transition-opacity focus:outline-none focus:ring-2`}>
              <svg className={`w-8 h-8 ${colors.text}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <button type="button" onClick={handleSkip} disabled={currentIndex >= resolved.length - 1}
              className="p-3 text-white/30 hover:text-white/70 disabled:opacity-10 transition-colors"
              aria-label="Skip exercise">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <ExerciseQueueRail upcoming={upcoming} />
        <div className="px-4 pb-2 pt-1 bg-slate-900">
          <PhaseProgressBar segments={phaseSegments} currentPhase={currentPhase} completedPhases={completedPhases} />
        </div>
      </div>
    );
  }

  // ── PREPARING COUNTDOWN ────────────────────────────────────────────────
  if (gmbState === 'preparing' && current) {
    const colors = PHASE_COLORS[current.sessionExercise.phase];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 gap-4">
        <p className="text-slate-400 text-sm">Get ready</p>
        <p className={`text-7xl font-bold tabular-nums ${colors.text}`}>{prepareRemaining}</p>
        <p className="text-slate-300 text-lg font-medium text-center px-6 max-w-sm">{current.def.name}</p>
      </div>
    );
  }

  // ── PAUSED ─────────────────────────────────────────────────────────────
  if (gmbState === 'paused') {
    const elapsedSessionSec = Math.round((Date.now() - sessionStartTime) / 1000);
    const elapsedMin = Math.floor(elapsedSessionSec / 60);
    const elapsedSecDisplay = elapsedSessionSec % 60;
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
            {elapsedMin}:{elapsedSecDisplay.toString().padStart(2, '0')} elapsed
          </p>
        </div>
        <button
          type="button"
          onClick={handleResume}
          className="w-full max-w-xs py-5 bg-emerald-500 hover:bg-emerald-600 text-white
                     rounded-2xl text-lg font-bold transition-colors
                     focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={handleAbortWithCheckpoint}
          className="text-slate-500 hover:text-slate-300 text-sm underline underline-offset-4 transition-colors"
        >
          End session
        </button>
      </div>
    );
  }

  // ── EXERCISING ─────────────────────────────────────────────────────────
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Hero — takes all flex space, contains abort/pause controls internally */}
      <AnimatePresence mode="wait">
        <GmbExerciseHero
          key={currentIndex}
          exerciseDef={current.def}
          phase={currentPhase}
          index={currentIndex}
          total={resolved.length}
          targetDurationSec={targetDuration}
          elapsedSec={elapsedSec}
          remainingSec={remainingSec}
          onNext={handleNext}
          onBack={handleBack}
          onPause={handlePause}
          onAbort={handleAbortWithCheckpoint}
        />
      </AnimatePresence>

      {/* Queue Rail */}
      <ExerciseQueueRail upcoming={upcoming} />

      {/* Phase progress — bottom of screen */}
      <div className="px-4 pb-2 pt-1 bg-slate-900">
        <PhaseProgressBar
          segments={phaseSegments}
          currentPhase={currentPhase}
          completedPhases={completedPhases}
        />
      </div>
    </div>
  );
}
