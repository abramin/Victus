import { motion } from 'framer-motion';
import type { WeeklyTarget } from '../../api/types';
import type { PlanPhase } from './PhaseBadge';
import { IntakeSparkline } from './IntakeSparkline';
import { fadeInUp } from '../../lib/animations';

interface PastWeekCardProps {
  weekData: WeeklyTarget;
  phase: PlanPhase;
  showSparkline?: boolean;
}

const PHASE_BORDER_COLORS = {
  initiation: 'border-blue-500/50',
  momentum: 'border-emerald-500/50',
  peak: 'border-amber-500/50',
} as const;

export function PastWeekCard({ weekData, phase, showSparkline = true }: PastWeekCardProps) {
  const hasActual = weekData.actualWeightKg !== undefined && weekData.actualWeightKg !== null;
  const variance = hasActual ? weekData.actualWeightKg! - weekData.projectedWeightKg : 0;
  const isComplete = weekData.daysLogged >= 5;
  const isPartial = weekData.daysLogged > 0 && weekData.daysLogged < 5;
  const phaseBorderColor = PHASE_BORDER_COLORS[phase];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      variants={fadeInUp}
      className={`
        relative flex-shrink-0 w-full lg:w-64
        bg-slate-900/40 backdrop-blur-sm
        border-l-2 ${phaseBorderColor}
        rounded-lg p-4
        transition-colors hover:bg-slate-900/60
      `}
    >
      {/* Week Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-lg font-bold text-slate-300">
          Week {weekData.weekNumber}
        </div>

        {/* Status Badge */}
        {isComplete && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            ✓ Complete
          </span>
        )}
        {isPartial && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Partial
          </span>
        )}
      </div>

      {/* Date Range */}
      <div className="text-xs text-slate-500 mb-3">
        {formatDate(weekData.startDate)} - {formatDate(weekData.endDate)}
      </div>

      {/* Weight Data */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-500">Target</span>
          <span className="font-mono text-sm text-slate-400 tabular-nums">
            {weekData.projectedWeightKg.toFixed(1)} kg
          </span>
        </div>

        {hasActual && (
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500">Actual</span>
            <div className="flex items-baseline gap-1">
              <span
                className={`font-mono text-sm tabular-nums ${
                  variance > 0.2
                    ? 'text-orange-400'
                    : variance < -0.2
                      ? 'text-green-400'
                      : 'text-slate-300'
                }`}
              >
                {weekData.actualWeightKg!.toFixed(1)} kg
              </span>
              {Math.abs(variance) > 0.1 && (
                <span className="text-xs text-slate-500">
                  ({variance > 0 ? '+' : ''}
                  {variance.toFixed(1)})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Intake with Sparkline */}
      <div className="space-y-1 mb-3">
        <div className="text-xs text-slate-500">Daily Intake</div>
        {showSparkline ? (
          <IntakeSparkline
            targetKcal={weekData.targetIntakeKcal}
            maxKcal={weekData.targetIntakeKcal * 1.2}
          />
        ) : (
          <div className="font-mono text-sm text-slate-400 tabular-nums">
            {weekData.targetIntakeKcal.toLocaleString()} kcal
          </div>
        )}
      </div>

      {/* Days Logged */}
      <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
        <span className="text-xs text-slate-500">Days Logged</span>
        <span
          className={`font-mono text-sm tabular-nums ${
            weekData.daysLogged >= 7
              ? 'text-green-400'
              : weekData.daysLogged >= 5
                ? 'text-green-500'
                : weekData.daysLogged > 0
                  ? 'text-yellow-500'
                  : 'text-slate-500'
          }`}
        >
          {weekData.daysLogged}/7
        </span>
      </div>
    </motion.div>
  );
}
