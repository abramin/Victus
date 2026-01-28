import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { type PlanPhase } from './PhaseBadge';
import { getPhaseInsight } from '../../api/client';

interface PhaseContextHeaderProps {
  currentPhase: PlanPhase;
  currentWeekInPhase: number;
  totalPhaseWeeks: number;
  planProgress: number; // 0-100 overall campaign completion
  planId?: number;
  currentWeek: number;
}

const PHASE_COLORS = {
  initiation: 'text-blue-400 border-blue-500',
  momentum: 'text-emerald-400 border-emerald-500',
  peak: 'text-amber-400 border-amber-500',
} as const;

const PHASE_LABELS = {
  initiation: 'INITIATION',
  momentum: 'MOMENTUM',
  peak: 'PEAK',
} as const;

const FALLBACK_INSIGHTS = {
  initiation: 'Focus: Metabolic calibration and baseline adherence. Keep protein high.',
  momentum: 'Focus: Maintaining consistency and optimizing adherence patterns.',
  peak: 'Focus: Final push with precision execution. Stay the course.',
} as const;

export function PhaseContextHeader({
  currentPhase,
  currentWeekInPhase,
  totalPhaseWeeks,
  planProgress,
  planId,
  currentWeek,
}: PhaseContextHeaderProps) {
  const [insight, setInsight] = useState<string>(FALLBACK_INSIGHTS[currentPhase]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch Ollama-generated insight if planId is available
    if (!planId) {
      setInsight(FALLBACK_INSIGHTS[currentPhase]);
      return;
    }

    const controller = new AbortController();

    const fetchInsight = async () => {
      setIsLoading(true);
      try {
        const response = await getPhaseInsight(planId, currentWeek, controller.signal);
        setInsight(response.insight || FALLBACK_INSIGHTS[currentPhase]);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Failed to fetch phase insight:', error);
        setInsight(FALLBACK_INSIGHTS[currentPhase]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchInsight();

    return () => controller.abort();
  }, [planId, currentWeek, currentPhase]);

  const phaseColor = PHASE_COLORS[currentPhase];
  const phaseLabel = PHASE_LABELS[currentPhase];

  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-900/50 backdrop-blur-sm border border-slate-800">
      {/* Animated progress bar background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-slate-800/50 to-slate-700/30"
        initial={{ width: 0 }}
        animate={{ width: `${planProgress}%` }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      {/* Scanline effect */}
      <div className="absolute inset-0 animate-scanline opacity-20" />

      {/* Content */}
      <div className="relative px-6 py-4 space-y-2">
        {/* Phase Badge & Position */}
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-md border-2 ${phaseColor} font-mono text-sm font-bold tracking-wide`}
          >
            {phaseLabel}
          </div>
          <span className="text-slate-300 font-mono text-sm">
            Week {currentWeekInPhase} of {totalPhaseWeeks}
          </span>
          <div className="ml-auto text-xs text-slate-500 font-mono">
            {planProgress}% Complete
          </div>
        </div>

        {/* Phase Insight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-sm text-slate-400 italic"
        >
          {isLoading ? (
            <span className="animate-shimmer">Loading insight...</span>
          ) : (
            insight
          )}
        </motion.div>
      </div>
    </div>
  );
}
