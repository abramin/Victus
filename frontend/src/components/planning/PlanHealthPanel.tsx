import type { NutritionPlan, DualTrackAnalysis } from '../../api/types';
import { Card } from '../common/Card';

interface PlanHealthPanelProps {
  plan: NutritionPlan;
  analysis: DualTrackAnalysis | null;
}

type HealthStatus = 'on_track' | 'behind' | 'ahead';

function getHealthStatus(varianceKg: number, tolerancePercent: number, plannedWeight: number): HealthStatus {
  const toleranceKg = (tolerancePercent / 100) * plannedWeight;

  if (Math.abs(varianceKg) <= toleranceKg) {
    return 'on_track';
  }
  // Positive variance = heavier than planned (behind for weight loss)
  return varianceKg > 0 ? 'behind' : 'ahead';
}

const STATUS_CONFIG = {
  on_track: {
    label: 'On Track',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    dotColor: 'bg-green-500',
    description: 'You are within your target range',
  },
  behind: {
    label: 'Behind',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    dotColor: 'bg-yellow-500',
    description: 'You are above your target weight',
  },
  ahead: {
    label: 'Ahead',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    dotColor: 'bg-blue-500',
    description: 'You are below your target weight',
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

  const status = getHealthStatus(analysis.varianceKg, analysis.tolerancePercent, analysis.plannedWeightKg);
  const config = STATUS_CONFIG[status];

  // Calculate current vs required pace
  const weeksRemaining = plan.durationWeeks - analysis.currentWeek;
  const weightToGoal = analysis.actualWeightKg - plan.goalWeightKg;
  const requiredPace = weeksRemaining > 0 ? weightToGoal / weeksRemaining : 0;
  const currentPace = plan.requiredWeeklyChangeKg;

  // Determine if the plan is for weight loss or gain
  const isWeightLoss = plan.goalWeightKg < plan.startWeightKg;

  return (
    <Card title="Plan Health">
      <div className="space-y-4">
        {/* Status Badge */}
        <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor}`}>
          <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />
          <div>
            <div className={`font-semibold ${config.textColor}`}>{config.label}</div>
            <div className={`text-xs ${config.textColor} opacity-75`}>{config.description}</div>
          </div>
        </div>

        {/* Variance Display */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Variance</div>
            <div className={`text-lg font-semibold ${analysis.varianceKg > 0 ? 'text-orange-600' : analysis.varianceKg < 0 ? 'text-green-600' : 'text-gray-900'}`}>
              {analysis.varianceKg > 0 ? '+' : ''}{analysis.varianceKg.toFixed(1)} kg
            </div>
            <div className="text-xs text-gray-500">
              ({analysis.variancePercent > 0 ? '+' : ''}{analysis.variancePercent.toFixed(1)}%)
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Tolerance</div>
            <div className="text-lg font-semibold text-gray-900">
              ±{analysis.tolerancePercent}%
            </div>
            <div className="text-xs text-gray-500">
              ±{((analysis.tolerancePercent / 100) * analysis.plannedWeightKg).toFixed(1)} kg
            </div>
          </div>
        </div>

        {/* Pace Comparison */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pace Comparison</div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current plan pace</span>
              <span className="font-medium tabular-nums">
                {isWeightLoss ? '' : '+'}{currentPace.toFixed(2)} kg/wk
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Required to hit goal</span>
              <span className={`font-medium tabular-nums ${Math.abs(requiredPace) > Math.abs(currentPace) * 1.2 ? 'text-orange-600' : 'text-gray-900'}`}>
                {requiredPace > 0 ? '+' : ''}{requiredPace.toFixed(2)} kg/wk
              </span>
            </div>
          </div>
        </div>

        {/* Landing Point Preview */}
        {analysis.landingPoint && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Projected Outcome</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${analysis.landingPoint.onTrackForGoal ? 'bg-green-500' : 'bg-orange-500'}`} />
              <span className="text-sm">
                At current pace, you'll reach{' '}
                <span className="font-semibold">{analysis.landingPoint.weightKg.toFixed(1)} kg</span>
              </span>
            </div>
            {!analysis.landingPoint.onTrackForGoal && (
              <div className="mt-1 text-xs text-orange-600">
                {analysis.landingPoint.varianceFromGoalKg > 0 ? '+' : ''}
                {analysis.landingPoint.varianceFromGoalKg.toFixed(1)} kg from goal
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
