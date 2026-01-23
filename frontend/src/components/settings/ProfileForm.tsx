import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, Sex, Goal } from '../../api/types';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { MacroRatiosInput } from './MacroRatiosInput';
import { MealRatiosInput } from './MealRatiosInput';

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  onSave: (profile: UserProfile) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'maintain', label: 'Maintain Weight' },
  { value: 'gain_weight', label: 'Gain Weight' },
];

const DEFAULT_PROFILE: UserProfile = {
  height_cm: 175,
  birthDate: '1990-01-01',
  sex: 'male',
  goal: 'maintain',
  currentWeightKg: 75,
  targetWeightKg: 75,
  timeframeWeeks: 12,
  targetWeeklyChangeKg: 0,
  carbRatio: 0.45,
  proteinRatio: 0.3,
  fatRatio: 0.25,
  mealRatios: { breakfast: 0.3, lunch: 0.3, dinner: 0.4 },
  pointsConfig: { carbMultiplier: 1.15, proteinMultiplier: 4.35, fatMultiplier: 3.5 },
  fruitTargetG: 600,
  veggieTargetG: 500,
};

// Aggressive goal thresholds (kg/week)
const AGGRESSIVE_LOSS_THRESHOLD = 1.0; // > 1 kg/week loss is aggressive
const AGGRESSIVE_GAIN_THRESHOLD = 0.5; // > 0.5 kg/week gain is aggressive

export function ProfileForm({ initialProfile, onSave, saving, error }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile || DEFAULT_PROFILE);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [useManualWeeklyChange, setUseManualWeeklyChange] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  // Calculate derived weekly change from current weight, target weight, and timeframe
  const derivedWeeklyChange = useMemo(() => {
    const current = profile.currentWeightKg || 0;
    const target = profile.targetWeightKg || 0;
    const weeks = profile.timeframeWeeks || 0;

    if (current > 0 && target > 0 && weeks > 0) {
      return (target - current) / weeks;
    }
    return 0;
  }, [profile.currentWeightKg, profile.targetWeightKg, profile.timeframeWeeks]);

  // Check for aggressive goal warning
  const aggressiveGoalWarning = useMemo(() => {
    const weeklyChange = useManualWeeklyChange ? profile.targetWeeklyChangeKg : derivedWeeklyChange;
    if (weeklyChange < -AGGRESSIVE_LOSS_THRESHOLD) {
      return `Losing more than ${AGGRESSIVE_LOSS_THRESHOLD} kg/week may be unsustainable and could lead to muscle loss.`;
    }
    if (weeklyChange > AGGRESSIVE_GAIN_THRESHOLD) {
      return `Gaining more than ${AGGRESSIVE_GAIN_THRESHOLD} kg/week may lead to excess fat gain.`;
    }
    return null;
  }, [profile.targetWeeklyChangeKg, derivedWeeklyChange, useManualWeeklyChange]);

  // Auto-update weekly change when derived values change (unless manual override)
  useEffect(() => {
    if (!useManualWeeklyChange && derivedWeeklyChange !== 0) {
      setProfile((prev) => ({ ...prev, targetWeeklyChangeKg: derivedWeeklyChange }));
    }
  }, [derivedWeeklyChange, useManualWeeklyChange]);

  // Track if profile has changes compared to initial
  const hasChanges = useMemo(() => {
    if (!initialProfile) return true; // New profile always has "changes"
    return JSON.stringify(profile) !== JSON.stringify(initialProfile);
  }, [profile, initialProfile]);

  // Estimate daily calories for macro gram display (simplified Mifflin-St Jeor + moderate activity)
  const estimatedCalories = useMemo(() => {
    const weight = profile.currentWeightKg || profile.targetWeightKg || 75;
    const height = profile.height_cm || 175;

    // Calculate age from birthDate
    const birthDate = profile.birthDate ? new Date(profile.birthDate) : new Date('1990-01-01');
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // Mifflin-St Jeor BMR formula
    let bmr: number;
    if (profile.sex === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply moderate activity multiplier (1.55) and goal adjustment
    let tdee = bmr * 1.55;

    // Adjust for goal
    if (profile.goal === 'lose_weight') {
      tdee -= 500; // Moderate deficit
    } else if (profile.goal === 'gain_weight') {
      tdee += 300; // Moderate surplus
    }

    return Math.round(tdee);
  }, [
    profile.currentWeightKg,
    profile.targetWeightKg,
    profile.height_cm,
    profile.birthDate,
    profile.sex,
    profile.goal,
  ]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (profile.height_cm < 100 || profile.height_cm > 250) {
      errors.height = 'Height must be between 100 and 250 cm';
    }

    if (!profile.birthDate) {
      errors.birthDate = 'Birth date is required';
    }

    if (!profile.sex) {
      errors.sex = 'Sex is required';
    }

    if (!profile.goal) {
      errors.goal = 'Goal is required';
    }

    // Current weight validation (optional but if provided must be valid)
    if (
      profile.currentWeightKg !== undefined &&
      profile.currentWeightKg !== 0 &&
      (profile.currentWeightKg < 30 || profile.currentWeightKg > 300)
    ) {
      errors.currentWeight = 'Current weight must be between 30 and 300 kg';
    }

    if (profile.targetWeightKg < 30 || profile.targetWeightKg > 300) {
      errors.targetWeight = 'Target weight must be between 30 and 300 kg';
    }

    // Timeframe validation (optional but if provided must be valid)
    if (
      profile.timeframeWeeks !== undefined &&
      profile.timeframeWeeks !== 0 &&
      (profile.timeframeWeeks < 1 || profile.timeframeWeeks > 520)
    ) {
      errors.timeframe = 'Timeframe must be between 1 and 520 weeks';
    }

    // Weekly change validation (expanded range to support lb users)
    if (profile.targetWeeklyChangeKg < -2 || profile.targetWeeklyChangeKg > 2) {
      errors.weeklyChange = 'Weekly change must be between -2.0 and 2.0 kg';
    }

    const macroSum = profile.carbRatio + profile.proteinRatio + profile.fatRatio;
    if (Math.abs(macroSum - 1.0) > 0.01) {
      errors.macroRatios = 'Macro ratios must sum to 100%';
    }

    const mealSum =
      profile.mealRatios.breakfast + profile.mealRatios.lunch + profile.mealRatios.dinner;
    if (Math.abs(mealSum - 1.0) > 0.01) {
      errors.mealRatios = 'Meal ratios must sum to 100%';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSave(profile);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Biometrics Section */}
      <Card title="Biometrics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Height"
            value={profile.height_cm}
            onChange={(v) => updateProfile({ height_cm: v })}
            min={100}
            max={250}
            unit="cm"
            error={validationErrors.height}
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Birth Date <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="date"
              value={profile.birthDate.split('T')[0]}
              onChange={(e) => updateProfile({ birthDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {validationErrors.birthDate && (
              <p className="text-sm text-red-400">{validationErrors.birthDate}</p>
            )}
          </div>

          <Select
            label="Sex"
            value={profile.sex}
            onChange={(v) => updateProfile({ sex: v as Sex })}
            options={SEX_OPTIONS}
            error={validationErrors.sex}
            required
          />
        </div>
      </Card>

      {/* Goals Section */}
      <Card title="Goals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Goal"
            value={profile.goal}
            onChange={(v) => updateProfile({ goal: v as Goal })}
            options={GOAL_OPTIONS}
            error={validationErrors.goal}
            required
          />

          <NumberInput
            label="Current Weight"
            value={profile.currentWeightKg || 0}
            onChange={(v) => updateProfile({ currentWeightKg: v })}
            min={30}
            max={300}
            step={0.1}
            unit="kg"
            error={validationErrors.currentWeight}
            required
          />

          <NumberInput
            label="Target Weight"
            value={profile.targetWeightKg}
            onChange={(v) => updateProfile({ targetWeightKg: v })}
            min={30}
            max={300}
            step={0.1}
            unit="kg"
            error={validationErrors.targetWeight}
            required
          />

          <NumberInput
            label="Timeframe"
            value={profile.timeframeWeeks || 0}
            onChange={(v) => updateProfile({ timeframeWeeks: v })}
            min={1}
            max={520}
            step={1}
            unit="weeks"
            error={validationErrors.timeframe}
          />
        </div>

        {/* Derived/Manual Weekly Change */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Weekly Change</label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={useManualWeeklyChange}
                onChange={(e) => setUseManualWeeklyChange(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              Manual override
            </label>
          </div>

          {!useManualWeeklyChange && derivedWeeklyChange !== 0 && (
            <div className="mb-2 text-sm text-slate-400">
              Calculated: {derivedWeeklyChange > 0 ? '+' : ''}
              {derivedWeeklyChange.toFixed(2)} kg/week
            </div>
          )}

          <NumberInput
            label=""
            value={profile.targetWeeklyChangeKg}
            onChange={(v) => {
              setUseManualWeeklyChange(true);
              updateProfile({ targetWeeklyChangeKg: v });
            }}
            min={-2}
            max={2}
            step={0.5}
            unit="kg/week"
            error={validationErrors.weeklyChange}
          />
        </div>

        {/* Aggressive Goal Warning */}
        {aggressiveGoalWarning && (
          <div className="mt-4 p-3 bg-amber-900/50 border border-amber-700 rounded-md">
            <p className="text-sm text-amber-300">{aggressiveGoalWarning}</p>
          </div>
        )}
      </Card>

      {/* Macro Ratios Section */}
      <Card>
        <MacroRatiosInput
          carbRatio={profile.carbRatio}
          proteinRatio={profile.proteinRatio}
          fatRatio={profile.fatRatio}
          onChange={(carb, protein, fat) =>
            updateProfile({ carbRatio: carb, proteinRatio: protein, fatRatio: fat })
          }
          error={validationErrors.macroRatios}
          estimatedCalories={estimatedCalories}
        />
      </Card>

      {/* Meal Ratios Section */}
      <Card>
        <MealRatiosInput
          breakfast={profile.mealRatios.breakfast}
          lunch={profile.mealRatios.lunch}
          dinner={profile.mealRatios.dinner}
          onChange={(b, l, d) => updateProfile({ mealRatios: { breakfast: b, lunch: l, dinner: d } })}
          error={validationErrors.mealRatios}
        />
      </Card>

      {/* Fruit/Veggie Targets */}
      <Card title="Daily Targets">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Fruit Target"
            value={profile.fruitTargetG}
            onChange={(v) => updateProfile({ fruitTargetG: v })}
            min={0}
            max={2000}
            step={50}
            unit="g"
          />

          <NumberInput
            label="Vegetable Target"
            value={profile.veggieTargetG}
            onChange={(v) => updateProfile({ veggieTargetG: v })}
            min={0}
            max={2000}
            step={50}
            unit="g"
          />
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={!hasChanges}>
          Save Profile
        </Button>
      </div>
    </form>
  );
}
