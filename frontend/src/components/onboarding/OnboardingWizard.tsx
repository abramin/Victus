import { useState } from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '../../api/types';
import { BasicInfoStep } from './BasicInfoStep';
import { ActivityGoalsStep } from './ActivityGoalsStep';
import { FuelMixtureStep } from './FuelMixtureStep';
import { TypewriterText } from './primitives/TypewriterText';
import { SegmentedLoader } from './primitives/SegmentedLoader';
import { CARB_KCAL_PER_G, PROTEIN_KCAL_PER_G, FAT_KCAL_PER_G } from '../../constants';

interface OnboardingWizardProps {
  onComplete: (profile: UserProfile) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}

export interface OnboardingData {
  // Step 1: Basic Information
  fullName: string;
  age: number;
  gender: 'male' | 'female';
  weightKg: number;
  heightCm: number;

  // Step 2: Activity & Goals
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose_weight' | 'maintain' | 'gain_weight';

  // Step 3: Nutrition Targets
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const DEFAULT_DATA: OnboardingData = {
  fullName: '',
  age: 30,
  gender: 'male',
  weightKg: 70,
  heightCm: 170,
  activityLevel: 'moderate',
  goal: 'maintain',
  dailyCalories: 2000,
  proteinG: 150,
  carbsG: 200,
  fatG: 70,
};

const STEPS = ['Basic Information', 'Activity & Goals', 'Nutrition Targets'];

export function OnboardingWizard({ onComplete, saving, error }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    // Convert onboarding data to UserProfile
    const totalCalories = data.dailyCalories;
    const carbCalories = data.carbsG * CARB_KCAL_PER_G;
    const proteinCalories = data.proteinG * PROTEIN_KCAL_PER_G;
    const fatCalories = data.fatG * FAT_KCAL_PER_G;
    const totalMacroCalories = carbCalories + proteinCalories + fatCalories;

    // Calculate ratios from gram inputs
    const carbRatio = totalMacroCalories > 0 ? carbCalories / totalMacroCalories : 0.4;
    const proteinRatio = totalMacroCalories > 0 ? proteinCalories / totalMacroCalories : 0.3;
    const fatRatio = totalMacroCalories > 0 ? fatCalories / totalMacroCalories : 0.3;

    // Calculate birth date from age
    const today = new Date();
    const birthYear = today.getFullYear() - data.age;
    const birthDate = `${birthYear}-01-01`;

    const profile: UserProfile = {
      height_cm: data.heightCm,
      birthDate,
      sex: data.gender,
      goal: data.goal,
      currentWeightKg: data.weightKg,
      targetWeightKg: data.weightKg, // Start with current weight as target
      timeframeWeeks: 12,
      targetWeeklyChangeKg: 0,
      carbRatio,
      proteinRatio,
      fatRatio,
      mealRatios: { breakfast: 0.3, lunch: 0.3, dinner: 0.4 },
      pointsConfig: { carbMultiplier: 1.15, proteinMultiplier: 4.35, fatMultiplier: 3.5 },
      supplementConfig: { maltodextrinG: 0, wheyG: 0, collagenG: 0 },
      fruitTargetG: 600,
      veggieTargetG: 500,
    };

    await onComplete(profile);
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-12 relative">
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent h-32 animate-scanline" />
      </div>

      {/* Content with z-index layering */}
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Header */}
        <div className="text-center mb-8">
        <TypewriterText
          text="INITIALIZING VICTUS_OS // USER_CALIBRATION"
          className="text-3xl font-bold mb-2"
        />
        <p className="text-gray-400">Let's set up your nutrition profile to get started</p>
      </div>

      {/* Progress Indicator */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-mono text-emerald-400">
            STEP_{currentStep + 1}_OF_{STEPS.length}
          </span>
          <span className="text-sm font-mono text-emerald-400">
            {Math.round(progressPercent)}% COMPLETE
          </span>
        </div>
        <SegmentedLoader progress={progressPercent} />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl bg-gray-900/50 rounded-2xl border border-gray-800 p-8">
        {currentStep === 0 && (
          <BasicInfoStep data={data} onChange={updateData} />
        )}
        {currentStep === 1 && (
          <ActivityGoalsStep data={data} onChange={updateData} />
        )}
        {currentStep === 2 && (
          <FuelMixtureStep data={data} onChange={updateData} />
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            Previous
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Next
            </button>
          ) : (
            <motion.button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-mono font-medium tracking-wide hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed animate-engage-pulse"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? '> ENGAGING...' : '[ ENGAGE SYSTEMS ]'}
            </motion.button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
