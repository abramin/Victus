import { useReducer, useCallback, useMemo } from 'react';
import type { FastingProtocol, FoodReference, FoodCategory, DayType } from '../../api/types';

// Types
export type MealName = 'breakfast' | 'lunch' | 'dinner' | 'feast';

export interface SelectedFood {
  food: FoodReference;
  grams: number;
  servings: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;
}

export interface MealState {
  items: SelectedFood[];
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalCalories: number;
}

interface State {
  activeMealIndex: number;
  mealStates: Record<MealName, MealState>;
}

type Action =
  | { type: 'NEXT_MEAL'; availableMeals: MealName[] }
  | { type: 'PREV_MEAL'; availableMeals: MealName[] }
  | { type: 'SET_MEAL'; index: number }
  | { type: 'ADD_FOOD'; meal: MealName; food: FoodReference; grams: number }
  | { type: 'REMOVE_FOOD'; meal: MealName; index: number }
  | { type: 'CLEAR_MEAL'; meal: MealName };

// Meal configuration by protocol
export const MEAL_CONFIG: Record<FastingProtocol, MealName[]> = {
  standard: ['breakfast', 'lunch', 'dinner'],
  '16_8': ['lunch', 'dinner'],
  '20_4': ['feast'],
};

export const PROTOCOL_LABELS: Record<FastingProtocol, string> = {
  standard: 'STANDARD',
  '16_8': '16:8 LEANGAINS',
  '20_4': '20:4 WARRIOR',
};

export const MEAL_DISPLAY_NAMES: Record<MealName, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  feast: 'THE FEAST',
};

// API meal slot mapping
export const API_MEAL_MAP: Record<MealName, 'breakfast' | 'lunch' | 'dinner'> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  feast: 'dinner',
};

// Category-based macro estimation
const CATEGORY_MACROS: Record<FoodCategory, { proteinPer100: number; carbsPer100: number; fatPer100: number }> = {
  high_protein: { proteinPer100: 25, carbsPer100: 5, fatPer100: 8 },
  high_carb: { proteinPer100: 8, carbsPer100: 60, fatPer100: 2 },
  high_fat: { proteinPer100: 5, carbsPer100: 5, fatPer100: 40 },
  veg: { proteinPer100: 2, carbsPer100: 6, fatPer100: 0 },
  fruit: { proteinPer100: 1, carbsPer100: 15, fatPer100: 0 },
};

export const DEFAULT_SERVING_G = 100;

export function calculateMacros(food: FoodReference, grams: number) {
  const macros = CATEGORY_MACROS[food.category];
  const multiplier = grams / 100;
  return {
    proteinG: Math.round(macros.proteinPer100 * multiplier),
    carbsG: Math.round(macros.carbsPer100 * multiplier),
    fatG: Math.round(macros.fatPer100 * multiplier),
    calories: Math.round((macros.proteinPer100 * 4 + macros.carbsPer100 * 4 + macros.fatPer100 * 9) * multiplier),
  };
}

// Smart sorting for food deck
export function sortFoodsForContext(
  foods: FoodReference[],
  dayType: DayType,
  mealName: MealName
): FoodReference[] {
  const weights: Record<DayType, Record<FoodCategory, number>> = {
    fatburner: { high_protein: 3, high_fat: 2, high_carb: 1 },
    performance: { high_carb: 3, high_protein: 2, high_fat: 1 },
    metabolize: { high_protein: 2, high_carb: 2, high_fat: 1 },
  };

  // Meal-time boost
  const mealBoost: Record<MealName, Partial<Record<FoodCategory, number>>> = {
    breakfast: { high_carb: 0.5 },
    lunch: {},
    dinner: { high_protein: 0.5 },
    feast: { high_protein: 0.3 },
  };

  const dayWeights = weights[dayType];
  const boost = mealBoost[mealName];

  return [...foods].sort((a, b) => {
    const weightA = (dayWeights[a.category] || 1) + (boost[a.category] || 0);
    const weightB = (dayWeights[b.category] || 1) + (boost[b.category] || 0);
    return weightB - weightA;
  });
}

// Initial state
function createInitialMealState(): MealState {
  return {
    items: [],
    totalProteinG: 0,
    totalCarbsG: 0,
    totalFatG: 0,
    totalCalories: 0,
  };
}

function createInitialState(): State {
  return {
    activeMealIndex: 0,
    mealStates: {
      breakfast: createInitialMealState(),
      lunch: createInitialMealState(),
      dinner: createInitialMealState(),
      feast: createInitialMealState(),
    },
  };
}

// Reducer
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NEXT_MEAL': {
      const nextIndex = (state.activeMealIndex + 1) % action.availableMeals.length;
      return { ...state, activeMealIndex: nextIndex };
    }

    case 'PREV_MEAL': {
      const prevIndex = state.activeMealIndex === 0
        ? action.availableMeals.length - 1
        : state.activeMealIndex - 1;
      return { ...state, activeMealIndex: prevIndex };
    }

    case 'SET_MEAL': {
      return { ...state, activeMealIndex: action.index };
    }

    case 'ADD_FOOD': {
      const macros = calculateMacros(action.food, action.grams);
      const newItem: SelectedFood = {
        food: action.food,
        grams: action.grams,
        servings: action.grams / DEFAULT_SERVING_G,
        ...macros,
      };

      const currentMealState = state.mealStates[action.meal];
      const updatedMealState: MealState = {
        items: [...currentMealState.items, newItem],
        totalProteinG: currentMealState.totalProteinG + macros.proteinG,
        totalCarbsG: currentMealState.totalCarbsG + macros.carbsG,
        totalFatG: currentMealState.totalFatG + macros.fatG,
        totalCalories: currentMealState.totalCalories + macros.calories,
      };

      return {
        ...state,
        mealStates: {
          ...state.mealStates,
          [action.meal]: updatedMealState,
        },
      };
    }

    case 'REMOVE_FOOD': {
      const currentMealState = state.mealStates[action.meal];
      const itemToRemove = currentMealState.items[action.index];
      if (!itemToRemove) return state;

      const updatedMealState: MealState = {
        items: currentMealState.items.filter((_, i) => i !== action.index),
        totalProteinG: currentMealState.totalProteinG - itemToRemove.proteinG,
        totalCarbsG: currentMealState.totalCarbsG - itemToRemove.carbsG,
        totalFatG: currentMealState.totalFatG - itemToRemove.fatG,
        totalCalories: currentMealState.totalCalories - itemToRemove.calories,
      };

      return {
        ...state,
        mealStates: {
          ...state.mealStates,
          [action.meal]: updatedMealState,
        },
      };
    }

    case 'CLEAR_MEAL': {
      return {
        ...state,
        mealStates: {
          ...state.mealStates,
          [action.meal]: createInitialMealState(),
        },
      };
    }

    default:
      return state;
  }
}

// Hook
export function useTacticalKitchenState(protocol: FastingProtocol) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const availableMeals = useMemo(() => MEAL_CONFIG[protocol], [protocol]);
  const activeMeal = availableMeals[state.activeMealIndex] ?? availableMeals[0];
  const activeMealState = state.mealStates[activeMeal];

  const nextMeal = useCallback(() => {
    dispatch({ type: 'NEXT_MEAL', availableMeals });
  }, [availableMeals]);

  const prevMeal = useCallback(() => {
    dispatch({ type: 'PREV_MEAL', availableMeals });
  }, [availableMeals]);

  const addFood = useCallback((food: FoodReference, grams: number) => {
    dispatch({ type: 'ADD_FOOD', meal: activeMeal, food, grams });
  }, [activeMeal]);

  const removeFood = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FOOD', meal: activeMeal, index });
  }, [activeMeal]);

  const clearMeal = useCallback(() => {
    dispatch({ type: 'CLEAR_MEAL', meal: activeMeal });
  }, [activeMeal]);

  return {
    activeMealIndex: state.activeMealIndex,
    availableMeals,
    activeMeal,
    activeMealState,
    allMealStates: state.mealStates,
    canNavigate: availableMeals.length > 1,
    nextMeal,
    prevMeal,
    addFood,
    removeFood,
    clearMeal,
  };
}
