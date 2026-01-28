import { motion } from 'framer-motion';
import type { SessionPhase } from '../../api/types';
import { getExerciseById } from './exerciseLibrary';

export interface CompletedExercise {
  exerciseId: string;
  phase: SessionPhase;
  actualDurationSec: number;
  rpe: number;
}

interface SessionCompleteScreenProps {
  completedExercises: CompletedExercise[];
  totalDurationSec: number;
  onFinish: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

const PHASE_DOT: Record<SessionPhase, string> = {
  prepare: 'bg-amber-500',
  practice: 'bg-teal-500',
  push: 'bg-violet-500',
};

/**
 * Post-session summary screen shown after all exercises are completed.
 */
export function SessionCompleteScreen({ completedExercises, totalDurationSec, onFinish }: SessionCompleteScreenProps) {
  const phasesUsed = new Set(completedExercises.map((e) => e.phase));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 px-6">
      {/* Animated checkmark */}
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
        className="text-slate-400 text-sm mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Great work
      </motion.p>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{formatTime(totalDurationSec)}</p>
          <p className="text-xs text-slate-500">Duration</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{completedExercises.length}</p>
          <p className="text-xs text-slate-500">Exercises</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{phasesUsed.size}</p>
          <p className="text-xs text-slate-500">Phases</p>
        </div>
      </motion.div>

      {/* Exercise summary list */}
      <motion.div
        className="w-full max-w-sm space-y-2 max-h-48 overflow-y-auto mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {completedExercises.map((ce, i) => {
          const def = getExerciseById(ce.exerciseId);
          if (!def) return null;
          return (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-800/40 rounded-lg">
              <span className="text-lg">{def.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{def.name}</p>
                <p className="text-xs text-slate-500">{formatTime(ce.actualDurationSec)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${PHASE_DOT[ce.phase]}`} />
                <span className="text-xs text-slate-500">RPE {ce.rpe}</span>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Finish button */}
      <button
        type="button"
        onClick={onFinish}
        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium
                   transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        Finish
      </button>
    </div>
  );
}
