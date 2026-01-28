import { useMemo } from 'react';
import type { FoodReference, DayType } from '../../api/types';
import { FoodChip } from './FoodChip';
import { sortFoodsForContext, DEFAULT_SERVING_G, type MealName } from './useTacticalKitchenState';

interface FoodDeckProps {
  foods: FoodReference[];
  dayType: DayType;
  activeMeal: MealName;
  onTap: (food: FoodReference) => void;
  onDoubleTap: (food: FoodReference) => void;
  onLongPress: (food: FoodReference) => void;
}

export function FoodDeck({
  foods,
  dayType,
  activeMeal,
  onTap,
  onDoubleTap,
  onLongPress,
}: FoodDeckProps) {
  const sortedFoods = useMemo(
    () => sortFoodsForContext(foods, dayType, activeMeal),
    [foods, dayType, activeMeal]
  );

  return (
    <div className="fixed bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-800 backdrop-blur-sm">
      {/* Hint bar */}
      <div className="flex justify-center gap-6 py-2 text-[10px] text-slate-600 border-b border-slate-800/50">
        <span>TAP = 1×{DEFAULT_SERVING_G}g</span>
        <span>DOUBLE = 2×{DEFAULT_SERVING_G}g</span>
        <span>HOLD = Custom</span>
      </div>

      {/* Scrollable chips */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {sortedFoods.map((food) => (
          <FoodChip
            key={food.id}
            food={food}
            onTap={() => onTap(food)}
            onDoubleTap={() => onDoubleTap(food)}
            onLongPress={() => onLongPress(food)}
          />
        ))}

        {sortedFoods.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm py-4">
            No foods available
          </div>
        )}
      </div>
    </div>
  );
}
