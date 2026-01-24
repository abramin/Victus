import type { NutritionPlan, DualTrackAnalysis } from '../../api/types';
import { Card } from '../common/Card';

interface PlanSummaryCardProps {
  plan: NutritionPlan;
  analysis?: DualTrackAnalysis | null;
  onComplete?: () => void;
  onAbandon?: () => void;
}

export function PlanSummaryCard({ plan, analysis, onComplete, onAbandon }: PlanSummaryCardProps) {
  const progressPercent = Math.min(100, (plan.currentWeek / plan.durationWeeks) * 100);
  const isLoss = plan.requiredWeeklyChangeKg < 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card title="Plan Overview">
      <div className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium">Week {plan.currentWeek} of {plan.durationWeeks}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Start</div>
            <div className="text-lg font-semibold">{plan.startWeightKg.toFixed(1)} kg</div>
            <div className="text-xs text-gray-400">{formatDate(plan.startDate)}</div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-500">Current</div>
            <div className="text-lg font-semibold">
              {analysis ? analysis.actualWeightKg.toFixed(1) : '—'} kg
            </div>
            <div className="text-xs text-gray-400">Week {plan.currentWeek}</div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-500">Goal</div>
            <div className="text-lg font-semibold">{plan.goalWeightKg.toFixed(1)} kg</div>
            <div className="text-xs text-gray-400">Week {plan.durationWeeks}</div>
          </div>
        </div>

        {/* Daily targets */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Daily {isLoss ? 'Deficit' : 'Surplus'}</div>
              <div className="text-lg font-semibold">
                {Math.abs(Math.round(plan.requiredDailyDeficitKcal))} kcal
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Weekly Change</div>
              <div className={`text-lg font-semibold ${isLoss ? 'text-green-600' : 'text-orange-600'}`}>
                {plan.requiredWeeklyChangeKg > 0 ? '+' : ''}{plan.requiredWeeklyChangeKg.toFixed(2)} kg
              </div>
            </div>
          </div>
        </div>

        {/* Variance info */}
        {analysis && (
          <div className={`p-3 rounded-lg ${analysis.recalibrationNeeded ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500">Variance from Plan</div>
                <div className={`text-lg font-semibold ${analysis.recalibrationNeeded ? 'text-yellow-700' : 'text-green-600'}`}>
                  {analysis.varianceKg > 0 ? '+' : ''}{analysis.varianceKg.toFixed(1)} kg ({analysis.variancePercent.toFixed(1)}%)
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${analysis.recalibrationNeeded ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                {analysis.recalibrationNeeded ? 'Needs Review' : 'On Track'}
              </div>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-100 text-green-800' :
              plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </span>
          </div>

          {plan.status === 'active' && (
            <div className="flex gap-2">
              {onComplete && (
                <button
                  onClick={onComplete}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Complete
                </button>
              )}
              {onAbandon && (
                <button
                  onClick={onAbandon}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Abandon
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
