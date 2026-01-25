import { motion } from 'framer-motion';
import { Panel } from '../common/Panel';
import type { DraftedFood, MacroSpent } from './types';
import { CARB_KCAL_PER_G, PROTEIN_KCAL_PER_G, FAT_KCAL_PER_G } from '../../constants';
import type { FoodCategory, MacroPoints } from '../../api/types';

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
  // Per-macro tracking for separate gauges
  macroTargets?: MacroPoints;
  macroSpent?: MacroSpent;
}

interface MacroStackedBarProps {
  proteinKcal: number;
  carbKcal: number;
  fatKcal: number;
  totalBudgetKcal: number;
}

function MacroStackedBar({ proteinKcal, carbKcal, fatKcal, totalBudgetKcal }: MacroStackedBarProps) {
  const totalConsumedKcal = proteinKcal + carbKcal + fatKcal;
  
  // Calculate percentages of the total budget
  const proteinPercent = totalBudgetKcal > 0 ? (proteinKcal / totalBudgetKcal) * 100 : 0;
  const carbPercent = totalBudgetKcal > 0 ? (carbKcal / totalBudgetKcal) * 100 : 0;
  const fatPercent = totalBudgetKcal > 0 ? (fatKcal / totalBudgetKcal) * 100 : 0;
  const remainingPercent = Math.max(0, 100 - proteinPercent - carbPercent - fatPercent);
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 uppercase tracking-wide">Macro Breakdown</div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-700">
        {proteinPercent > 0 && (
          <motion.div
            className="bg-purple-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${proteinPercent}%` }}
            transition={{ duration: 0.3 }}
            title={`Protein: ${Math.round(proteinKcal)} kcal`}
          />
        )}
        {carbPercent > 0 && (
          <motion.div
            className="bg-orange-500 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${carbPercent}%` }}
            transition={{ duration: 0.3, delay: 0.1 }}
            title={`Carbs: ${Math.round(carbKcal)} kcal`}
          />
        )}
        {fatPercent > 0 && (
          <motion.div
            className="bg-gray-400 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${fatPercent}%` }}
            transition={{ duration: 0.3, delay: 0.2 }}
            title={`Fat: ${Math.round(fatKcal)} kcal`}
          />
        )}
        {/* Empty space represents remaining budget */}
      </div>
      <div className="flex justify-between items-center text-xs">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="text-gray-500">Prot</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="text-gray-500">Carb</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span className="text-gray-500">Fat</span>
          </span>
        </div>
        <span className="text-gray-500">
          {remainingPercent > 0 ? `${Math.round(remainingPercent)}% remaining` : 'Full!'}
        </span>
      </div>
    </div>
  );
}

/** Individual macro progress bar with overflow support */
interface MacroProgressBarProps {
  macro: 'protein' | 'carbs' | 'fats';
  target: number;
  spent: number;
}

const MACRO_CONFIG = {
  protein: { color: 'bg-purple-500', overflowColor: 'bg-red-500', label: 'P' },
  carbs: { color: 'bg-orange-500', overflowColor: 'bg-red-500', label: 'C' },
  fats: { color: 'bg-gray-400', overflowColor: 'bg-red-500', label: 'F' },
} as const;

function MacroProgressBar({ macro, target, spent }: MacroProgressBarProps) {
  const percentage = target > 0 ? (spent / target) * 100 : 0;
  const isOverflow = percentage > 100;
  const config = MACRO_CONFIG[macro];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-4 font-medium">{config.label}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${isOverflow ? config.overflowColor : config.color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span className={`text-xs tabular-nums w-12 text-right ${isOverflow ? 'text-red-400' : 'text-gray-400'}`}>
        {spent}/{target}
      </span>
    </div>
  );
}

/** Three separate macro progress bars */
interface MacroGaugesProps {
  macroTargets: MacroPoints;
  macroSpent: MacroSpent;
}

function MacroGauges({ macroTargets, macroSpent }: MacroGaugesProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 uppercase tracking-wide">Macro Progress</div>
      <div className="space-y-1.5">
        <MacroProgressBar macro="protein" target={macroTargets.protein} spent={macroSpent.protein} />
        <MacroProgressBar macro="carbs" target={macroTargets.carbs} spent={macroSpent.carbs} />
        <MacroProgressBar macro="fats" target={macroTargets.fats} spent={macroSpent.fats} />
      </div>
    </div>
  );
}

/** Get dominant macro category for visual indicator */
function getMacroDominantColor(category: FoodCategory): string {
  switch (category) {
    case 'high_protein':
      return 'bg-purple-500';
    case 'high_carb':
      return 'bg-orange-500';
    case 'high_fat':
      return 'bg-gray-400';
  }
}

export function MealCard({
  meal,
  carbPoints,
  proteinPoints,
  fatPoints,
  carbGrams = 0,
  proteinGrams = 0,
  fatGrams = 0,
  totalKcal,
  onViewBreakdown,
  isSelected = false,
  onSelect,
  draftedFoods = [],
  spentPoints = 0,
  onRemoveFood,
  onClearDraft,
  macroTargets,
  macroSpent,
}: MealCardProps) {
  const totalPoints = carbPoints + proteinPoints + fatPoints;
  const hasDraftedFoods = draftedFoods.length > 0;
  
  // Calculate total budget in calories from gram targets
  const totalBudgetKcal = totalKcal ?? (
    carbGrams * CARB_KCAL_PER_G +
    proteinGrams * PROTEIN_KCAL_PER_G +
    fatGrams * FAT_KCAL_PER_G
  );
  
  // Calculate consumed calories from drafted foods
  // For now, we'll estimate based on points distribution (this should ideally come from the drafted foods data)
  // TODO: Add actual kcal and macro data to DraftedFood interface
  const consumedKcal = hasDraftedFoods ? (spentPoints / totalPoints) * totalBudgetKcal : 0;
  
  // Estimate macro distribution from drafted foods based on points
  // This is a simplified calculation - ideally each DraftedFood should carry its macro breakdown
  const proteinKcal = hasDraftedFoods ? (proteinPoints / totalPoints) * consumedKcal : 0;
  const carbKcal = hasDraftedFoods ? (carbPoints / totalPoints) * consumedKcal : 0;
  const fatKcal = hasDraftedFoods ? (fatPoints / totalPoints) * consumedKcal : 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`
        w-full text-left transition-all duration-200 rounded-xl cursor-pointer
        ${isSelected
          ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-900'
          : 'hover:ring-1 hover:ring-gray-600'
        }
      `}
    >
      <Panel className={isSelected ? 'bg-gray-800/80' : ''}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">{meal}</h3>
            {isSelected && (
              <span className="text-xs text-emerald-400 font-medium">● Active</span>
            )}
          </div>
          {/* Hero Metric: Calories */}
          <div className="text-right">
            <div className="text-white text-lg font-semibold">
              {Math.round(consumedKcal)}
              <span className="text-gray-500 text-sm font-normal"> / {Math.round(totalBudgetKcal)} kcal</span>
            </div>
          </div>
        </div>

        {/* Macro visualization - separate gauges when data available, stacked bar otherwise */}
        {macroTargets && macroSpent ? (
          <MacroGauges macroTargets={macroTargets} macroSpent={macroSpent} />
        ) : (
          <MacroStackedBar
            proteinKcal={proteinKcal}
            carbKcal={carbKcal}
            fatKcal={fatKcal}
            totalBudgetKcal={totalBudgetKcal}
          />
        )}

        {/* Drafted Foods List */}
        {hasDraftedFoods && (
          <div className="mt-4 pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Selected Items</div>
            <div className="space-y-2">
              {draftedFoods.map((df, index) => {
                const macroColor = getMacroDominantColor(df.food.category);
                // Estimate calories for this food item (simplified - should be from actual data)
                const itemKcal = Math.round((df.allocatedPoints / totalPoints) * consumedKcal);
                
                return (
                  <div key={index} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Macro indicator dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${macroColor}`} />
                      <span className="text-gray-300 truncate">{df.food.foodItem}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0">{df.grams}g</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{itemKcal} kcal</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFood?.(index);
                        }}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Clear all button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearDraft?.();
              }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors mt-3"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewBreakdown?.();
            }}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </Panel>
    </div>
  );
}
