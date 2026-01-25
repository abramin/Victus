import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MuscleFatigue, MuscleGroup } from '../../api/types';

interface BodyMapVisualizerProps {
  muscles: MuscleFatigue[];
  size?: 'sm' | 'md' | 'lg';
  onMuscleClick?: (muscle: MuscleGroup) => void;
  highlightMuscles?: MuscleGroup[];
}

const SIZE_CONFIG = {
  sm: { width: 200, height: 280 },
  md: { width: 280, height: 400 },
  lg: { width: 360, height: 520 },
};

// SVG path definitions for front and back body views
// Simplified anatomical shapes for each muscle group
const MUSCLE_PATHS: Record<MuscleGroup, { d: string; view: 'front' | 'back' }> = {
  // Front view muscles
  chest: {
    d: 'M30,45 Q40,40 50,45 L55,65 Q50,70 30,70 Q25,70 25,65 Z M50,45 Q60,40 70,45 L75,65 Q70,70 50,70 Q45,70 45,65 Z',
    view: 'front',
  },
  front_delt: {
    d: 'M20,40 Q15,45 18,55 L25,50 Q22,42 20,40 Z M80,40 Q85,45 82,55 L75,50 Q78,42 80,40 Z',
    view: 'front',
  },
  biceps: {
    d: 'M15,55 Q10,65 12,80 L18,80 Q22,65 20,55 Z M85,55 Q90,65 88,80 L82,80 Q78,65 80,55 Z',
    view: 'front',
  },
  triceps: {
    d: 'M12,58 Q8,68 10,82 L15,82 Q18,68 15,58 Z M88,58 Q92,68 90,82 L85,82 Q82,68 85,58 Z',
    view: 'back',
  },
  forearms: {
    d: 'M8,82 Q5,95 8,110 L14,110 Q17,95 14,82 Z M92,82 Q95,95 92,110 L86,110 Q83,95 86,82 Z',
    view: 'front',
  },
  core: {
    d: 'M35,72 L65,72 L65,120 Q50,125 35,120 Z',
    view: 'front',
  },
  quads: {
    d: 'M30,125 Q25,150 28,180 L42,180 Q48,150 45,125 Z M55,125 Q52,150 58,180 L72,180 Q75,150 70,125 Z',
    view: 'front',
  },
  // Back view muscles
  traps: {
    d: 'M35,30 Q50,25 65,30 L60,50 Q50,45 40,50 Z',
    view: 'back',
  },
  lats: {
    d: 'M25,50 Q20,70 25,90 L35,85 Q30,70 35,55 Z M75,50 Q80,70 75,90 L65,85 Q70,70 65,55 Z',
    view: 'back',
  },
  rear_delt: {
    d: 'M20,42 Q15,48 18,56 L24,52 Q22,46 20,42 Z M80,42 Q85,48 82,56 L76,52 Q78,46 80,42 Z',
    view: 'back',
  },
  side_delt: {
    d: 'M18,44 Q14,50 16,58 L22,54 Q20,48 18,44 Z M82,44 Q86,50 84,58 L78,54 Q80,48 82,44 Z',
    view: 'front',
  },
  lower_back: {
    d: 'M38,90 L62,90 L60,115 Q50,120 40,115 Z',
    view: 'back',
  },
  glutes: {
    d: 'M30,115 Q25,135 35,145 L50,140 Q50,130 45,120 Z M70,115 Q75,135 65,145 L50,140 Q50,130 55,120 Z',
    view: 'back',
  },
  hamstrings: {
    d: 'M32,148 Q28,170 30,195 L44,195 Q48,170 44,148 Z M56,148 Q52,170 56,195 L70,195 Q72,170 68,148 Z',
    view: 'back',
  },
  calves: {
    d: 'M32,200 Q28,220 32,245 L42,245 Q46,220 42,200 Z M58,200 Q54,220 58,245 L68,245 Q72,220 68,200 Z',
    view: 'back',
  },
};

// Body outline paths
const BODY_OUTLINE_FRONT = `
  M50,10
  Q30,10 25,25 L20,40 Q15,45 10,60 L8,85 Q5,100 10,115 L15,85 Q18,70 20,60
  Q22,50 25,45 L30,70 L35,125 L28,180 Q25,200 28,220 L30,250 L45,250 L42,200 L48,125
  L50,70 L52,125 L58,200 L55,250 L70,250 L72,220 Q75,200 72,180 L65,125 L70,70 L75,45
  Q78,50 80,60 Q82,70 85,85 L90,115 Q95,100 92,85 L90,60 Q85,45 80,40 L75,25 Q70,10 50,10
`;

const BODY_OUTLINE_BACK = `
  M50,10
  Q30,10 25,25 L20,40 Q15,45 10,60 L8,85 Q5,100 10,115 L15,85 Q18,70 20,60
  Q22,50 25,45 L30,55 L25,90 L30,115 L28,145 L30,200 Q28,220 30,245 L32,250 L45,250 L42,200 L40,145 L42,115 L38,90 L42,55
  L50,50 L58,55 L62,90 L58,115 L60,145 L58,200 L55,250 L68,250 L70,245 Q72,220 70,200 L72,145 L70,115 L75,90 L70,55 L75,45
  Q78,50 80,60 Q82,70 85,85 L90,115 Q95,100 92,85 L90,60 Q85,45 80,40 L75,25 Q70,10 50,10
`;

export function BodyMapVisualizer({
  muscles,
  size = 'md',
  onMuscleClick,
  highlightMuscles = [],
}: BodyMapVisualizerProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const { width, height } = SIZE_CONFIG[size];

  // Build a map for quick lookup
  const muscleMap = new Map(muscles.map((m) => [m.muscle, m]));

  const getMuscleColor = (muscle: MuscleGroup): string => {
    const data = muscleMap.get(muscle);
    return data?.color ?? '#374151'; // gray-700 default
  };

  const getMuscleOpacity = (muscle: MuscleGroup): number => {
    const data = muscleMap.get(muscle);
    if (!data) return 0.3;
    // Higher fatigue = higher opacity
    return 0.4 + (data.fatiguePercent / 100) * 0.6;
  };

  const isHighlighted = (muscle: MuscleGroup): boolean => {
    return highlightMuscles.includes(muscle) || hoveredMuscle === muscle;
  };

  const renderMuscle = (muscle: MuscleGroup, path: string) => {
    const data = muscleMap.get(muscle);
    const highlighted = isHighlighted(muscle);

    return (
      <motion.path
        key={muscle}
        d={path}
        fill={getMuscleColor(muscle)}
        fillOpacity={getMuscleOpacity(muscle)}
        stroke={highlighted ? '#fff' : getMuscleColor(muscle)}
        strokeWidth={highlighted ? 2 : 1}
        strokeOpacity={0.8}
        className="cursor-pointer transition-all"
        onMouseEnter={() => setHoveredMuscle(muscle)}
        onMouseLeave={() => setHoveredMuscle(null)}
        onClick={() => onMuscleClick?.(muscle)}
        initial={{ scale: 1 }}
        animate={{
          scale: highlighted ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
      />
    );
  };

  // Get tooltip data
  const tooltipData = hoveredMuscle ? muscleMap.get(hoveredMuscle) : null;

  return (
    <div className="relative flex flex-col items-center">
      {/* Dual view: Front and Back */}
      <div className="flex gap-4">
        {/* Front View */}
        <div className="relative">
          <svg
            width={width / 2}
            height={height}
            viewBox="0 0 100 260"
            className="overflow-visible"
          >
            {/* Body outline */}
            <path
              d={BODY_OUTLINE_FRONT}
              fill="none"
              stroke="#475569"
              strokeWidth={1.5}
              opacity={0.5}
            />

            {/* Muscle groups - Front */}
            {Object.entries(MUSCLE_PATHS)
              .filter(([, config]) => config.view === 'front')
              .map(([muscle, config]) => renderMuscle(muscle as MuscleGroup, config.d))}
          </svg>
          <div className="text-center text-xs text-gray-500 mt-1">Front</div>
        </div>

        {/* Back View */}
        <div className="relative">
          <svg
            width={width / 2}
            height={height}
            viewBox="0 0 100 260"
            className="overflow-visible"
            style={{ transform: 'scaleX(-1)' }}
          >
            {/* Body outline */}
            <path
              d={BODY_OUTLINE_BACK}
              fill="none"
              stroke="#475569"
              strokeWidth={1.5}
              opacity={0.5}
            />

            {/* Muscle groups - Back */}
            {Object.entries(MUSCLE_PATHS)
              .filter(([, config]) => config.view === 'back')
              .map(([muscle, config]) => renderMuscle(muscle as MuscleGroup, config.d))}
          </svg>
          <div className="text-center text-xs text-gray-500 mt-1">Back</div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 shadow-xl z-10"
        >
          <div className="text-sm font-medium text-white">{tooltipData.displayName}</div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tooltipData.color }}
            />
            <span className="text-sm text-gray-300">
              {tooltipData.fatiguePercent.toFixed(0)}% - {tooltipData.status}
            </span>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-400">Fresh</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-gray-400">Stimulated</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-400">Fatigued</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-400">Overreached</span>
        </div>
      </div>
    </div>
  );
}
