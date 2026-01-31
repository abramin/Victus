import { useRef, useEffect, useMemo } from 'react';
import type { FoodReference, FoodCategory, DayType } from '../../api/types';
import { NeuralChip, type MacroType } from './NeuralChip';
import { sortFoodsForContext, type MealName } from './useTacticalKitchenState';

interface CategoryConfig {
  category: FoodCategory;
  emoji: string;
  label: string;
}

const CATEGORY_ORDER: CategoryConfig[] = [
  { category: 'vegetable', emoji: '\u{1F966}', label: 'VEGETABLES' },
  { category: 'fruit', emoji: '\u{1F34E}', label: 'FRUITS' },
  { category: 'high_protein', emoji: '\u{1F969}', label: 'PROTEINS' },
  { category: 'high_carb', emoji: '\u{1F35A}', label: 'GRAINS & CARBS' },
  { category: 'high_fat', emoji: '\u{1F951}', label: 'FATS' },
];

// Map meal to preferred scroll category
const MEAL_SCROLL_TARGET: Record<MealName, FoodCategory> = {
  breakfast: 'fruit',
  lunch: 'vegetable',
  dinner: 'vegetable',
  feast: 'high_protein',
};

interface CommandArmoryProps {
  foods: FoodReference[];
  dayType: DayType;
  activeMeal: MealName;
  onAdd: (food: FoodReference, grams: number) => void;
  onPulseRing: (macroType: MacroType) => void;
}

export function CommandArmory({
  foods,
  dayType,
  activeMeal,
  onAdd,
  onPulseRing,
}: CommandArmoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<FoodCategory, HTMLDivElement | null>>({
    vegetable: null,
    fruit: null,
    high_protein: null,
    high_carb: null,
    high_fat: null,
  });

  // Sort foods for context (day type + meal)
  const sortedFoods = useMemo(
    () => sortFoodsForContext(foods, dayType, activeMeal),
    [foods, dayType, activeMeal]
  );

  // Group foods by category
  const groupedFoods = useMemo(() => {
    const groups: Record<FoodCategory, FoodReference[]> = {
      vegetable: [],
      fruit: [],
      high_protein: [],
      high_carb: [],
      high_fat: [],
      // Handle potential backend mismatch if any other categories slip through
    };

    // Helper to map backend categories to frontend expectations
    // Backend uses 'veg', frontend expects 'vegetable'
    const normalizeCategory = (cat: string): FoodCategory => {
      if (cat === 'veg') return 'vegetable';
      return cat as FoodCategory;
    };

    for (const food of sortedFoods) {
      const category = normalizeCategory(food.category);
      if (groups[category]) {
        groups[category].push(food);
      } else {
        console.warn(`[CommandArmory] Dropping food with unknown category: ${category}`, food);
      }
    }
    return groups;
  }, [sortedFoods]);

  // Auto-scroll to relevant section when meal changes
  useEffect(() => {
    const targetCategory = MEAL_SCROLL_TARGET[activeMeal];
    const targetSection = sectionRefs.current[targetCategory];
    if (targetSection && containerRef.current) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeMeal]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-slate-950/50 border-l border-slate-800"
    >
      <div className="p-3 space-y-4">
        {CATEGORY_ORDER.map(({ category, emoji, label }) => {
          const categoryFoods = groupedFoods[category];
          if (categoryFoods.length === 0) return null;

          return (
            <div
              key={category}
              ref={(el) => {
                sectionRefs.current[category] = el;
              }}
            >
              {/* Sticky category header */}
              <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm py-2 mb-2 border-b border-slate-800/50">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider">
                  {emoji} {label}
                </h3>
              </div>

              {/* Food grid */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {categoryFoods.map((food) => (
                  <NeuralChip
                    key={food.id}
                    food={food}
                    onAdd={(grams) => onAdd(food, grams)}
                    onPulseRing={onPulseRing}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {foods.length === 0 && (
          <div className="flex items-center justify-center text-slate-600 text-sm py-12">
            No foods available
          </div>
        )}
      </div>
    </div>
  );
}
