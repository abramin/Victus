import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionFatigueReport } from '../../api/types';

interface SessionReportModalProps {
  report: SessionFatigueReport | null;
  isVisible: boolean;
  onClose: () => void;
}

const ARCHETYPE_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
  cardio_impact: 'Cardio (Impact)',
  cardio_low: 'Cardio (Low Impact)',
};

const STATUS_COLORS: Record<string, string> = {
  fresh: 'text-emerald-400',
  stimulated: 'text-yellow-400',
  fatigued: 'text-orange-400',
  overreached: 'text-red-400',
};

export function SessionReportModal({
  report,
  isVisible,
  onClose,
}: SessionReportModalProps) {
  // Auto-close after 4 seconds
  useEffect(() => {
    if (isVisible && report) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, report, onClose]);

  if (!report) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-4xl mb-2"
              >
                💥
              </motion.div>
              <h2 className="text-xl font-bold text-white">
                SESSION COMPLETE
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {ARCHETYPE_LABELS[report.archetype] ?? report.archetype}
              </p>
            </div>

            {/* Load Score */}
            <div className="flex justify-center mb-6">
              <div className="bg-gray-800 rounded-lg px-6 py-3 border border-gray-700">
                <div className="text-xs text-gray-500 uppercase tracking-wide text-center">
                  Total Load
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white text-center"
                >
                  {(report.totalLoad * 100).toFixed(0)}
                </motion.div>
              </div>
            </div>

            {/* Fatigue Injections */}
            <div className="space-y-3">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Stimulus Applied
              </div>
              {report.injections.map((injection, index) => (
                <motion.div
                  key={injection.muscle}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">
                      {injection.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      +{injection.injectedPercent.toFixed(0)}%
                    </span>
                    <span className={`text-sm font-medium ${STATUS_COLORS[injection.status] ?? 'text-gray-400'}`}>
                      {injection.newTotal.toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              className="w-full mt-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-colors"
            >
              Done
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
