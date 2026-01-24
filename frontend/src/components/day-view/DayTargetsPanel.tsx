import type { DayType, MealRatios, MealTargets } from '../../api/types';
import {
  CARB_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
  FAT_KCAL_PER_G,
  DAY_TYPE_BADGE,
} from '../../constants';

interface MacroGrams {
  carbsG: number;
  proteinG: number;
  fatsG: number;
}

interface MealGrams {
  breakfast: MacroGrams;
  lunch: MacroGrams;
  dinner: MacroGrams;
}

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
  /** Training context to display below date (e.g., "Strength (Hypertrophy) • 60 mins • RPE 8") */
  trainingContext?: string;
  mealGrams?: MealGrams;
  totalGrams?: number;
  totalCalories?: number;
  /** Show provisional/preview styling (faded, dashed border, preview badge) */
  isProvisional?: boolean;
}

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
  trainingContext,
  mealGrams,
  totalCalories,
  isProvisional = false,
}: DayTargetsPanelProps) {
  const fruitByMeal = splitTarget(totalFruitG, mealRatios);
  const veggieByMeal = splitTarget(totalVeggiesG, mealRatios);
  
  // Per-meal totals in points
  const mealTotals = {
    breakfast: mealTotal(mealTargets.breakfast),
    lunch: mealTotal(mealTargets.lunch),
    dinner: mealTotal(mealTargets.dinner),
  };
  
  const totalPoints = mealTotals.breakfast + mealTotals.lunch + mealTotals.dinner;

  // Calculate per-meal calories from grams
  const mealCalories = mealGrams ? {
    breakfast: Math.round(
      mealGrams.breakfast.carbsG * CARB_KCAL_PER_G +
      mealGrams.breakfast.proteinG * PROTEIN_KCAL_PER_G +
      mealGrams.breakfast.fatsG * FAT_KCAL_PER_G
    ),
    lunch: Math.round(
      mealGrams.lunch.carbsG * CARB_KCAL_PER_G +
      mealGrams.lunch.proteinG * PROTEIN_KCAL_PER_G +
      mealGrams.lunch.fatsG * FAT_KCAL_PER_G
    ),
    dinner: Math.round(
      mealGrams.dinner.carbsG * CARB_KCAL_PER_G +
      mealGrams.dinner.proteinG * PROTEIN_KCAL_PER_G +
      mealGrams.dinner.fatsG * FAT_KCAL_PER_G
    ),
  } : null;

  // Calculate total calories from grams if not provided
  const computedCalories = totalCalories ?? (mealCalories
    ? mealCalories.breakfast + mealCalories.lunch + mealCalories.dinner
    : 0);

  // Calculate macro percentages for each meal (by caloric contribution)
  const getMacroPercentages = (macros: MacroGrams) => {
    const carbCal = macros.carbsG * CARB_KCAL_PER_G;
    const proteinCal = macros.proteinG * PROTEIN_KCAL_PER_G;
    const fatCal = macros.fatsG * FAT_KCAL_PER_G;
    const totalCal = carbCal + proteinCal + fatCal;
    if (totalCal === 0) return { carb: 0, protein: 0, fat: 0 };
    return {
      carb: Math.round((carbCal / totalCal) * 100),
      protein: Math.round((proteinCal / totalCal) * 100),
      fat: Math.round((fatCal / totalCal) * 100),
    };
  };

  const headerClass = compact ? 'text-base' : 'text-lg';
  const panelPadding = compact ? 'p-4' : 'p-5';
  const gridClass = compact ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-3';
  const statText = compact ? 'text-xs' : 'text-sm';

  // Provisional styling: faded opacity, dashed border
  const provisionalClass = isProvisional
    ? 'opacity-70 border-dashed border-gray-600'
    : 'border-gray-800';

  return (
    <div className={`bg-gray-900 rounded-xl border ${provisionalClass} ${panelPadding}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-white font-semibold ${headerClass}`}>{title}</h3>
            {isProvisional && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-900/40 text-yellow-400 border border-yellow-800">
                Preview
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs">{dateLabel}</p>
          {trainingContext && (
            <p className="text-blue-400 text-xs mt-1 font-medium">{trainingContext}</p>
          )}
          {helperText && <p className="text-gray-500 text-xs mt-1">{helperText}</p>}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${DAY_TYPE_BADGE[dayType].className}`}>
          {DAY_TYPE_BADGE[dayType].label}
        </span>
      </div>

      <div className={gridClass}>
        {/* Breakfast Card */}
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-white font-medium">Breakfast</h4>
            <span className="text-xs text-white font-semibold">
              {mealCalories ? `${mealCalories.breakfast} kcal` : '--'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {mealTotals.breakfast} pts ({totalPoints > 0 ? Math.round((mealTotals.breakfast / totalPoints) * 100) : 0}% of day)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-semibold text-orange-400">
                {mealGrams ? mealGrams.breakfast.carbsG : mealTargets.breakfast.carbs}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Carb</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.breakfast).carb}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">
                {mealGrams ? mealGrams.breakfast.proteinG : mealTargets.breakfast.protein}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Protein</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.breakfast).protein}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-300">
                {mealGrams ? mealGrams.breakfast.fatsG : mealTargets.breakfast.fats}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Fat</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.breakfast).fat}%)
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-green-400">Fruit {fruitByMeal.breakfast}g</span>
            <span className="text-emerald-400">Veg {veggieByMeal.breakfast}g</span>
          </div>
        </div>

        {/* Lunch Card */}
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-white font-medium">Lunch</h4>
            <span className="text-xs text-white font-semibold">
              {mealCalories ? `${mealCalories.lunch} kcal` : '--'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {mealTotals.lunch} pts ({totalPoints > 0 ? Math.round((mealTotals.lunch / totalPoints) * 100) : 0}% of day)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-semibold text-orange-400">
                {mealGrams ? mealGrams.lunch.carbsG : mealTargets.lunch.carbs}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Carb</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.lunch).carb}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">
                {mealGrams ? mealGrams.lunch.proteinG : mealTargets.lunch.protein}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Protein</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.lunch).protein}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-300">
                {mealGrams ? mealGrams.lunch.fatsG : mealTargets.lunch.fats}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Fat</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.lunch).fat}%)
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px]">
            <span className="text-green-400">Fruit {fruitByMeal.lunch}g</span>
            <span className="text-emerald-400">Veg {veggieByMeal.lunch}g</span>
          </div>
        </div>

        {/* Dinner Card */}
        <div className="bg-gray-950/70 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-white font-medium">Dinner</h4>
            <span className="text-xs text-white font-semibold">
              {mealCalories ? `${mealCalories.dinner} kcal` : '--'}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {mealTotals.dinner} pts ({totalPoints > 0 ? Math.round((mealTotals.dinner / totalPoints) * 100) : 0}% of day)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-semibold text-orange-400">
                {mealGrams ? mealGrams.dinner.carbsG : mealTargets.dinner.carbs}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Carb</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.dinner).carb}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-400">
                {mealGrams ? mealGrams.dinner.proteinG : mealTargets.dinner.protein}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Protein</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.dinner).protein}%)
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-300">
                {mealGrams ? mealGrams.dinner.fatsG : mealTargets.dinner.fats}g
              </div>
              <div className="text-[10px] text-gray-500 uppercase">Fat</div>
              {mealGrams && (
                <div className="text-[9px] text-gray-600">
                  ({getMacroPercentages(mealGrams.dinner).fat}%)
                </div>
              )}
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
          <span className="text-gray-400">Total Calories</span>
          <span className="text-white font-medium ml-2">
            {computedCalories} kcal
          </span>
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
