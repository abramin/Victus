import type { DayType, MealRatios, MealTargets, PointsConfig, SupplementConfig } from '../../api/types';
import {
  FRUIT_CARBS_PERCENT_WEIGHT,
  VEGGIE_CARBS_PERCENT_WEIGHT,
  MALTODEXTRIN_CARB_PERCENT,
  WHEY_PROTEIN_PERCENT,
  COLLAGEN_PROTEIN_PERCENT,
} from '../../constants';
import { roundToNearest5 } from '../../utils/math';

export function calculateMealTargets(
  totalCarbsG: number,
  totalProteinG: number,
  totalFatsG: number,
  fruitG: number,
  veggiesG: number,
  mealRatios: MealRatios,
  pointsConfig: PointsConfig,
  dayType: DayType,
  supplements: SupplementConfig
): MealTargets {
  const fruitCarbs = fruitG * FRUIT_CARBS_PERCENT_WEIGHT;
  const veggieCarbs = veggiesG * VEGGIE_CARBS_PERCENT_WEIGHT;
  let availableCarbs = totalCarbsG - veggieCarbs - fruitCarbs;

  if (dayType === 'performance') {
    availableCarbs -= supplements.maltodextrinG * MALTODEXTRIN_CARB_PERCENT;
  }
  if (availableCarbs < 0) {
    availableCarbs = 0;
  }

  let availableProtein = totalProteinG - supplements.collagenG * COLLAGEN_PROTEIN_PERCENT;
  if (dayType === 'performance') {
    availableProtein -= supplements.wheyG * WHEY_PROTEIN_PERCENT;
  }
  if (availableProtein < 0) {
    availableProtein = 0;
  }

  return {
    breakfast: {
      carbs: roundToNearest5(availableCarbs * pointsConfig.carbMultiplier * mealRatios.breakfast),
      protein: roundToNearest5(availableProtein * pointsConfig.proteinMultiplier * mealRatios.breakfast),
      fats: roundToNearest5(totalFatsG * pointsConfig.fatMultiplier * mealRatios.breakfast),
    },
    lunch: {
      carbs: roundToNearest5(availableCarbs * pointsConfig.carbMultiplier * mealRatios.lunch),
      protein: roundToNearest5(availableProtein * pointsConfig.proteinMultiplier * mealRatios.lunch),
      fats: roundToNearest5(totalFatsG * pointsConfig.fatMultiplier * mealRatios.lunch),
    },
    dinner: {
      carbs: roundToNearest5(availableCarbs * pointsConfig.carbMultiplier * mealRatios.dinner),
      protein: roundToNearest5(availableProtein * pointsConfig.proteinMultiplier * mealRatios.dinner),
      fats: roundToNearest5(totalFatsG * pointsConfig.fatMultiplier * mealRatios.dinner),
    },
  };
}
