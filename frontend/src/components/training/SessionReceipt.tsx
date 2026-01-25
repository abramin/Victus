import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionReceiptProps {
  loadScore: number;
  isVisible: boolean;
  onComplete: () => void;
  /** Duration to show the receipt in ms (default: 2000) */
  displayDuration?: number;
}

/**
 * Flash card overlay showing load points earned after workout save.
 * Auto-dismisses after displayDuration and calls onComplete.
 */
export function SessionReceipt({
  loadScore,
  isVisible,
  onComplete,
  displayDuration = 2000,
}: SessionReceiptProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, displayDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete, displayDuration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl shadow-purple-500/30 border border-white/20"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />

            <div className="relative flex flex-col items-center gap-3">
              {/* Lightning icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                className="text-5xl"
              >
                ⚡
              </motion.div>

              {/* Score */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-white tracking-tight">
                  {loadScore}
                </div>
                <div className="text-lg font-medium text-white/80">
                  Load Points Earned!
                </div>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-white/60 mt-1"
              >
                Session Complete
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
