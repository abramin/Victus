import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import type { FoodReference } from '../../api/types';
import { calculateMacros, DEFAULT_SERVING_G } from './useTacticalKitchenState';

interface GramSliderProps {
  food: FoodReference | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (grams: number) => void;
}

const MIN_GRAMS = 10;
const MAX_GRAMS = 500;
const STEP = 10;

export function GramSlider({ food, isOpen, onClose, onConfirm }: GramSliderProps) {
  const [grams, setGrams] = useState(DEFAULT_SERVING_G);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGrams(Number(e.target.value));
  }, []);

  const increment = useCallback(() => {
    setGrams((g) => Math.min(g + STEP, MAX_GRAMS));
  }, []);

  const decrement = useCallback(() => {
    setGrams((g) => Math.max(g - STEP, MIN_GRAMS));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(grams);
    setGrams(DEFAULT_SERVING_G); // Reset for next use
    onClose();
  }, [grams, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setGrams(DEFAULT_SERVING_G);
    onClose();
  }, [onClose]);

  const macros = food ? calculateMacros(food, grams) : null;

  return (
    <AnimatePresence>
      {isOpen && food && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-700 p-4 pb-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{food.foodItem}</h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grams Display */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={decrement}
                disabled={grams <= MIN_GRAMS}
                className="p-2 rounded-full bg-slate-800 text-white disabled:opacity-40"
              >
                <Minus className="w-6 h-6" />
              </motion.button>

              <div className="text-center">
                <span className="text-4xl font-bold text-white">{grams}</span>
                <span className="text-xl text-slate-400 ml-1">g</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={increment}
                disabled={grams >= MAX_GRAMS}
                className="p-2 rounded-full bg-slate-800 text-white disabled:opacity-40"
              >
                <Plus className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Slider */}
            <div className="px-2 mb-6">
              <input
                type="range"
                min={MIN_GRAMS}
                max={MAX_GRAMS}
                step={STEP}
                value={grams}
                onChange={handleSliderChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-6
                  [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-emerald-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                "
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{MIN_GRAMS}g</span>
                <span>{MAX_GRAMS}g</span>
              </div>
            </div>

            {/* Macro Preview */}
            {macros && (
              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-xs text-slate-500 block">Calories</span>
                  <span className="text-sm font-semibold text-white">{macros.calories}</span>
                </div>
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-xs text-purple-400 block">Protein</span>
                  <span className="text-sm font-semibold text-white">{macros.proteinG}g</span>
                </div>
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-xs text-orange-400 block">Carbs</span>
                  <span className="text-sm font-semibold text-white">{macros.carbsG}g</span>
                </div>
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-xs text-gray-400 block">Fat</span>
                  <span className="text-sm font-semibold text-white">{macros.fatG}g</span>
                </div>
              </div>
            )}

            {/* Confirm Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-500 transition-colors"
            >
              Add {grams}g
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
