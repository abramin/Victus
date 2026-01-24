interface MacroBarChartProps {
  /** Carbohydrate grams */
  carbsG: number;
  /** Protein grams */
  proteinG: number;
  /** Fat grams */
  fatsG: number;
  /** Show gram labels below the bar */
  showLabels?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Simple horizontal stacked bar chart showing macro distribution.
 * Colors: amber (carbs), red (protein), blue (fats)
 */
export function MacroBarChart({
  carbsG,
  proteinG,
  fatsG,
  showLabels = true,
  className = '',
}: MacroBarChartProps) {
  const total = carbsG + proteinG + fatsG;

  if (total === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="h-3 bg-gray-700 rounded-full" />
        {showLabels && (
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>No macro data</span>
          </div>
        )}
      </div>
    );
  }

  const carbPercent = (carbsG / total) * 100;
  const proteinPercent = (proteinG / total) * 100;
  const fatPercent = (fatsG / total) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Stacked Bar */}
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
        {carbPercent > 0 && (
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${carbPercent}%` }}
          />
        )}
        {proteinPercent > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${proteinPercent}%` }}
          />
        )}
        {fatPercent > 0 && (
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${fatPercent}%` }}
          />
        )}
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="flex justify-between mt-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-gray-400">Carbs</span>
            <span className="text-white font-medium">{carbsG}g</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-400">Protein</span>
            <span className="text-white font-medium">{proteinG}g</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-400">Fats</span>
            <span className="text-white font-medium">{fatsG}g</span>
          </div>
        </div>
      )}
    </div>
  );
}
