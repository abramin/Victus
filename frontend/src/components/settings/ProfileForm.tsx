import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, Sex, Goal, BMREquation, TDEESource } from '../../api/types';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { MacroRatiosInput } from './MacroRatiosInput';
import { MacroGramsInput } from './MacroGramsInput';
import { MealRatiosInput } from './MealRatiosInput';
import { RecalibrationSettings } from './RecalibrationSettings';
import {
  SEX_OPTIONS,
  GOAL_OPTIONS,
  BMR_EQUATION_OPTIONS,
  TDEE_SOURCE_OPTIONS,
  HEIGHT_MIN_CM,
  HEIGHT_MAX_CM,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  WEEKLY_CHANGE_MIN_KG,
  WEEKLY_CHANGE_MAX_KG,
  TIMEFRAME_MIN_WEEKS,
  TIMEFRAME_MAX_WEEKS,
  BODY_FAT_MIN_PERCENT,
  BODY_FAT_MAX_PERCENT,
  TDEE_MIN_KCAL,
  TDEE_MAX_KCAL,
  FRUIT_VEGGIE_MAX_G,
  AGGRESSIVE_LOSS_THRESHOLD_KG,
  AGGRESSIVE_GAIN_THRESHOLD_KG,
  DEFAULT_HEIGHT_CM,
  DEFAULT_WEIGHT_KG,
  DEFAULT_TIMEFRAME_WEEKS,
  DEFAULT_BIRTH_DATE,
  DEFAULT_MACRO_RATIOS,
  DEFAULT_MEAL_RATIOS,
  DEFAULT_POINTS_CONFIG,
  DEFAULT_FRUIT_TARGET_G,
  DEFAULT_VEGGIE_TARGET_G,
  MODERATE_ACTIVITY_MULTIPLIER,
  DEFAULT_DEFICIT_KCAL,
  DEFAULT_SURPLUS_KCAL,
  RECALIBRATION_TOLERANCE_MIN,
  RECALIBRATION_TOLERANCE_MAX,
  RECALIBRATION_TOLERANCE_DEFAULT,
} from '../../constants';

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  onSave: (profile: UserProfile) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  height_cm: DEFAULT_HEIGHT_CM,
  birthDate: DEFAULT_BIRTH_DATE,
  sex: 'male',
  goal: 'maintain',
  currentWeightKg: DEFAULT_WEIGHT_KG,
  targetWeightKg: DEFAULT_WEIGHT_KG,
  timeframeWeeks: DEFAULT_TIMEFRAME_WEEKS,
  targetWeeklyChangeKg: 0,
  carbRatio: DEFAULT_MACRO_RATIOS.carb,
  proteinRatio: DEFAULT_MACRO_RATIOS.protein,
  fatRatio: DEFAULT_MACRO_RATIOS.fat,
  mealRatios: { breakfast: DEFAULT_MEAL_RATIOS.breakfast, lunch: DEFAULT_MEAL_RATIOS.lunch, dinner: DEFAULT_MEAL_RATIOS.dinner },
  pointsConfig: { carbMultiplier: DEFAULT_POINTS_CONFIG.carbMultiplier, proteinMultiplier: DEFAULT_POINTS_CONFIG.proteinMultiplier, fatMultiplier: DEFAULT_POINTS_CONFIG.fatMultiplier },
  supplementConfig: { maltodextrinG: 0, wheyG: 0, collagenG: 0 },
  fruitTargetG: DEFAULT_FRUIT_TARGET_G,
  veggieTargetG: DEFAULT_VEGGIE_TARGET_G,
  bmrEquation: 'mifflin_st_jeor',
  tdeeSource: 'formula',
  recalibrationTolerance: RECALIBRATION_TOLERANCE_DEFAULT,
};

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
    if (weeklyChange < -AGGRESSIVE_LOSS_THRESHOLD_KG) {
      return `Losing more than ${AGGRESSIVE_LOSS_THRESHOLD_KG} kg/week may be unsustainable and could lead to muscle loss.`;
    }
    if (weeklyChange > AGGRESSIVE_GAIN_THRESHOLD_KG) {
      return `Gaining more than ${AGGRESSIVE_GAIN_THRESHOLD_KG} kg/week may lead to excess fat gain.`;
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
    const weight = profile.currentWeightKg || profile.targetWeightKg || DEFAULT_WEIGHT_KG;
    const height = profile.height_cm || DEFAULT_HEIGHT_CM;

    // Calculate age from birthDate
    const birthDate = profile.birthDate ? new Date(profile.birthDate) : new Date(DEFAULT_BIRTH_DATE);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // Mifflin-St Jeor BMR formula
    let bmr: number;
    if (profile.sex === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply moderate activity multiplier and goal adjustment
    let tdee = bmr * MODERATE_ACTIVITY_MULTIPLIER;

    // Adjust for goal
    if (profile.goal === 'lose_weight') {
      tdee -= DEFAULT_DEFICIT_KCAL;
    } else if (profile.goal === 'gain_weight') {
      tdee += DEFAULT_SURPLUS_KCAL;
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

    if (profile.height_cm < HEIGHT_MIN_CM || profile.height_cm > HEIGHT_MAX_CM) {
      errors.height = `Height must be between ${HEIGHT_MIN_CM} and ${HEIGHT_MAX_CM} cm`;
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
      (profile.currentWeightKg < WEIGHT_MIN_KG || profile.currentWeightKg > WEIGHT_MAX_KG)
    ) {
      errors.currentWeight = `Current weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`;
    }

    if (profile.targetWeightKg < WEIGHT_MIN_KG || profile.targetWeightKg > WEIGHT_MAX_KG) {
      errors.targetWeight = `Target weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`;
    }

    // Timeframe validation (optional but if provided must be valid)
    if (
      profile.timeframeWeeks !== undefined &&
      profile.timeframeWeeks !== 0 &&
      (profile.timeframeWeeks < TIMEFRAME_MIN_WEEKS || profile.timeframeWeeks > TIMEFRAME_MAX_WEEKS)
    ) {
      errors.timeframe = `Timeframe must be between ${TIMEFRAME_MIN_WEEKS} and ${TIMEFRAME_MAX_WEEKS} weeks`;
    }

    // Weekly change validation (expanded range to support lb users)
    if (profile.targetWeeklyChangeKg < WEEKLY_CHANGE_MIN_KG || profile.targetWeeklyChangeKg > WEEKLY_CHANGE_MAX_KG) {
      errors.weeklyChange = `Weekly change must be between ${WEEKLY_CHANGE_MIN_KG} and ${WEEKLY_CHANGE_MAX_KG} kg`;
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

    // Body fat percent validation (only required for Katch-McArdle)
    if (
      profile.bmrEquation === 'katch_mcardle' &&
      profile.bodyFatPercent !== undefined &&
      profile.bodyFatPercent !== 0 &&
      (profile.bodyFatPercent < BODY_FAT_MIN_PERCENT || profile.bodyFatPercent > BODY_FAT_MAX_PERCENT)
    ) {
      errors.bodyFatPercent = `Body fat % must be between ${BODY_FAT_MIN_PERCENT}% and ${BODY_FAT_MAX_PERCENT}%`;
    }

    // Manual TDEE validation (required when tdeeSource is 'manual')
    if (profile.tdeeSource === 'manual') {
      if (!profile.manualTDEE || profile.manualTDEE < TDEE_MIN_KCAL || profile.manualTDEE > TDEE_MAX_KCAL) {
        errors.manualTDEE = `Manual TDEE must be between ${TDEE_MIN_KCAL} and ${TDEE_MAX_KCAL} kcal`;
      }
    }

    // Recalibration tolerance validation
    if (
      profile.recalibrationTolerance !== undefined &&
      profile.recalibrationTolerance !== 0 &&
      (profile.recalibrationTolerance < RECALIBRATION_TOLERANCE_MIN ||
        profile.recalibrationTolerance > RECALIBRATION_TOLERANCE_MAX)
    ) {
      errors.recalibrationTolerance = `Tolerance must be between ${RECALIBRATION_TOLERANCE_MIN}% and ${RECALIBRATION_TOLERANCE_MAX}%`;
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
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="profile-form">
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
            testId="height-input"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              Birth Date <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="date"
              value={profile.birthDate.split('T')[0]}
              onChange={(e) => updateProfile({ birthDate: e.target.value })}
              data-testid="birthDate-input"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {validationErrors.birthDate && (
              <p className="text-sm text-red-400" data-testid="birthDate-error">{validationErrors.birthDate}</p>
            )}
          </div>

          <Select
            label="Sex"
            value={profile.sex}
            onChange={(v) => updateProfile({ sex: v as Sex })}
            options={SEX_OPTIONS}
            error={validationErrors.sex}
            required
            testId="sex-select"
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
            testId="goal-select"
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
            testId="currentWeight-input"
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
            testId="targetWeight-input"
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
            testId="timeframe-input"
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
            testId="weeklyChange-input"
          />
        </div>

        {/* Aggressive Goal Warning */}
        {aggressiveGoalWarning && (
          <div className="mt-4 p-3 bg-amber-900/50 border border-amber-700 rounded-md" data-testid="aggressive-goal-warning">
            <p className="text-sm text-amber-300">{aggressiveGoalWarning}</p>
          </div>
        )}
      </Card>

      {/* Macro Ratios Section */}
      <Card>
        <MacroGramsInput
          carbRatio={profile.carbRatio}
          proteinRatio={profile.proteinRatio}
          fatRatio={profile.fatRatio}
          onChange={(carb, protein, fat) =>
            updateProfile({ carbRatio: carb, proteinRatio: protein, fatRatio: fat })
          }
          error={validationErrors.macroRatios}
          estimatedCalories={estimatedCalories}
          weightKg={profile.currentWeightKg || profile.targetWeightKg}
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

      {/* TDEE Configuration Section */}
      <Card title="TDEE Configuration">
        <p className="text-sm text-slate-400 mb-4">
          Configure how your Total Daily Energy Expenditure (TDEE) is calculated. This affects your daily calorie targets.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="BMR Equation"
            value={profile.bmrEquation || 'mifflin_st_jeor'}
            onChange={(v) => updateProfile({ bmrEquation: v as BMREquation })}
            options={BMR_EQUATION_OPTIONS}
            testId="bmrEquation-select"
          />

          {/* Body Fat % - Only shown when Katch-McArdle is selected */}
          {profile.bmrEquation === 'katch_mcardle' && (
            <NumberInput
              label="Body Fat %"
              value={profile.bodyFatPercent || 0}
              onChange={(v) => updateProfile({ bodyFatPercent: v })}
              min={3}
              max={70}
              step={0.5}
              unit="%"
              error={validationErrors.bodyFatPercent}
              testId="bodyFat-input"
            />
          )}

          <Select
            label="TDEE Source"
            value={profile.tdeeSource || 'formula'}
            onChange={(v) => updateProfile({ tdeeSource: v as TDEESource })}
            options={TDEE_SOURCE_OPTIONS}
            testId="tdeeSource-select"
          />

          {/* Manual TDEE - Only shown when Manual is selected */}
          {profile.tdeeSource === 'manual' && (
            <NumberInput
              label="Manual TDEE"
              value={profile.manualTDEE || 0}
              onChange={(v) => updateProfile({ manualTDEE: v })}
              min={1000}
              max={6000}
              step={50}
              unit="kcal"
              error={validationErrors.manualTDEE}
              testId="manualTDEE-input"
            />
          )}
        </div>

        {/* TDEE Source Help Text */}
        {profile.tdeeSource === 'formula' && (
          <p className="mt-3 text-sm text-slate-500">
            Using BMR × activity factor + exercise calories. Good starting point for most users.
          </p>
        )}
        {profile.tdeeSource === 'manual' && (
          <p className="mt-3 text-sm text-slate-500">
            Enter your known TDEE from a wearable device or previous measurement. Confidence: 80%.
          </p>
        )}
        {profile.tdeeSource === 'adaptive' && (
          <p className="mt-3 text-sm text-slate-500">
            TDEE will be calculated from your weight trend and intake data. Requires 14+ days of logging for accurate results.
          </p>
        )}

        {/* Katch-McArdle Warning */}
        {profile.bmrEquation === 'katch_mcardle' && !profile.bodyFatPercent && (
          <div className="mt-3 p-3 bg-amber-900/50 border border-amber-700 rounded-md">
            <p className="text-sm text-amber-300">
              Katch-McArdle requires body fat %. Without it, Mifflin-St Jeor will be used as fallback.
            </p>
          </div>
        )}
      </Card>

      {/* Recalibration Settings Section */}
      <Card>
        <RecalibrationSettings
          tolerance={profile.recalibrationTolerance || RECALIBRATION_TOLERANCE_DEFAULT}
          onChange={(tolerance) => updateProfile({ recalibrationTolerance: tolerance })}
          error={validationErrors.recalibrationTolerance}
        />
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-md" data-testid="profile-error">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={!hasChanges} testId="save-profile-button">
          Save Profile
        </Button>
      </div>
    </form>
  );
}
