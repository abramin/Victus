interface MacroTarget {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface ConsumedMacros {
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  fruitVegCarbsG?: number;
}

interface RemainingBudgetProps {
  targets: MacroTarget;
  consumed: ConsumedMacros;
}

interface BudgetItemProps {
  label: string;
  remaining: number;
  colorClass: string;
}

function BudgetItem({ label, remaining, colorClass }: BudgetItemProps) {
  const isOver = remaining < 0;

  return (
    <div className="flex flex-col items-center">
      <span className={`text-xs font-bold ${colorClass} tracking-wider`}>{label}</span>
      <span className={`text-xl font-bold tabular-nums ${isOver ? 'text-red-400' : 'text-white'}`}>
        {isOver ? remaining : `${remaining}g`}
      </span>
    </div>
  );
}

export function RemainingBudget({ targets, consumed }: RemainingBudgetProps) {
  const effectiveCarbs = consumed.totalCarbsG - (consumed.fruitVegCarbsG ?? 0);
  const remaining = {
    protein: targets.proteinG - consumed.totalProteinG,
    carbs: targets.carbsG - effectiveCarbs,
    fat: targets.fatG - consumed.totalFatG,
  };

  return (
    <div className="flex justify-around items-center py-3 px-4 bg-slate-900/60 rounded-lg border border-slate-800">
      <BudgetItem label="PROT" remaining={remaining.protein} colorClass="text-purple-400" />
      <div className="w-px h-8 bg-slate-700" />
      <BudgetItem label="CARB" remaining={remaining.carbs} colorClass="text-orange-400" />
      <div className="w-px h-8 bg-slate-700" />
      <BudgetItem label="FAT" remaining={remaining.fat} colorClass="text-gray-400" />
    </div>
  );
}
