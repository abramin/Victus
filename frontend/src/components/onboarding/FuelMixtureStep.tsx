import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingData } from './OnboardingWizard';
import { LiquidTank } from './primitives/LiquidTank';

interface FuelMixtureStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

// Max values for each macro tank (reasonable upper bounds)
const MAX_VALUES = {
  protein: 350,
  carbs: 500,
  fat: 200,
};

export function FuelMixtureStep({ data, onChange }: FuelMixtureStepProps) {
  // Calculate recommended calories based on profile
  const recommendedCalories = useMemo(() => {
    // Mifflin-St Jeor BMR formula
    let bmr: number;
    if (data.gender === 'male') {
      bmr = 10 * data.weightKg + 6.25 * data.heightCm - 5 * data.age + 5;
    } else {
      bmr = 10 * data.weightKg + 6.25 * data.heightCm - 5 * data.age - 161;
    }

    // Apply activity multiplier
    const tdee = bmr * ACTIVITY_MULTIPLIERS[data.activityLevel];

    // Adjust for goal
    if (data.goal === 'lose_weight') {
      return Math.round(tdee - 500);
    } else if (data.goal === 'gain_weight') {
      return Math.round(tdee + 300);
    }
    return Math.round(tdee);
  }, [data.weightKg, data.heightCm, data.age, data.gender, data.activityLevel, data.goal]);

  // Calculate total calories from macros
  const totalMacroCalories = useMemo(() => {
    const carbCal = data.carbsG * 4;
    const proteinCal = data.proteinG * 4;
    const fatCal = data.fatG * 9;
    return carbCal + proteinCal + fatCal;
  }, [data.carbsG, data.proteinG, data.fatG]);

  // Calculate macro percentages from gram values
  const macroPercentages = useMemo(() => {
    const carbCal = data.carbsG * 4;
    const proteinCal = data.proteinG * 4;
    const fatCal = data.fatG * 9;
    const total = carbCal + proteinCal + fatCal;

    if (total === 0) return { carbs: 40, protein: 30, fat: 30 };

    return {
      protein: Math.round((proteinCal / total) * 100),
      carbs: Math.round((carbCal / total) * 100),
      fat: Math.round((fatCal / total) * 100),
    };
  }, [data.carbsG, data.proteinG, data.fatG]);

  const handleRecalibrate = () => {
    // Guard against invalid calculations - ensure minimum 1200 calories
    const calories = Math.max(1200, recommendedCalories);

    // Default macro split: 40% carbs, 30% protein, 30% fat
    const proteinG = Math.max(0, Math.round((calories * 0.3) / 4));
    const carbsG = Math.max(0, Math.round((calories * 0.4) / 4));
    const fatG = Math.max(0, Math.round((calories * 0.3) / 9));

    onChange({
      dailyCalories: calories,
      proteinG,
      carbsG,
      fatG,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-mono text-sm text-emerald-400 tracking-widest mb-2">
          FUEL_MIXTURE_CALIBRATION
        </h2>
        <p className="text-gray-500 text-sm font-mono">
          Drag tanks or enter values to configure macro ratios
        </p>
      </div>

      {/* Recalibrate Button */}
      <motion.button
        type="button"
        onClick={handleRecalibrate}
        className="w-full px-4 py-3 bg-slate-900 border border-emerald-500/30 rounded-lg font-mono text-sm text-emerald-400 hover:bg-slate-800 hover:border-emerald-500/50 transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {'> RECALIBRATE_FROM_PROFILE'}
      </motion.button>

      {/* Liquid Tanks */}
      <div className="flex justify-center items-end gap-8 py-6">
        <LiquidTank
          label="PROTEIN"
          value={data.proteinG}
          maxValue={MAX_VALUES.protein}
          color="purple"
          onChange={(value) => onChange({ proteinG: value })}
        />
        <LiquidTank
          label="CARBS"
          value={data.carbsG}
          maxValue={MAX_VALUES.carbs}
          color="blue"
          onChange={(value) => onChange({ carbsG: value })}
        />
        <LiquidTank
          label="FATS"
          value={data.fatG}
          maxValue={MAX_VALUES.fat}
          color="amber"
          onChange={(value) => onChange({ fatG: value })}
        />
      </div>

      {/* Macro Percentages */}
      <div className="flex justify-center gap-6 font-mono text-xs">
        <span className="text-purple-400">{macroPercentages.protein}%</span>
        <span className="text-blue-400">{macroPercentages.carbs}%</span>
        <span className="text-amber-400">{macroPercentages.fat}%</span>
      </div>

      {/* Total Energy Display */}
      <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-slate-400">TOTAL_ENERGY</span>
          <span className="font-mono text-2xl text-white">
            {totalMacroCalories.toLocaleString()}
            <span className="text-slate-500 text-sm ml-2">kcal</span>
          </span>
        </div>
        <div className="mt-2 flex justify-between text-xs font-mono text-slate-500">
          <span>TARGET: {data.dailyCalories.toLocaleString()} kcal</span>
          <span
            className={
              Math.abs(totalMacroCalories - data.dailyCalories) < 100
                ? 'text-emerald-400'
                : 'text-amber-400'
            }
          >
            {totalMacroCalories > data.dailyCalories ? '+' : ''}
            {totalMacroCalories - data.dailyCalories} kcal
          </span>
        </div>
      </div>
    </div>
  );
}
