import { PROTEIN_KCAL_PER_G, CARB_KCAL_PER_G, FAT_KCAL_PER_G } from '../../constants';

interface MacroStackedBarProps {
  proteinG: number;
  carbsG: number;
  fatsG: number;
  /**
   * Show percentage labels on the bar segments
   */
  showLabels?: boolean;
  /**
   * Height in pixels
   */
  height?: number;
}

/**
 * Compact horizontal stacked bar showing daily macro distribution.
 * Replaces the three large meal blocks with a single visual summary.
 * Colors: Protein (blue) | Carbs (orange) | Fat (yellow)
 */
export function MacroStackedBar({
  proteinG,
  carbsG,
  fatsG,
  showLabels = true,
  height = 24,
}: MacroStackedBarProps) {
  // Calculate calories from grams
  const proteinCal = proteinG * PROTEIN_KCAL_PER_G;
  const carbsCal = carbsG * CARB_KCAL_PER_G;
  const fatsCal = fatsG * FAT_KCAL_PER_G;
  const totalCal = proteinCal + carbsCal + fatsCal;

  // Calculate percentages with NaN safety
  const proteinPct = totalCal > 0 && !isNaN(proteinCal) ? (proteinCal / totalCal) * 100 : 0;
  const carbsPct = totalCal > 0 && !isNaN(carbsCal) ? (carbsCal / totalCal) * 100 : 0;
  const fatsPct = totalCal > 0 && !isNaN(fatsCal) ? (fatsCal / totalCal) * 100 : 0;

  // Don't render if no data
  if (totalCal === 0) {
    return (
      <div
        className="w-full bg-gray-800 rounded flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <span className="text-xs text-gray-500">No data</span>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* Stacked Bar */}
      <div
        className="w-full flex overflow-hidden rounded"
        style={{ height: `${height}px` }}
      >
        {/* Protein Segment (Blue) */}
        <div
          className="bg-blue-500 flex items-center justify-center relative"
          style={{ width: `${proteinPct}%` }}
        >
          {showLabels && proteinPct > 10 && (
            <span className="text-[10px] font-bold text-white z-10">
              {Math.round(proteinPct)}%
            </span>
          )}
        </div>

        {/* Carbs Segment (Orange) */}
        <div
          className="bg-orange-500 flex items-center justify-center relative"
          style={{ width: `${carbsPct}%` }}
        >
          {showLabels && carbsPct > 10 && (
            <span className="text-[10px] font-bold text-white z-10">
              {Math.round(carbsPct)}%
            </span>
          )}
        </div>

        {/* Fat Segment (Yellow) */}
        <div
          className="bg-yellow-500 flex items-center justify-center relative"
          style={{ width: `${fatsPct}%` }}
        >
          {showLabels && fatsPct > 10 && (
            <span className="text-[10px] font-bold text-white z-10">
              {Math.round(fatsPct)}%
            </span>
          )}
        </div>
      </div>

      {/* Legend below */}
      <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-400">Protein</span>
          <span className="text-white font-medium">{proteinG}g</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-gray-400">Carbs</span>
          <span className="text-white font-medium">{carbsG}g</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-gray-400">Fat</span>
          <span className="text-white font-medium">{fatsG}g</span>
        </div>
      </div>
    </div>
  );
}
