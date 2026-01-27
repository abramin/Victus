import { motion } from 'framer-motion';
import type { RegionRecovery } from './useRecoveryContext';

interface RecoveryIndicatorProps {
  regionRecovery: RegionRecovery[];
  overallScore: number;
}

/**
 * Compact recovery status indicator showing Upper/Core/Lower fatigue levels.
 * Displays as mini progress bars with color-coded status.
 */
export function RecoveryIndicator({
  regionRecovery,
  overallScore,
}: RecoveryIndicatorProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Overall score */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: `conic-gradient(${getScoreColor(overallScore)} ${overallScore}%, #374151 ${overallScore}%)`,
          }}
        >
          <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-white">{overallScore}</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          Recovery
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Region bars */}
      <div className="flex items-center gap-3">
        {regionRecovery.map((region) => (
          <motion.div
            key={region.region}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {region.label}
            </span>
            <div className="relative w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: region.color }}
                initial={{ width: 0 }}
                animate={{ width: `${100 - region.avgFatigue}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Get color for overall recovery score.
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#3b82f6'; // blue-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}
