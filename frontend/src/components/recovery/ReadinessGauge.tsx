import { motion } from 'framer-motion';
import type { RecoveryScoreBreakdown } from '../../api/types';

interface ReadinessGaugeProps {
  score: number;
  components?: RecoveryScoreBreakdown;
  size?: 'sm' | 'md' | 'lg';
  showNudge?: boolean;
  nudgeMessage?: string;
}

const SIZE_CONFIG = {
  sm: { width: 120, height: 70, strokeWidth: 8, fontSize: 24 },
  md: { width: 180, height: 100, strokeWidth: 12, fontSize: 32 },
  lg: { width: 240, height: 130, strokeWidth: 16, fontSize: 40 },
};

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green-500
  if (score >= 40) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Low';
  return 'Poor';
}

function getStatusLabel(score: number): string {
  if (score >= 70) return 'Ready to Train';
  if (score >= 50) return 'Light Activity OK';
  if (score >= 30) return 'Recovery Needed';
  return 'Rest Recommended';
}

/**
 * Semi-circle radial gauge showing recovery readiness score (0-100).
 * Gradient: Red (0-40) -> Yellow (40-70) -> Green (70-100)
 */
export function ReadinessGauge({
  score,
  size = 'md',
  showNudge = false,
  nudgeMessage,
}: ReadinessGaugeProps) {
  const config = SIZE_CONFIG[size];
  const { width, height, strokeWidth, fontSize } = config;

  // Calculate arc dimensions
  const centerX = width / 2;
  const centerY = height - 10;
  const radius = Math.min(centerX, centerY) - strokeWidth / 2 - 5;

  // Arc path for the background (full semi-circle)
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)

  // Calculate the arc path
  const startX = centerX + radius * Math.cos(startAngle);
  const startY = centerY + radius * Math.sin(startAngle);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY + radius * Math.sin(endAngle);

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  // Calculate the filled arc based on score (0-100 maps to 0-180 degrees)
  const scoreAngle = Math.PI * (1 - score / 100);
  const scoreX = centerX + radius * Math.cos(scoreAngle);
  const scoreY = centerY + radius * Math.sin(scoreAngle);

  // Determine if we need the large arc flag (> 90 degrees = > 50 score)
  const largeArcFlag = score > 50 ? 1 : 0;

  const scoreArcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${scoreX} ${scoreY}`;

  // Circumference of the semi-circle
  const circumference = Math.PI * radius;
  const scoreDashLength = circumference * (score / 100);

  const scoreColor = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Background arc (grey) */}
        <path
          d={arcPath}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored arc based on score */}
        <motion.path
          d={arcPath}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - scoreDashLength }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Score indicator dot */}
        <motion.circle
          cx={scoreX}
          cy={scoreY}
          r={strokeWidth / 2 + 2}
          fill={scoreColor}
          stroke="white"
          strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        />

        {/* Center text - Score */}
        <text
          x={centerX}
          y={centerY - fontSize / 2}
          textAnchor="middle"
          fill={scoreColor}
          fontSize={fontSize}
          fontWeight="bold"
          className="select-none"
        >
          {Math.round(score)}
        </text>

        {/* Center text - Label */}
        <text
          x={centerX}
          y={centerY + 2}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={fontSize * 0.35}
          className="select-none"
        >
          {getScoreLabel(score)}
        </text>
      </svg>

      {/* Status label below gauge */}
      <div className="text-center mt-1">
        <span className="text-sm text-slate-400">{getStatusLabel(score)}</span>
      </div>

      {/* Nudge warning */}
      {showNudge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-3 py-2 rounded-lg bg-orange-900/30 border border-orange-700/50"
        >
          <div className="flex items-center gap-2 text-sm text-orange-300">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{nudgeMessage || 'Recovery is low. Consider reducing intensity.'}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
