import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  MealId,
  MealDraft,
  MealDraftState,
  DraftedFood,
  FoodModalState,
} from '../components/meal-points/types';
import type { FoodReference, MacroPoints } from '../api/types';

interface MealTargets {
  breakfast: MacroPoints;
  lunch: MacroPoints;
  dinner: MacroPoints;
}

const createEmptyDraft = (targetPoints: number): MealDraft => ({
  foods: [],
  spentPoints: 0,
  remainingPoints: targetPoints,
});

export function usePlateBuilder(mealData: MealTargets | null) {
  const targetPointsByMeal = useMemo(
    () => ({
      breakfast:
        (mealData?.breakfast.carbs ?? 0) +
        (mealData?.breakfast.protein ?? 0) +
        (mealData?.breakfast.fats ?? 0),
      lunch:
        (mealData?.lunch.carbs ?? 0) +
        (mealData?.lunch.protein ?? 0) +
        (mealData?.lunch.fats ?? 0),
      dinner:
        (mealData?.dinner.carbs ?? 0) +
        (mealData?.dinner.protein ?? 0) +
        (mealData?.dinner.fats ?? 0),
    }),
    [
      mealData?.breakfast.carbs,
      mealData?.breakfast.protein,
      mealData?.breakfast.fats,
      mealData?.lunch.carbs,
      mealData?.lunch.protein,
      mealData?.lunch.fats,
      mealData?.dinner.carbs,
      mealData?.dinner.protein,
      mealData?.dinner.fats,
    ]
  );
  const hasMealData = Boolean(mealData);

  // Calculate total points per meal from macro points
  const getMealTargetPoints = useCallback(
    (mealId: MealId): number => targetPointsByMeal[mealId],
    [targetPointsByMeal]
  );

  // Initialize draft state
  const [drafts, setDrafts] = useState<MealDraftState>(() => ({
    breakfast: createEmptyDraft(0),
    lunch: createEmptyDraft(0),
    dinner: createEmptyDraft(0),
  }));

  // Sync drafts when meal data changes
  useEffect(() => {
    if (!hasMealData) return;
    setDrafts((prev) => {
      const breakfastRemaining =
        targetPointsByMeal.breakfast - prev.breakfast.spentPoints;
      const lunchRemaining =
        targetPointsByMeal.lunch - prev.lunch.spentPoints;
      const dinnerRemaining =
        targetPointsByMeal.dinner - prev.dinner.spentPoints;

      if (
        prev.breakfast.remainingPoints === breakfastRemaining &&
        prev.lunch.remainingPoints === lunchRemaining &&
        prev.dinner.remainingPoints === dinnerRemaining
      ) {
        return prev;
      }

      return {
        breakfast: {
          ...prev.breakfast,
          remainingPoints: breakfastRemaining,
        },
        lunch: {
          ...prev.lunch,
          remainingPoints: lunchRemaining,
        },
        dinner: {
          ...prev.dinner,
          remainingPoints: dinnerRemaining,
        },
      };
    });
  }, [hasMealData, targetPointsByMeal]);

  // Modal state
  const [modalState, setModalState] = useState<FoodModalState>({
    isOpen: false,
    food: null,
    mealId: 'dinner',
    fillPercentage: 100,
  });

  // Add food to a meal
  const addFoodToMeal = useCallback(
    (mealId: MealId, food: FoodReference, allocatedPoints: number) => {
      if (!food.plateMultiplier) return;

      const grams = Math.round(allocatedPoints * food.plateMultiplier);
      const draftedFood: DraftedFood = { food, allocatedPoints, grams };

      setDrafts((prev) => {
        const meal = prev[mealId];
        const newSpent = meal.spentPoints + allocatedPoints;
        const targetPoints = getMealTargetPoints(mealId);

        return {
          ...prev,
          [mealId]: {
            foods: [...meal.foods, draftedFood],
            spentPoints: newSpent,
            remainingPoints: targetPoints - newSpent,
          },
        };
      });
    },
    [getMealTargetPoints]
  );

  // Remove food from a meal
  const removeFoodFromMeal = useCallback(
    (mealId: MealId, index: number) => {
      setDrafts((prev) => {
        const meal = prev[mealId];
        const removedFood = meal.foods[index];
        if (!removedFood) return prev;

        const newFoods = meal.foods.filter((_, i) => i !== index);
        const newSpent = meal.spentPoints - removedFood.allocatedPoints;
        const targetPoints = getMealTargetPoints(mealId);

        return {
          ...prev,
          [mealId]: {
            foods: newFoods,
            spentPoints: newSpent,
            remainingPoints: targetPoints - newSpent,
          },
        };
      });
    },
    [getMealTargetPoints]
  );

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    setDrafts({
      breakfast: createEmptyDraft(getMealTargetPoints('breakfast')),
      lunch: createEmptyDraft(getMealTargetPoints('lunch')),
      dinner: createEmptyDraft(getMealTargetPoints('dinner')),
    });
  }, [getMealTargetPoints]);

  // Clear single meal draft
  const clearMealDraft = useCallback(
    (mealId: MealId) => {
      setDrafts((prev) => ({
        ...prev,
        [mealId]: createEmptyDraft(getMealTargetPoints(mealId)),
      }));
    },
    [getMealTargetPoints]
  );

  // Open modal for adding food
  const openFoodModal = useCallback(
    (food: FoodReference, mealId: MealId) => {
      const remaining = drafts[mealId].remainingPoints;
      setModalState({
        isOpen: true,
        food,
        mealId,
        fillPercentage: remaining > 0 ? 100 : 0,
      });
    },
    [drafts]
  );

  // Close modal
  const closeFoodModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Update fill percentage in modal
  const setFillPercentage = useCallback((percentage: number) => {
    setModalState((prev) => ({
      ...prev,
      fillPercentage: Math.max(0, Math.min(100, percentage)),
    }));
  }, []);

  // Confirm food addition from modal
  const confirmFoodAddition = useCallback(() => {
    const { food, mealId, fillPercentage } = modalState;
    if (!food) return;

    const remaining = drafts[mealId].remainingPoints;
    const allocatedPoints = Math.round((remaining * fillPercentage) / 100);

    if (allocatedPoints > 0) {
      addFoodToMeal(mealId, food, allocatedPoints);
    }
    closeFoodModal();
  }, [modalState, drafts, addFoodToMeal, closeFoodModal]);

  return {
    drafts,
    modalState,
    addFoodToMeal,
    removeFoodFromMeal,
    clearAllDrafts,
    clearMealDraft,
    openFoodModal,
    closeFoodModal,
    setFillPercentage,
    confirmFoodAddition,
    getMealTargetPoints,
  };
}
