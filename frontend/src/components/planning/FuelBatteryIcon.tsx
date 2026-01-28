import { motion } from 'framer-motion';
import { liquidFill } from '../../lib/animations';

interface FuelBatteryIconProps {
  currentKcal: number;
  targetKcal: number;
  maxKcal?: number; // For scale context
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { width: 30, height: 60, fontSize: 10 },
  md: { width: 40, height: 80, fontSize: 12 },
  lg: { width: 50, height: 100, fontSize: 14 },
};

function getFillColor(fillPercent: number): { start: string; end: string } {
  if (fillPercent >= 80) {
    return { start: '#10b981', end: '#34d399' }; // emerald-500 → emerald-400
  }
  if (fillPercent >= 50) {
    return { start: '#3b82f6', end: '#60a5fa' }; // blue-500 → blue-400
  }
  return { start: '#f59e0b', end: '#fb923c' }; // amber-500 → orange-500
}

export function FuelBatteryIcon({
  currentKcal,
  targetKcal,
  maxKcal,
  size = 'md',
}: FuelBatteryIconProps) {
  const config = SIZE_CONFIG[size];
  const { width, height, fontSize } = config;

  // Calculate fill percentage based on target vs max (or just show as full if no max)
  const fillPercent = maxKcal
    ? Math.min((targetKcal / maxKcal) * 100, 100)
    : 75; // Default to 75% if no max context

  const colors = getFillColor(fillPercent);

  // Battery dimensions
  const batteryWidth = width;
  const batteryHeight = height;
  const terminalWidth = width * 0.4;
  const terminalHeight = height * 0.08;
  const strokeWidth = 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={batteryWidth}
        height={batteryHeight + terminalHeight + 2}
        viewBox={`0 0 ${batteryWidth} ${batteryHeight + terminalHeight + 2}`}
        className="overflow-visible"
      >
        <defs>
          {/* Gradient for liquid fill */}
          <linearGradient id="batteryFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>

          {/* Clip path for rounded battery body */}
          <clipPath id="batteryClip">
            <rect
              x={strokeWidth}
              y={terminalHeight + 2}
              width={batteryWidth - strokeWidth * 2}
              height={batteryHeight - strokeWidth * 2}
              rx={3}
            />
          </clipPath>
        </defs>

        {/* Battery terminal (top nub) */}
        <rect
          x={(batteryWidth - terminalWidth) / 2}
          y={0}
          width={terminalWidth}
          height={terminalHeight}
          rx={2}
          fill="currentColor"
          className="text-slate-600"
        />

        {/* Battery outline */}
        <rect
          x={strokeWidth / 2}
          y={terminalHeight + 2}
          width={batteryWidth - strokeWidth}
          height={batteryHeight - strokeWidth}
          rx={4}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-700"
        />

        {/* Liquid fill with animation */}
        <g clipPath="url(#batteryClip)">
          <motion.rect
            x={strokeWidth}
            y={terminalHeight + 2 + (batteryHeight - strokeWidth * 2)}
            width={batteryWidth - strokeWidth * 2}
            height={0}
            fill="url(#batteryFill)"
            variants={liquidFill}
            initial="empty"
            animate="filled"
            custom={fillPercent}
            style={{ transformOrigin: 'bottom' }}
          />

          {/* Wave effect overlay */}
          <motion.path
            d={`M ${strokeWidth} ${terminalHeight + 2 + batteryHeight * (1 - fillPercent / 100)}
                Q ${batteryWidth * 0.25} ${terminalHeight + 2 + batteryHeight * (1 - fillPercent / 100) - 2}
                  ${batteryWidth * 0.5} ${terminalHeight + 2 + batteryHeight * (1 - fillPercent / 100)}
                Q ${batteryWidth * 0.75} ${terminalHeight + 2 + batteryHeight * (1 - fillPercent / 100) + 2}
                  ${batteryWidth - strokeWidth} ${terminalHeight + 2 + batteryHeight * (1 - fillPercent / 100)}
                L ${batteryWidth - strokeWidth} ${batteryHeight + terminalHeight + 2}
                L ${strokeWidth} ${batteryHeight + terminalHeight + 2} Z`}
            fill="rgba(255, 255, 255, 0.1)"
            className="animate-liquid-wave"
          />
        </g>

        {/* Fill percentage text inside battery (optional) */}
        {fillPercent > 30 && (
          <text
            x={batteryWidth / 2}
            y={terminalHeight + 2 + batteryHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={fontSize}
            fontWeight="bold"
            className="select-none"
          >
            {Math.round(fillPercent)}%
          </text>
        )}
      </svg>

      {/* Calorie label below */}
      <div className="text-xs font-mono tabular-nums text-slate-300">
        {targetKcal.toLocaleString()} kcal
      </div>
    </div>
  );
}
