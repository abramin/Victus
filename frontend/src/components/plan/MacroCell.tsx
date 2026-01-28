import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { cellHeatmapGlow } from '../../lib/animations';
import { getHeatmapColor } from '../../utils';
import { TRAINING_ICONS } from '../../constants';
import type { TrainingType } from '../../api/types';

interface MacroCellProps {
  date: Date;
  isToday: boolean;
  heatmapIntensity: number;
  hasData: boolean;
  primaryTrainingType?: TrainingType;
}

/**
 * Minimal calendar cell for Macro view (default zoom level).
 * Shows day number with modality icon watermark and radial gradient heatmap.
 * Color gradient: Blue (recovery) → Deep Red (max load)
 */
export function MacroCell({ date, isToday, heatmapIntensity, hasData, primaryTrainingType }: MacroCellProps) {
  const dayNumber = date.getDate();
  const heatmapColor = hasData ? getHeatmapColor(heatmapIntensity) : '#1F2937'; // gray-800 fallback

  // Memoize gradient calculation to prevent unnecessary recalculations
  const gradientStyle = useMemo(() => {
    if (!hasData) return 'transparent';

    const rgb = {
      r: parseInt(heatmapColor.slice(1, 3), 16),
      g: parseInt(heatmapColor.slice(3, 5), 16),
      b: parseInt(heatmapColor.slice(5, 7), 16),
    };

    return `radial-gradient(circle at center, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 50%, rgba(0, 0, 0, 0) 100%)`;
  }, [heatmapColor, hasData]);

  // Get modality icon if training type exists
  const modalityIcon = primaryTrainingType ? TRAINING_ICONS[primaryTrainingType] : null;

  return (
    <motion.div
      variants={cellHeatmapGlow}
      initial="initial"
      animate="animate"
      className="w-full h-full flex items-center justify-center relative"
      style={{
        background: gradientStyle,
      }}
    >
      {/* Modality Icon Watermark */}
      {modalityIcon && (
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30 pointer-events-none">
          {modalityIcon}
        </div>
      )}

      {/* Day Number (bring to front) */}
      <div className="flex flex-col items-center gap-1 relative z-10">
        <span
          className={`text-2xl font-semibold ${
            isToday ? 'text-white' : hasData ? 'text-gray-200' : 'text-gray-600'
          }`}
        >
          {dayNumber}
        </span>
        {isToday && (
          <span className="text-[10px] text-blue-400 font-medium tracking-wide">TODAY</span>
        )}
      </div>
    </motion.div>
  );
}
