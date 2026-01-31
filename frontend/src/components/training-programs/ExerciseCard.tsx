import { motion } from 'framer-motion';
import type { SessionPhase } from '../../api/types';
import type { ExerciseDef } from './exerciseLibrary';
import { RPEDial } from './RPEDial';

interface ExerciseCardProps {
  exerciseDef: ExerciseDef;
  phase: SessionPhase;
  index: number;
  total: number;
  targetDurationSec: number;
  targetReps: number;
  currentWeight: number;
  elapsedSec: number;
  currentRep: number;
  rpe: number;
  onDone: () => void;
  onRpeChange: (rpe: number) => void;
  onRepIncrement: () => void;
  onWeightChange: (weight: number) => void;
  onTargetRepsChange: (reps: number) => void;
  onAbort: () => void;
}

const PHASE_BADGE: Record<SessionPhase, { label: string; bg: string; text: string }> = {
  prepare: { label: 'PREPARE', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  practice: { label: 'PRACTICE', bg: 'bg-teal-500/20', text: 'text-teal-400' },
  push: { label: 'PUSH', bg: 'bg-violet-500/20', text: 'text-violet-400' },
};

const PHASE_HERO_GRADIENT: Record<SessionPhase, string> = {
  prepare: 'from-amber-900/50 to-amber-800/20',
  practice: 'from-teal-900/50 to-teal-800/20',
  push: 'from-violet-900/50 to-violet-800/20',
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * High-fidelity "Active Session" exercise card.
 * Calimove-style layout: header, hero zone, data overlay, control bar.
 */
export function ExerciseCard({
  exerciseDef,
  phase,
  index,
  total,
  targetDurationSec,
  targetReps,
  currentWeight,
  elapsedSec,
  currentRep,
  rpe,
  onDone,
  onRpeChange,
  onRepIncrement,
  onWeightChange,
  onTargetRepsChange,
  onAbort,
}: ExerciseCardProps) {
  const isTimed = targetDurationSec > 0;
  const badge = PHASE_BADGE[phase];
  const heroGradient = PHASE_HERO_GRADIENT[phase];
  const repsComplete = !isTimed && currentRep >= targetReps;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <button
          type="button"
          onClick={onAbort}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-xs text-slate-500 tabular-nums">
          EX. {index + 1} OF {total}
        </span>

        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Hero Zone */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
        <motion.div
          className={`w-48 h-48 rounded-2xl bg-gradient-to-br ${heroGradient} flex items-center justify-center border border-slate-700/50`}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-9xl">{exerciseDef.icon}</span>
        </motion.div>

        <h2 className="text-2xl font-semibold text-white text-center">{exerciseDef.name}</h2>

        {exerciseDef.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {exerciseDef.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Data Overlay Strip */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4 border-t border-slate-800">
        {/* TM Range (left) */}
        <div className="flex flex-col items-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Target</p>
          {isTimed ? (
            <p className="text-lg font-bold text-white tabular-nums">{targetDurationSec}s</p>
          ) : (
            <p className="text-lg font-bold text-white tabular-nums">{targetReps} reps</p>
          )}
        </div>

        {/* RPE Dial (right) */}
        <RPEDial value={rpe} onChange={onRpeChange} />
      </div>

      {/* Adjust Sliders (rep-based exercises only) */}
      {!isTimed && (
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 space-y-4">
          {/* Weight Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="weight-slider" className="text-xs text-slate-400 uppercase tracking-wider">
                Weight
              </label>
              <span className="text-sm font-semibold text-white tabular-nums">{currentWeight.toFixed(1)} kg</span>
            </div>
            <input
              id="weight-slider"
              type="range"
              min="0"
              max="150"
              step="2.5"
              value={currentWeight}
              onChange={(e) => onWeightChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Target Reps Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="reps-slider" className="text-xs text-slate-400 uppercase tracking-wider">
                Target Reps
              </label>
              <span className="text-sm font-semibold text-white tabular-nums">{targetReps} reps</span>
            </div>
            <input
              id="reps-slider"
              type="range"
              min="1"
              max="30"
              step="1"
              value={targetReps}
              onChange={(e) => onTargetRepsChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        {/* Timer or Rep Counter */}
        <div className="flex items-center gap-3">
          {isTimed ? (
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatTime(Math.max(0, targetDurationSec - elapsedSec))}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white tabular-nums">{currentRep}/{targetReps}</span>
              <button
                type="button"
                onClick={onRepIncrement}
                disabled={repsComplete}
                className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center
                           hover:bg-slate-600 disabled:opacity-30 transition-colors"
                aria-label="Add rep"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Done button */}
        <button
          type="button"
          onClick={onDone}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg
                     font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Done
        </button>
      </div>
    </div>
  );
}
