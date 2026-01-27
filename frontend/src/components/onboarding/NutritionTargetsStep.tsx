import { useMemo } from 'react';
import type { OnboardingData } from './OnboardingWizard';

interface NutritionTargetsStepProps {
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

export function NutritionTargetsStep({ data, onChange }: NutritionTargetsStepProps) {
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

  const handleRecalculate = () => {
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
    <div>
      <h2 className="text-2xl font-semibold text-white mb-2">Nutrition Targets</h2>
      <p className="text-gray-400 mb-6">We've calculated recommended targets based on your profile</p>

      {/* Recalculate Button */}
      <button
        type="button"
        onClick={handleRecalculate}
        className="w-full mb-6 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
      >
        Recalculate Based on Profile
      </button>

      <div className="space-y-6">
        {/* Daily Calories */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Daily Calories</label>
          <div className="relative">
            <input
              type="number"
              value={data.dailyCalories}
              onChange={(e) => onChange({ dailyCalories: parseInt(e.target.value) || 0 })}
              min={1000}
              max={6000}
              step={50}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
              <button
                type="button"
                onClick={() => onChange({ dailyCalories: Math.min(6000, data.dailyCalories + 50) })}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onChange({ dailyCalories: Math.max(1000, data.dailyCalories - 50) })}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Macro Inputs */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Protein (g)</label>
            <div className="relative">
              <input
                type="number"
                value={data.proteinG}
                onChange={(e) => onChange({ proteinG: parseInt(e.target.value) || 0 })}
                min={0}
                max={500}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  type="button"
                  onClick={() => onChange({ proteinG: Math.min(500, data.proteinG + 5) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ proteinG: Math.max(0, data.proteinG - 5) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Carbs (g)</label>
            <div className="relative">
              <input
                type="number"
                value={data.carbsG}
                onChange={(e) => onChange({ carbsG: parseInt(e.target.value) || 0 })}
                min={0}
                max={700}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  type="button"
                  onClick={() => onChange({ carbsG: Math.min(700, data.carbsG + 5) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ carbsG: Math.max(0, data.carbsG - 5) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Fat (g)</label>
            <div className="relative">
              <input
                type="number"
                value={data.fatG}
                onChange={(e) => onChange({ fatG: parseInt(e.target.value) || 0 })}
                min={0}
                max={300}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  type="button"
                  onClick={() => onChange({ fatG: Math.min(300, data.fatG + 5) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ fatG: Math.max(0, data.fatG - 5) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Derived Percentages Display */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-400 mb-1">Protein</div>
              <div className="text-2xl font-semibold text-white">{macroPercentages.protein}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Carbs</div>
              <div className="text-2xl font-semibold text-white">{macroPercentages.carbs}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Fat</div>
              <div className="text-2xl font-semibold text-white">{macroPercentages.fat}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
