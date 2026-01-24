import { motion } from 'framer-motion';
import { Panel } from '../common/Panel';
import type { DraftedFood } from './types';

interface MealCardProps {
  meal: 'Breakfast' | 'Lunch' | 'Dinner';
  carbPoints: number;
  proteinPoints: number;
  fatPoints: number;
  carbGrams?: number;
  proteinGrams?: number;
  fatGrams?: number;
  totalKcal?: number;
  onViewBreakdown?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  // Plate Builder props
  draftedFoods?: DraftedFood[];
  spentPoints?: number;
  onRemoveFood?: (index: number) => void;
  onClearDraft?: () => void;
}

interface MacroBarProps {
  label: string;
  current: number;
  color: string;
  bgColor: string;
}

function MacroBar({ label, current, color, bgColor }: MacroBarProps) {
  // For display purposes, show points as progress toward a reasonable max
  const maxPoints = 100; // Visual max for the bar
  const percentage = Math.min((current / maxPoints) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-10 uppercase">{label}</span>
      <div className={`flex-1 h-2 rounded-full ${bgColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${color.replace('bg-', 'text-').replace('-500', '-400')}`}>
        {current}
      </span>
    </div>
  );
}

interface BudgetBarProps {
  spent: number;
  total: number;
}

function BudgetBar({ spent, total }: BudgetBarProps) {
  const percentage = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const isFull = percentage >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">
          {spent} / {total} pts
        </span>
        {isFull && <span className="text-emerald-400">Full!</span>}
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isFull ? 'bg-emerald-500' : 'bg-blue-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

export function MealCard({
  meal,
  carbPoints,
  proteinPoints,
  fatPoints,
  totalKcal,
  onViewBreakdown,
  isSelected = false,
  onSelect,
  draftedFoods = [],
  spentPoints = 0,
  onRemoveFood,
  onClearDraft,
}: MealCardProps) {
  const totalPoints = carbPoints + proteinPoints + fatPoints;
  const hasDraftedFoods = draftedFoods.length > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        w-full text-left transition-all duration-200 rounded-xl
        ${isSelected 
          ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-900' 
          : 'hover:ring-1 hover:ring-gray-600'
        }
      `}
    >
      <Panel className={isSelected ? 'bg-gray-800/80' : ''}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">{meal}</h3>
            {isSelected && (
              <span className="text-xs text-emerald-400 font-medium">● Active</span>
            )}
          </div>
          {totalKcal !== undefined && (
            <span className="text-gray-500 text-xs">{totalKcal} kcal</span>
          )}
        </div>

        {/* Macro Progress Bars or Budget Bar */}
        {hasDraftedFoods ? (
          <BudgetBar spent={spentPoints} total={totalPoints} />
        ) : (
          <div className="space-y-2">
            <MacroBar
              label="Prot"
              current={proteinPoints}
              color="bg-purple-500"
              bgColor="bg-purple-500/20"
            />
            <MacroBar
              label="Carb"
              current={carbPoints}
              color="bg-orange-500"
              bgColor="bg-orange-500/20"
            />
            <MacroBar
              label="Fat"
              current={fatPoints}
              color="bg-gray-400"
              bgColor="bg-gray-600/30"
            />
          </div>
        )}

        {/* Drafted Foods List */}
        {hasDraftedFoods && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            {draftedFoods.map((df, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-300 truncate">{df.food.foodItem}</span>
                  <span className="text-gray-500 text-xs flex-shrink-0">{df.grams}g</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFood?.(index);
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {/* Clear all button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearDraft?.();
              }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors mt-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-800">
          <span
            onClick={(e) => {
              e.stopPropagation();
              onViewBreakdown?.();
            }}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Panel>
    </button>
  );
}
