import { useState, useEffect } from 'react';
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
  targetWeightKg: 75,
  targetWeeklyChangeKg: 0,
  carbRatio: 0.45,
  proteinRatio: 0.3,
  fatRatio: 0.25,
  mealRatios: { breakfast: 0.3, lunch: 0.3, dinner: 0.4 },
  pointsConfig: { carbMultiplier: 1.15, proteinMultiplier: 4.35, fatMultiplier: 3.5 },
  fruitTargetG: 600,
  veggieTargetG: 500,
};

export function ProfileForm({ initialProfile, onSave, saving, error }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile || DEFAULT_PROFILE);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

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

    if (profile.targetWeightKg < 30 || profile.targetWeightKg > 300) {
      errors.targetWeight = 'Target weight must be between 30 and 300 kg';
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Goal"
            value={profile.goal}
            onChange={(v) => updateProfile({ goal: v as Goal })}
            options={GOAL_OPTIONS}
            error={validationErrors.goal}
            required
          />

          <NumberInput
            label="Target Weight"
            value={profile.targetWeightKg}
            onChange={(v) => updateProfile({ targetWeightKg: v })}
            min={30}
            max={300}
            step={0.5}
            unit="kg"
            error={validationErrors.targetWeight}
            required
          />

          <NumberInput
            label="Weekly Change"
            value={profile.targetWeeklyChangeKg}
            onChange={(v) => updateProfile({ targetWeeklyChangeKg: v })}
            min={-1}
            max={1}
            step={0.1}
            unit="kg"
          />
        </div>
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
        <Button type="submit" loading={saving}>
          Save Profile
        </Button>
      </div>
    </form>
  );
}
