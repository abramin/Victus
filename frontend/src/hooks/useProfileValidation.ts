import { useMemo, useEffect, useCallback, useState } from 'react';
import type { UserProfile } from '../api/types';
import {
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
  RECALIBRATION_TOLERANCE_MIN,
  RECALIBRATION_TOLERANCE_MAX,
} from '../constants';

export interface ValidationErrors {
  [key: string]: string;
}

export interface UseProfileValidationReturn {
  errors: ValidationErrors;
  validate: (profile: UserProfile) => boolean;
  derivedWeeklyChange: number;
  aggressiveGoalWarning: string | null;
  projectedEndDate: string | null;
  macroRatiosValid: boolean;
}

export function useProfileValidation(profile: UserProfile): UseProfileValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({});

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

  // Check if macro ratios are valid (sum to 100%)
  const macroRatiosValid = useMemo(() => {
    const total = profile.carbRatio + profile.proteinRatio + profile.fatRatio;
    return Math.abs(total - 1.0) <= 0.01;
  }, [profile.carbRatio, profile.proteinRatio, profile.fatRatio]);

  const validate = useCallback((profileToValidate: UserProfile): boolean => {
    const newErrors: ValidationErrors = {};

    if (profileToValidate.height_cm < HEIGHT_MIN_CM || profileToValidate.height_cm > HEIGHT_MAX_CM) {
      newErrors.height = `Height must be between ${HEIGHT_MIN_CM} and ${HEIGHT_MAX_CM} cm`;
    }

    if (!profileToValidate.birthDate) {
      newErrors.birthDate = 'Birth date is required';
    }

    if (!profileToValidate.sex) {
      newErrors.sex = 'Sex is required';
    }

    if (!profileToValidate.goal) {
      newErrors.goal = 'Goal is required';
    }

    // Current weight validation (optional but if provided must be valid)
    if (
      profileToValidate.currentWeightKg !== undefined &&
      profileToValidate.currentWeightKg !== 0 &&
      (profileToValidate.currentWeightKg < WEIGHT_MIN_KG || profileToValidate.currentWeightKg > WEIGHT_MAX_KG)
    ) {
      newErrors.currentWeight = `Current weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`;
    }

    if (profileToValidate.targetWeightKg < WEIGHT_MIN_KG || profileToValidate.targetWeightKg > WEIGHT_MAX_KG) {
      newErrors.targetWeight = `Target weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`;
    }

    // Timeframe validation (optional but if provided must be valid)
    if (
      profileToValidate.timeframeWeeks !== undefined &&
      profileToValidate.timeframeWeeks !== 0 &&
      (profileToValidate.timeframeWeeks < TIMEFRAME_MIN_WEEKS || profileToValidate.timeframeWeeks > TIMEFRAME_MAX_WEEKS)
    ) {
      newErrors.timeframe = `Timeframe must be between ${TIMEFRAME_MIN_WEEKS} and ${TIMEFRAME_MAX_WEEKS} weeks`;
    }

    // Weekly change validation (expanded range to support lb users)
    if (profileToValidate.targetWeeklyChangeKg < WEEKLY_CHANGE_MIN_KG || profileToValidate.targetWeeklyChangeKg > WEEKLY_CHANGE_MAX_KG) {
      newErrors.weeklyChange = `Weekly change must be between ${WEEKLY_CHANGE_MIN_KG} and ${WEEKLY_CHANGE_MAX_KG} kg`;
    }

    // Body fat validation (optional)
    if (
      profileToValidate.bodyFatPercent !== undefined &&
      (profileToValidate.bodyFatPercent < BODY_FAT_MIN_PERCENT || profileToValidate.bodyFatPercent > BODY_FAT_MAX_PERCENT)
    ) {
      newErrors.bodyFat = `Body fat must be between ${BODY_FAT_MIN_PERCENT}% and ${BODY_FAT_MAX_PERCENT}%`;
    }

    // Manual TDEE validation (only when using override)
    if (
      profileToValidate.tdeeSource === 'override' &&
      profileToValidate.manualTDEE !== undefined &&
      (profileToValidate.manualTDEE < TDEE_MIN_KCAL || profileToValidate.manualTDEE > TDEE_MAX_KCAL)
    ) {
      newErrors.manualTDEE = `TDEE must be between ${TDEE_MIN_KCAL} and ${TDEE_MAX_KCAL} kcal`;
    }

    // Fruit/veggie targets validation
    if (profileToValidate.fruitTargetG !== undefined && profileToValidate.fruitTargetG > FRUIT_VEGGIE_MAX_G) {
      newErrors.fruitTarget = `Fruit target must be at most ${FRUIT_VEGGIE_MAX_G}g`;
    }
    if (profileToValidate.veggieTargetG !== undefined && profileToValidate.veggieTargetG > FRUIT_VEGGIE_MAX_G) {
      newErrors.veggieTarget = `Veggie target must be at most ${FRUIT_VEGGIE_MAX_G}g`;
    }

    // Macro ratios must sum to ~1.0
    const ratioSum = profileToValidate.carbRatio + profileToValidate.proteinRatio + profileToValidate.fatRatio;
    if (Math.abs(ratioSum - 1.0) > 0.01) {
      newErrors.macroRatios = 'Macro ratios must sum to 100%';
    }

    // Meal ratios must sum to ~1.0
    const mealSum =
      profileToValidate.mealRatios.breakfast + profileToValidate.mealRatios.lunch + profileToValidate.mealRatios.dinner;
    if (Math.abs(mealSum - 1.0) > 0.01) {
      newErrors.mealRatios = 'Meal ratios must sum to 100%';
    }

    // Recalibration tolerance validation
    if (
      profileToValidate.recalibrationTolerance !== undefined &&
      (profileToValidate.recalibrationTolerance < RECALIBRATION_TOLERANCE_MIN ||
        profileToValidate.recalibrationTolerance > RECALIBRATION_TOLERANCE_MAX)
    ) {
      newErrors.recalibrationTolerance = `Tolerance must be between ${RECALIBRATION_TOLERANCE_MIN} and ${RECALIBRATION_TOLERANCE_MAX} kg`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  return {
    errors,
    validate,
    derivedWeeklyChange,
    aggressiveGoalWarning,
    projectedEndDate,
    macroRatiosValid,
  };
}
