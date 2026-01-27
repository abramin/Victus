import type { TrainingType, MuscleGroup } from '../../api/types';

/**
 * Maps training types to the muscle groups they primarily target.
 * Used for recovery context to warn about scheduling sessions
 * when target muscles are already fatigued.
 */
export const TRAINING_TO_MUSCLES: Record<TrainingType, MuscleGroup[]> = {
  // Strength-based sessions
  strength: [
    'chest',
    'front_delt',
    'triceps',
    'lats',
    'biceps',
    'quads',
    'glutes',
    'hamstrings',
    'core',
  ],
  calisthenics: ['chest', 'lats', 'core', 'triceps', 'biceps', 'front_delt'],
  hiit: ['quads', 'core', 'glutes', 'hamstrings', 'calves'],

  // Cardio sessions
  run: ['quads', 'hamstrings', 'calves', 'glutes'],
  row: ['lats', 'biceps', 'rear_delt', 'quads', 'core'],
  cycle: ['quads', 'hamstrings', 'calves', 'glutes'],
  walking: ['quads', 'calves'],

  // Recovery/mobility sessions (minimal muscle targeting)
  rest: [],
  qigong: [],
  mobility: [],
  gmb: ['core', 'front_delt', 'triceps'],
  mixed: ['chest', 'lats', 'quads', 'core', 'glutes'],
};

/**
 * Muscle group regions for aggregated recovery display.
 */
export type MuscleRegion = 'upper' | 'core' | 'lower';

export const MUSCLE_REGIONS: Record<MuscleRegion, MuscleGroup[]> = {
  upper: [
    'chest',
    'front_delt',
    'triceps',
    'side_delt',
    'lats',
    'traps',
    'biceps',
    'rear_delt',
    'forearms',
  ],
  core: ['core', 'lower_back'],
  lower: ['quads', 'glutes', 'hamstrings', 'calves'],
};

/**
 * Get the region for a muscle group.
 */
export function getMuscleRegion(muscle: MuscleGroup): MuscleRegion {
  if (MUSCLE_REGIONS.upper.includes(muscle)) return 'upper';
  if (MUSCLE_REGIONS.core.includes(muscle)) return 'core';
  return 'lower';
}

/**
 * Fatigue thresholds for warnings.
 */
export const FATIGUE_THRESHOLDS = {
  caution: 60, // 60-84% = caution (yellow)
  warning: 85, // 85%+ = warning (red)
};
