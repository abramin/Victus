import { motion } from 'framer-motion';
import { cellHeatmapGlow } from '../../lib/animations';
import { getHeatmapColor } from '../../utils';

interface MacroCellProps {
  date: Date;
  isToday: boolean;
  heatmapIntensity: number;
  hasData: boolean;
}

/**
 * Minimal calendar cell for Macro view (default zoom level).
 * Shows only day number with heatmap glow background.
 * Color gradient: Blue (recovery) → Deep Red (max load)
 */
export function MacroCell({ date, isToday, heatmapIntensity, hasData }: MacroCellProps) {
  const dayNumber = date.getDate();
  const heatmapColor = hasData ? getHeatmapColor(heatmapIntensity) : '#1F2937'; // gray-800 fallback

  return (
    <motion.div
      variants={cellHeatmapGlow}
      initial="initial"
      animate="animate"
      className="w-full h-full flex items-center justify-center"
      style={{
        backgroundColor: `${heatmapColor}1A`, // 10% opacity
        boxShadow: hasData
          ? `0 0 20px ${heatmapColor}40, inset 0 0 30px ${heatmapColor}20`
          : 'none',
      }}
    >
      <div className="flex flex-col items-center gap-1">
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
