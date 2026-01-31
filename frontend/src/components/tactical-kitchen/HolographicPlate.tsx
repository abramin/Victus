import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { MealState } from './useTacticalKitchenState';

export type MacroType = 'protein' | 'carbs' | 'fat';

interface MacroTarget {
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
}

interface HolographicPlateProps {
  mealState: MealState;
  targets: MacroTarget;
  /** Daily targets for the ring visualization */
  dailyTargets?: MacroTarget;
  /** Total consumed today across all meals */
  consumedToday?: { proteinG: number; carbsG: number; fatG: number; calories: number };
  /** Carbs from fruit/veg to exclude from carb budget */
  fruitVegCarbsG?: number;
  pulsingMacro?: MacroType | null;
  isWarning?: boolean;
}

interface RingConfig {
  radius: number;
  strokeWidth: number;
  color: string;
  overflowColor: string;
  label: string;
}

const RINGS: Record<MacroType, RingConfig> = {
  protein: { radius: 100, strokeWidth: 18, color: '#a855f7', overflowColor: '#ef4444', label: 'P' },
  carbs: { radius: 78, strokeWidth: 16, color: '#f97316', overflowColor: '#ef4444', label: 'C' },
  fat: { radius: 58, strokeWidth: 14, color: '#6b7280', overflowColor: '#ef4444', label: 'F' },
};

interface MacroRingProps {
  macro: MacroType;
  consumed: number;
  target: number;
  config: RingConfig;
  delay: number;
  isPulsing: boolean;
}

function MacroRing({ macro, consumed, target, config, delay, isPulsing }: MacroRingProps) {
  const [animatedTarget, setAnimatedTarget] = useState(0);
  const circumference = 2 * Math.PI * config.radius;
  const fillPercent = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const isOverflow = consumed > target && target > 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedTarget(fillPercent), delay);
    return () => clearTimeout(timer);
  }, [fillPercent, delay]);

  const springValue = useSpring(animatedTarget, { stiffness: 60, damping: 18 });
  const strokeOffset = useTransform(springValue, (v) => circumference - (v / 100) * circumference);

  const ringColor = isOverflow ? config.overflowColor : config.color;

  // Pulse animation when food is added
  const pulseAnimation = isPulsing
    ? {
      scale: [1, 1.08, 1],
      filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
    }
    : isOverflow
      ? {
        opacity: [1, 0.5, 1],
        strokeWidth: [config.strokeWidth + 2, config.strokeWidth + 6, config.strokeWidth + 2],
      }
      : { opacity: 1 };

  const pulseTransition = isPulsing
    ? { duration: 0.4, ease: 'easeInOut' as const }
    : isOverflow
      ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const }
      : undefined;

  return (
    <g style={{ transformOrigin: '120px 120px' }}>
      {/* Background ring */}
      <circle
        cx="120"
        cy="120"
        r={config.radius}
        stroke="#1e293b"
        strokeWidth={config.strokeWidth}
        fill="none"
      />
      {/* Progress ring */}
      <motion.circle
        cx="120"
        cy="120"
        r={config.radius}
        stroke={ringColor}
        strokeWidth={isOverflow ? config.strokeWidth + 2 : config.strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        style={{ strokeDashoffset: strokeOffset }}
        animate={pulseAnimation}
        transition={pulseTransition}
      />
      {/* Glow effect when filling (normal state) */}
      {consumed > 0 && !isOverflow && (
        <motion.circle
          cx="120"
          cy="120"
          r={config.radius}
          stroke={config.color}
          strokeWidth={config.strokeWidth + 4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: strokeOffset }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isPulsing ? 0.6 : 0.3 }}
          transition={{ duration: 0.3 }}
          filter="blur(6px)"
        />
      )}
      {/* Red glow effect when overflowing */}
      {isOverflow && (
        <motion.circle
          cx="120"
          cy="120"
          r={config.radius}
          stroke={config.overflowColor}
          strokeWidth={config.strokeWidth + 8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          animate={{
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          filter="blur(10px)"
        />
      )}
      {/* Pulse glow when adding food */}
      {isPulsing && (
        <motion.circle
          cx="120"
          cy="120"
          r={config.radius}
          stroke={config.color}
          strokeWidth={config.strokeWidth + 12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: strokeOffset }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          filter="blur(12px)"
        />
      )}
    </g>
  );
}

export function HolographicPlate({
  mealState,
  targets,
  dailyTargets,
  consumedToday,
  fruitVegCarbsG,
  pulsingMacro,
  isWarning
}: HolographicPlateProps) {
  // Use daily totals for ring display if provided, otherwise fall back to mealState
  const ringConsumed = consumedToday ?? {
    proteinG: mealState.totalProteinG,
    carbsG: mealState.totalCarbsG,
    fatG: mealState.totalFatG,
    calories: mealState.totalCalories,
  };
  const adjustedRingConsumed = {
    ...ringConsumed,
    carbsG: Math.max(0, ringConsumed.carbsG - (fruitVegCarbsG ?? 0)),
  };
  const ringTargets = dailyTargets ?? targets;

  const remainingCalories = Math.max(0, ringTargets.calories - adjustedRingConsumed.calories);
  const isCaloriesOverflow = adjustedRingConsumed.calories > ringTargets.calories;

  return (
    <div className="flex flex-col items-center">
      {/* Ring Gauge */}
      <div className="relative w-60 h-60">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
          <MacroRing
            macro="protein"
            consumed={adjustedRingConsumed.proteinG}
            target={ringTargets.proteinG}
            config={RINGS.protein}
            delay={100}
            isPulsing={pulsingMacro === 'protein'}
          />
          <MacroRing
            macro="carbs"
            consumed={adjustedRingConsumed.carbsG}
            target={ringTargets.carbsG}
            config={RINGS.carbs}
            delay={150}
            isPulsing={pulsingMacro === 'carbs'}
          />
          <MacroRing
            macro="fat"
            consumed={adjustedRingConsumed.fatG}
            target={ringTargets.fatG}
            config={RINGS.fat}
            delay={200}
            isPulsing={pulsingMacro === 'fat'}
          />
        </svg>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={remainingCalories}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`text-4xl font-bold ${isCaloriesOverflow ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-white'}`}
          >
            {isCaloriesOverflow ? `-${adjustedRingConsumed.calories - ringTargets.calories}` : remainingCalories}
          </motion.span>
          <span className={`text-xs tracking-wider ${isWarning ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
            {isCaloriesOverflow ? 'OVER KCAL' : isWarning ? 'CRASH RISK' : 'REMAINING'}
          </span>
        </div>
      </div>

      {/* Macro Legend */}
      <div className="flex gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-slate-400">
            P: {adjustedRingConsumed.proteinG}/{ringTargets.proteinG}g
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-slate-400">
            C: {adjustedRingConsumed.carbsG}/{ringTargets.carbsG}g
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
          <span className="text-slate-400">
            F: {adjustedRingConsumed.fatG}/{ringTargets.fatG}g
          </span>
        </div>
      </div>
    </div>
  );
}
