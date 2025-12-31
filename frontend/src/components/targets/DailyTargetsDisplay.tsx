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

function MacroSummary({ targets }: { targets: DailyTargets }) {
  return (
    <div className="grid grid-cols-4 gap-4 text-center">
      <div>
        <div className="text-3xl font-bold text-slate-100">{targets.totalCalories}</div>
        <div className="text-sm text-slate-400">Calories</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-amber-400">{targets.totalCarbsG}g</div>
        <div className="text-sm text-slate-400">Carbs</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-red-400">{targets.totalProteinG}g</div>
        <div className="text-sm text-slate-400">Protein</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-blue-400">{targets.totalFatsG}g</div>
        <div className="text-sm text-slate-400">Fats</div>
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
