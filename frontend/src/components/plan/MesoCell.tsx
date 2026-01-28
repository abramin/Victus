import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { TrainingSession, ActualTrainingSession } from '../../api/types';
import { cellExpand } from '../../lib/animations';
import { TrainingBadge } from './TrainingBadge';
import { getHeatmapColor } from '../../utils';

interface MesoCellProps {
  date: Date;
  isToday: boolean;
  heatmapIntensity: number;
  hasData: boolean;
  plannedSessions?: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
  loadScore?: number;
  avgRpe?: number;
}

/**
 * Expanded calendar cell for Meso view (hover state).
 * Shows day number, training modality icons, and RPE/Load scores.
 * Cell expands with spring animation on hover.
 */
export function MesoCell({
  date,
  isToday,
  heatmapIntensity,
  hasData,
  plannedSessions,
  actualSessions,
  loadScore,
  avgRpe,
}: MesoCellProps) {
  const dayNumber = date.getDate();
  const heatmapColor = hasData ? getHeatmapColor(heatmapIntensity) : '#1F2937';
  const sessions = actualSessions?.length ? actualSessions : plannedSessions;
  const hasTraining = sessions && sessions.length > 0 && sessions.some(s => s.type !== 'rest');

  // Memoize gradient and shadow calculations
  const gradientStyle = useMemo(() => {
    if (!hasData) return 'transparent';

    const rgb = {
      r: parseInt(heatmapColor.slice(1, 3), 16),
      g: parseInt(heatmapColor.slice(3, 5), 16),
      b: parseInt(heatmapColor.slice(5, 7), 16),
    };

    return `radial-gradient(circle at center, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15) 50%, rgba(0, 0, 0, 0) 100%)`;
  }, [heatmapColor, hasData]);

  return (
    <motion.div
      variants={cellExpand}
      initial="collapsed"
      animate="expanded"
      className="w-full h-full flex flex-col p-3 rounded-lg"
      style={{
        background: gradientStyle,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header: Day Number + Today Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xl font-semibold ${
            isToday ? 'text-white' : hasData ? 'text-gray-200' : 'text-gray-600'
          }`}
        >
          {dayNumber}
        </span>
        {isToday && (
          <span className="text-[9px] text-blue-400 font-medium tracking-wide">TODAY</span>
        )}
      </div>

      {/* Training Section */}
      {hasData && (
        <div className="flex-1 flex flex-col gap-2">
          {/* Training Badge */}
          {hasTraining && sessions ? (
            <TrainingBadge sessions={sessions} compact />
          ) : (
            <div className="text-[10px] text-gray-500 px-1.5">Rest day</div>
          )}

          {/* Metrics: RPE + Load Score */}
          {hasTraining && (
            <div className="flex gap-2 text-[11px]">
              {avgRpe !== undefined && avgRpe > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">RPE</span>
                  <span className="text-white font-medium">{avgRpe.toFixed(1)}</span>
                </div>
              )}
              {loadScore !== undefined && loadScore > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Load</span>
                  <span className="text-white font-medium">{Math.round(loadScore)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-gray-600">--</span>
        </div>
      )}
    </motion.div>
  );
}
