import type { TrainingType } from '../../api/types';

/**
 * Session categories for visual grouping in the planner.
 * Each category groups related training types with consistent styling.
 */
export const SESSION_CATEGORIES = {
  strength: {
    types: ['strength', 'calisthenics', 'hiit'] as TrainingType[],
    color: '#a855f7', // purple-500
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderClass: 'border-purple-500',
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
    label: 'Strength',
  },
  cardio: {
    types: ['run', 'row', 'cycle', 'walking'] as TrainingType[],
    color: '#3b82f6', // blue-500
    glowColor: 'rgba(59, 130, 246, 0.4)',
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    label: 'Cardio',
  },
  recovery: {
    types: ['rest', 'qigong', 'mobility', 'gmb'] as TrainingType[],
    color: '#22c55e', // green-500
    glowColor: 'rgba(34, 197, 94, 0.4)',
    borderClass: 'border-green-500',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    label: 'Recovery',
  },
  mixed: {
    types: ['mixed'] as TrainingType[],
    color: '#f59e0b', // amber-500
    glowColor: 'rgba(245, 158, 11, 0.4)',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-400',
    label: 'Mixed',
  },
} as const;

export type SessionCategory = keyof typeof SESSION_CATEGORIES;

export interface SessionCategoryConfig {
  category: SessionCategory;
  color: string;
  glowColor: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
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
 * Get all training types grouped by category for display in the deck.
 */
export function getTrainingTypesByCategory(): {
  category: SessionCategory;
  label: string;
  types: TrainingType[];
}[] {
  return [
    { category: 'strength', label: 'Strength', types: SESSION_CATEGORIES.strength.types.slice() },
    { category: 'cardio', label: 'Cardio', types: SESSION_CATEGORIES.cardio.types.slice() },
    { category: 'recovery', label: 'Recovery', types: SESSION_CATEGORIES.recovery.types.slice() },
    { category: 'mixed', label: 'Mixed', types: SESSION_CATEGORIES.mixed.types.slice() },
  ];
}
