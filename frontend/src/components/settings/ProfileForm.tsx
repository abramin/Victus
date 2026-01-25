import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, Sex, Goal, BMREquation, TDEESource, NutritionPlan, FastingProtocol, MealRatios } from '../../api/types';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { SelectorCard } from '../common/SelectorCard';
import { ContextualSlider, BODY_FAT_ZONES } from '../common/ContextualSlider';
import { MacroDistributionBar } from './MacroDistributionBar';
import { MealDistributionBar } from './MealDistributionBar';
import { FastingProtocolSelector, FASTING_PROTOCOL_OPTIONS } from './FastingProtocolSelector';
import { RecalibrationSettings } from './RecalibrationSettings';
import { GoalProjectorChart } from './GoalProjectorChart';
import { LockedGoalsBanner } from './LockedGoalsBanner';
import { shallowEqual } from '../../utils/equality';
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
  activePlan?: NutritionPlan | null; // When present, goals are locked
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
  fastingProtocol: 'standard',
  eatingWindowStart: '08:00',
  eatingWindowEnd: '20:00',
};

export function ProfileForm({ initialProfile, onSave, saving, error, activePlan }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile || DEFAULT_PROFILE);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Goals are locked when there's an active or paused plan
  const isGoalsLocked = !!(activePlan && (activePlan.status === 'active' || activePlan.status === 'paused'));

  // Calculate plan end date for display
  const planEndDate = useMemo(() => {
    if (!activePlan) return '';
    const endDate = new Date(activePlan.startDate);
    endDate.setDate(endDate.getDate() + activePlan.durationWeeks * 7);
    return endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [activePlan]);

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
    if (derivedWeeklyChange < -AGGRESSIVE_LOSS_THRESHOLD_KG) {
      return `Losing more than ${AGGRESSIVE_LOSS_THRESHOLD_KG} kg/week may be unsustainable and could lead to muscle loss.`;
    }
    if (derivedWeeklyChange > AGGRESSIVE_GAIN_THRESHOLD_KG) {
      return `Gaining more than ${AGGRESSIVE_GAIN_THRESHOLD_KG} kg/week may lead to excess fat gain.`;
    }
    return null;
  }, [derivedWeeklyChange]);

  // Calculate projected end date from timeframe
  const projectedEndDate = useMemo(() => {
    const weeks = profile.timeframeWeeks || 0;
    if (weeks <= 0) return null;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + weeks * 7);
    return endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [profile.timeframeWeeks]);

  // Auto-update weekly change when derived values change
  useEffect(() => {
    setProfile((prev) => ({ ...prev, targetWeeklyChangeKg: derivedWeeklyChange }));
  }, [derivedWeeklyChange]);

  // Track if profile has changes compared to initial
  const hasChanges = useMemo(() => {
    if (!initialProfile) return true; // New profile always has "changes"
    return !shallowEqual(profile, initialProfile);
  }, [profile, initialProfile]);

  const macroRatiosValid = useMemo(() => {
    const total = profile.carbRatio + profile.proteinRatio + profile.fatRatio;
    return Math.abs(total - 1.0) <= 0.01;
  }, [profile.carbRatio, profile.proteinRatio, profile.fatRatio]);

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
      {/* Two-column responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Body & Goals */}
        <div className="space-y-6">
          {/* Biometrics Section */}
          <Card title="Biometrics">
            <div className="space-y-4">
              {/* Sex Selector Cards */}
              <SelectorCard
                label="Sex"
                value={profile.sex}
                onChange={(v) => updateProfile({ sex: v as Sex })}
                options={[
                  { value: 'male', label: 'Male', icon: '♂️' },
                  { value: 'female', label: 'Female', icon: '♀️' },
                ]}
                columns={2}
                error={validationErrors.sex}
                testId="sex-select"
              />

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
              </div>
            </div>
          </Card>

          {/* Goals Section */}
          <Card title="Goals">
            <div className="space-y-6">
              {/* Locked Goals Banner - shown when active plan exists */}
              {isGoalsLocked && activePlan && (
                <LockedGoalsBanner
                  planName={activePlan.name}
                  targetWeight={activePlan.goalWeightKg}
                  endDate={planEndDate}
                  currentWeek={activePlan.currentWeek}
                  totalWeeks={activePlan.durationWeeks}
                />
              )}

              {/* Goal Type Selector Cards */}
              <div className={isGoalsLocked ? 'opacity-60 pointer-events-none' : ''}>
                <SelectorCard
                  label="Primary Goal"
                  value={profile.goal}
                  onChange={(v) => updateProfile({ goal: v as Goal })}
                  options={[
                    { value: 'lose_weight', label: 'Lose Weight', description: 'Calorie Deficit', icon: '📉' },
                    { value: 'maintain', label: 'Maintain', description: 'TDEE Match', icon: '⚖️' },
                    { value: 'gain_weight', label: 'Gain Muscle', description: 'Surplus', icon: '💪' },
                  ]}
                  columns={3}
                  error={validationErrors.goal}
                  testId="goal-select"
                />
              </div>

              {/* Current Weight Input */}
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

              {/* Goal Projector Chart - Locked read-only mode when plan active */}
              {isGoalsLocked && activePlan && profile.currentWeightKg > 0 && (
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                  <GoalProjectorChart
                    currentWeight={profile.currentWeightKg}
                    targetWeight={activePlan.goalWeightKg}
                    timeframeWeeks={activePlan.durationWeeks}
                    readOnly
                    minWeight={WEIGHT_MIN_KG}
                    maxWeight={WEIGHT_MAX_KG}
                  />
                </div>
              )}

              {/* Goal Projector Chart - Editable mode when no plan */}
              {!isGoalsLocked && profile.goal !== 'maintain' && profile.currentWeightKg > 0 && (
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                  <GoalProjectorChart
                    currentWeight={profile.currentWeightKg}
                    targetWeight={profile.targetWeightKg || profile.currentWeightKg}
                    timeframeWeeks={profile.timeframeWeeks || 12}
                    onTargetWeightChange={(v) => updateProfile({ targetWeightKg: v })}
                    onTimeframeChange={(v) => updateProfile({ timeframeWeeks: v })}
                    minWeight={WEIGHT_MIN_KG}
                    maxWeight={WEIGHT_MAX_KG}
                    minWeeks={TIMEFRAME_MIN_WEEKS}
                    maxWeeks={TIMEFRAME_MAX_WEEKS}
                  />
                </div>
              )}

              {/* Fallback inputs for maintain goal or when chart isn't shown */}
              {!isGoalsLocked && profile.goal === 'maintain' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}

              {/* Aggressive Goal Warning - only show when not locked */}
              {!isGoalsLocked && aggressiveGoalWarning && (
                <div className="p-3 bg-amber-900/50 border border-amber-700 rounded-md" data-testid="aggressive-goal-warning">
                  <p className="text-sm text-amber-300">{aggressiveGoalWarning}</p>
                </div>
              )}
            </div>
          </Card>

          {/* TDEE Configuration Section */}
          <Card title="TDEE Configuration">
            <div className="space-y-6">
              <p className="text-sm text-slate-400">
                Configure how your Total Daily Energy Expenditure (TDEE) is calculated.
              </p>

              {/* BMR Equation Selector Cards */}
              <SelectorCard
                label="BMR Equation"
                value={profile.bmrEquation || 'mifflin_st_jeor'}
                onChange={(v) => updateProfile({ bmrEquation: v as BMREquation })}
                options={[
                  { value: 'mifflin_st_jeor', label: 'Mifflin-St Jeor', description: 'Best for most people' },
                  { value: 'katch_mcardle', label: 'Katch-McArdle', description: 'Requires Body Fat %' },
                  { value: 'harris_benedict', label: 'Harris-Benedict', description: 'Classic formula' },
                  { value: 'who_fao', label: 'WHO/FAO', description: 'International standard' },
                ]}
                columns={2}
                testId="bmrEquation-select"
              />

              {/* Body Fat Slider - Only shown when Katch-McArdle is selected */}
              {profile.bmrEquation === 'katch_mcardle' && (
                <ContextualSlider
                  label="Body Fat"
                  value={profile.bodyFatPercent || 20}
                  onChange={(v) => updateProfile({ bodyFatPercent: v })}
                  min={BODY_FAT_MIN_PERCENT}
                  max={BODY_FAT_MAX_PERCENT}
                  step={0.5}
                  unit="%"
                  zones={BODY_FAT_ZONES}
                  error={validationErrors.bodyFatPercent}
                  testId="bodyFat-slider"
                />
              )}

              {/* TDEE Source Selector Cards */}
              <SelectorCard
                label="TDEE Source"
                value={profile.tdeeSource || 'formula'}
                onChange={(v) => updateProfile({ tdeeSource: v as TDEESource })}
                options={[
                  { value: 'formula', label: 'Formula', description: 'BMR × Activity Factor' },
                  { value: 'manual', label: 'Manual', description: 'Enter your own TDEE' },
                  { value: 'adaptive', label: 'Adaptive', description: 'Learn from your data' },
                ]}
                columns={3}
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

              {/* TDEE Source Help Text */}
              {profile.tdeeSource === 'formula' && (
                <p className="text-sm text-slate-500">
                  Using BMR × activity factor + exercise calories. Good starting point for most users.
                </p>
              )}
              {profile.tdeeSource === 'manual' && (
                <p className="text-sm text-slate-500">
                  Enter your known TDEE from a wearable device or previous measurement.
                </p>
              )}
              {profile.tdeeSource === 'adaptive' && (
                <p className="text-sm text-slate-500">
                  TDEE will be calculated from your weight trend and intake data. Requires 14+ days of logging.
                </p>
              )}

              {/* Katch-McArdle Warning */}
              {profile.bmrEquation === 'katch_mcardle' && !profile.bodyFatPercent && (
                <div className="p-3 bg-amber-900/50 border border-amber-700 rounded-md">
                  <p className="text-sm text-amber-300">
                    Katch-McArdle requires body fat %. Without it, Mifflin-St Jeor will be used as fallback.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Nutrition */}
        <div className="space-y-6">
          {/* Macro Ratios Section */}
          <Card>
            <MacroDistributionBar
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

          {/* Fasting Protocol Section */}
          <Card title="Eating Window">
            <FastingProtocolSelector
              protocol={profile.fastingProtocol || 'standard'}
              eatingWindowStart={profile.eatingWindowStart || '08:00'}
              eatingWindowEnd={profile.eatingWindowEnd || '20:00'}
              onProtocolChange={(protocol) => updateProfile({ fastingProtocol: protocol })}
              onWindowChange={(start, end) => updateProfile({ eatingWindowStart: start, eatingWindowEnd: end })}
            />
          </Card>

          {/* Meal Distribution Section */}
          <Card>
            {profile.fastingProtocol === 'standard' || !profile.fastingProtocol ? (
              <MealDistributionBar
                breakfast={profile.mealRatios.breakfast}
                lunch={profile.mealRatios.lunch}
                dinner={profile.mealRatios.dinner}
                onChange={(b, l, d) => updateProfile({ mealRatios: { breakfast: b, lunch: l, dinner: d } })}
                error={validationErrors.mealRatios}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-slate-200">Effective Meal Distribution</h3>
                  <span className="text-sm text-green-400">✓ 100%</span>
                </div>
                <p className="text-xs text-slate-500">
                  {profile.fastingProtocol === '16_8'
                    ? 'Breakfast calories are automatically redistributed to Lunch and Dinner'
                    : 'All calories are consolidated into the Dinner window'}
                </p>
                {/* Static display for fasting protocols */}
                <div className="relative h-12 rounded-lg overflow-hidden">
                  {profile.fastingProtocol === '16_8' ? (
                    <>
                      <div
                        className="absolute top-0 h-full bg-slate-600/50 flex items-center justify-center"
                        style={{ left: 0, width: '0%' }}
                      />
                      <div
                        className="absolute top-0 h-full bg-emerald-500/80 flex items-center justify-center"
                        style={{ left: '0%', width: '50%' }}
                      >
                        <span className="text-xs font-medium text-white drop-shadow-sm">Lunch 50%</span>
                      </div>
                      <div
                        className="absolute top-0 h-full bg-indigo-500/80 flex items-center justify-center"
                        style={{ left: '50%', width: '50%' }}
                      >
                        <span className="text-xs font-medium text-white drop-shadow-sm">Dinner 50%</span>
                      </div>
                    </>
                  ) : (
                    <div
                      className="absolute top-0 h-full bg-indigo-500/80 flex items-center justify-center w-full"
                    >
                      <span className="text-xs font-medium text-white drop-shadow-sm">Dinner 100%</span>
                    </div>
                  )}
                </div>
                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-600/50" />
                    <span className="text-sm text-slate-500 line-through">Breakfast</span>
                    <span className="text-sm font-medium text-slate-500">0%</span>
                  </div>
                  {profile.fastingProtocol === '16_8' ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500/80" />
                        <span className="text-sm text-slate-300">Lunch</span>
                        <span className="text-sm font-medium text-slate-200">50%</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-500/80" />
                        <span className="text-sm text-slate-300">Dinner</span>
                        <span className="text-sm font-medium text-slate-200">50%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded bg-slate-600/50" />
                        <span className="text-sm text-slate-500 line-through">Lunch</span>
                        <span className="text-sm font-medium text-slate-500">0%</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-500/80" />
                        <span className="text-sm text-slate-300">Dinner</span>
                        <span className="text-sm font-medium text-slate-200">100%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
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

          {/* Recalibration Settings Section */}
          <Card>
            <RecalibrationSettings
              tolerance={profile.recalibrationTolerance || RECALIBRATION_TOLERANCE_DEFAULT}
              onChange={(tolerance) => updateProfile({ recalibrationTolerance: tolerance })}
              error={validationErrors.recalibrationTolerance}
            />
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-md" data-testid="profile-error">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={saving}
          disabled={!hasChanges || !macroRatiosValid}
          testId="save-profile-button"
        >
          Save Profile
        </Button>
      </div>
    </form>
  );
}
