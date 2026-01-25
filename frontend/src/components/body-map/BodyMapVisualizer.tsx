import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MuscleFatigue, MuscleGroup } from '../../api/types';

interface BodyMapVisualizerProps {
  muscles: MuscleFatigue[];
  size?: 'sm' | 'md' | 'lg';
  onMuscleClick?: (muscle: MuscleGroup) => void;
  highlightMuscles?: MuscleGroup[];
}

const SIZE_CONFIG = {
  sm: { width: 200, height: 400 },
  md: { width: 280, height: 560 },
  lg: { width: 360, height: 720 },
};

// --- ANATOMICAL CONSTANTS (Organic Curves) ---

// 1. The Silhouette (Base Body)
// Smoother head, neck slope, and natural leg sweep
const SILHOUETTE_FRONT = `
  M50,8
  C42,8 38,14 38,22 C38,26 40,28 42,30
  C32,32 24,36 18,44
  C12,54 10,75 12,85
  L14,95 C14,105 16,110 20,115
  L22,110 C24,95 24,85 24,75
  C26,75 28,85 30,100
  C32,120 28,150 28,170
  C28,190 28,215 30,235 L32,252 L44,252
  L42,215 C40,180 44,150 46,125
  L48,110 L50,110 L52,110 L54,125
  C56,150 60,180 58,215 L56,252 L68,252 L70,235
  C72,215 72,190 72,170
  C72,150 68,120 70,100
  C72,85 74,75 76,75
  C76,85 76,95 78,110 L80,115
  C84,110 86,105 86,95 L88,85
  C90,75 88,54 82,44
  C76,36 68,32 58,30
  C60,28 62,26 62,22 C62,14 58,8 50,8 Z
`;

const SILHOUETTE_BACK = `
  M50,8
  C42,8 38,14 38,22 C38,26 40,28 42,30
  C32,32 24,36 18,44
  C12,54 10,75 12,85
  L14,95 C14,105 16,110 20,115
  L22,110 C24,95 24,85 24,75
  C26,75 28,85 30,100
  C32,120 28,150 28,170
  C28,190 28,215 30,235 L32,252 L44,252
  L42,215 C40,180 44,150 46,125
  L48,110 L50,110 L52,110 L54,125
  C56,150 60,180 58,215 L56,252 L68,252 L70,235
  C72,215 72,190 72,170
  C72,150 68,120 70,100
  C72,85 74,75 76,75
  C76,85 76,95 78,110 L80,115
  C84,110 86,105 86,95 L88,85
  C90,75 88,54 82,44
  C76,36 68,32 58,30
  C60,28 62,26 62,22 C62,14 58,8 50,8 Z
`;

// 2. The Muscles (Organic shapes with curves)
const MUSCLE_PATHS: Record<MuscleGroup, { d: string; view: 'front' | 'back' }> = {
  // --- FRONT ---
  chest: {
    // Rounded pectoral plates
    d: `M50,44 C50,44 42,42 34,46 C28,50 28,60 32,68 C36,72 44,72 50,70 Z
        M50,44 C50,44 58,42 66,46 C72,50 72,60 68,68 C64,72 56,72 50,70 Z`,
    view: 'front',
  },
  front_delt: {
    // Rounded shoulder cap, hugging the chest
    d: `M32,44 C26,44 20,48 16,56 C18,60 22,60 26,58 C28,54 30,50 32,44 Z
        M68,44 C74,44 80,48 84,56 C82,60 78,60 74,58 C72,54 70,50 68,44 Z`,
    view: 'front',
  },
  side_delt: {
    // Outer curve of shoulder
    d: `M16,56 C14,60 14,68 18,72 C20,68 22,64 24,60 C22,58 20,56 16,56 Z
        M84,56 C86,60 86,68 82,72 C80,68 78,64 76,60 C78,58 80,56 84,56 Z`,
    view: 'front',
  },
  biceps: {
    // Spindle shape
    d: `M20,74 C18,78 18,88 22,94 C26,88 26,78 24,74 C22,72 20,72 20,74 Z
        M80,74 C82,78 82,88 78,94 C74,88 74,78 76,74 C78,72 80,72 80,74 Z`,
    view: 'front',
  },
  forearms: {
    // Tapered shape
    d: `M22,96 C18,100 18,110 20,118 C22,118 24,110 26,100 C25,98 22,96 22,96 Z
        M78,96 C82,100 82,110 80,118 C78,118 76,110 74,100 C75,98 78,96 78,96 Z`,
    view: 'front',
  },
  core: {
    // Tapered torso with slight curve for ribs
    d: `M34,70 C34,85 36,95 38,105 C40,110 44,112 50,112 C56,112 60,110 62,105 C64,95 66,85 66,70 C60,74 56,75 50,75 C44,75 40,74 34,70 Z`,
    view: 'front',
  },
  quads: {
    // Natural "tear drop" sweep
    d: `M36,115 C30,120 26,145 28,165 C30,175 36,182 42,182 C46,182 48,160 48,140 C48,130 46,120 44,115 L36,115 Z
        M64,115 C70,120 74,145 72,165 C70,175 64,182 58,182 C54,182 52,160 52,140 C52,130 54,120 56,115 L64,115 Z`,
    view: 'front',
  },

  // --- BACK ---
  traps: {
    // Diamond shape neck to back
    d: `M50,26 C44,28 40,32 38,40 C42,48 46,52 50,56 C54,52 58,48 62,40 C60,32 56,28 50,26 Z`,
    view: 'back',
  },
  rear_delt: {
    // Back of shoulder
    d: `M24,42 C20,44 18,50 20,58 C24,60 28,58 32,54 C30,50 28,46 24,42 Z
        M76,42 C80,44 82,50 80,58 C76,60 72,58 68,54 C70,50 72,46 76,42 Z`,
    view: 'back',
  },
  lats: {
    // The "V" Shape wings
    d: `M34,58 C30,65 26,80 32,94 C38,98 42,92 46,85 C46,75 44,65 34,58 Z
        M66,58 C70,65 74,80 68,94 C62,98 58,92 54,85 C54,75 56,65 66,58 Z`,
    view: 'back',
  },
  lower_back: {
    // Erectors
    d: `M44,88 C44,95 44,105 46,112 L50,112 L50,60 C48,70 46,80 44,88 Z
        M56,88 C56,95 56,105 54,112 L50,112 L50,60 C52,70 54,80 56,88 Z`,
    view: 'back',
  },
  triceps: {
    // Horseshoe shape
    d: `M18,60 C16,68 16,78 18,86 C22,86 24,78 24,70 C24,65 22,60 18,60 Z
        M82,60 C84,68 84,78 82,86 C78,86 76,78 76,70 C76,65 78,60 82,60 Z`,
    view: 'back',
  },
  glutes: {
    // Rounded hips
    d: `M46,114 C38,114 34,124 36,138 C38,145 46,145 50,140 L50,118 C48,116 48,114 46,114 Z
        M54,114 C62,114 66,124 64,138 C62,145 54,145 50,140 L50,118 C52,116 52,114 54,114 Z`,
    view: 'back',
  },
  hamstrings: {
    // Back of thigh
    d: `M36,148 C32,155 32,170 34,184 C38,188 44,188 46,184 C48,170 46,155 44,148 L36,148 Z
        M64,148 C68,155 68,170 66,184 C62,188 56,188 54,184 C52,170 54,155 56,148 L64,148 Z`,
    view: 'back',
  },
  calves: {
    // Diamond gastrocnemius
    d: `M34,192 C30,198 30,215 32,230 C36,235 40,235 42,230 C44,215 42,198 40,192 Z
        M66,192 C70,198 70,215 68,230 C64,235 60,235 58,230 C56,215 58,198 60,192 Z`,
    view: 'back',
  },
};

// --- COLOR THEME ---
const THEME = {
  background: '#09090b',    // The dark background of your app
  bodyBase: '#e2e8f0',      // Light grey/White for the skin
  muscleBase: '#cbd5e1',    // Slightly darker grey for untargeted muscles
  outline: '#09090b',       // STROKE matches BG to create "Gaps"
  highlightStroke: '#ffffff',
};

export function BodyMapVisualizer({
  muscles,
  size = 'md',
  onMuscleClick,
  highlightMuscles = [],
}: BodyMapVisualizerProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = SIZE_CONFIG[size];

  const muscleMap = new Map(muscles.map((m) => [m.muscle, m]));

  const getMuscleColor = (muscle: MuscleGroup): string => {
    const data = muscleMap.get(muscle);
    if (data && data.fatiguePercent > 0) {
      return data.color;
    }
    return THEME.muscleBase;
  };

  const isHighlighted = (muscle: MuscleGroup): boolean => {
    return highlightMuscles.includes(muscle) || hoveredMuscle === muscle;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const renderMuscle = (muscle: MuscleGroup, path: string, index: number) => {
    const highlighted = isHighlighted(muscle);
    const color = getMuscleColor(muscle);

    return (
      <motion.path
        key={muscle}
        d={path}
        fill={color}
        fillOpacity={1}

        // This creates the "gap" effect by stroking with background color
        stroke={highlighted ? THEME.highlightStroke : THEME.outline}
        strokeWidth={highlighted ? 2 : 1.5}
        strokeLinejoin="round"
        strokeLinecap="round"

        className="cursor-pointer"
        style={{ transformOrigin: 'center' }}
        onMouseEnter={() => setHoveredMuscle(muscle)}
        onMouseLeave={() => setHoveredMuscle(null)}
        onClick={() => onMuscleClick?.(muscle)}

        initial={{ scale: 0.98 }}
        animate={{
          scale: highlighted ? 1.05 : 1,
          fill: color,
        }}
        transition={{
          scale: { duration: 0.2 },
          fill: { duration: 0.3 }
        }}
      />
    );
  };

  const renderBodySvg = (view: 'front' | 'back') => {
    const silhouette = view === 'front' ? SILHOUETTE_FRONT : SILHOUETTE_BACK;
    const musclePaths = Object.entries(MUSCLE_PATHS)
      .filter(([, config]) => config.view === view)
      .map(([muscle, config], index) => ({ muscle: muscle as MuscleGroup, ...config, index }));

    return (
      <svg
        width={width / 2}
        height={height}
        viewBox="0 0 100 260"
        className="overflow-visible"
        style={view === 'back' ? { transform: 'scaleX(-1)' } : undefined}
      >
        {/* Layer 1: The Base Mannequin */}
        <path
          d={silhouette}
          fill={THEME.bodyBase}
          stroke={THEME.outline}
          strokeWidth={0.5}
        />

        {/* Layer 2: The Muscle Plates */}
        <g>
          {musclePaths.map(({ muscle, d, index }) => renderMuscle(muscle, d, index))}
        </g>
      </svg>
    );
  };

  // Get tooltip data
  const tooltipData = hoveredMuscle ? muscleMap.get(hoveredMuscle) : null;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center"
      onMouseMove={handleMouseMove}
    >
      <div className="flex gap-4">
        {/* Front View */}
        <div className="relative">
          {renderBodySvg('front')}
        </div>

        {/* Back View */}
        <div className="relative">
          {renderBodySvg('back')}
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute pointer-events-none z-20"
            style={{
              left: Math.min(mousePos.x + 15, width - 140),
              top: Math.max(mousePos.y - 80, 10),
            }}
          >
            <div className="px-3 py-2 bg-zinc-900 text-white rounded shadow-xl border border-zinc-700 text-sm">
              <div className="font-bold mb-1">{tooltipData.displayName}</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: tooltipData.color }}
                />
                <span className="text-zinc-300">
                  {tooltipData.fatiguePercent}% Fatigue
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#ef4444]" />
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Primary</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#eab308]" />
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Secondary</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#e2e8f0] border border-gray-700" />
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Untargeted</span>
        </div>
      </div>
    </div>
  );
}