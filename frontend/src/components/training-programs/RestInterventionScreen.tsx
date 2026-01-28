import { motion, AnimatePresence } from 'framer-motion';
import type { ExerciseDef } from './exerciseLibrary';

export const DEFAULT_REST_SEC = 90;

interface RestInterventionScreenProps {
  remainingSeconds: number;
  totalSeconds: number;
  onSkip: () => void;
  nextExercise?: ExerciseDef;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Full-screen rest intervention between exercises.
 * Bright green high-contrast bar with countdown timer.
 */
export function RestInterventionScreen({ remainingSeconds, totalSeconds, onSkip, nextExercise }: RestInterventionScreenProps) {
  const progressPercent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-emerald-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress bar — shrinks from left to right */}
      <motion.div
        className="h-2 bg-emerald-500"
        animate={{ width: `${progressPercent}%` }}
        transition={{ duration: 1, ease: 'linear' }}
      />

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <motion.p
          className="text-emerald-300 text-sm font-medium tracking-widest uppercase"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Recovery
        </motion.p>

        <motion.h1
          className="text-white text-7xl font-bold tabular-nums"
          key={remainingSeconds}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {formatTime(remainingSeconds)}
        </motion.h1>

        <p className="text-emerald-400 text-base">REST</p>
      </div>

      {/* Next exercise preview */}
      <AnimatePresence>
        {nextExercise && (
          <motion.div
            className="mx-6 mb-6 p-4 rounded-xl bg-emerald-800/50 border border-emerald-700/50 flex items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="text-2xl">{nextExercise.icon}</span>
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-wider">Next</p>
              <p className="text-sm text-white font-medium">{nextExercise.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <div className="px-6 pb-8 flex justify-end">
        <button
          type="button"
          onClick={onSkip}
          className="text-emerald-300 hover:text-white text-sm transition-colors flex items-center gap-1"
        >
          Skip Rest
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
