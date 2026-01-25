import type { FoodReference } from '../../api/types';

export type MealId = 'breakfast' | 'lunch' | 'dinner';

/** A food item added to a meal draft with allocated points */
export interface DraftedFood {
  food: FoodReference;
  allocatedPoints: number;
  grams: number;
}

/** Per-macro remaining points for a meal */
export interface MacroRemaining {
  protein: number;
  carbs: number;
  fats: number;
}

/** Per-macro spent points for a meal */
export interface MacroSpent {
  protein: number;
  carbs: number;
  fats: number;
}

/** Draft state for a single meal */
export interface MealDraft {
  foods: DraftedFood[];
  spentPoints: number;
  remainingPoints: number;
  /** Per-macro spent points */
  spentByMacro: MacroSpent;
  /** Per-macro remaining points */
  remainingByMacro: MacroRemaining;
}

/** Complete draft state for all meals */
export type MealDraftState = Record<MealId, MealDraft>;

/** State for the food addition modal */
export interface FoodModalState {
  isOpen: boolean;
  food: FoodReference | null;
  mealId: MealId;
  fillPercentage: number; // 0-100
}

/** Ghost preview state for hover interactions */
export interface GhostPreview {
  macroType: 'protein' | 'carbs' | 'fats';
  pointsToConsume: number;
  wouldOverflow: boolean;
}
