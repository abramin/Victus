import { motion } from 'framer-motion';
import type { NutritionPlan, DualTrackAnalysis } from '../../api/types';
import { Card } from '../common/Card';
import { calculateKcalCorrection } from '../../utils/math';

interface PlanHealthPanelProps {
  plan: NutritionPlan;
  analysis: DualTrackAnalysis | null;
}

type SignalStatus = 'on_track' | 'at_risk' | 'off_track' | 'critical_deviation';

/**
 * Calculate plan health status using Vector-First logic.
 *
 * Priority order (strict):
 * 1. CRITICAL DEVIATION (Red): trendDiverging = true (trend opposes goal direction)
 * 2. ON TRACK (Green): Projected landing variance < 1.0kg
 * 3. AT RISK (Amber): Projected landing variance 1.0-3.0kg
 * 4. OFF TRACK (Red): Projected landing variance > 3.0kg
 */
function getSignalStatus(analysis: DualTrackAnalysis): SignalStatus {
  // Step 1: Vector Direction Check (highest priority)
  // trendDiverging = true means trend direction opposes goal direction
  // (e.g., gaining weight on a weight loss plan)
  if (analysis.trendDiverging) {
    return 'critical_deviation';
  }

  // Step 2 & 3: Status based on projected landing variance
  if (!analysis.landingPoint) {
    return 'on_track';
  }

  const projectedError = Math.abs(analysis.landingPoint.varianceFromGoalKg);

  if (projectedError < 1.0) {
    return 'on_track';
  } else if (projectedError <= 3.0) {
    return 'at_risk';
  } else {
    return 'off_track';
  }
}

const SIGNAL_CONFIG = {
  on_track: {
    label: 'ON TRACK',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
  },
  at_risk: {
    label: 'AT RISK',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
  },
  off_track: {
    label: 'OFF TRACK',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
  },
  critical_deviation: {
    label: 'CRITICAL DEVIATION',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
  },
} as const;

export function PlanHealthPanel({ plan, analysis }: PlanHealthPanelProps) {
  if (!analysis) {
    return (
      <Card title="Plan Health">
        <div className="flex items-center justify-center h-32 text-gray-500">
          Loading analysis...
        </div>
      </Card>
    );
  }

  const signal = getSignalStatus(analysis);
  const config = SIGNAL_CONFIG[signal];

  // Calculate current vs required pace
  const weeksRemaining = plan.durationWeeks - analysis.currentWeek;
  const weightToGoal = analysis.actualWeightKg - plan.goalWeightKg;
  const requiredPace = weeksRemaining > 0 ? weightToGoal / weeksRemaining : 0;
  const currentPace = plan.requiredWeeklyChangeKg;

  // Determine if the plan is for weight loss or gain
  const isWeightLoss = plan.goalWeightKg < plan.startWeightKg;

  const kcalCorrection = signal !== 'on_track'
    ? calculateKcalCorrection(analysis.landingPoint?.varianceFromGoalKg, weeksRemaining)
    : null;

  // Landing point projection text with correction guidance
  const getLandingText = (): string | null => {
    // Critical deviation - show the trend warning prominently
    if (signal === 'critical_deviation') {
      return analysis.trendDivergingMsg || 'Trending in opposite direction to your goal.';
    }

    if (!analysis.landingPoint) return null;

    if (signal === 'on_track') {
      return `At this pace, you reach ${analysis.landingPoint.weightKg.toFixed(1)}kg (Goal: ${plan.goalWeightKg.toFixed(1)}kg)`;
    }

    if (kcalCorrection) {
      return `Current velocity puts you at ${analysis.landingPoint.weightKg.toFixed(1)}kg. ${isWeightLoss ? 'Increase' : 'Decrease'} deficit by ${kcalCorrection} kcal to correct.`;
    }

    return `Current velocity puts you at ${analysis.landingPoint.weightKg.toFixed(1)}kg (Goal: ${plan.goalWeightKg.toFixed(1)}kg)`;
  };

  const landingText = getLandingText();

  return (
    <Card title="Plan Health">
      <div className="space-y-4">
        {/* Hero Signal */}
        <div className={`p-4 rounded-xl ${config.bgColor} border-2 ${config.borderColor}`}>
          <div className="flex items-center gap-4">
            {/* Pulsing dot */}
            <motion.div
              className={`w-5 h-5 rounded-full ${config.dotColor}`}
              animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div>
              <div className={`text-xl font-bold ${config.textColor}`}>
                {config.label}
              </div>
              {landingText && (
                <div className="text-sm text-gray-400 mt-0.5">
                  {landingText}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Details */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-gray-300 transition-colors select-none">
            <svg
              className="w-4 h-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            View Details
          </summary>

          <div className="mt-4 space-y-4">
            {/* Variance Display */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {signal === 'critical_deviation' || signal === 'off_track' ? 'Projected Variance' : 'Current Variance'}
                </div>
                {/* Show projected variance for critical/off_track when it's significantly larger */}
                {(signal === 'critical_deviation' || signal === 'off_track') && analysis.landingPoint ? (
                  <>
                    <div className="text-lg font-bold text-red-400">
                      {analysis.landingPoint.varianceFromGoalKg > 0 ? '+' : ''}{analysis.landingPoint.varianceFromGoalKg.toFixed(1)} kg
                    </div>
                    <div className="text-xs text-gray-500">
                      Current: {analysis.varianceKg > 0 ? '+' : ''}{analysis.varianceKg.toFixed(1)} kg
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`text-lg font-semibold ${analysis.varianceKg > 0 ? 'text-orange-400' : analysis.varianceKg < 0 ? 'text-green-400' : 'text-gray-300'}`}>
                      {analysis.varianceKg > 0 ? '+' : ''}{analysis.varianceKg.toFixed(1)} kg
                    </div>
                    <div className="text-xs text-gray-500">
                      ({analysis.variancePercent > 0 ? '+' : ''}{analysis.variancePercent.toFixed(1)}%)
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Tolerance</div>
                <div className="text-lg font-semibold text-gray-300">
                  ±{analysis.tolerancePercent}%
                </div>
                <div className="text-xs text-gray-500">
                  ±{((analysis.tolerancePercent / 100) * analysis.plannedWeightKg).toFixed(1)} kg
                </div>
              </div>
            </div>

            {/* Pace Comparison */}
            <div className="pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pace Comparison</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current plan pace</span>
                  <span className="font-medium tabular-nums text-gray-300">
                    {isWeightLoss ? '' : '+'}{currentPace.toFixed(2)} kg/wk
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Required to hit goal</span>
                  <span className={`font-medium tabular-nums ${Math.abs(requiredPace) > Math.abs(currentPace) * 1.2 ? 'text-orange-400' : 'text-gray-300'}`}>
                    {requiredPace > 0 ? '+' : ''}{requiredPace.toFixed(2)} kg/wk
                  </span>
                </div>
              </div>
            </div>

            {/* Landing Point Detail */}
            {analysis.landingPoint && !analysis.landingPoint.onTrackForGoal && (
              <div className="pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Projected Variance</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-sm text-orange-400">
                    {analysis.landingPoint.varianceFromGoalKg > 0 ? '+' : ''}
                    {analysis.landingPoint.varianceFromGoalKg.toFixed(1)} kg from goal
                  </span>
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </Card>
  );
}
