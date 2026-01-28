import { motion } from 'framer-motion';
import type { WeeklyTarget } from '../../api/types';
import type { PlanPhase } from './PhaseBadge';
import { WeekProgressRing } from './WeekProgressRing';
import { scaleIn, hoverLift } from '../../lib/animations';

interface ActiveWeekCardProps {
  weekData: WeeklyTarget;
  phase: PlanPhase;
}

const PHASE_COLORS = {
  initiation: 'border-blue-500 shadow-blue-500/20',
  momentum: 'border-emerald-500 shadow-emerald-500/20',
  peak: 'border-amber-500 shadow-amber-500/20',
} as const;

const PHASE_TEXT_COLORS = {
  initiation: 'text-blue-400',
  momentum: 'text-emerald-400',
  peak: 'text-amber-400',
} as const;

const PHASE_STRIPE_CLASSES = {
  initiation: 'bg-gradient-to-b from-blue-500 to-transparent',
  momentum: 'bg-gradient-to-b from-emerald-500 to-transparent',
  peak: 'bg-gradient-to-b from-amber-500 to-transparent',
} as const;

export function ActiveWeekCard({ weekData, phase }: ActiveWeekCardProps) {
  const hasActual = weekData.actualWeightKg !== undefined && weekData.actualWeightKg !== null;
  const variance = hasActual ? weekData.actualWeightKg! - weekData.projectedWeightKg : 0;
  const phaseColors = PHASE_COLORS[phase];
  const phaseTextColor = PHASE_TEXT_COLORS[phase];

  // Progress toward projected weight: 100% = on target, capped at 100%
  const weightProgress = hasActual
    ? Math.min(100, 100 - ((weekData.actualWeightKg! - weekData.projectedWeightKg) / weekData.projectedWeightKg) * 100)
    : 0;
  const intakeProgress = weekData.actualIntakeKcal ? (weekData.actualIntakeKcal / weekData.targetIntakeKcal) * 100 : 0;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={hoverLift}
      className={`
        relative flex-shrink-0 w-full lg:w-96
        bg-slate-800/80 backdrop-blur-xl
        border-2 ${phaseColors}
        rounded-lg shadow-2xl
        overflow-hidden
        animate-glow-pulse
      `}
    >
      {/* Phase indicator stripe (left edge) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${PHASE_STRIPE_CLASSES[phase]}`} />

      {/* Header Bar */}
      <div className="bg-slate-900/60 px-6 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className={`text-2xl font-mono font-bold ${phaseTextColor} tracking-wider`}>
            WEEK {String(weekData.weekNumber).padStart(2, '0')}
          </div>
          <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">
            Current
          </div>
        </div>
      </div>

      {/* Bento Grid: 3 Columns */}
      <div className="grid grid-cols-3 divide-x divide-slate-800">
        {/* Column 1: Identity */}
        <div className="p-6 flex flex-col justify-center">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Date Range</div>
          <div className="text-sm text-slate-300 font-mono mb-4">
            {new Date(weekData.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
            {' - '}
            {new Date(weekData.endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Focus</div>
          <div className={`text-lg font-semibold ${phaseTextColor} capitalize`}>
            {phase}
          </div>
        </div>

        {/* Column 2: Targets */}
        <div className="p-6 flex flex-col justify-center space-y-6">
          {/* Weight Goal */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Weight Goal</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              {weekData.projectedWeightKg.toFixed(1)}
            </div>
            <div className="text-xs text-slate-400">kg target</div>
            {hasActual && (
              <>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      Math.abs(variance) <= 0.2 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(weightProgress, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Actual: {weekData.actualWeightKg!.toFixed(1)} kg
                  {Math.abs(variance) > 0.1 && (
                    <span className="ml-1 text-slate-500">
                      ({variance > 0 ? '+' : ''}{variance.toFixed(1)})
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Calorie Target */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Intake</div>
            <div className="text-3xl font-bold text-white tabular-nums">
              {weekData.targetIntakeKcal}
            </div>
            <div className="text-xs text-slate-400">kcal/day</div>
            {weekData.actualIntakeKcal && (
              <>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      intakeProgress >= 95 && intakeProgress <= 105 ? 'bg-emerald-500' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(intakeProgress, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Actual: {weekData.actualIntakeKcal} kcal
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 3: Status */}
        <div className="p-6 flex flex-col justify-center items-center">
          <WeekProgressRing daysLogged={weekData.daysLogged} totalDays={7} size="lg" />
          {weekData.daysLogged >= 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            >
              ✓ On Track
            </motion.div>
          )}
        </div>
      </div>

      {/* Fuel Injection Footer */}
      <div className="bg-slate-950 px-6 py-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Fuel Injection</div>
        <div className="grid grid-cols-3 gap-4">
          {/* Protein */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <div>
              <div className="text-xs text-slate-400">Protein</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {weekData.targetProteinG}g
              </div>
            </div>
          </div>

          {/* Carbs */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <div>
              <div className="text-xs text-slate-400">Carbs</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {weekData.targetCarbsG}g
              </div>
            </div>
          </div>

          {/* Fats */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div>
              <div className="text-xs text-slate-400">Fats</div>
              <div className="text-lg font-bold text-white tabular-nums">
                {weekData.targetFatsG}g
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
