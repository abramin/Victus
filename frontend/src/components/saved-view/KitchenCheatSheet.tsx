import { useState, useEffect, useMemo } from 'react';
import { Panel } from '../common/Panel';
import { getFoodReference } from '../../api/client';
import type { FoodReference, FoodCategory, MealTargets } from '../../api/types';

interface KitchenCheatSheetProps {
  mealTargets: MealTargets;
  selectedMeal?: 'breakfast' | 'lunch' | 'dinner';
}

type MacroTab = 'carbs' | 'protein' | 'fats';

const TAB_TO_CATEGORY: Record<MacroTab, FoodCategory> = {
  carbs: 'high_carb',
  protein: 'high_protein',
  fats: 'high_fat',
};

const TAB_CONFIG: Record<MacroTab, { label: string; color: string; bgColor: string }> = {
  carbs: { label: 'Carbs', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  protein: { label: 'Protein', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  fats: { label: 'Fats', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
};

export function KitchenCheatSheet({ mealTargets, selectedMeal = 'dinner' }: KitchenCheatSheetProps) {
  const [foods, setFoods] = useState<FoodReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MacroTab>('protein');

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const response = await getFoodReference();
        setFoods(response.foods);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load food reference');
      } finally {
        setLoading(false);
      }
    };
    fetchFoods();
  }, []);

  // Get the target points for the selected meal and macro
  const targetPoints = useMemo(() => {
    const meal = mealTargets[selectedMeal];
    return {
      carbs: meal.carbs,
      protein: meal.protein,
      fats: meal.fats,
    };
  }, [mealTargets, selectedMeal]);

  // Filter foods by selected category
  const filteredFoods = useMemo(() => {
    const category = TAB_TO_CATEGORY[activeTab];
    return foods.filter(f => f.category === category);
  }, [foods, activeTab]);

  // Calculate suggested serving based on plate multiplier
  // plate_multiplier represents the portion size relative to points
  const getSuggestion = (food: FoodReference, points: number): string => {
    if (!food.plateMultiplier) return '—';
    // Higher multiplier = more food per point
    // For example, if multiplier is 1.0 for carbs, 100g ≈ 100 points
    // If multiplier is 0.25 for protein, 100g ≈ 400 points
    const servingG = Math.round(points * food.plateMultiplier);
    return `~${servingG}g`;
  };

  const currentPoints = targetPoints[activeTab];
  const tabConfig = TAB_CONFIG[activeTab];

  if (loading) {
    return (
      <Panel title="Quick Reference">
        <div className="flex justify-center py-4">
          <div className="animate-pulse text-gray-500 text-sm">Loading...</div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Quick Reference">
        <div className="text-red-400 text-sm">{error}</div>
      </Panel>
    );
  }

  return (
    <Panel title="Quick Reference">
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(Object.keys(TAB_CONFIG) as MacroTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${activeTab === tab
                ? `${TAB_CONFIG[tab].bgColor} ${TAB_CONFIG[tab].color}`
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
              }
            `}
          >
            {TAB_CONFIG[tab].label}
          </button>
        ))}
      </div>

      {/* Target info */}
      <div className="mb-3 text-xs text-gray-400">
        To hit <span className={tabConfig.color}>~{currentPoints} pts</span> ({selectedMeal}):
      </div>

      {/* Food list */}
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {filteredFoods.slice(0, 6).map(food => (
          <div
            key={food.id}
            className="flex justify-between items-center text-sm py-1 px-2 rounded bg-gray-800/50"
          >
            <span className="text-gray-300 truncate mr-2">{food.foodItem}</span>
            <span className={`${tabConfig.color} font-medium whitespace-nowrap`}>
              {getSuggestion(food, currentPoints)}
            </span>
          </div>
        ))}
        {filteredFoods.length === 0 && (
          <div className="text-gray-500 text-xs text-center py-2">
            No foods in this category
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredFoods.length > 6 && (
        <div className="mt-2 text-center">
          <button className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
            +{filteredFoods.length - 6} more foods
          </button>
        </div>
      )}
    </Panel>
  );
}
