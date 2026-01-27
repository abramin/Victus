import type { TrainingType } from '../api/types';

/**
 * Session category definitions for visual styling.
 * Each category groups related training types with consistent colors.
 */
export const SESSION_CATEGORIES = {
  strength: {
    types: ['strength', 'calisthenics', 'hiit'] as TrainingType[],
    color: '#a855f7', // purple-500
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: '#a855f7',
    emoji: '💪',
    label: 'Strength',
  },
  cardio: {
    types: ['run', 'row', 'cycle', 'walking'] as TrainingType[],
    color: '#2563eb', // blue-600
    glowColor: 'rgba(37, 99, 235, 0.4)',
    borderColor: '#2563eb',
    emoji: '🏃',
    label: 'Cardio',
  },
  recovery: {
    types: ['rest', 'qigong', 'mobility', 'gmb'] as TrainingType[],
    color: '#22c55e', // green-500
    glowColor: 'rgba(34, 197, 94, 0.4)',
    borderColor: '#22c55e',
    emoji: '🧘',
    label: 'Recovery',
  },
  mixed: {
    types: ['mixed'] as TrainingType[],
    color: '#f59e0b', // amber-500
    glowColor: 'rgba(245, 158, 11, 0.4)',
    borderColor: '#f59e0b',
    emoji: '🔥',
    label: 'Mixed',
  },
} as const;

export type SessionCategory = keyof typeof SESSION_CATEGORIES;

export interface SessionCategoryConfig {
  category: SessionCategory;
  color: string;
  glowColor: string;
  borderColor: string;
  emoji: string;
  label: string;
}

/**
 * Get the visual category for a training type.
 */
export function getSessionCategory(trainingType: TrainingType): SessionCategoryConfig {
  for (const [category, config] of Object.entries(SESSION_CATEGORIES)) {
    if (config.types.includes(trainingType)) {
      return {
        category: category as SessionCategory,
        ...config,
      };
    }
  }
  // Fallback to mixed
  return {
    category: 'mixed',
    ...SESSION_CATEGORIES.mixed,
  };
}

/**
 * Emoji mapping for each training type.
 */
export const TRAINING_TYPE_EMOJIS: Record<TrainingType, string> = {
  rest: '😴',
  qigong: '🧘',
  walking: '🚶',
  gmb: '🤸',
  run: '🏃',
  row: '🚣',
  cycle: '🚴',
  hiit: '⚡',
  strength: '🏋️',
  calisthenics: '💪',
  mobility: '🧘‍♂️',
  mixed: '🔥',
};

/**
 * Display labels for each training type.
 */
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  rest: 'Rest',
  qigong: 'Qigong',
  walking: 'Walking',
  gmb: 'GMB',
  run: 'Run',
  row: 'Row',
  cycle: 'Cycle',
  hiit: 'HIIT',
  strength: 'Strength',
  calisthenics: 'Calisthenics',
  mobility: 'Mobility',
  mixed: 'Mixed',
};

/**
 * Load zone colors for the equalizer chart.
 */
export const LOAD_ZONE_COLORS = {
  optimal: '#22c55e', // green-500
  high: '#f59e0b', // amber-500
  overload: '#ef4444', // red-500
  empty: '#334155', // slate-700
} as const;

/**
 * Day type colors and labels.
 */
export const DAY_TYPE_CONFIG = {
  performance: {
    color: '#a855f7', // purple-500
    bgColor: 'rgba(168, 85, 247, 0.2)',
    label: 'Performance',
    emoji: '⚡',
  },
  fatburner: {
    color: '#f59e0b', // amber-500
    bgColor: 'rgba(245, 158, 11, 0.2)',
    label: 'Fat Burner',
    emoji: '🔥',
  },
  metabolize: {
    color: '#22c55e', // green-500
    bgColor: 'rgba(34, 197, 94, 0.2)',
    label: 'Metabolize',
    emoji: '🍽️',
  },
} as const;

export type DayTypeKey = keyof typeof DAY_TYPE_CONFIG;
