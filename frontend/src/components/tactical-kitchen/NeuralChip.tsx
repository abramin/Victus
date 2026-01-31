import { motion } from 'framer-motion';
import type { FoodReference, FoodCategory } from '../../api/types';
import { useNeuralAccelerator, getRateColor } from './useNeuralAccelerator';

export type MacroType = 'protein' | 'carbs' | 'fat';

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  high_protein: '\u{1F969}',
  high_carb: '\u{1F35A}',
  high_fat: '\u{1F951}',
  vegetable: '\u{1F966}',
  fruit: '\u{1F34E}',
};

const CATEGORY_COLORS: Record<FoodCategory, string> = {
  high_protein: 'border-purple-500/40',
  high_carb: 'border-orange-500/40',
  high_fat: 'border-gray-500/40',
  vegetable: 'border-green-500/40',
  fruit: 'border-pink-500/40',
};

function getDominantMacro(category: FoodCategory): MacroType {
  switch (category) {
    case 'high_protein':
      return 'protein';
    case 'high_carb':
    case 'fruit':
      return 'carbs';
    case 'high_fat':
      return 'fat';
    case 'vegetable':
      return 'carbs';
  }
}

interface NeuralChipProps {
  food: FoodReference;
  onAdd: (grams: number) => void;
  onPulseRing: (macroType: MacroType) => void;
}

export function NeuralChip({ food, onAdd, onPulseRing }: NeuralChipProps) {
  const { state, start, stop, cancel } = useNeuralAccelerator();

  const displayName = food.foodItem.length > 8 ? food.foodItem.substring(0, 8) + '\u2026' : food.foodItem;
  const glowColor = getRateColor(state.elapsedMs);

  const handlePointerDown = () => {
    start();
  };

  const handlePointerUp = () => {
    if (state.isActive) {
      const grams = stop();
      onAdd(grams);
      onPulseRing(getDominantMacro(food.category));
    }
  };

  const handlePointerLeave = () => {
    if (state.isActive) {
      cancel();
    }
  };

  return (
    <motion.button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      animate={{ scale: state.isActive ? 0.95 : 1 }}
      transition={{ duration: 0.1 }}
      className={`
        relative flex flex-col items-center justify-center
        w-16 h-16 rounded-xl
        bg-slate-800/80 border-2 ${CATEGORY_COLORS[food.category]}
        select-none touch-none
        active:bg-slate-700/80
        transition-colors
      `}
      style={{ WebkitTouchCallout: 'none' }}
    >
      {/* Glow overlay when active */}
      {state.isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl flex items-center justify-center bg-slate-900/90"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            boxShadow: `0 0 20px ${glowColor}, inset 0 0 10px ${glowColor}40`,
          }}
          transition={{ duration: 0.1 }}
        >
          <motion.span
            key={state.currentGrams}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-lg font-bold text-white"
            style={{ textShadow: `0 0 8px ${glowColor}` }}
          >
            +{state.currentGrams}g
          </motion.span>
        </motion.div>
      )}

      {/* Default state */}
      {!state.isActive && (
        <>
          <span className="text-xl">{CATEGORY_EMOJI[food.category]}</span>
          <span className="text-[10px] text-white font-medium truncate w-full px-1 text-center mt-0.5">
            {displayName}
          </span>
        </>
      )}
    </motion.button>
  );
}
