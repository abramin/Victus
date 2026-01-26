import type { DailyTargets, DayType } from '../../../api/types';
import { DAY_TYPE_BADGE } from '../../../constants';
import { MacroDonutChart } from '../../charts/MacroDonutChart';

interface NutritionCardProps {
  calculatedTargets: DailyTargets;
  dayType: DayType;
}

export function NutritionCard({ calculatedTargets, dayType }: NutritionCardProps) {
  const { totalCalories, totalProteinG, totalCarbsG, totalFatsG, fruitG, veggiesG, waterL } =
    calculatedTargets;

  // Calculate caloric percentages for donut chart
  const carbCal = totalCarbsG * 4;
  const proteinCal = totalProteinG * 4;
  const fatCal = totalFatsG * 9;
  const totalCal = carbCal + proteinCal + fatCal || 1; // Prevent division by zero

  const badge = DAY_TYPE_BADGE[dayType];

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
      {/* Header with day type badge */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Nutrition Targets</h3>
        <span className={`px-2 py-1 text-xs rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Main content: Donut + Macros */}
      <div className="flex gap-4 items-center">
        {/* Donut Chart */}
        <div className="flex-shrink-0">
          <MacroDonutChart
            carbs={(carbCal / totalCal) * 100}
            protein={(proteinCal / totalCal) * 100}
            fat={(fatCal / totalCal) * 100}
            size={72}
            centerLabel={`${totalCalories}`}
          />
          <div className="text-[10px] text-slate-500 text-center mt-1">kcal</div>
        </div>

        {/* Macro Grid */}
        <div className="grid grid-cols-3 gap-3 flex-1 text-center">
          <div>
            <span className="text-xl font-bold text-purple-400">{totalProteinG}</span>
            <span className="text-xs text-slate-500 block">Protein</span>
          </div>
          <div>
            <span className="text-xl font-bold text-orange-400">{totalCarbsG}</span>
            <span className="text-xs text-slate-500 block">Carbs</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-300">{totalFatsG}</span>
            <span className="text-xs text-slate-500 block">Fat</span>
          </div>
        </div>
      </div>

      {/* Pills: Fruit, Veggies, Water */}
      <div className="flex gap-2 flex-wrap mt-4 pt-3 border-t border-slate-800">
        <span className="px-2 py-1 rounded-full bg-pink-900/40 text-pink-400 text-xs border border-pink-800/50">
          Fruit {fruitG}g
        </span>
        <span className="px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-400 text-xs border border-emerald-800/50">
          Veggies {veggiesG}g
        </span>
        <span className="px-2 py-1 rounded-full bg-blue-900/40 text-blue-400 text-xs border border-blue-800/50">
          Water {waterL.toFixed(1)}L
        </span>
      </div>
    </div>
  );
}
