import { useMemo } from 'react';
import { Panel } from '../common/Panel';
import type { TrainingSession, TrainingConfig } from '../../api/types';

type ActivityStatus = 'on_track' | 'at_risk' | 'secured';

interface DeficitMonitorProps {
  plannedSessions: TrainingSession[];
  trainingConfigs: TrainingConfig[];
  weightKg: number;
  activeCaloriesBurned?: number;
  totalCalories: number;
}

/**
 * Calculate planned burn calories from training sessions using MET formula.
 * Formula: (MET - 1) × weight(kg) × duration(hours)
 */
function calculatePlannedBurn(
  sessions: TrainingSession[],
  configs: TrainingConfig[],
  weightKg: number
): number {
  const configMap = new Map(configs.map(c => [c.type, c]));

  return sessions.reduce((total, session) => {
    const config = configMap.get(session.type);
    if (!config || session.type === 'rest') return total;

    const durationHours = session.durationMin / 60;
    const netMET = Math.max(0, config.met - 1);
    const calories = netMET * weightKg * durationHours;

    return total + calories;
  }, 0);
}

/**
 * Determine activity status based on progress and time of day.
 */
function getActivityStatus(
  actual: number,
  target: number,
  currentHour: number
): ActivityStatus {
  if (actual >= target) {
    return 'secured';
  }

  // After 6pm (18:00), show "at risk" if behind
  if (currentHour >= 18) {
    return 'at_risk';
  }

  return 'on_track';
}

function getStatusConfig(status: ActivityStatus) {
  switch (status) {
    case 'secured':
      return {
        label: 'Deficit Secured',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500',
        dotColor: 'bg-emerald-400',
      };
    case 'at_risk':
      return {
        label: 'Deficit at Risk',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500',
        dotColor: 'bg-amber-400',
      };
    case 'on_track':
    default:
      return {
        label: 'On Track',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500',
        dotColor: 'bg-gray-400',
      };
  }
}

export function DeficitMonitor({
  plannedSessions,
  trainingConfigs,
  weightKg,
  activeCaloriesBurned,
  totalCalories,
}: DeficitMonitorProps) {
  const plannedBurn = useMemo(
    () => Math.round(calculatePlannedBurn(plannedSessions, trainingConfigs, weightKg)),
    [plannedSessions, trainingConfigs, weightKg]
  );

  const actualBurn = activeCaloriesBurned ?? 0;
  const progress = plannedBurn > 0 ? Math.min(100, (actualBurn / plannedBurn) * 100) : 0;
  const remaining = Math.max(0, plannedBurn - actualBurn);

  const currentHour = new Date().getHours();
  const status = getActivityStatus(actualBurn, plannedBurn, currentHour);
  const statusConfig = getStatusConfig(status);

  // Rest day - no activity goal
  if (plannedBurn === 0) {
    return (
      <Panel title="Activity & Deficit">
        <div className="text-center py-2">
          <p className="text-gray-400 text-sm">Rest day - no activity goal</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Activity & Deficit">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400">Active Burn (Garmin)</span>
          <span className="text-xs text-gray-500">Target: {plannedBurn} kcal</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusConfig.bgColor} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Label */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-300">
            {activeCaloriesBurned !== undefined ? (
              <span className="font-medium">{actualBurn} kcal</span>
            ) : (
              <span className="text-gray-500 italic">No data yet</span>
            )}
          </span>

          {/* Status Indicator */}
          <div className={`flex items-center gap-2 ${statusConfig.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Context Text */}
      {status !== 'secured' && remaining > 0 && (
        <p className="text-xs text-gray-500">
          You need to burn <span className="text-gray-400">{remaining} more kcal</span> to "earn" full meals.
        </p>
      )}
      {status === 'secured' && (
        <p className="text-xs text-emerald-400/70">
          Activity goal reached! Your {totalCalories.toLocaleString()} kcal target is fully earned.
        </p>
      )}
    </Panel>
  );
}
