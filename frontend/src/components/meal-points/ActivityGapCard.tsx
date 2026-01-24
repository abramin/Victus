import { useState, useMemo } from 'react';
import { Panel } from '../common/Panel';
import type { TrainingSession, TrainingConfig } from '../../api/types';

type ActivityStatus = 'on_track' | 'at_risk' | 'secured';

interface ActivityGapCardProps {
  plannedSessions: TrainingSession[];
  trainingConfigs: TrainingConfig[];
  weightKg: number;
  activeCaloriesBurned?: number;
  totalCalories: number;
  onActiveCaloriesChange: (calories: number | null) => void;
  isLoading?: boolean;
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

export function ActivityGapCard({
  plannedSessions,
  trainingConfigs,
  weightKg,
  activeCaloriesBurned,
  totalCalories,
  onActiveCaloriesChange,
  isLoading = false,
}: ActivityGapCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const plannedBurn = useMemo(
    () => Math.round(calculatePlannedBurn(plannedSessions, trainingConfigs, weightKg)),
    [plannedSessions, trainingConfigs, weightKg]
  );

  const actualBurn = activeCaloriesBurned ?? 0;
  const progress = plannedBurn > 0 ? Math.min(100, (actualBurn / plannedBurn) * 100) : 0;

  const currentHour = new Date().getHours();
  const status = getActivityStatus(actualBurn, plannedBurn, currentHour);
  const statusConfig = getStatusConfig(status);

  const handleEditStart = () => {
    setEditValue(activeCaloriesBurned?.toString() ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    const value = editValue.trim();
    if (value === '') {
      onActiveCaloriesChange(null);
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        onActiveCaloriesChange(parsed);
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <Panel title="Daily Activity Goal">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusConfig.bgColor} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Label */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm text-gray-300">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  autoFocus
                  className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-right"
                  placeholder="0"
                  min={0}
                />
                <span className="text-gray-500">/ {plannedBurn} kcal</span>
              </div>
            ) : (
              <button
                onClick={handleEditStart}
                disabled={isLoading}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                {activeCaloriesBurned !== undefined ? (
                  <>
                    <span className="font-medium">{actualBurn}</span>
                    <span className="text-gray-500">/ {plannedBurn} kcal</span>
                  </>
                ) : (
                  <span className="text-gray-500 italic">
                    Enter today's burn → {plannedBurn} kcal goal
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Status Indicator */}
          <div className={`flex items-center gap-2 ${statusConfig.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Context Text */}
      <p className="text-xs text-gray-500">
        You get to eat <span className="text-gray-400">{totalCalories.toLocaleString()} kcal</span> because you planned to burn{' '}
        <span className="text-gray-400">{plannedBurn} kcal</span>.
      </p>
    </Panel>
  );
}
