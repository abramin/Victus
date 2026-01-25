import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Modal } from '../common/Modal';
import type { FoodModalState, DraftedFood, MacroSpent } from './types';
import type { FoodReference, MacroPoints } from '../../api/types';

/** Map food category to macro type */
type MacroType = 'protein' | 'carbs' | 'fats';
const categoryToMacro = (category: string): MacroType => {
  if (category === 'high_protein') return 'protein';
  if (category === 'high_carb') return 'carbs';
  return 'fats';
};

interface PlateBuilderModalProps {
  modalState: FoodModalState;
  existingFoods: DraftedFood[];
  targetPoints: number;
  macroTargets: MacroPoints | null;
  macroSpent: MacroSpent;
  onClose: () => void;
  onConfirm: () => void;
  onFillPercentageChange: (percentage: number) => void;
}

const COLORS = {
  existing: '#4b5563', // Gray - already added foods
  active: '#3b82f6', // Blue - current food being added
  activeOverflow: '#f59e0b', // Amber - over macro limit
  activeOverflowHard: '#ef4444', // Red - over total limit
  remaining: '#1f2937', // Dark gray - empty space
};

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function PlateBuilderModal({
  modalState,
  existingFoods,
  targetPoints,
  macroTargets,
  macroSpent,
  onClose,
  onConfirm,
  onFillPercentageChange,
}: PlateBuilderModalProps) {
  const { isOpen, food, mealId, fillPercentage } = modalState;

  // Get primary macro for this food
  const primaryMacro = useMemo(
    () => (food ? categoryToMacro(food.category) : 'protein'),
    [food]
  );

  // Calculate existing points from already-added foods (total)
  const existingPoints = useMemo(
    () => existingFoods.reduce((sum, f) => sum + f.allocatedPoints, 0),
    [existingFoods]
  );

  // Calculate remaining points available for this food (total budget)
  // Remove Math.max(0, ...) to allow seeing how much over we are
  const remainingFromTarget = useMemo(
    () => targetPoints - existingPoints,
    [targetPoints, existingPoints]
  );

  // Calculate macro-specific remaining points (the "smart limit")
  const macroRemaining = useMemo(() => {
    if (!macroTargets) return remainingFromTarget;
    const target = macroTargets[primaryMacro];
    const spent = macroSpent[primaryMacro];
    return target - spent;
  }, [macroTargets, macroSpent, primaryMacro, remainingFromTarget]);

  // Smart limit = min of macro limit and total limit (but at least 0 for the base)
  const smartLimitPoints = useMemo(
    () => Math.max(0, Math.min(macroRemaining, remainingFromTarget)),
    [macroRemaining, remainingFromTarget]
  );

  // Calculate where the macro limit falls on the slider (for marker position)
  // If we're over macro limit, marker is at 0; otherwise it's at 100%
  const macroLimitPercent = useMemo(() => {
    if (smartLimitPoints <= 0) return 0;
    if (macroRemaining <= remainingFromTarget) return 100;
    return Math.min(100, (macroRemaining / remainingFromTarget) * 100);
  }, [smartLimitPoints, macroRemaining, remainingFromTarget]);

  // Calculate active points based on slider (using smart limit as 100% baseline)
  // Slider now goes 0-150%, where 100% = smart limit
  const activePoints = useMemo(() => {
    const basePoints = Math.max(0, smartLimitPoints);
    return Math.round((basePoints * fillPercentage) / 100);
  }, [smartLimitPoints, fillPercentage]);

  // Detect overflow states
  const isOverMacroLimit = activePoints > Math.max(0, macroRemaining);
  const isOverTotalLimit = activePoints > Math.max(0, remainingFromTarget);

  // Calculate grams for current food
  const calculatedGrams = useMemo(() => {
    if (!food?.plateMultiplier) return 0;
    return Math.round(activePoints * food.plateMultiplier);
  }, [food, activePoints]);

  // Determine active color based on overflow state
  const activeColor = useMemo(() => {
    if (isOverTotalLimit) return COLORS.activeOverflowHard;
    if (isOverMacroLimit) return COLORS.activeOverflow;
    return COLORS.active;
  }, [isOverMacroLimit, isOverTotalLimit]);

  // Chart data with three segments
  const chartData = useMemo(() => {
    const totalBudget = targetPoints;
    const emptyPoints = Math.max(0, totalBudget - existingPoints - activePoints);
    // If we're over budget, show the overflow portion
    const normalPoints = Math.min(activePoints, Math.max(0, remainingFromTarget));
    const overflowPoints = Math.max(0, activePoints - Math.max(0, remainingFromTarget));

    const data = [
      { name: 'Existing', value: existingPoints, color: COLORS.existing },
    ];

    if (overflowPoints > 0) {
      // Split active into normal + overflow
      if (normalPoints > 0) {
        data.push({ name: 'Current', value: normalPoints, color: COLORS.active });
      }
      data.push({ name: 'Overflow', value: overflowPoints, color: activeColor });
    } else {
      data.push({ name: 'Current', value: activePoints, color: activeColor });
    }

    if (emptyPoints > 0) {
      data.push({ name: 'Empty', value: emptyPoints, color: COLORS.remaining });
    }

    return data.filter((d) => d.value > 0);
  }, [existingPoints, activePoints, remainingFromTarget, targetPoints, activeColor]);

  if (!food) return null;

  // Allow adding if user has selected any portion (don't block based on budget)
  const canAdd = fillPercentage > 0 && activePoints > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add ${food.foodItem}`}
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Meal context */}
        <div className="text-center text-sm text-gray-400">
          Adding to{' '}
          <span className="text-white font-medium">
            {capitalizeFirst(mealId)}
          </span>
        </div>

        {/* Radial chart with grams hero number */}
        <div className="relative w-48 h-48 mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
                animationDuration={300}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    style={
                      entry.name === 'Empty'
                        ? {
                            strokeDasharray: '4 4',
                            stroke: '#374151',
                            strokeWidth: 2,
                          }
                        : undefined
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center grams display - HERO NUMBER */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            key={calculatedGrams}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <span className="text-4xl font-bold text-white">{calculatedGrams}g</span>
            <span className="text-sm text-gray-400">{activePoints} pts</span>
          </motion.div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs">
          {existingFoods.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-600" />
              <span className="text-gray-400">Existing</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-400">This food</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-gray-600 border-dashed" />
            <span className="text-gray-400">Remaining</span>
          </div>
        </div>

        {/* Slider with macro limit marker */}
        <div className="px-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Fill amount</span>
            <span className={`font-medium ${isOverMacroLimit ? 'text-amber-400' : 'text-white'}`}>
              {fillPercentage}%
            </span>
          </div>

          {/* Slider track with macro limit marker */}
          <div className="relative">
            {/* Macro limit marker - shows where 100% of macro budget falls */}
            {macroLimitPercent > 0 && macroLimitPercent < 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none"
                style={{ left: `${(macroLimitPercent / 150) * 100}%` }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-amber-400 whitespace-nowrap">
                  {primaryMacro} limit
                </div>
              </div>
            )}

            <input
              type="range"
              min={0}
              max={150}
              value={fillPercentage}
              onChange={(e) => onFillPercentageChange(parseInt(e.target.value, 10))}
              className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-none
                [&::-moz-range-thumb]:cursor-pointer
                ${isOverTotalLimit
                  ? '[&::-webkit-slider-thumb]:bg-red-500 [&::-moz-range-thumb]:bg-red-500'
                  : isOverMacroLimit
                    ? '[&::-webkit-slider-thumb]:bg-amber-500 [&::-moz-range-thumb]:bg-amber-500'
                    : '[&::-webkit-slider-thumb]:bg-blue-500 [&::-moz-range-thumb]:bg-blue-500'
                }
              `}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>100%</span>
            <span>150% (overflow)</span>
          </div>

          {/* Overflow warning */}
          {isOverMacroLimit && !isOverTotalLimit && (
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Exceeds {primaryMacro} budget
            </div>
          )}
          {isOverTotalLimit && (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Exceeds meal calorie budget
            </div>
          )}
        </div>

        {/* Quick fill buttons */}
        <div className="flex justify-center gap-2">
          {[25, 50, 75, 100, 125].map((pct) => (
            <button
              key={pct}
              onClick={() => onFillPercentageChange(pct)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                fillPercentage === pct
                  ? pct > 100
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-500 text-white'
                  : pct > 100
                    ? 'bg-gray-800 text-amber-400 hover:bg-gray-700'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAdd}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isOverTotalLimit
                ? 'bg-red-600 hover:bg-red-500'
                : isOverMacroLimit
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isOverMacroLimit ? 'Add Anyway' : `Add to ${capitalizeFirst(mealId)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
