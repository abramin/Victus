import { useMemo, useState, useEffect } from 'react';
import { NumberInput } from '../common/NumberInput';
import {
  ProteinGuardrailIndicator,
  FatGuardrailIndicator,
} from '../common/GuardrailIndicator';
import {
  CARB_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
  FAT_KCAL_PER_G,
} from '../../constants';

interface MacroGramsInputProps {
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
  // Calculate calories per macro
  const carbCals = calories * carbRatio;
  const proteinCals = calories * proteinRatio;
  const fatCals = calories * fatRatio;

  return {
    carbsG: Math.round(carbCals / CARB_KCAL_PER_G),
    proteinG: Math.round(proteinCals / PROTEIN_KCAL_PER_G),
    fatsG: Math.round(fatCals / FAT_KCAL_PER_G),
  };
}

// Calculate ratios from grams and total calories
function gramsToRatios(carbsG: number, proteinG: number, fatsG: number) {
  const carbCals = carbsG * CARB_KCAL_PER_G;
  const proteinCals = proteinG * PROTEIN_KCAL_PER_G;
  const fatCals = fatsG * FAT_KCAL_PER_G;
  const totalCals = carbCals + proteinCals + fatCals;

  if (totalCals === 0) {
    return { carbRatio: 0.45, proteinRatio: 0.30, fatRatio: 0.25 };
  }

  return {
    carbRatio: carbCals / totalCals,
    proteinRatio: proteinCals / totalCals,
    fatRatio: fatCals / totalCals,
  };
}

// Calculate total calories from grams
function gramsToCalories(carbsG: number, proteinG: number, fatsG: number): number {
  return Math.round(
    carbsG * CARB_KCAL_PER_G + proteinG * PROTEIN_KCAL_PER_G + fatsG * FAT_KCAL_PER_G
  );
}

export function MacroGramsInput({
  carbRatio,
  proteinRatio,
  fatRatio,
  onChange,
  error,
  estimatedCalories = 2000,
  weightKg = 75,
}: MacroGramsInputProps) {
  const ratioSum = carbRatio + proteinRatio + fatRatio;
  const ratioTotalPercent = ratioSum * 100;
  const ratioValid = Math.abs(ratioSum - 1) <= 0.01;
  const ratioPercents = {
    carbs: Number((carbRatio * 100).toFixed(1)),
    protein: Number((proteinRatio * 100).toFixed(1)),
    fats: Number((fatRatio * 100).toFixed(1)),
  };

  // Convert ratios to grams for initial state
  const initialGrams = useMemo(() => {
    return ratiosToGrams(estimatedCalories, carbRatio, proteinRatio, fatRatio);
  }, [estimatedCalories, carbRatio, proteinRatio, fatRatio]);

  const [carbsG, setCarbsG] = useState(initialGrams.carbsG);
  const [proteinG, setProteinG] = useState(initialGrams.proteinG);
  const [fatsG, setFatsG] = useState(initialGrams.fatsG);
  const [inputMode, setInputMode] = useState<'grams' | 'ratios'>('grams');

  // Sync with external ratio changes (e.g., when loading profile)
  useEffect(() => {
    if (inputMode === 'ratios') {
      const newGrams = ratiosToGrams(estimatedCalories, carbRatio, proteinRatio, fatRatio);
      setCarbsG(newGrams.carbsG);
      setProteinG(newGrams.proteinG);
      setFatsG(newGrams.fatsG);
    }
  }, [carbRatio, proteinRatio, fatRatio, estimatedCalories, inputMode]);

  // Calculate derived values
  const derivedValues = useMemo(() => {
    const totalCalories = gramsToCalories(carbsG, proteinG, fatsG);
    const ratios = gramsToRatios(carbsG, proteinG, fatsG);

    return {
      totalCalories,
      carbPercent: Math.round(ratios.carbRatio * 100),
      proteinPercent: Math.round(ratios.proteinRatio * 100),
      fatPercent: Math.round(ratios.fatRatio * 100),
      carbsPerKg: weightKg > 0 ? (carbsG / weightKg).toFixed(1) : '0',
      proteinPerKg: weightKg > 0 ? (proteinG / weightKg).toFixed(1) : '0',
      fatsPerKg: weightKg > 0 ? (fatsG / weightKg).toFixed(1) : '0',
    };
  }, [carbsG, proteinG, fatsG, weightKg]);

  // Validate percentages sum to ~100%
  const percentSum = derivedValues.carbPercent + derivedValues.proteinPercent + derivedValues.fatPercent;
  const gramsValid = percentSum >= 99 && percentSum <= 101;
  const isValid = inputMode === 'ratios' ? ratioValid : gramsValid;

  const displayPercents =
    inputMode === 'ratios'
      ? {
          carbs: ratioPercents.carbs,
          protein: ratioPercents.protein,
          fats: ratioPercents.fats,
        }
      : {
          carbs: derivedValues.carbPercent,
          protein: derivedValues.proteinPercent,
          fats: derivedValues.fatPercent,
        };

  const formatPercent = (value: number) => (Number.isInteger(value) ? `${value}` : value.toFixed(1));

  // Handle gram changes and update parent with ratios
  const handleGramChange = (type: 'carbs' | 'protein' | 'fats', value: number) => {
    let newCarbs = carbsG;
    let newProtein = proteinG;
    let newFats = fatsG;

    switch (type) {
      case 'carbs':
        newCarbs = value;
        setCarbsG(value);
        break;
      case 'protein':
        newProtein = value;
        setProteinG(value);
        break;
      case 'fats':
        newFats = value;
        setFatsG(value);
        break;
    }

    // Convert to ratios and notify parent
    const ratios = gramsToRatios(newCarbs, newProtein, newFats);
    onChange(ratios.carbRatio, ratios.proteinRatio, ratios.fatRatio);
  };

  const handleRatioChange = (type: 'carbs' | 'protein' | 'fats', value: number) => {
    const clamp = (val: number) => Math.min(100, Math.max(0, val));
    const nextCarbs = type === 'carbs' ? clamp(value) / 100 : carbRatio;
    const nextProtein = type === 'protein' ? clamp(value) / 100 : proteinRatio;
    const nextFats = type === 'fats' ? clamp(value) / 100 : fatRatio;

    onChange(nextCarbs, nextProtein, nextFats);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Daily Macros</h3>
        <div className="flex items-center gap-2">
          {inputMode === 'ratios' && (
            <span className={`text-sm ${ratioValid ? 'text-green-400' : 'text-red-400'}`}>
              Total: {formatPercent(ratioTotalPercent)}%
            </span>
          )}
          <button
            type="button"
            onClick={() => setInputMode('grams')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              inputMode === 'grams'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            Grams
          </button>
          <button
            type="button"
            onClick={() => setInputMode('ratios')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              inputMode === 'ratios'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            Percentages
          </button>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-3 gap-4">
        <NumberInput
          label="Carbohydrates"
          value={inputMode === 'grams' ? carbsG : ratioPercents.carbs}
          onChange={(v) =>
            inputMode === 'grams' ? handleGramChange('carbs', v) : handleRatioChange('carbs', v)
          }
          min={0}
          max={inputMode === 'grams' ? 1000 : 100}
          step={inputMode === 'grams' ? 5 : 1}
          unit={inputMode === 'grams' ? 'g' : '%'}
          testId="carbs-input"
        />
        <NumberInput
          label="Protein"
          value={inputMode === 'grams' ? proteinG : ratioPercents.protein}
          onChange={(v) =>
            inputMode === 'grams'
              ? handleGramChange('protein', v)
              : handleRatioChange('protein', v)
          }
          min={0}
          max={inputMode === 'grams' ? 500 : 100}
          step={inputMode === 'grams' ? 5 : 1}
          unit={inputMode === 'grams' ? 'g' : '%'}
          testId="protein-input"
        />
        <NumberInput
          label="Fats"
          value={inputMode === 'grams' ? fatsG : ratioPercents.fats}
          onChange={(v) =>
            inputMode === 'grams' ? handleGramChange('fats', v) : handleRatioChange('fats', v)
          }
          min={0}
          max={inputMode === 'grams' ? 300 : 100}
          step={inputMode === 'grams' ? 5 : 1}
          unit={inputMode === 'grams' ? 'g' : '%'}
          testId="fats-input"
        />
      </div>

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
          <div className="text-amber-400 font-medium">{carbsG}g</div>
          <div className="text-xs text-slate-500">{formatPercent(displayPercents.carbs)}%</div>
          <div className="text-xs text-slate-500">{derivedValues.carbsPerKg} g/kg</div>
          <div className="text-xs text-slate-600">Carbs</div>
        </div>

          {/* Protein */}
          <div className="space-y-1">
          <div className="text-purple-400 font-medium">{proteinG}g</div>
          <div className="text-xs text-slate-500">{formatPercent(displayPercents.protein)}%</div>
          <div className="text-xs text-slate-500">{derivedValues.proteinPerKg} g/kg</div>
          <div className="text-xs text-slate-600">Protein</div>
        </div>

          {/* Fats */}
          <div className="space-y-1">
          <div className="text-red-400 font-medium">{fatsG}g</div>
          <div className="text-xs text-slate-500">{formatPercent(displayPercents.fats)}%</div>
          <div className="text-xs text-slate-500">{derivedValues.fatsPerKg} g/kg</div>
          <div className="text-xs text-slate-600">Fats</div>
        </div>
      </div>

        {/* Macro guardrail indicators */}
        {weightKg > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
            <ProteinGuardrailIndicator value={Number(derivedValues.proteinPerKg)} />
            <FatGuardrailIndicator value={Number(derivedValues.fatsPerKg)} />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!isValid && !error && inputMode === 'ratios' && (
        <p className="text-sm text-red-400">
          Percentages must total 100%. Adjust carbs, protein, or fats.
        </p>
      )}
      {!isValid && !error && inputMode === 'grams' && (
        <p className="text-sm text-yellow-400">Macro percentages should sum to approximately 100%</p>
      )}
    </div>
  );
}
