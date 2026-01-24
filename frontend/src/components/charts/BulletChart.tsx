import { motion } from 'framer-motion';

interface BulletChartProps {
  /** Actual value achieved */
  actual: number;
  /** Target value to reach */
  target: number;
  /** Minimum threshold (at-risk below this) */
  minimum: number;
  /** Label for the chart */
  label: string;
  /** Unit to display (e.g., 'kcal') */
  unit?: string;
  /** Enable pulse animation when at-risk */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type ChartState = 'at-risk' | 'warning' | 'on-track';

function getState(actual: number, minimum: number, target: number): ChartState {
  if (actual < minimum) return 'at-risk';
  if (actual >= target) return 'on-track';
  return 'warning';
}

const STATE_COLORS: Record<ChartState, string> = {
  'at-risk': 'bg-red-500',
  warning: 'bg-yellow-500',
  'on-track': 'bg-green-500',
};

const STATE_BG_COLORS: Record<ChartState, string> = {
  'at-risk': 'bg-red-500/20',
  warning: 'bg-yellow-500/20',
  'on-track': 'bg-green-500/20',
};

export function BulletChart({
  actual,
  target,
  minimum,
  label,
  unit = '',
  animate = false,
  className = '',
}: BulletChartProps) {
  const state = getState(actual, minimum, target);
  const percentage = Math.min((actual / target) * 100, 100);
  const minimumPercentage = (minimum / target) * 100;
  const isAtRisk = state === 'at-risk';
  const shouldPulse = animate && isAtRisk;

  return (
    <div className={`w-full ${className}`} data-state={state}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-white">{actual}</span>
          <span className="text-sm text-gray-500">/ {target} {unit}</span>
        </div>
      </div>

      {/* Bullet Bar */}
      <div className="relative h-4 rounded-full bg-gray-700 overflow-hidden">
        {/* Target background (full bar) */}
        <div className="absolute inset-0 bg-gray-700" />

        {/* Minimum threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${minimumPercentage}%` }}
        />

        {/* Actual value bar */}
        <motion.div
          className={`absolute top-1 bottom-1 left-1 rounded-full ${STATE_COLORS[state]} ${shouldPulse ? 'animate-pulse' : ''}`}
          initial={{ width: 0 }}
          animate={{ width: `calc(${percentage}% - 8px)` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span>0</span>
        <span className="text-red-400">Min: {minimum}</span>
        <span>Target: {target}</span>
      </div>
    </div>
  );
}
