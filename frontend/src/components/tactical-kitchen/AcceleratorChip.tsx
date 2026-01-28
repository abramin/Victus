import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FoodReference, FoodCategory } from '../../api/types';
import { useAccelerator } from './useAccelerator';
import { FineTuneOverlay } from './FineTuneOverlay';

export type MacroType = 'protein' | 'carbs' | 'fat';

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  high_protein: '\u{1F969}',
  high_carb: '\u{1F35A}',
  high_fat: '\u{1F951}',
  veg: '\u{1F966}',
  fruit: '\u{1F34E}',
};

const CATEGORY_COLORS: Record<FoodCategory, string> = {
  high_protein: 'border-purple-500/40',
  high_carb: 'border-orange-500/40',
  high_fat: 'border-gray-500/40',
  veg: 'border-green-500/40',
  fruit: 'border-pink-500/40',
};

const PHASE_COLORS: Record<1 | 2 | 3, string> = {
  1: '#22c55e', // green
  2: '#eab308', // yellow
  3: '#f97316', // orange
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
    case 'veg':
      return 'carbs';
  }
}

interface AcceleratorChipProps {
  food: FoodReference;
  onAdd: (grams: number) => void;
  onPulseRing: (macroType: MacroType) => void;
}

export function AcceleratorChip({ food, onAdd, onPulseRing }: AcceleratorChipProps) {
  const chipRef = useRef<HTMLButtonElement>(null);
  const { state, start, stop, adjustFine, confirm, dismiss } = useAccelerator(food.category);

  const displayName = food.foodItem.length > 10 ? food.foodItem.substring(0, 10) + '\u2026' : food.foodItem;

  // Ring geometry
  const radius = 32;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const maxGrams = 500;
  const progress = Math.min(state.currentGrams / maxGrams, 1);
  const strokeOffset = circumference * (1 - progress);

  const handleConfirm = () => {
    const grams = confirm();
    onAdd(grams);
    onPulseRing(getDominantMacro(food.category));
  };

  const handlePointerDown = () => {
    start();
  };

  const handlePointerUp = () => {
    if (state.isActive) {
      stop();
    }
  };

  const handlePointerLeave = () => {
    if (state.isActive) {
      stop();
    }
  };

  // Auto-dismiss fine-tune after 5s
  useEffect(() => {
    if (state.showFineTune) {
      const timer = setTimeout(dismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.showFineTune, dismiss]);

  return (
    <div className="relative">
      <motion.button
        ref={chipRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        animate={{ scale: state.isActive ? 0.95 : 1 }}
        transition={{ duration: 0.1 }}
        className={`
          relative flex flex-col items-center justify-center
          w-20 h-20 rounded-xl
          bg-slate-800/80 border-2 ${CATEGORY_COLORS[food.category]}
          select-none touch-none
          active:bg-slate-700/80
          transition-colors
        `}
        style={{ WebkitTouchCallout: 'none' }}
      >
        {/* Loading ring */}
        {state.isActive && (
          <svg
            className="absolute inset-0 w-full h-full transform -rotate-90"
            viewBox="0 0 80 80"
          >
            {/* Background ring */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress ring */}
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              stroke={PHASE_COLORS[state.phase as 1 | 2 | 3] || PHASE_COLORS[1]}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>
        )}

        {/* Gram counter when active */}
        {state.isActive ? (
          <motion.span
            key={state.currentGrams}
            initial={{ scale: 1.2, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-bold text-white"
          >
            {state.currentGrams}g
          </motion.span>
        ) : (
          <>
            <span className="text-2xl">{CATEGORY_EMOJI[food.category]}</span>
            <span className="text-[11px] text-white font-medium truncate w-full px-1 text-center mt-1">
              {displayName}
            </span>
          </>
        )}
      </motion.button>

      {/* Fine-tune overlay */}
      <AnimatePresence>
        {state.showFineTune && (
          <FineTuneOverlay
            grams={state.currentGrams}
            food={food}
            onAdjust={adjustFine}
            onConfirm={handleConfirm}
            onDismiss={dismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
