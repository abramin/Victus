import { useMemo } from 'react';
import { Panel } from '../common/Panel';
import { BulletChart } from '../charts';
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
  const remaining = Math.max(0, plannedBurn - actualBurn);

  const currentHour = new Date().getHours();
  const status = getActivityStatus(actualBurn, plannedBurn, currentHour);

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
      {/* Enhanced Bullet Chart Visualization */}
      <BulletChart
        actual={actualBurn}
        target={plannedBurn}
        minimum={Math.round(plannedBurn * 0.5)} // 50% of target as minimum threshold
        label="Active Burn (Garmin)"
        unit="kcal"
        animate={status === 'at_risk'}
      />

      {/* Context Text */}
      <div className="mt-3">
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
      </div>
    </Panel>
  );
}
