import type { DailyTargets, MacroPoints, DayType } from '../../api/types';
import { Card } from '../common/Card';

interface DailyTargetsDisplayProps {
  targets: DailyTargets;
  estimatedTDEE: number;
  date: string;
}

function DayTypeBadge({ dayType }: { dayType: DayType }) {
  const styles = {
    performance: 'bg-green-900/50 text-green-300 border-green-700',
    fatburner: 'bg-orange-900/50 text-orange-300 border-orange-700',
    metabolize: 'bg-purple-900/50 text-purple-300 border-purple-700',
  };

  const labels = {
    performance: 'Performance Day',
    fatburner: 'Fat Burner Day',
    metabolize: 'Metabolize Day',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[dayType]}`}>
      {labels[dayType]}
    </span>
  );
}

function MealCard({ title, points }: { title: string; points: MacroPoints }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
      <h4 className="text-lg font-medium text-slate-200 mb-3">{title}</h4>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-2xl font-bold text-amber-400">{points.carbs}</div>
          <div className="text-xs text-slate-400 uppercase">Carbs</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400">{points.protein}</div>
          <div className="text-xs text-slate-400 uppercase">Protein</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400">{points.fats}</div>
          <div className="text-xs text-slate-400 uppercase">Fats</div>
        </div>
      </div>
    </div>
  );
}

function MacroProgressBar({
  label,
  grams,
  calories,
  totalCalories,
  color
}: {
  label: string;
  grams: number;
  calories: number;
  totalCalories: number;
  color: string;
}) {
  const percentage = totalCalories > 0 ? Math.round((calories / totalCalories) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={color}>{label}</span>
        <span className="text-slate-400">{grams}g ({percentage}%)</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            label === 'Carbs' ? 'bg-amber-500' :
            label === 'Protein' ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MacroSummary({ targets }: { targets: DailyTargets }) {
  const carbCalories = targets.totalCarbsG * 4;
  const proteinCalories = targets.totalProteinG * 4;
  const fatCalories = targets.totalFatsG * 9;

  return (
    <div className="space-y-6">
      {/* Total Calories Display */}
      <div className="text-center">
        <div className="text-4xl font-bold text-slate-100">{targets.totalCalories}</div>
        <div className="text-sm text-slate-400">Total Calories</div>
      </div>

      {/* Macro Numbers Grid */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-amber-400">{targets.totalCarbsG}g</div>
          <div className="text-xs text-slate-400">Carbs</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400">{targets.totalProteinG}g</div>
          <div className="text-xs text-slate-400">Protein</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-400">{targets.totalFatsG}g</div>
          <div className="text-xs text-slate-400">Fats</div>
        </div>
      </div>

      {/* Visual Progress Bars */}
      <div className="space-y-3 pt-2">
        <MacroProgressBar
          label="Carbs"
          grams={targets.totalCarbsG}
          calories={carbCalories}
          totalCalories={targets.totalCalories}
          color="text-amber-400"
        />
        <MacroProgressBar
          label="Protein"
          grams={targets.totalProteinG}
          calories={proteinCalories}
          totalCalories={targets.totalCalories}
          color="text-red-400"
        />
        <MacroProgressBar
          label="Fats"
          grams={targets.totalFatsG}
          calories={fatCalories}
          totalCalories={targets.totalCalories}
          color="text-blue-400"
        />
      </div>
    </div>
  );
}

export function DailyTargetsDisplay({ targets, estimatedTDEE, date }: DailyTargetsDisplayProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Today's Targets</h1>
        <p className="text-slate-400">{formattedDate}</p>
        <div className="mt-3">
          <DayTypeBadge dayType={targets.dayType} />
        </div>
      </div>

      {/* Macro Summary */}
      <Card>
        <MacroSummary targets={targets} />
      </Card>

      {/* Meal Breakdown */}
      <Card title="Meal Points">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MealCard title="Breakfast" points={targets.meals.breakfast} />
          <MealCard title="Lunch" points={targets.meals.lunch} />
          <MealCard title="Dinner" points={targets.meals.dinner} />
        </div>
      </Card>

      {/* Additional Targets */}
      <Card title="Additional Targets">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">{targets.fruitG}g</div>
            <div className="text-sm text-slate-400">Fruit</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{targets.veggiesG}g</div>
            <div className="text-sm text-slate-400">Vegetables</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-400">{targets.waterL}L</div>
            <div className="text-sm text-slate-400">Water</div>
          </div>
        </div>
      </Card>

      {/* TDEE Info */}
      <div className="text-center text-sm text-slate-500">
        Estimated TDEE: {estimatedTDEE} kcal
      </div>
    </div>
  );
}
