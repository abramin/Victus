import { motion } from 'framer-motion';
import { Check, Minus, Plus, X } from 'lucide-react';
import type { FoodReference } from '../../api/types';

interface FineTuneOverlayProps {
  grams: number;
  food: FoodReference;
  onAdjust: (delta: number) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function FineTuneOverlay({
  grams,
  food,
  onAdjust,
  onConfirm,
  onDismiss,
}: FineTuneOverlayProps) {
  const displayName =
    food.foodItem.length > 12 ? food.foodItem.substring(0, 12) + '\u2026' : food.foodItem;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute -top-20 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl min-w-[140px]">
        {/* Food name */}
        <div className="text-[10px] text-slate-500 text-center mb-1 truncate">
          {displayName}
        </div>

        {/* Gram display and adjusters */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onAdjust(-5)}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>

          <motion.span
            key={grams}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-xl font-bold text-white min-w-[60px] text-center"
          >
            {grams}g
          </motion.span>

          <button
            onClick={() => onAdjust(5)}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-2 mt-2">
          <button
            onClick={onDismiss}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onConfirm}
            className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Arrow pointer */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-slate-900 border-r border-b border-slate-700" />
      </div>
    </motion.div>
  );
}
