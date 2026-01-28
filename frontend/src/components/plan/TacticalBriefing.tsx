import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getLogByDate, getDayInsight } from '../../api/client';
import type { DailyLog, DayInsightResponse } from '../../api/types';
import { drawerSlide } from '../../lib/animations';
import { MacroStackedBar } from './MacroStackedBar';
import { TrainingBadge } from './TrainingBadge';
import { TRAINING_LABELS } from '../../constants';
import { formatSleepHours } from '../../utils/format';

interface TacticalBriefingProps {
  /**
   * Whether the drawer is open
   */
  isOpen: boolean;
  /**
   * Date to display (YYYY-MM-DD format)
   */
  date: string | null;
  /**
   * Callback when drawer should close
   */
  onClose: () => void;
}

/**
 * Side drawer "Tactical Briefing" - detailed day view with 3 zones:
 * 1. Bio-Status Strip (Weight, Sleep, HRV)
 * 2. Action vs Fuel (Workout + Macro distribution)
 * 3. Mission Summary (Ollama insight)
 */
export function TacticalBriefing({ isOpen, date, onClose }: TacticalBriefingProps) {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [insight, setInsight] = useState<DayInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch log and insight when date changes
  useEffect(() => {
    if (!date || !isOpen) {
      setLog(null);
      setInsight(null);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch log data
        const logData = await getLogByDate(date, controller.signal);
        if (controller.signal.aborted) return;
        setLog(logData);

        // Only fetch insight if a log exists for this date
        if (logData) {
          if (controller.signal.aborted) return;
          const insightData = await getDayInsight(date, controller.signal);
          if (controller.signal.aborted) return;
          setInsight(insightData);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load day data');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [date, isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Format date for display
  const dateLabel = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Determine session for display (actual if available, otherwise planned)
  const sessions = log?.actualTrainingSessions?.length
    ? log.actualTrainingSessions
    : log?.plannedTrainingSessions || [];
  const hasTraining = sessions.length > 0 && sessions.some((s) => s.type !== 'rest');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            variants={drawerSlide}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md md:max-w-lg bg-gray-900 border-l border-gray-800 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Tactical Briefing</h2>
                <p className="text-sm text-gray-400">{dateLabel}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                aria-label="Close drawer"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!loading && !log && !error && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">No check-in data for this date</p>
                </div>
              )}

              {log && !loading && (
                <>
                  {/* Zone 1: Bio-Status Strip */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      Bio-Status
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Weight */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          <span className="text-[10px] text-gray-500">Weight</span>
                        </div>
                        <p className="text-lg font-semibold text-white">{log.weightKg.toFixed(1)}kg</p>
                      </div>

                      {/* Sleep */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span className="text-[10px] text-gray-500">Sleep</span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {formatSleepHours(log.sleepHours)}
                        </p>
                      </div>

                      {/* HRV */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span className="text-[10px] text-gray-500">HRV</span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                          {log.hrvMs ? `${log.hrvMs}ms` : '--'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Zone 2: Action vs Fuel */}
                  <div className="space-y-4">
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      Action vs. Fuel
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Workout Session */}
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <h4 className="text-xs text-gray-500 mb-2">Workout</h4>
                        {hasTraining ? (
                          <>
                            <TrainingBadge sessions={sessions} />
                            {sessions.length > 0 && (
                              <div className="mt-2 text-xs text-gray-400">
                                {sessions.map(s => TRAINING_LABELS[s.type]).join(', ')}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">Rest day</p>
                        )}
                      </div>

                      {/* Right: Macro Stacked Bar */}
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <h4 className="text-xs text-gray-500 mb-2">Macros Consumed</h4>
                        <MacroStackedBar
                          proteinG={log.consumedProteinG}
                          carbsG={log.consumedCarbsG}
                          fatsG={log.consumedFatG}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Zone 3: Mission Summary (Ollama Insight) */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      Mission Summary
                    </h3>
                    <div className="bg-gray-950 rounded-lg p-4 border border-gray-800 font-mono text-xs leading-relaxed">
                      {insight && insight.generated ? (
                        <p className="text-slate-200 whitespace-pre-wrap">{insight.insight}</p>
                      ) : (
                        <p className="text-slate-200">
                          {insight ? insight.insight : 'Generating insight...'}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
