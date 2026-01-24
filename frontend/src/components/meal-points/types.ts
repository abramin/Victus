import type { FoodReference } from '../../api/types';

export type MealId = 'breakfast' | 'lunch' | 'dinner';

/** A food item added to a meal draft with allocated points */
export interface DraftedFood {
  food: FoodReference;
  allocatedPoints: number;
  grams: number;
}

/** Draft state for a single meal */
export interface MealDraft {
  foods: DraftedFood[];
  spentPoints: number;
  remainingPoints: number;
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
