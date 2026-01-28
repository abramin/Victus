import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FoodReference, FoodCategory, DayType } from '../../api/types';
import { AcceleratorChip, type MacroType } from './AcceleratorChip';
import { sortFoodsForContext, type MealName } from './useTacticalKitchenState';

export type CategoryTab = 'PROT' | 'CARB' | 'FAT' | 'VEG' | 'FRUIT';

const CATEGORY_TAB_MAP: Record<CategoryTab, FoodCategory> = {
  PROT: 'high_protein',
  CARB: 'high_carb',
  FAT: 'high_fat',
  VEG: 'veg',
  FRUIT: 'fruit',
};

const TAB_COLORS: Record<CategoryTab, { active: string; inactive: string }> = {
  PROT: { active: 'bg-purple-600 text-white', inactive: 'bg-slate-800 text-purple-400' },
  CARB: { active: 'bg-orange-600 text-white', inactive: 'bg-slate-800 text-orange-400' },
  FAT: { active: 'bg-gray-600 text-white', inactive: 'bg-slate-800 text-gray-400' },
  VEG: { active: 'bg-green-600 text-white', inactive: 'bg-slate-800 text-green-400' },
  FRUIT: { active: 'bg-pink-600 text-white', inactive: 'bg-slate-800 text-pink-400' },
};

interface GridArmoryProps {
  foods: FoodReference[];
  dayType: DayType;
  activeMeal: MealName;
  onAdd: (food: FoodReference, grams: number) => void;
  onPulseRing: (macroType: MacroType) => void;
}

export function GridArmory({
  foods,
  dayType,
  activeMeal,
  onAdd,
  onPulseRing,
}: GridArmoryProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>('PROT');

  const filteredFoods = useMemo(() => {
    const category = CATEGORY_TAB_MAP[activeTab];
    const categoryFoods = foods.filter((f) => f.category === category);
    return sortFoodsForContext(categoryFoods, dayType, activeMeal);
  }, [foods, activeTab, dayType, activeMeal]);

  const tabs: CategoryTab[] = ['PROT', 'CARB', 'FAT', 'VEG', 'FRUIT'];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-800 backdrop-blur-sm">
      {/* Category tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-slate-800/50 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const colors = TAB_COLORS[tab];
          return (
            <motion.button
              key={tab}
              onClick={() => setActiveTab(tab)}
              whileTap={{ scale: 0.95 }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider
                transition-colors flex-shrink-0
                ${isActive ? colors.active : colors.inactive}
              `}
            >
              {tab}
            </motion.button>
          );
        })}
      </div>

      {/* 2-row grid */}
      <div className="grid grid-flow-col grid-rows-2 gap-3 px-4 py-3 overflow-x-auto scrollbar-hide auto-cols-max">
        {filteredFoods.map((food) => (
          <AcceleratorChip
            key={food.id}
            food={food}
            onAdd={(grams) => onAdd(food, grams)}
            onPulseRing={onPulseRing}
          />
        ))}

        {filteredFoods.length === 0 && (
          <div className="col-span-full row-span-2 flex items-center justify-center text-slate-600 text-sm py-8">
            No {activeTab.toLowerCase()} foods available
          </div>
        )}
      </div>
    </div>
  );
}
