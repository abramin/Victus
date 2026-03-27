import { motion } from 'framer-motion';
import type { SessionPhase } from '../../api/types';
import type { ExerciseDef } from './exerciseLibrary';

interface GmbExerciseHeroProps {
  exerciseDef: ExerciseDef;
  phase: SessionPhase;
  index: number;
  total: number;
  targetDurationSec: number;
  elapsedSec: number;
  remainingSec: number;
  onNext: () => void;
  onBack: () => void;
  onPause: () => void;
  onAbort: () => void;
}

const PHASE_BADGE: Record<SessionPhase, { label: string; bg: string; text: string; ring: string }> = {
  prepare:  { label: 'PREPARE',  bg: 'bg-amber-500/20',  text: 'text-amber-400',  ring: 'stroke-amber-500' },
  practice: { label: 'PRACTICE', bg: 'bg-teal-500/20',   text: 'text-teal-400',   ring: 'stroke-teal-500' },
  play:     { label: 'PLAY',     bg: 'bg-teal-500/20',   text: 'text-teal-400',   ring: 'stroke-teal-500' },
  push:     { label: 'PUSH',     bg: 'bg-violet-500/20', text: 'text-violet-400', ring: 'stroke-violet-500' },
  ponder:   { label: 'PONDER',   bg: 'bg-blue-500/20',   text: 'text-blue-400',   ring: 'stroke-blue-500' },
};

const PHASE_HERO_BG: Record<SessionPhase, string> = {
  prepare:  'from-amber-950 via-slate-950 to-slate-900',
  practice: 'from-teal-950 via-slate-950 to-slate-900',
  play:     'from-teal-950 via-slate-950 to-slate-900',
  push:     'from-violet-950 via-slate-950 to-slate-900',
  ponder:   'from-blue-950 via-slate-950 to-slate-900',
};

const AUTO_ADVANCE_PHASES: SessionPhase[] = ['prepare', 'ponder'];

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getExerciseCues(def: ExerciseDef): string[] {
  if (def.cues && def.cues.length > 0) return def.cues;
  if (def.description) return [def.description];
  return [];
}

interface CountdownRingProps {
  remaining: number;
  total: number;
  elapsed: number;
  isCountUp: boolean;
  phase: SessionPhase;
}

function CountdownRing({ remaining, total, elapsed, isCountUp, phase }: CountdownRingProps) {
  const R = 100;
  const C = 2 * Math.PI * R; // ≈ 628
  const progress = total > 0 ? Math.max(0, remaining / total) : (isCountUp ? 1 : 0);
  const dashoffset = C * (1 - progress);
  const displayTime = isCountUp ? elapsed : remaining;
  const badge = PHASE_BADGE[phase];
  const isOverTarget = isCountUp && total > 0 && elapsed >= total;

  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      <svg width="240" height="240" viewBox="0 0 240 240" className="-rotate-90">
        {/* Track */}
        <circle cx="120" cy="120" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
        {/* Progress */}
        <motion.circle
          cx="120" cy="120" r={R}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashoffset}
          className={badge.ring}
          animate={isOverTarget ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
          transition={isOverTarget ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.8 }}
          style={{ transition: isOverTarget ? undefined : 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-6xl font-bold tabular-nums ${badge.text}`}>
          {formatTime(displayTime)}
        </span>
        {isCountUp && total > 0 && (
          <span className="text-xs text-slate-500 mt-1">
            {isOverTarget ? 'target hit' : `/ ${formatTime(total)}`}
          </span>
        )}
      </div>
    </div>
  );
}

export function GmbExerciseHero({
  exerciseDef,
  phase,
  index,
  total,
  targetDurationSec,
  elapsedSec,
  remainingSec,
  onNext,
  onBack,
  onPause,
  onAbort,
}: GmbExerciseHeroProps) {
  const isAutoAdvance = AUTO_ADVANCE_PHASES.includes(phase);
  const badge = PHASE_BADGE[phase];
  const heroBg = PHASE_HERO_BG[phase];
  const cues = getExerciseCues(exerciseDef);
  const howTo = exerciseDef.howTo ?? [];

  return (
    <motion.div
      key={`hero-${index}`}
      className={`relative flex flex-col items-center justify-center flex-1 bg-gradient-to-b ${heroBg} overflow-hidden`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Background emoji watermark */}
      <span className="absolute inset-0 flex items-center justify-center text-[280px] opacity-[0.04] pointer-events-none select-none">
        {exerciseDef.icon}
      </span>

      {/* Minimal top strip: abort left, phase badge center, pause right */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 h-14 z-30 pointer-events-none">
        <button
          type="button"
          onClick={onAbort}
          className="p-2 text-white/40 hover:text-white/80 transition-colors pointer-events-auto text-2xl leading-none"
          aria-label="End session"
        >
          ×
        </button>
        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
        <button
          type="button"
          onClick={onPause}
          className="p-2 text-white/40 hover:text-white/80 transition-colors pointer-events-auto"
          aria-label="Pause session"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        </button>
      </div>

      {/* Counter */}
      <div className="z-10 pointer-events-none mb-1">
        <span className="text-xs text-white/25 tracking-widest">{index + 1} / {total}</span>
      </div>

      {/* Exercise name */}
      <h1 className="text-5xl font-black tracking-widest text-white uppercase text-center z-10 px-6 leading-none pointer-events-none mb-6">
        {exerciseDef.name}
      </h1>

      {/* Ring row with back/next arrows */}
      <div className="z-30 flex items-center gap-6 pointer-events-none">
        <button
          type="button"
          onClick={onBack}
          disabled={index === 0}
          className="p-3 text-white/30 hover:text-white/70 disabled:opacity-10 transition-colors pointer-events-auto"
          aria-label="Previous exercise"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <CountdownRing
          remaining={remainingSec}
          total={targetDurationSec}
          elapsed={elapsedSec}
          isCountUp={!isAutoAdvance}
          phase={phase}
        />

        <button
          type="button"
          onClick={onNext}
          className="p-3 text-white/30 hover:text-white/70 transition-colors pointer-events-auto"
          aria-label="Next exercise"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Inline how-to + cues — z-30 so they sit above gesture zones */}
      {(howTo.length > 0 || cues.length > 0) && (
        <div className="z-30 mt-5 px-6 w-full max-w-sm pointer-events-none space-y-4">
          {howTo.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-2">How To</p>
              <ol className="space-y-1.5">
                {howTo.map((step, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      {i + 1}
                    </span>
                    <p className="text-xs text-white/60 leading-snug">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {cues.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/25 uppercase mb-2">Key Cues</p>
              <ul className="space-y-1.5">
                {cues.map((cue, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className={`mt-1.5 flex-shrink-0 w-1 h-1 rounded-full ${badge.text.replace('text-', 'bg-')}`} />
                    <p className="text-xs text-white/70 leading-snug">{cue}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Invisible gesture zones — z-20, touch-only convenience targets (buttons above handle a11y) */}
      <div aria-hidden className="absolute inset-0 z-20 flex pointer-events-none">
        {/* Left: Back — disabled on first exercise to match button state */}
        <div
          className={`w-[30%] h-full transition-colors ${index === 0 ? 'pointer-events-none' : 'pointer-events-auto active:bg-white/5'}`}
          onClick={onBack}
        />
        {/* Center: Pause */}
        <div className="flex-1 h-full pointer-events-auto active:bg-white/5 transition-colors" onClick={onPause} />
        {/* Right: Next */}
        <div className="w-[30%] h-full pointer-events-auto active:bg-white/5 transition-colors" onClick={onNext} />
      </div>
    </motion.div>
  );
}
