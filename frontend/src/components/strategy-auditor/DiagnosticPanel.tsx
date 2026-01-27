import { motion, AnimatePresence } from 'framer-motion';
import { MismatchCard } from './MismatchCard';
import type { AuditMismatch } from '../../api/types';

interface DiagnosticPanelProps {
  isOpen: boolean;
  mismatches: AuditMismatch[];
  checkedAt?: string;
  onClose?: () => void;
}

/**
 * Notification shade panel showing all detected mismatches.
 * Slides down when expanded.
 */
export function DiagnosticPanel({ isOpen, mismatches, checkedAt, onClose }: DiagnosticPanelProps) {
  // Format the checked time
  const formatCheckedAt = (isoString: string | undefined) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 mt-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Strategy Diagnostics</h3>
                {checkedAt && (
                  <p className="text-xs text-gray-500">Last checked: {formatCheckedAt(checkedAt)}</p>
                )}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Mismatches */}
            {mismatches.length > 0 ? (
              <div className="space-y-3">
                {mismatches.map((mismatch, index) => (
                  <motion.div
                    key={mismatch.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <MismatchCard mismatch={mismatch} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">No strategy mismatches detected</p>
              </div>
            )}

            {/* Tip */}
            {mismatches.length > 0 && (
              <p className="mt-4 text-xs text-gray-500 italic">
                Consider adjusting your day type or training plan to address these mismatches.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
