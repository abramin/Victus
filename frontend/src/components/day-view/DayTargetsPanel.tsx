import type { DayType, MealRatios, MealTargets } from '../../api/types';

interface DayTargetsPanelProps {
  title: string;
  dateLabel: string;
  dayType: DayType;
  mealTargets: MealTargets;
  mealRatios: MealRatios;
  totalFruitG: number;
  totalVeggiesG: number;
  waterL?: number;
  compact?: boolean;
  helperText?: string;
}

const DAY_TYPE_BADGE: Record<DayType, { label: string; className: string }> = {
  performance: { label: 'Performance', className: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  fatburner: { label: 'Fatburner', className: 'bg-orange-900/40 text-orange-300 border-orange-800' },
  metabolize: { label: 'Metabolize', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-800' },
};

function splitTarget(total: number, ratios: MealRatios) {
  const breakfast = Math.max(0, Math.round(total * ratios.breakfast));
  const lunch = Math.max(0, Math.round(total * ratios.lunch));
  const dinner = Math.max(0, total - breakfast - lunch);

  return { breakfast, lunch, dinner };
}

function mealTotal(points: MealTargets[keyof MealTargets]) {
  return points.carbs + points.protein + points.fats;
}

export function DayTargetsPanel({
  title,
  dateLabel,
  dayType,
  mealTargets,
  mealRatios,
  totalFruitG,
  totalVeggiesG,
  waterL,
  compact = false,
  helperText,
}: DayTargetsPanelProps) {
  const fruitByMeal = splitTarget(totalFruitG, mealRatios);
  const veggieByMeal = splitTarget(totalVeggiesG, mealRatios);
  const mealTotals = {
    breakfast: mealTotal(mealTargets.breakfast),
    lunch: mealTotal(mealTargets.lunch),
    dinner: mealTotal(mealTargets.dinner),
  };
  const totalPoints = mealTotals.breakfast + mealTotals.lunch + mealTotals.dinner;

  const headerClass = compact ? 'text-base' : 'text-lg';
  const panelPadding = compact ? 'p-4' : 'p-5';
  const gridClass = compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-3';
  const statText = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 ${panelPadding}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className={`text-white font-semibold ${headerClass}`}>{title}</h3>
          <p className="text-gray-400 text-xs">{dateLabel}</p>
          {helperText && <p className="text-gray-500 text-xs mt-1">{helperText}</p>}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${DAY_TYPE_BADGE[dayType].className}`}>
          {DAY_TYPE_BADGE[dayType].label}
        </span>
      </div>

      <div className={gridClass}>
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-white font-medium">Breakfast</h4>
            <span className="text-xs text-gray-400">{mealTotals.breakfast} pts</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-semibold text-orange-400">{mealTargets.breakfast.carbs}</div>
              <div className="text-[10px] text-gray-500 uppercase">Carb</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">{mealTargets.breakfast.protein}</div>
              <div className="text-[10px] text-gray-500 uppercase">Protein</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-300">{mealTargets.breakfast.fats}</div>
              <div className="text-[10px] text-gray-500 uppercase">Fat</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-green-400">Fruit {fruitByMeal.breakfast}g</span>
            <span className="text-emerald-400">Veg {veggieByMeal.breakfast}g</span>
          </div>
        </div>

        <div className="bg-gray-950/70 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-white font-medium">Lunch</h4>
            <span className="text-xs text-gray-400">{mealTotals.lunch} pts</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-semibold text-orange-400">{mealTargets.lunch.carbs}</div>
              <div className="text-[10px] text-gray-500 uppercase">Carb</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">{mealTargets.lunch.protein}</div>
              <div className="text-[10px] text-gray-500 uppercase">Protein</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-300">{mealTargets.lunch.fats}</div>
              <div className="text-[10px] text-gray-500 uppercase">Fat</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-green-400">Fruit {fruitByMeal.lunch}g</span>
            <span className="text-emerald-400">Veg {veggieByMeal.lunch}g</span>
          </div>
        </div>

        <div className="bg-gray-950/70 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-white font-medium">Dinner</h4>
            <span className="text-xs text-gray-400">{mealTotals.dinner} pts</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-semibold text-orange-400">{mealTargets.dinner.carbs}</div>
              <div className="text-[10px] text-gray-500 uppercase">Carb</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">{mealTargets.dinner.protein}</div>
              <div className="text-[10px] text-gray-500 uppercase">Protein</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-300">{mealTargets.dinner.fats}</div>
              <div className="text-[10px] text-gray-500 uppercase">Fat</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-green-400">Fruit {fruitByMeal.dinner}g</span>
            <span className="text-emerald-400">Veg {veggieByMeal.dinner}g</span>
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap gap-3 mt-4 ${statText}`}>
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 px-3 py-2">
          <span className="text-gray-400">Total Points</span>
          <span className="text-white font-medium ml-2">{totalPoints}</span>
        </div>
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 px-3 py-2">
          <span className="text-gray-400">Fruit</span>
          <span className="text-white font-medium ml-2">{totalFruitG}g</span>
        </div>
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 px-3 py-2">
          <span className="text-gray-400">Veggies</span>
          <span className="text-white font-medium ml-2">{totalVeggiesG}g</span>
        </div>
        {waterL !== undefined && (
          <div className="bg-gray-950/70 rounded-lg border border-gray-800 px-3 py-2">
            <span className="text-gray-400">Water</span>
            <span className="text-white font-medium ml-2">{waterL}L</span>
          </div>
        )}
      </div>
    </div>
  );
}
