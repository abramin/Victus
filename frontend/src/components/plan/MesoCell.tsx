import { motion } from 'framer-motion';
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

  return (
    <motion.div
      variants={cellExpand}
      initial="collapsed"
      animate="expanded"
      className="w-full h-full flex flex-col p-3 rounded-lg"
      style={{
        backgroundColor: `${heatmapColor}25`, // 15% opacity for expanded state
        boxShadow: `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px ${heatmapColor}60`,
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
