/**
 * Shared constants for the Victus application.
 * Centralizes magic numbers and configuration values.
 */

// =============================================================================
// CALORIE CONVERSION CONSTANTS (PRD Section 0.2)
// =============================================================================

/** Calories per gram of carbohydrate */
export const CARB_KCAL_PER_G = 4;

/** Calories per gram of protein */
export const PROTEIN_KCAL_PER_G = 4;

/** Calories per gram of fat */
export const FAT_KCAL_PER_G = 9;

// =============================================================================
// MACRO CALCULATION CONSTANTS (aligned with backend domain/constants.go)
// =============================================================================

/** Fruit carbohydrate percentage by weight */
export const FRUIT_CARBS_PERCENT_WEIGHT = 0.10;

/** Vegetable carbohydrate percentage by weight */
export const VEGGIE_CARBS_PERCENT_WEIGHT = 0.03;

/** Maltodextrin carbohydrate percentage */
export const MALTODEXTRIN_CARB_PERCENT = 0.96;

/** Whey protein percentage */
export const WHEY_PROTEIN_PERCENT = 0.88;

/** Collagen protein percentage */
export const COLLAGEN_PROTEIN_PERCENT = 0.90;

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

/** Training type icons for calendar display */
export const TRAINING_ICONS: Record<TrainingType, string> = {
  rest: '😴',
  qigong: '🧘',
  walking: '🚶',
  gmb: '💪',
  run: '🏃',
  row: '🚣',
  cycle: '🚴',
  hiit: '⚡',
  strength: '🏋️',
  calisthenics: '🤸',
  mobility: '🔄',
  mixed: '🔀',
};

/** Training type colors for styling */
export const TRAINING_COLORS: Record<TrainingType, { bg: string; text: string }> = {
  rest: { bg: 'bg-gray-700/50', text: 'text-gray-400' },
  qigong: { bg: 'bg-teal-700/50', text: 'text-teal-400' },
  walking: { bg: 'bg-green-700/50', text: 'text-green-400' },
  gmb: { bg: 'bg-amber-700/50', text: 'text-amber-400' },
  run: { bg: 'bg-red-700/50', text: 'text-red-400' },
  row: { bg: 'bg-cyan-700/50', text: 'text-cyan-400' },
  cycle: { bg: 'bg-lime-700/50', text: 'text-lime-400' },
  hiit: { bg: 'bg-yellow-700/50', text: 'text-yellow-400' },
  strength: { bg: 'bg-indigo-700/50', text: 'text-indigo-400' },
  calisthenics: { bg: 'bg-pink-700/50', text: 'text-pink-400' },
  mobility: { bg: 'bg-violet-700/50', text: 'text-violet-400' },
  mixed: { bg: 'bg-slate-700/50', text: 'text-slate-400' },
};

// =============================================================================
// DAY TYPE DISPLAY CONFIGURATION
// =============================================================================

/** Day type color configuration for calendar views */
export const DAY_TYPE_COLORS: Record<DayType, { bg: string; text: string }> = {
  performance: { bg: 'bg-blue-600', text: 'text-blue-400' },
  fatburner: { bg: 'bg-orange-600', text: 'text-orange-400' },
  metabolize: { bg: 'bg-purple-600', text: 'text-purple-400' },
};

/** Day type badge configuration with full styling for panels */
export const DAY_TYPE_BADGE: Record<DayType, { label: string; className: string }> = {
  performance: { 
    label: 'Performance', 
    className: 'bg-blue-900/40 text-blue-300 border-blue-800' 
  },
  fatburner: { 
    label: 'Fatburner', 
    className: 'bg-orange-900/40 text-orange-300 border-orange-800' 
  },
  metabolize: { 
    label: 'Metabolize', 
    className: 'bg-emerald-900/40 text-emerald-300 border-emerald-800' 
  },
};

/** Short labels for compact calendar views */
export const DAY_TYPE_LABELS: Record<DayType, string> = {
  performance: 'Perf',
  fatburner: 'Fatb',
  metabolize: 'Meta',
};

// =============================================================================
// PLAN SIMULATOR CONSTANTS
// =============================================================================

/** Energy equivalent of 1 kg body weight in kcal */
export const KCAL_PER_KG = 7700;

/** Plan duration limits */
export const PLAN_DURATION_MIN_WEEKS = 4;
export const PLAN_DURATION_MAX_WEEKS = 104;

/** Safe deficit/surplus limits (kcal/day) */
export const MAX_SAFE_DEFICIT_KCAL = 750;
export const MAX_SAFE_SURPLUS_KCAL = 500;

/** Pace slider range (kg/week) */
export const PACE_MIN_KG_WEEK = 0.25;
export const PACE_MAX_KG_WEEK = 1.5;

/**
 * Pace zones for the plan simulator slider.
 * Zones are defined by percentage thresholds (0-100) mapping to the slider range.
 * Slider range: 0.25 - 1.5 kg/week
 * - 0.25-0.75 kg/week (0-40%) = Sustainable
 * - 0.75-1.0 kg/week (40-60%) = Aggressive
 * - 1.0-1.5 kg/week (60-100%) = Extreme
 */
export const PACE_ZONES = [
  { upTo: 40, label: 'Sustainable', color: 'text-green-400' },
  { upTo: 60, label: 'Aggressive', color: 'text-orange-400' },
  { upTo: 100, label: 'Extreme', color: 'text-red-400' },
] as const;

// =============================================================================
// BIOLOGICAL GUARDRAIL CONSTANTS
// =============================================================================

/** Minimum fat intake g/kg for hormonal health */
export const MIN_FAT_G_PER_KG = 0.5;

/** Minimum protein intake g/kg for muscle retention */
export const MIN_PROTEIN_G_PER_KG = 1.6;

/** Maximum protein g/kg (diminishing returns beyond) */
export const MAX_PROTEIN_G_PER_KG = 3.3;

/** Default starting protein g/kg */
export const DEFAULT_PROTEIN_G_PER_KG = 2.0;

/** Default starting fat g/kg */
export const DEFAULT_FAT_G_PER_KG = 0.8;

/** Minimum carbs for training days */
export const MIN_CARBS_G_PERFORMANCE = 100;

/**
 * Protein quality zones for UI feedback.
 * Each zone defines the upper bound (upTo) in g/kg.
 */
export const PROTEIN_ZONES = [
  { upTo: 1.2, label: 'Critical', color: 'text-red-400', description: 'Muscle loss likely' },
  { upTo: 1.6, label: 'Survival', color: 'text-orange-400', description: 'Minimum maintenance' },
  { upTo: 2.2, label: 'Athlete Baseline', color: 'text-blue-400', description: 'Optimal for most' },
  { upTo: 3.0, label: 'Optimal Growth', color: 'text-green-400', description: 'Max synthesis' },
  { upTo: 4.0, label: 'Diminishing', color: 'text-slate-400', description: 'Limited benefit' },
] as const;

/**
 * Fat quality zones for UI feedback.
 * Each zone defines the upper bound (upTo) in g/kg.
 */
export const FAT_ZONES = [
  { upTo: 0.3, label: 'Critical', color: 'text-red-400', description: 'Hormone disruption' },
  { upTo: 0.5, label: 'Low', color: 'text-orange-400', description: 'Below safe minimum' },
  { upTo: 0.7, label: 'Minimum', color: 'text-yellow-400', description: 'Bare minimum' },
  { upTo: 1.2, label: 'Optimal', color: 'text-green-400', description: 'Supports hormones' },
  { upTo: 2.0, label: 'High', color: 'text-slate-400', description: 'Keto range' },
] as const;

/** Type for zone entries */
export type MacroZone = (typeof PROTEIN_ZONES)[number] | (typeof FAT_ZONES)[number];

/**
 * Helper to find the zone for a given g/kg value.
 */
export function getZone(
  value: number,
  zones: readonly { upTo: number; label: string; color: string; description: string }[]
): (typeof zones)[number] {
  return zones.find((z) => value <= z.upTo) ?? zones[zones.length - 1];
}
