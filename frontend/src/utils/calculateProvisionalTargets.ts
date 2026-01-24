/**
 * calculateProvisionalTargets.ts
 *
 * Client-side calculation of provisional daily targets for live preview.
 * Ports core logic from backend/internal/domain/targets.go.
 */

import type {
  UserProfile,
  CreateDailyLogRequest,
  DailyTargets,
  MealTargets,
  TrainingSession,
  DayType,
  Goal,
  TrainingType,
} from '../api/types';

// =============================================================================
// CONSTANTS (mirroring backend/internal/domain/constants.go)
// =============================================================================

const NEAT_MULTIPLIER = 1.2;
const WATER_L_PER_KG = 0.04;

const FAT_MINIMUM_G_PER_KG = 0.7;
const FAT_CALORIES_PERCENT = 0.35;

const CALORIES_PER_GRAM_CARB = 4.0;
const CALORIES_PER_GRAM_PROTEIN = 4.0;
const CALORIES_PER_GRAM_FAT = 9.0;

const MAX_DEFICIT_PERCENT = 0.20;
const MAX_DEFICIT_KCAL = 750.0;
const MAX_SURPLUS_PERCENT = 0.10;
const MAX_SURPLUS_KCAL = 500.0;

const FRUIT_CARBS_PERCENT_WEIGHT = 0.10;
const VEGGIE_CARBS_PERCENT_WEIGHT = 0.03;
const FRUIT_MAX_CARB_PERCENT = 0.30;
const VEGGIE_MAX_CARB_PERCENT = 0.10;
const FATBURNER_FRUIT_REDUCTION = 0.70;

const MALTODEXTRIN_CARB_PERCENT = 0.96;
const WHEY_PROTEIN_PERCENT = 0.88;
const COLLAGEN_PROTEIN_PERCENT = 0.90;

// MET values for training types (from backend)
const TRAINING_MET: Record<TrainingType, number> = {
  rest: 1.0,
  qigong: 2.5,
  walking: 3.5,
  gmb: 4.0,
  run: 9.8,
  row: 7.0,
  cycle: 6.8,
  hiit: 12.8,
  strength: 5.0,
  calisthenics: 4.0,
  mobility: 2.5,
  mixed: 6.0,
};

// Day type multipliers
interface DayTypeMultipliers {
  carbs: number;
  protein: number;
  fats: number;
}

const DAY_TYPE_MULTIPLIERS: Record<DayType, DayTypeMultipliers> = {
  fatburner: { carbs: 0.60, protein: 1.00, fats: 0.85 },
  performance: { carbs: 1.30, protein: 1.00, fats: 1.00 },
  metabolize: { carbs: 1.50, protein: 1.00, fats: 1.10 },
};

// Protein recommendations based on goal
interface ProteinRecommendation {
  minGPerKg: number;
  optimalGPerKg: number;
}

function getProteinRecommendation(
  goal: Goal,
  isTrainingDay: boolean,
  deficitSeverity: number
): ProteinRecommendation {
  switch (goal) {
    case 'lose_weight':
      if (deficitSeverity > 0.25) {
        return { minGPerKg: 2.0, optimalGPerKg: 2.4 };
      }
      return { minGPerKg: 1.8, optimalGPerKg: 2.2 };
    case 'gain_weight':
      if (isTrainingDay) {
        return { minGPerKg: 1.6, optimalGPerKg: 2.0 };
      }
      return { minGPerKg: 1.4, optimalGPerKg: 1.8 };
    default: // maintain
      if (isTrainingDay) {
        return { minGPerKg: 1.4, optimalGPerKg: 1.8 };
      }
      return { minGPerKg: 1.2, optimalGPerKg: 1.6 };
  }
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

function calculateAge(birthDateStr: string): number {
  const birthDate = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function calculateBMR(profile: UserProfile, weightKg: number): number {
  const age = calculateAge(profile.birthDate);
  const base = 10 * weightKg + 6.25 * profile.height_cm - 5 * age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

function calculateExerciseCalories(sessions: TrainingSession[], weightKg: number): number {
  let total = 0;
  for (const session of sessions) {
    const met = TRAINING_MET[session.type] || 1.0;
    const netMET = Math.max(met - 1.0, 0);
    const durationHours = session.durationMin / 60.0;
    total += netMET * weightKg * durationHours;
  }
  return total;
}

function hasNonRestSession(sessions: TrainingSession[]): boolean {
  return sessions.some((s) => s.type !== 'rest');
}

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5;
}

function calculateFruit(carbsG: number, targetG: number, dayType: DayType): number {
  const maxFruit = (carbsG * FRUIT_MAX_CARB_PERCENT) / FRUIT_CARBS_PERCENT_WEIGHT;
  const multiplier = dayType === 'fatburner' ? FATBURNER_FRUIT_REDUCTION : 1.0;
  const adjustedTarget = targetG * multiplier;
  return roundToNearest5(Math.min(adjustedTarget, maxFruit));
}

function calculateVeggies(carbsG: number, targetG: number): number {
  const maxVeggies = (carbsG * VEGGIE_MAX_CARB_PERCENT) / VEGGIE_CARBS_PERCENT_WEIGHT;
  return roundToNearest5(Math.min(targetG, maxVeggies));
}

function calculateMealPoints(
  carbsG: number,
  proteinG: number,
  fatsG: number,
  fruitG: number,
  veggiesG: number,
  profile: UserProfile,
  dayType: DayType
): MealTargets {
  const { mealRatios, pointsConfig, supplementConfig } = profile;

  // Calculate available carbs (subtract fruit/veggie contributions)
  const fruitCarbs = fruitG * FRUIT_CARBS_PERCENT_WEIGHT;
  const veggieCarbs = veggiesG * VEGGIE_CARBS_PERCENT_WEIGHT;
  let availableCarbsG = carbsG - veggieCarbs - fruitCarbs;

  // On performance days, subtract maltodextrin carbs
  if (dayType === 'performance') {
    const maltodextrinCarbs = supplementConfig.maltodextrinG * MALTODEXTRIN_CARB_PERCENT;
    availableCarbsG -= maltodextrinCarbs;
  }
  availableCarbsG = Math.max(availableCarbsG, 0);

  // Calculate available protein (subtract collagen/whey contributions)
  const collagenProtein = supplementConfig.collagenG * COLLAGEN_PROTEIN_PERCENT;
  let availableProteinG = proteinG - collagenProtein;

  if (dayType === 'performance') {
    const wheyProtein = supplementConfig.wheyG * WHEY_PROTEIN_PERCENT;
    availableProteinG -= wheyProtein;
  }
  availableProteinG = Math.max(availableProteinG, 0);

  return {
    breakfast: {
      carbs: roundToNearest5(availableCarbsG * pointsConfig.carbMultiplier * mealRatios.breakfast),
      protein: roundToNearest5(availableProteinG * pointsConfig.proteinMultiplier * mealRatios.breakfast),
      fats: roundToNearest5(fatsG * pointsConfig.fatMultiplier * mealRatios.breakfast),
    },
    lunch: {
      carbs: roundToNearest5(availableCarbsG * pointsConfig.carbMultiplier * mealRatios.lunch),
      protein: roundToNearest5(availableProteinG * pointsConfig.proteinMultiplier * mealRatios.lunch),
      fats: roundToNearest5(fatsG * pointsConfig.fatMultiplier * mealRatios.lunch),
    },
    dinner: {
      carbs: roundToNearest5(availableCarbsG * pointsConfig.carbMultiplier * mealRatios.dinner),
      protein: roundToNearest5(availableProteinG * pointsConfig.proteinMultiplier * mealRatios.dinner),
      fats: roundToNearest5(fatsG * pointsConfig.fatMultiplier * mealRatios.dinner),
    },
  };
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

/**
 * Calculate provisional daily targets for live preview.
 * This mirrors the backend CalculateDailyTargets function.
 */
export function calculateProvisionalTargets(
  profile: UserProfile,
  formData: CreateDailyLogRequest
): DailyTargets | null {
  // Require minimum data
  if (!formData.weightKg || formData.weightKg <= 0) {
    return null;
  }

  const weightKg = formData.weightKg;
  const dayType = formData.dayType;
  const sessions = formData.plannedTrainingSessions || [];

  // 1. Calculate BMR using Mifflin-St Jeor
  const bmr = calculateBMR(profile, weightKg);

  // 2. Calculate exercise calories
  const exerciseCalories = calculateExerciseCalories(sessions, weightKg);

  // 3. Calculate TDEE
  const tdee = bmr * NEAT_MULTIPLIER + exerciseCalories;

  // 4. Apply goal-based adjustment
  let targetCalories: number;
  let deficitSeverity = 0;

  switch (profile.goal) {
    case 'lose_weight': {
      const deficit = Math.min(tdee * MAX_DEFICIT_PERCENT, MAX_DEFICIT_KCAL);
      targetCalories = tdee - deficit;
      deficitSeverity = deficit / tdee;
      break;
    }
    case 'gain_weight': {
      const surplus = Math.min(tdee * MAX_SURPLUS_PERCENT, MAX_SURPLUS_KCAL);
      targetCalories = tdee + surplus;
      break;
    }
    default:
      targetCalories = tdee;
  }

  // 5. Calculate macros with protein-first approach
  const isTrainingDay = hasNonRestSession(sessions);
  const proteinRec = getProteinRecommendation(profile.goal, isTrainingDay, deficitSeverity);

  const proteinG = weightKg * proteinRec.optimalGPerKg;
  const proteinCalories = proteinG * CALORIES_PER_GRAM_PROTEIN;

  // 6. Set fat floor
  const fatMinG = weightKg * FAT_MINIMUM_G_PER_KG;
  const remainingAfterProtein = targetCalories - proteinCalories;
  const fatCaloriesTarget = remainingAfterProtein * FAT_CALORIES_PERCENT;
  const fatG = Math.max(fatCaloriesTarget / CALORIES_PER_GRAM_FAT, fatMinG);
  const fatCalories = fatG * CALORIES_PER_GRAM_FAT;

  // 7. Remaining goes to carbs
  let carbCalories = targetCalories - proteinCalories - fatCalories;
  if (carbCalories < 0) carbCalories = 0;
  const carbG = carbCalories / CALORIES_PER_GRAM_CARB;

  // 8. Apply day type modifiers
  const mult = DAY_TYPE_MULTIPLIERS[dayType];
  const finalCarbsG = carbG * mult.carbs;
  const finalProteinG = Math.max(proteinG * mult.protein, weightKg * proteinRec.minGPerKg);
  const finalFatsG = Math.max(fatG * mult.fats, fatMinG);

  // 9. Recalculate total calories
  const totalCalories =
    finalCarbsG * CALORIES_PER_GRAM_CARB +
    finalProteinG * CALORIES_PER_GRAM_PROTEIN +
    finalFatsG * CALORIES_PER_GRAM_FAT;

  // 10. Calculate fruit/veggies targets
  const fruitG = calculateFruit(finalCarbsG, profile.fruitTargetG, dayType);
  const veggiesG = calculateVeggies(finalCarbsG, profile.veggieTargetG);

  // 11. Convert to meal points
  const meals = calculateMealPoints(
    finalCarbsG,
    finalProteinG,
    finalFatsG,
    fruitG,
    veggiesG,
    profile,
    dayType
  );

  // 12. Calculate water target
  const waterL = Math.round(weightKg * WATER_L_PER_KG * 10) / 10;

  return {
    totalCarbsG: Math.round(finalCarbsG),
    totalProteinG: Math.round(finalProteinG),
    totalFatsG: Math.round(finalFatsG),
    totalCalories: Math.round(totalCalories),
    meals,
    fruitG,
    veggiesG,
    waterL,
    dayType,
  };
}
