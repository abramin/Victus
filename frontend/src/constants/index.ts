/**
 * Shared constants for the Victus application.
 * Centralizes magic numbers and configuration values.
 */

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

/** Weight limits in kg */
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 300;

/** Height limits in cm */
export const HEIGHT_MIN_CM = 100;
export const HEIGHT_MAX_CM = 250;

/** Body fat percentage limits */
export const BODY_FAT_MIN_PERCENT = 3;
export const BODY_FAT_MAX_PERCENT = 70;

/** Resting heart rate limits in bpm */
export const HEART_RATE_MIN_BPM = 30;
export const HEART_RATE_MAX_BPM = 200;

/** Sleep hours limits */
export const SLEEP_HOURS_MIN = 0;
export const SLEEP_HOURS_MAX = 24;

/** Sleep quality limits (1-100 scale) */
export const SLEEP_QUALITY_MIN = 1;
export const SLEEP_QUALITY_MAX = 100;

/** Weekly change limits in kg/week */
export const WEEKLY_CHANGE_MIN_KG = -2.0;
export const WEEKLY_CHANGE_MAX_KG = 2.0;

/** Timeframe limits in weeks */
export const TIMEFRAME_MIN_WEEKS = 1;
export const TIMEFRAME_MAX_WEEKS = 520;

/** TDEE limits in kcal */
export const TDEE_MIN_KCAL = 1000;
export const TDEE_MAX_KCAL = 6000;

/** Recalibration tolerance limits in percentage */
export const RECALIBRATION_TOLERANCE_MIN = 1;
export const RECALIBRATION_TOLERANCE_MAX = 10;
export const RECALIBRATION_TOLERANCE_DEFAULT = 3;

/** Fruit/veggie target limits in grams */
export const FRUIT_VEGGIE_MAX_G = 2000;

// =============================================================================
// GOAL THRESHOLDS
// =============================================================================

/** Aggressive weight loss threshold (kg/week) - losing more than this may cause muscle loss */
export const AGGRESSIVE_LOSS_THRESHOLD_KG = 1.0;

/** Aggressive weight gain threshold (kg/week) - gaining more than this may cause excess fat */
export const AGGRESSIVE_GAIN_THRESHOLD_KG = 0.5;

// =============================================================================
// ACTIVITY MULTIPLIERS
// =============================================================================

/** Moderate activity multiplier for TDEE estimation */
export const MODERATE_ACTIVITY_MULTIPLIER = 1.55;

/** Sedentary activity multiplier for TDEE estimation */
export const SEDENTARY_ACTIVITY_MULTIPLIER = 1.2;

// =============================================================================
// CALORIE ADJUSTMENTS
// =============================================================================

/** Default calorie deficit for weight loss (kcal/day) */
export const DEFAULT_DEFICIT_KCAL = 500;

/** Default calorie surplus for weight gain (kcal/day) */
export const DEFAULT_SURPLUS_KCAL = 300;

// =============================================================================
// DEFAULT PROFILE VALUES
// =============================================================================

export const DEFAULT_HEIGHT_CM = 175;
export const DEFAULT_WEIGHT_KG = 75;
export const DEFAULT_TIMEFRAME_WEEKS = 12;
export const DEFAULT_BIRTH_DATE = '1990-01-01';

export const DEFAULT_MACRO_RATIOS = {
  carb: 0.45,
  protein: 0.3,
  fat: 0.25,
} as const;

export const DEFAULT_MEAL_RATIOS = {
  breakfast: 0.3,
  lunch: 0.3,
  dinner: 0.4,
} as const;

export const DEFAULT_POINTS_CONFIG = {
  carbMultiplier: 1.15,
  proteinMultiplier: 4.35,
  fatMultiplier: 3.5,
} as const;

export const DEFAULT_FRUIT_TARGET_G = 600;
export const DEFAULT_VEGGIE_TARGET_G = 500;

// =============================================================================
// FORM OPTIONS
// =============================================================================

import type { DayType, TrainingType, Sex, Goal, BMREquation, TDEESource } from '../api/types';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'maintain', label: 'Maintain Weight' },
  { value: 'gain_weight', label: 'Gain Weight' },
];

export const BMR_EQUATION_OPTIONS: { value: BMREquation; label: string }[] = [
  { value: 'mifflin_st_jeor', label: 'Mifflin-St Jeor (Default)' },
  { value: 'katch_mcardle', label: 'Katch-McArdle (Requires Body Fat %)' },
  { value: 'oxford_henry', label: 'Oxford-Henry' },
  { value: 'harris_benedict', label: 'Harris-Benedict (Legacy)' },
];

export const TDEE_SOURCE_OPTIONS: { value: TDEESource; label: string }[] = [
  { value: 'formula', label: 'Formula (BMR × Activity Factor)' },
  { value: 'manual', label: 'Manual (From Wearable/Known Value)' },
  { value: 'adaptive', label: 'Adaptive (Calculated from Your Data)' },
];

export const DAY_TYPE_OPTIONS: { value: DayType; label: string; description: string }[] = [
  { value: 'performance', label: 'Performance', description: 'Higher carbs for workout days' },
  { value: 'fatburner', label: 'Fatburner', description: 'Lower carbs for fat burning' },
  { value: 'metabolize', label: 'Metabolize', description: 'Balanced macros for recovery' },
];

export const TRAINING_LABELS: Record<TrainingType, string> = {
  rest: 'Rest',
  qigong: 'Qigong',
  walking: 'Walking',
  gmb: 'GMB',
  run: 'Running',
  row: 'Rowing',
  cycle: 'Cycling',
  hiit: 'HIIT',
  strength: 'Strength',
  calisthenics: 'Calisthenics',
  mobility: 'Mobility',
  mixed: 'Mixed',
};
