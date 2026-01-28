import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { SelectedFood } from './useTacticalKitchenState';
import type { FoodCategory } from '../../api/types';

const CATEGORY_DOT_COLORS: Record<FoodCategory, string> = {
  high_protein: 'bg-purple-500',
  high_carb: 'bg-orange-500',
  high_fat: 'bg-gray-500',
  veg: 'bg-green-500',
  fruit: 'bg-pink-500',
};

interface IngredientRowProps {
  item: SelectedFood;
  index: number;
  onRemove: (index: number) => void;
}

function IngredientRow({ item, index, onRemove }: IngredientRowProps) {
  const displayName =
    item.food.foodItem.length > 20
      ? item.food.foodItem.substring(0, 20) + '\u2026'
      : item.food.foodItem;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 group"
    >
      {/* Category dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_DOT_COLORS[item.food.category]}`} />

      {/* Food name and grams */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white truncate block">{displayName}</span>
        <span className="text-xs text-slate-500">{item.grams}g</span>
      </div>

      {/* Macros summary */}
      <div className="flex gap-2 text-[10px] text-slate-400">
        <span className="text-purple-400">P{item.proteinG}</span>
        <span className="text-orange-400">C{item.carbsG}</span>
        <span className="text-gray-400">F{item.fatG}</span>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(index)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-slate-700 transition-all"
        aria-label={`Remove ${item.food.foodItem}`}
      >
        <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
      </button>
    </motion.div>
  );
}

interface IngredientPileProps {
  items: SelectedFood[];
  onRemove: (index: number) => void;
}

export function IngredientPile({ items, onRemove }: IngredientPileProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        Tap foods below to add
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-full overflow-y-auto pr-1">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <IngredientRow
            key={`${item.food.id}-${index}`}
            item={item}
            index={index}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
