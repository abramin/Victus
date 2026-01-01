interface MealCardProps {
  meal: 'Breakfast' | 'Lunch' | 'Dinner';
  carbPoints: number;
  proteinPoints: number;
  fatPoints: number;
  sharePercent: number;
}

export function MealCard({ meal, carbPoints, proteinPoints, fatPoints, sharePercent }: MealCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">{meal}</h3>
      </div>

      {/* Points Display */}
      <div className="flex items-end gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-500">{carbPoints}</div>
          <div className="text-xs text-gray-500 mt-1">Carbs<br/>Points</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-500">{proteinPoints}</div>
          <div className="text-xs text-gray-500 mt-1">Protein<br/>Points</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-400">{fatPoints}</div>
          <div className="text-xs text-gray-500 mt-1">Fat<br/>Points</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          Share % applied: <span className="text-gray-400">{sharePercent}%</span>
        </span>
        <button className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
          View breakdown
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
