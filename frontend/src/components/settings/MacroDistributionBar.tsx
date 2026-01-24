import { useMemo } from 'react';
import { DistributionBar } from '../common/DistributionBar';
import {
  CARB_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
  FAT_KCAL_PER_G,
} from '../../constants';

interface MacroDistributionBarProps {
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  onChange: (carb: number, protein: number, fat: number) => void;
  error?: string;
  estimatedCalories?: number;
  weightKg?: number;
}

// Calculate grams from ratios and estimated calories
function ratiosToGrams(
  calories: number,
  carbRatio: number,
  proteinRatio: number,
  fatRatio: number
) {
  const carbCals = calories * carbRatio;
  const proteinCals = calories * proteinRatio;
  const fatCals = calories * fatRatio;

  return {
    carbsG: Math.round(carbCals / CARB_KCAL_PER_G),
    proteinG: Math.round(proteinCals / PROTEIN_KCAL_PER_G),
    fatsG: Math.round(fatCals / FAT_KCAL_PER_G),
  };
}

export function MacroDistributionBar({
  carbRatio,
  proteinRatio,
  fatRatio,
  onChange,
  error,
  estimatedCalories = 2000,
  weightKg = 75,
}: MacroDistributionBarProps) {
  // Calculate grams and derived values
  const derivedValues = useMemo(() => {
    const grams = ratiosToGrams(estimatedCalories, carbRatio, proteinRatio, fatRatio);
    const totalCalories = Math.round(
      grams.carbsG * CARB_KCAL_PER_G +
        grams.proteinG * PROTEIN_KCAL_PER_G +
        grams.fatsG * FAT_KCAL_PER_G
    );

    return {
      ...grams,
      totalCalories,
      carbsPerKg: weightKg > 0 ? (grams.carbsG / weightKg).toFixed(1) : '0',
      proteinPerKg: weightKg > 0 ? (grams.proteinG / weightKg).toFixed(1) : '0',
      fatsPerKg: weightKg > 0 ? (grams.fatsG / weightKg).toFixed(1) : '0',
    };
  }, [carbRatio, proteinRatio, fatRatio, estimatedCalories, weightKg]);

  const carbPct = carbRatio * 100;
  const proteinPct = proteinRatio * 100;
  const fatPct = fatRatio * 100;

  return (
    <div className="space-y-4">
      <DistributionBar
        title="Daily Macros"
        hint="Drag the handles to adjust macro distribution"
        segments={[
          { label: 'Carbs', value: carbRatio, color: 'bg-amber-500/80' },
          { label: 'Protein', value: proteinRatio, color: 'bg-purple-500/80' },
          { label: 'Fats', value: fatRatio, color: 'bg-red-500/80' },
        ]}
        onChange={([c, p, f]) => onChange(c, p, f)}
        error={error}
      />

      {/* Derived Values Display */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        {/* Hero: Total Calories */}
        <div className="text-center mb-4 pb-4 border-b border-slate-700">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Daily Target</div>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            {derivedValues.totalCalories.toLocaleString()}
          </div>
          <div className="text-sm text-slate-400 mt-1">kcal</div>
        </div>

        <div className="text-sm text-slate-400 mb-3">Macro Breakdown</div>

        {/* Macro Breakdown Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Carbs */}
          <div className="space-y-1">
            <div className="text-amber-400 font-medium">{derivedValues.carbsG}g</div>
            <div className="text-xs text-slate-500">{carbPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-500">{derivedValues.carbsPerKg} g/kg</div>
            <div className="text-xs text-slate-600">Carbs</div>
          </div>

          {/* Protein */}
          <div className="space-y-1">
            <div className="text-purple-400 font-medium">{derivedValues.proteinG}g</div>
            <div className="text-xs text-slate-500">{proteinPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-500">{derivedValues.proteinPerKg} g/kg</div>
            <div className="text-xs text-slate-600">Protein</div>
          </div>

          {/* Fats */}
          <div className="space-y-1">
            <div className="text-red-400 font-medium">{derivedValues.fatsG}g</div>
            <div className="text-xs text-slate-500">{fatPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-500">{derivedValues.fatsPerKg} g/kg</div>
            <div className="text-xs text-slate-600">Fats</div>
          </div>
        </div>

        {/* Protein per kg indicator */}
        {weightKg > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Protein target:</span>
              <span
                className={`text-xs font-medium ${
                  Number(derivedValues.proteinPerKg) >= 1.6
                    ? 'text-green-400'
                    : Number(derivedValues.proteinPerKg) >= 1.2
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {derivedValues.proteinPerKg} g/kg
                {Number(derivedValues.proteinPerKg) >= 1.6 && ' ✓ Optimal'}
                {Number(derivedValues.proteinPerKg) < 1.6 &&
                  Number(derivedValues.proteinPerKg) >= 1.2 &&
                  ' Moderate'}
                {Number(derivedValues.proteinPerKg) < 1.2 && ' Below recommended'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}