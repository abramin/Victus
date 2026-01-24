import { Panel } from '../common/Panel';

interface MealCardProps {
  meal: 'Breakfast' | 'Lunch' | 'Dinner';
  carbPoints: number;
  proteinPoints: number;
  fatPoints: number;
  carbGrams?: number;
  proteinGrams?: number;
  fatGrams?: number;
  totalKcal?: number;
  onViewBreakdown?: () => void;
}

export function MealCard({
  meal,
  carbPoints,
  proteinPoints,
  fatPoints,
  carbGrams,
  proteinGrams,
  fatGrams,
  totalKcal,
  onViewBreakdown,
}: MealCardProps) {
  return (
    <Panel>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">{meal}</h3>
        {totalKcal !== undefined && (
          <span className="text-gray-400 text-sm font-medium">{totalKcal} kcal</span>
        )}
      </div>

      {/* Points Display */}
      <div className="flex items-end gap-4 mb-4">
        <div className="text-center flex-1">
          <div className="text-3xl font-bold text-purple-500">{proteinPoints}</div>
          <div className="text-xs text-gray-500 mt-1">PROT</div>
          {proteinGrams !== undefined && (
            <div className="text-xs text-gray-600">({proteinGrams}g)</div>
          )}
        </div>
        <div className="text-center flex-1">
          <div className="text-3xl font-bold text-orange-500">{carbPoints}</div>
          <div className="text-xs text-gray-500 mt-1">CARB</div>
          {carbGrams !== undefined && (
            <div className="text-xs text-gray-600">({carbGrams}g)</div>
          )}
        </div>
        <div className="text-center flex-1">
          <div className="text-3xl font-bold text-gray-400">{fatPoints}</div>
          <div className="text-xs text-gray-500 mt-1">FAT</div>
          {fatGrams !== undefined && (
            <div className="text-xs text-gray-600">({fatGrams}g)</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end text-sm">
        <button
          onClick={onViewBreakdown}
          className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View breakdown
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Panel>
  );
}
