import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FastingProtocol } from '../../api/types';
import { PROTOCOL_LABELS, MEAL_DISPLAY_NAMES, type MealName } from './useTacticalKitchenState';

interface MealCyclerProps {
  protocol: FastingProtocol;
  activeMeal: MealName;
  canNavigate: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function MealCycler({
  protocol,
  activeMeal,
  canNavigate,
  onPrev,
  onNext,
}: MealCyclerProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
      {/* Protocol Badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 tracking-wider">PROTOCOL:</span>
        <span className="text-xs font-bold text-emerald-400 tracking-wide">
          {PROTOCOL_LABELS[protocol]}
        </span>
      </div>

      {/* Meal Navigator */}
      <div className="flex items-center gap-3">
        {canNavigate && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onPrev}
            className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            aria-label="Previous meal"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        )}

        <AnimatePresence mode="wait">
          <motion.span
            key={activeMeal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="text-lg font-bold text-white tracking-wide min-w-[120px] text-center"
          >
            {MEAL_DISPLAY_NAMES[activeMeal]}
          </motion.span>
        </AnimatePresence>

        {canNavigate && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onNext}
            className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            aria-label="Next meal"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Spacer for balance */}
      <div className="w-24" />
    </div>
  );
}
