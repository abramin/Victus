import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  MealId,
  MealDraft,
  MealDraftState,
  DraftedFood,
  FoodModalState,
  MacroRemaining,
  MacroSpent,
  GhostPreview,
} from '../components/meal-points/types';
import type { FoodReference, MacroPoints } from '../api/types';

interface MealTargets {
  breakfast: MacroPoints;
  lunch: MacroPoints;
  dinner: MacroPoints;
}

const createEmptyMacroSpent = (): MacroSpent => ({
  protein: 0,
  carbs: 0,
  fats: 0,
});

const createEmptyDraft = (
  targetPoints: number,
  macroTargets?: MacroPoints
): MealDraft => ({
  foods: [],
  spentPoints: 0,
  remainingPoints: targetPoints,
  spentByMacro: createEmptyMacroSpent(),
  remainingByMacro: {
    protein: macroTargets?.protein ?? 0,
    carbs: macroTargets?.carbs ?? 0,
    fats: macroTargets?.fats ?? 0,
  },
});

/** Map food category to macro type */
type MacroType = 'protein' | 'carbs' | 'fats';
const categoryToMacro = (category: string): MacroType => {
  if (category === 'high_protein') return 'protein';
  if (category === 'high_carb') return 'carbs';
  return 'fats';
};

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
    if (!hasMealData || !mealData) return;
    setDrafts((prev) => {
      const calcRemainingByMacro = (
        targets: MacroPoints,
        spent: MacroSpent
      ): MacroRemaining => ({
        protein: targets.protein - spent.protein,
        carbs: targets.carbs - spent.carbs,
        fats: targets.fats - spent.fats,
      });

      const breakfastRemaining =
        targetPointsByMeal.breakfast - prev.breakfast.spentPoints;
      const lunchRemaining =
        targetPointsByMeal.lunch - prev.lunch.spentPoints;
      const dinnerRemaining =
        targetPointsByMeal.dinner - prev.dinner.spentPoints;

      const breakfastMacroRemaining = calcRemainingByMacro(
        mealData.breakfast,
        prev.breakfast.spentByMacro
      );
      const lunchMacroRemaining = calcRemainingByMacro(
        mealData.lunch,
        prev.lunch.spentByMacro
      );
      const dinnerMacroRemaining = calcRemainingByMacro(
        mealData.dinner,
        prev.dinner.spentByMacro
      );

      return {
        breakfast: {
          ...prev.breakfast,
          remainingPoints: breakfastRemaining,
          remainingByMacro: breakfastMacroRemaining,
        },
        lunch: {
          ...prev.lunch,
          remainingPoints: lunchRemaining,
          remainingByMacro: lunchMacroRemaining,
        },
        dinner: {
          ...prev.dinner,
          remainingPoints: dinnerRemaining,
          remainingByMacro: dinnerMacroRemaining,
        },
      };
    });
  }, [hasMealData, mealData, targetPointsByMeal]);

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
      if (!food.plateMultiplier || !mealData) return;

      const grams = Math.round(allocatedPoints * food.plateMultiplier);
      const draftedFood: DraftedFood = { food, allocatedPoints, grams };
      const macroType = categoryToMacro(food.category);

      setDrafts((prev) => {
        const meal = prev[mealId];
        const newSpent = meal.spentPoints + allocatedPoints;
        const targetPoints = getMealTargetPoints(mealId);
        const targets = mealData[mealId];

        // Update per-macro spent
        const newSpentByMacro: MacroSpent = {
          ...meal.spentByMacro,
          [macroType]: meal.spentByMacro[macroType] + allocatedPoints,
        };

        // Calculate per-macro remaining
        const newRemainingByMacro: MacroRemaining = {
          protein: targets.protein - newSpentByMacro.protein,
          carbs: targets.carbs - newSpentByMacro.carbs,
          fats: targets.fats - newSpentByMacro.fats,
        };

        return {
          ...prev,
          [mealId]: {
            foods: [...meal.foods, draftedFood],
            spentPoints: newSpent,
            remainingPoints: targetPoints - newSpent,
            spentByMacro: newSpentByMacro,
            remainingByMacro: newRemainingByMacro,
          },
        };
      });
    },
    [getMealTargetPoints, mealData]
  );

  // Remove food from a meal
  const removeFoodFromMeal = useCallback(
    (mealId: MealId, index: number) => {
      if (!mealData) return;

      setDrafts((prev) => {
        const meal = prev[mealId];
        const removedFood = meal.foods[index];
        if (!removedFood) return prev;

        const macroType = categoryToMacro(removedFood.food.category);
        const newFoods = meal.foods.filter((_, i) => i !== index);
        const newSpent = meal.spentPoints - removedFood.allocatedPoints;
        const targetPoints = getMealTargetPoints(mealId);
        const targets = mealData[mealId];

        // Update per-macro spent
        const newSpentByMacro: MacroSpent = {
          ...meal.spentByMacro,
          [macroType]: meal.spentByMacro[macroType] - removedFood.allocatedPoints,
        };

        // Calculate per-macro remaining
        const newRemainingByMacro: MacroRemaining = {
          protein: targets.protein - newSpentByMacro.protein,
          carbs: targets.carbs - newSpentByMacro.carbs,
          fats: targets.fats - newSpentByMacro.fats,
        };

        return {
          ...prev,
          [mealId]: {
            foods: newFoods,
            spentPoints: newSpent,
            remainingPoints: targetPoints - newSpent,
            spentByMacro: newSpentByMacro,
            remainingByMacro: newRemainingByMacro,
          },
        };
      });
    },
    [getMealTargetPoints, mealData]
  );

  // Clear all drafts
  const clearAllDrafts = useCallback(() => {
    setDrafts({
      breakfast: createEmptyDraft(
        getMealTargetPoints('breakfast'),
        mealData?.breakfast
      ),
      lunch: createEmptyDraft(getMealTargetPoints('lunch'), mealData?.lunch),
      dinner: createEmptyDraft(getMealTargetPoints('dinner'), mealData?.dinner),
    });
  }, [getMealTargetPoints, mealData]);

  // Clear single meal draft
  const clearMealDraft = useCallback(
    (mealId: MealId) => {
      setDrafts((prev) => ({
        ...prev,
        [mealId]: createEmptyDraft(getMealTargetPoints(mealId), mealData?.[mealId]),
      }));
    },
    [getMealTargetPoints, mealData]
  );

  // Open modal for adding food - with smart default based on macro budget
  const openFoodModal = useCallback(
    (food: FoodReference, mealId: MealId) => {
      const macroType = categoryToMacro(food.category);
      const macroRemaining = drafts[mealId].remainingByMacro[macroType];
      const totalRemaining = drafts[mealId].remainingPoints;

      // Smart limit = min of macro remaining and total remaining
      const smartLimit = Math.min(
        Math.max(0, macroRemaining),
        Math.max(0, totalRemaining)
      );

      // Default to 100% if there's room, 50% if we're over (allows controlled overflow)
      const defaultPercentage = smartLimit > 0 ? 100 : 50;

      setModalState({
        isOpen: true,
        food,
        mealId,
        fillPercentage: defaultPercentage,
      });
    },
    [drafts]
  );

  // Close modal
  const closeFoodModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Update fill percentage in modal (0-150 range to allow overflow)
  const setFillPercentage = useCallback((percentage: number) => {
    setModalState((prev) => ({
      ...prev,
      fillPercentage: Math.max(0, Math.min(150, percentage)),
    }));
  }, []);

  // Confirm food addition from modal - uses macro-aware smart limit
  const confirmFoodAddition = useCallback(() => {
    const { food, mealId, fillPercentage } = modalState;
    if (!food) return;

    const macroType = categoryToMacro(food.category);
    const macroRemaining = drafts[mealId].remainingByMacro[macroType];
    const totalRemaining = drafts[mealId].remainingPoints;

    // Smart limit = min of macro remaining and total remaining (but at least 0)
    const smartLimit = Math.max(
      0,
      Math.min(Math.max(0, macroRemaining), Math.max(0, totalRemaining))
    );

    // Calculate points: fillPercentage of smart limit (can go up to 150%)
    const allocatedPoints = Math.round((smartLimit * fillPercentage) / 100);

    if (allocatedPoints > 0) {
      addFoodToMeal(mealId, food, allocatedPoints);
    }
    closeFoodModal();
  }, [modalState, drafts, addFoodToMeal, closeFoodModal]);

  // Get per-macro remaining for a meal
  const getMacroRemaining = useCallback(
    (mealId: MealId): MacroRemaining => drafts[mealId].remainingByMacro,
    [drafts]
  );

  // Get per-macro targets for a meal
  const getMacroTargets = useCallback(
    (mealId: MealId): MacroPoints | null => mealData?.[mealId] ?? null,
    [mealData]
  );

  // Calculate ghost preview for a food item
  const calculateGhostPreview = useCallback(
    (food: FoodReference, mealId: MealId): GhostPreview => {
      const macroType = categoryToMacro(food.category);
      const remaining = drafts[mealId].remainingByMacro;

      // Estimate points based on using the remaining total points
      // (the portion suggestion calculation)
      const totalRemaining = drafts[mealId].remainingPoints;
      const pointsToConsume = Math.round(
        totalRemaining * (food.plateMultiplier ?? 0)
      );

      // Check if this would overflow the specific macro budget
      const wouldOverflow = pointsToConsume > remaining[macroType];

      return {
        macroType,
        pointsToConsume,
        wouldOverflow,
      };
    },
    [drafts]
  );

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
    getMacroRemaining,
    getMacroTargets,
    calculateGhostPreview,
  };
}
