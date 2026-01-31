import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, X } from 'lucide-react';
import type { MealsConsumed, MealConsumedMacros } from '../../api/types';
import type { MealName } from './useTacticalKitchenState';

const MEAL_CONFIG: { meal: 'breakfast' | 'lunch' | 'dinner'; label: string; emoji: string }[] = [
  { meal: 'breakfast', label: 'BREAKFAST', emoji: '\u2600\uFE0F' },
  { meal: 'lunch', label: 'LUNCH', emoji: '\u{1F305}' },
  { meal: 'dinner', label: 'DINNER', emoji: '\u{1F319}' },
];

interface LoggedMealsPanelProps {
  mealsConsumed: MealsConsumed;
  activeMeal: MealName;
  onEditMeal: (meal: 'breakfast' | 'lunch' | 'dinner') => void;
  onClearMeal: (meal: 'breakfast' | 'lunch' | 'dinner') => Promise<void>;
}

interface MealCardProps {
  meal: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  emoji: string;
  macros: MealConsumedMacros;
  isActive: boolean;
  onEdit: () => void;
  onClear: () => Promise<void>;
}

function MealCard({ meal, label, emoji, macros, isActive, onEdit, onClear }: MealCardProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const isEmpty = macros.calories === 0;

  const handleClearClick = () => {
    setConfirmingClear(true);
  };

  const handleConfirmClear = async () => {
    setClearing(true);
    try {
      await onClear();
    } finally {
      setClearing(false);
      setConfirmingClear(false);
    }
  };

  const handleCancelClear = () => {
    setConfirmingClear(false);
  };

  return (
    <div
      className={`
        relative rounded-lg border p-3
        ${isActive ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 bg-slate-800/40'}
        ${isEmpty ? 'opacity-60' : ''}
      `}
    >
      {/* Clear confirmation overlay */}
      <AnimatePresence>
        {confirmingClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-lg bg-slate-900/95 flex items-center justify-center gap-2 z-10"
          >
            <button
              onClick={handleConfirmClear}
              disabled={clearing}
              className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear'}
            </button>
            <button
              onClick={handleCancelClear}
              disabled={clearing}
              className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{emoji}</span>
          <span className="text-xs font-bold text-slate-300 tracking-wider">{label}</span>
        </div>
        {!isEmpty && (
          <span className="text-sm font-bold text-white tabular-nums">{macros.calories} kcal</span>
        )}
      </div>

      {/* Macros or empty state */}
      {isEmpty ? (
        <div className="text-xs text-slate-500">Not logged</div>
      ) : (
        <>
          <div className="flex gap-3 text-xs mb-3">
            <span className="text-purple-400">P: {macros.proteinG}g</span>
            <span className="text-orange-400">C: {macros.carbsG}g</span>
            <span className="text-gray-400">F: {macros.fatG}g</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={handleClearClick}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs font-medium hover:bg-red-600 hover:text-white transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function LoggedMealsPanel({
  mealsConsumed,
  activeMeal,
  onEditMeal,
  onClearMeal,
}: LoggedMealsPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-2">TODAY'S MEALS</h3>
      {MEAL_CONFIG.map(({ meal, label, emoji }) => (
        <MealCard
          key={meal}
          meal={meal}
          label={label}
          emoji={emoji}
          macros={mealsConsumed[meal]}
          isActive={activeMeal === meal}
          onEdit={() => onEditMeal(meal)}
          onClear={() => onClearMeal(meal)}
        />
      ))}
    </div>
  );
}
