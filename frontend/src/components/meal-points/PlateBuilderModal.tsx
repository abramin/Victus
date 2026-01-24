import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Modal } from '../common/Modal';
import type { FoodModalState, DraftedFood, MealId } from './types';
import type { FoodReference } from '../../api/types';

interface PlateBuilderModalProps {
  modalState: FoodModalState;
  existingFoods: DraftedFood[];
  targetPoints: number;
  onClose: () => void;
  onConfirm: () => void;
  onFillPercentageChange: (percentage: number) => void;
}

const COLORS = {
  existing: '#4b5563', // Gray - already added foods
  active: '#3b82f6', // Blue - current food being added
  remaining: '#1f2937', // Dark gray - empty space
};

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function PlateBuilderModal({
  modalState,
  existingFoods,
  targetPoints,
  onClose,
  onConfirm,
  onFillPercentageChange,
}: PlateBuilderModalProps) {
  const { isOpen, food, mealId, fillPercentage } = modalState;

  // Calculate existing points from already-added foods
  const existingPoints = useMemo(
    () => existingFoods.reduce((sum, f) => sum + f.allocatedPoints, 0),
    [existingFoods]
  );

  // Calculate remaining points available for this food
  const remainingFromTarget = useMemo(
    () => Math.max(0, targetPoints - existingPoints),
    [targetPoints, existingPoints]
  );

  // Calculate active points based on slider
  const activePoints = useMemo(
    () => Math.round((remainingFromTarget * fillPercentage) / 100),
    [remainingFromTarget, fillPercentage]
  );

  // Calculate grams for current food
  const calculatedGrams = useMemo(() => {
    if (!food?.plateMultiplier) return 0;
    return Math.round(activePoints * food.plateMultiplier);
  }, [food, activePoints]);

  // Chart data with three segments
  const chartData = useMemo(() => {
    const emptyPoints = remainingFromTarget - activePoints;
    return [
      { name: 'Existing', value: existingPoints, color: COLORS.existing },
      { name: 'Current', value: activePoints, color: COLORS.active },
      { name: 'Empty', value: Math.max(0, emptyPoints), color: COLORS.remaining },
    ].filter((d) => d.value > 0);
  }, [existingPoints, activePoints, remainingFromTarget]);

  if (!food) return null;

  const canAdd = activePoints > 0;

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

        {/* Slider */}
        <div className="px-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Fill amount</span>
            <span className="text-white font-medium">{fillPercentage}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={fillPercentage}
            onChange={(e) => onFillPercentageChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:bg-blue-500
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:bg-blue-500
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-none
              [&::-moz-range-thumb]:cursor-pointer
            "
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>100% of remaining</span>
          </div>
        </div>

        {/* Quick fill buttons */}
        <div className="flex justify-center gap-2">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => onFillPercentageChange(pct)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                fillPercentage === pct
                  ? 'bg-blue-500 text-white'
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
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to {capitalizeFirst(mealId)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
