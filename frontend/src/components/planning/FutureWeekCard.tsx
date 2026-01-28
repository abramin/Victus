import { motion } from 'framer-motion';
import type { WeeklyTarget } from '../../api/types';
import type { PlanPhase } from './PhaseBadge';
import { fadeIn } from '../../lib/animations';

interface FutureWeekCardProps {
  weekData: WeeklyTarget;
  phase: PlanPhase;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const PHASE_BORDER_COLORS = {
  initiation: 'border-blue-500/30',
  momentum: 'border-emerald-500/30',
  peak: 'border-amber-500/30',
} as const;

export function FutureWeekCard({
  weekData,
  phase,
  isExpanded,
  onToggleExpand,
}: FutureWeekCardProps) {
  const phaseBorderColor = PHASE_BORDER_COLORS[phase];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      variants={fadeIn}
      onClick={onToggleExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpand();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={`
        relative flex-shrink-0 cursor-pointer
        transition-all duration-200 ease-out
        ${isExpanded ? 'w-full lg:w-80' : 'w-full lg:w-48'}
        ${isExpanded ? 'bg-slate-800/60 border border-slate-700 opacity-90' : 'bg-slate-900/30 opacity-50'}
        hover:opacity-90 hover:bg-slate-800/50 hover:animate-glitch-peek
        rounded-lg p-4
        ${isExpanded ? phaseBorderColor : ''}
        focus:outline-none focus:ring-2 focus:ring-emerald-500/50
      `}
    >
      {/* Phase indicator stripe */}
      {isExpanded && (
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-${phase === 'initiation' ? 'blue' : phase === 'momentum' ? 'emerald' : 'amber'}-500/50 to-transparent`}
        />
      )}

      {/* Collapsed View (Default) */}
      {!isExpanded && (
        <div className="flex flex-col gap-1 text-slate-500">
          <div className="font-mono text-sm font-bold">Week {weekData.weekNumber}</div>
          <div className="text-xs">{weekData.projectedWeightKg.toFixed(1)} kg</div>
          <div className="text-xs tabular-nums">
            {weekData.targetIntakeKcal.toLocaleString()} kcal
          </div>
        </div>
      )}

      {/* Expanded View (On Click/Hover) */}
      {isExpanded && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-lg font-bold text-slate-300">
              Week {weekData.weekNumber}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
              Upcoming
            </span>
          </div>

          <div className="text-xs text-slate-500">
            {formatDate(weekData.startDate)} - {formatDate(weekData.endDate)}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Target Weight</div>
              <div className="font-mono text-slate-300 tabular-nums">
                {weekData.projectedWeightKg.toFixed(1)} kg
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Daily Intake</div>
              <div className="font-mono text-slate-300 tabular-nums">
                {weekData.targetIntakeKcal.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/50 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-slate-600">Protein</div>
              <div className="font-mono text-slate-400">{weekData.targetProteinG}g</div>
            </div>
            <div>
              <div className="text-slate-600">Carbs</div>
              <div className="font-mono text-slate-400">{weekData.targetCarbsG}g</div>
            </div>
            <div>
              <div className="text-slate-600">Fats</div>
              <div className="font-mono text-slate-400">{weekData.targetFatsG}g</div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
