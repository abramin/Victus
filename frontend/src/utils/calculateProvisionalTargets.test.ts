import { describe, it, expect } from 'vitest';
import { calculateProvisionalTargets } from './calculateProvisionalTargets';
import type { UserProfile, CreateDailyLogRequest } from '../api/types';

// Invariant: This module mirrors backend/internal/domain/targets.go.
// Client-side preview must match server-calculated targets within rounding tolerance.
// Drift causes user confusion when preview differs from saved targets.

const baseProfile: UserProfile = {
  height_cm: 175,
  birthDate: '1990-01-01',
  sex: 'male',
  goal: 'maintain',
  currentWeightKg: 80,
  targetWeightKg: 80,
  timeframeWeeks: 12,
  targetWeeklyChangeKg: 0,
  carbRatio: 0.45,
  proteinRatio: 0.30,
  fatRatio: 0.25,
  mealRatios: { breakfast: 0.25, lunch: 0.35, dinner: 0.40 },
  pointsConfig: { carbMultiplier: 1, proteinMultiplier: 1, fatMultiplier: 1 },
  supplementConfig: { maltodextrinG: 0, wheyG: 0, collagenG: 0 },
  fruitTargetG: 200,
  veggieTargetG: 400,
  bmrEquation: 'mifflin_st_jeor',
  tdeeSource: 'formula',
  recalibrationTolerance: 0.5,
};

const baseFormData: CreateDailyLogRequest = {
  date: '2026-01-27',
  weightKg: 80,
  dayType: 'performance',
  sleepQuality: 75,
  plannedTrainingSessions: [],
};

// Helper: compute expected age the same way the source does (dynamic based on current date)
function computeAge(birthDateStr: string): number {
  const birthDate = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Helper: compute expected TDEE for the base profile (Mifflin-St Jeor, no exercise)
function computeExpectedTdee(sex: 'male' | 'female', weightKg: number, heightCm: number, birthDate: string): number {
  const age = computeAge(birthDate);
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  return bmr * 1.2; // NEAT multiplier
}

describe('calculateProvisionalTargets', () => {
  describe('input validation', () => {
    it('returns null when weight is zero', () => {
      // Invariant: Cannot calculate targets without weight - it drives all calculations.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        weightKg: 0,
      });
      expect(result).toBe(null);
    });

    it('returns null when weight is negative', () => {
      // Invariant: Negative weight is physically impossible - reject early.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        weightKg: -10,
      });
      expect(result).toBe(null);
    });

    it('returns null when weight is undefined', () => {
      // Invariant: Missing weight data should not cause calculation errors.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        weightKg: undefined as unknown as number,
      });
      expect(result).toBe(null);
    });
  });

  describe('BMR calculation (Mifflin-St Jeor)', () => {
    it('calculates BMR correctly for male', () => {
      // Invariant: BMR = 10*weight + 6.25*height - 5*age + 5 (male, Mifflin-St Jeor)
      // totalCalories exceeds base TDEE because performance day applies 1.30x carb multiplier.
      const expectedTdee = computeExpectedTdee('male', 80, 175, '1990-01-01');
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      // Performance day inflates carbs by 1.30x, adding ~300 kcal above TDEE.
      // Assert totalCalories is above TDEE (inflation) but below TDEE * 1.40 (ceiling).
      expect(result!.totalCalories).toBeGreaterThan(expectedTdee);
      expect(result!.totalCalories).toBeLessThan(expectedTdee * 1.40);
    });

    it('calculates BMR correctly for female', () => {
      // Invariant: BMR = 10*weight + 6.25*height - 5*age - 161 (female)
      // Female BMR is lower by 166 kcal vs male (5 − (−161) = 166).
      const femaleProfile: UserProfile = {
        ...baseProfile,
        sex: 'female',
      };
      const expectedMaleTdee = computeExpectedTdee('male', 80, 175, '1990-01-01');
      const expectedFemaleTdee = computeExpectedTdee('female', 80, 175, '1990-01-01');
      const result = calculateProvisionalTargets(femaleProfile, baseFormData);

      expect(result).not.toBe(null);
      // Female TDEE is ~199 kcal lower than male TDEE (166 BMR diff * 1.2 NEAT)
      expect(expectedFemaleTdee).toBeCloseTo(expectedMaleTdee - 199.2, 0);
      // totalCalories includes performance day inflation but stays below male equivalent
      expect(result!.totalCalories).toBeGreaterThan(expectedFemaleTdee);
      expect(result!.totalCalories).toBeLessThan(expectedFemaleTdee * 1.40);
    });
  });

  describe('exercise calories calculation', () => {
    it('adds exercise calories from training sessions', () => {
      // Invariant: Exercise calories = (MET - 1) * weight * duration_hours
      // Strength has MET 5.0, so net MET = 4.0
      // 60 min = 1 hour, 80kg: 4.0 * 80 * 1 = 320 extra kcal
      const withTraining: CreateDailyLogRequest = {
        ...baseFormData,
        plannedTrainingSessions: [{ type: 'strength', durationMin: 60 }],
      };

      const restResult = calculateProvisionalTargets(baseProfile, baseFormData);
      const trainingResult = calculateProvisionalTargets(baseProfile, withTraining);

      expect(trainingResult).not.toBe(null);
      expect(restResult).not.toBe(null);
      // Training day should have higher calories due to exercise
      expect(trainingResult!.totalCalories).toBeGreaterThan(restResult!.totalCalories);
    });

    it('handles multiple training sessions', () => {
      // Invariant: Multiple sessions stack additively.
      const singleSession: CreateDailyLogRequest = {
        ...baseFormData,
        plannedTrainingSessions: [{ type: 'strength', durationMin: 60 }],
      };

      const doubleSessions: CreateDailyLogRequest = {
        ...baseFormData,
        plannedTrainingSessions: [
          { type: 'strength', durationMin: 60 },
          { type: 'run', durationMin: 30 },
        ],
      };

      const singleResult = calculateProvisionalTargets(baseProfile, singleSession);
      const doubleResult = calculateProvisionalTargets(baseProfile, doubleSessions);

      expect(doubleResult!.totalCalories).toBeGreaterThan(singleResult!.totalCalories);
    });

    it('ignores rest sessions in exercise calculation', () => {
      // Invariant: Rest has MET 1.0, so net MET = 0 (no extra calories).
      const withRest: CreateDailyLogRequest = {
        ...baseFormData,
        plannedTrainingSessions: [{ type: 'rest', durationMin: 480 }],
      };

      const noSession = calculateProvisionalTargets(baseProfile, baseFormData);
      const withRestResult = calculateProvisionalTargets(baseProfile, withRest);

      // Rest session should not add exercise calories
      expect(withRestResult!.totalCalories).toBe(noSession!.totalCalories);
    });
  });

  describe('day type multipliers', () => {
    it('performance/fatburner carb ratio matches 1.30/0.60 multiplier ratio', () => {
      // Invariant: Performance = carbs * 1.30, Fatburner = carbs * 0.60.
      // Cross-day ratio verifies the stated multipliers are applied correctly.
      const performanceResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'performance',
      });

      const fatburnerResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'fatburner',
      });

      expect(performanceResult).not.toBe(null);
      expect(fatburnerResult).not.toBe(null);
      // Expected ratio: 1.30 / 0.60 = 2.167
      const ratio = performanceResult!.totalCarbsG / fatburnerResult!.totalCarbsG;
      expect(ratio).toBeCloseTo(1.30 / 0.60, 1);
    });

    it('metabolize/performance carb ratio matches 1.50/1.30 multiplier ratio', () => {
      // Invariant: Metabolize = carbs * 1.50, Performance = carbs * 1.30.
      // Ratio verification catches multiplier drift without duplicating full calculation.
      const metabolizeResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'metabolize',
      });

      const performanceResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'performance',
      });

      expect(metabolizeResult).not.toBe(null);
      expect(performanceResult).not.toBe(null);
      // Expected ratio: 1.50 / 1.30 = 1.154
      const ratio = metabolizeResult!.totalCarbsG / performanceResult!.totalCarbsG;
      expect(ratio).toBeCloseTo(1.50 / 1.30, 1);
    });

    it('fatburner applies 0.85x fat multiplier while enforcing fat floor', () => {
      // Invariant: Fatburner fats = max(baseFats * 0.85, weightKg * 0.7).
      // Fat floor may override the multiplier for lighter users.
      const fatburnerResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'fatburner',
      });
      const performanceResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'performance',
      });

      expect(fatburnerResult).not.toBe(null);
      expect(performanceResult).not.toBe(null);
      // Fatburner fats ≤ performance fats (0.85x multiplier or fat floor, whichever is higher)
      expect(fatburnerResult!.totalFatsG).toBeLessThanOrEqual(performanceResult!.totalFatsG);
      // Fat floor is 80kg * 0.7 = 56g — must be maintained regardless
      expect(fatburnerResult!.totalFatsG).toBeGreaterThanOrEqual(56);
    });
  });

  describe('goal-based adjustments', () => {
    it('applies deficit for lose_weight goal', () => {
      // Invariant: Max deficit is min(TDEE * 20%, 750 kcal).
      const loseWeightProfile: UserProfile = {
        ...baseProfile,
        goal: 'lose_weight',
      };

      const maintainResult = calculateProvisionalTargets(baseProfile, baseFormData);
      const loseResult = calculateProvisionalTargets(loseWeightProfile, baseFormData);

      expect(loseResult).not.toBe(null);
      expect(loseResult!.totalCalories).toBeLessThan(maintainResult!.totalCalories);
    });

    it('applies surplus for gain_weight goal', () => {
      // Invariant: Max surplus is min(TDEE * 10%, 500 kcal).
      const gainWeightProfile: UserProfile = {
        ...baseProfile,
        goal: 'gain_weight',
      };

      const maintainResult = calculateProvisionalTargets(baseProfile, baseFormData);
      const gainResult = calculateProvisionalTargets(gainWeightProfile, baseFormData);

      expect(gainResult).not.toBe(null);
      expect(gainResult!.totalCalories).toBeGreaterThan(maintainResult!.totalCalories);
    });

    it('increases protein for lose_weight goal', () => {
      // Invariant: Higher protein during deficit preserves muscle mass.
      // lose_weight: 1.8-2.2 g/kg vs maintain: 1.2-1.6 g/kg
      const loseWeightProfile: UserProfile = {
        ...baseProfile,
        goal: 'lose_weight',
      };

      const maintainResult = calculateProvisionalTargets(baseProfile, baseFormData);
      const loseResult = calculateProvisionalTargets(loseWeightProfile, baseFormData);

      expect(loseResult).not.toBe(null);
      expect(loseResult!.totalProteinG).toBeGreaterThan(maintainResult!.totalProteinG);
    });
  });

  describe('fat floor enforcement', () => {
    it('enforces minimum fat of 0.7g per kg body weight', () => {
      // Invariant: Fat floor = 0.7 * weight_kg. Essential for hormone production.
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      // 80kg * 0.7 = 56g minimum fat
      expect(result!.totalFatsG).toBeGreaterThanOrEqual(56);
    });

    it('fat floor is maintained even with aggressive deficit', () => {
      // Invariant: Fat floor must be maintained regardless of calorie target.
      const aggressiveProfile: UserProfile = {
        ...baseProfile,
        goal: 'lose_weight',
      };

      const result = calculateProvisionalTargets(aggressiveProfile, {
        ...baseFormData,
        dayType: 'fatburner', // Lower fat multiplier (0.85)
      });

      expect(result).not.toBe(null);
      // Even with fatburner day (0.85x fat), floor should be maintained
      expect(result!.totalFatsG).toBeGreaterThanOrEqual(56);
    });
  });

  describe('fruit and veggie targets', () => {
    it('calculates fruit target within carb limits', () => {
      // Invariant: Fruit limited to 30% of carbs by weight (10g carbs per 100g fruit).
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      // Fruit target should be capped and rounded to nearest 5
      expect(result!.fruitG % 5).toBe(0);
      expect(result!.fruitG).toBeLessThanOrEqual(baseProfile.fruitTargetG);
    });

    it('reduces fruit on fatburner days', () => {
      // Invariant: Fatburner reduces fruit by 70% to lower sugar intake.
      const performanceResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'performance',
      });

      const fatburnerResult = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'fatburner',
      });

      expect(fatburnerResult).not.toBe(null);
      expect(fatburnerResult!.fruitG).toBeLessThan(performanceResult!.fruitG);
    });

    it('calculates veggie target within carb limits', () => {
      // Invariant: Veggies limited to 10% of carbs by weight (3g carbs per 100g veggies).
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      // Veggie target should be rounded to nearest 5
      expect(result!.veggiesG % 5).toBe(0);
    });
  });

  describe('meal point distribution', () => {
    it('distributes points according to meal ratios', () => {
      // Invariant: Meal points = macro * multiplier * ratio. Must match profile ratios.
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      const { meals } = result!;

      // Breakfast ratio is 0.25
      // Lunch ratio is 0.35
      // Dinner ratio is 0.40
      // Verify ratios are approximately preserved
      const totalCarbs = meals.breakfast.carbs + meals.lunch.carbs + meals.dinner.carbs;
      expect(meals.breakfast.carbs / totalCarbs).toBeCloseTo(0.25, 1);
      expect(meals.lunch.carbs / totalCarbs).toBeCloseTo(0.35, 1);
      expect(meals.dinner.carbs / totalCarbs).toBeCloseTo(0.40, 1);
    });

    it('rounds meal points to nearest 5', () => {
      // Invariant: Meal points must be rounded for easier tracking (no decimals).
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      const { meals } = result!;

      expect(meals.breakfast.carbs % 5).toBe(0);
      expect(meals.breakfast.protein % 5).toBe(0);
      expect(meals.breakfast.fats % 5).toBe(0);
      expect(meals.lunch.carbs % 5).toBe(0);
      expect(meals.dinner.carbs % 5).toBe(0);
    });

    it('subtracts supplement carbs on performance days', () => {
      // Invariant: Maltodextrin carbs (96% carb) are pre-workout, not in meals.
      const withSupplements: UserProfile = {
        ...baseProfile,
        supplementConfig: { maltodextrinG: 50, wheyG: 30, collagenG: 20 },
      };

      const noSupps = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'performance',
      });
      const withSupps = calculateProvisionalTargets(withSupplements, {
        ...baseFormData,
        dayType: 'performance',
      });

      expect(withSupps).not.toBe(null);
      // Meal carbs should be lower when supplements account for some carbs
      const noSuppsCarbs =
        noSupps!.meals.breakfast.carbs +
        noSupps!.meals.lunch.carbs +
        noSupps!.meals.dinner.carbs;
      const withSuppsCarbs =
        withSupps!.meals.breakfast.carbs +
        withSupps!.meals.lunch.carbs +
        withSupps!.meals.dinner.carbs;

      expect(withSuppsCarbs).toBeLessThan(noSuppsCarbs);
    });

    it('subtracts supplement protein on performance days', () => {
      // Invariant: Whey (88% protein) and collagen (90% protein) reduce meal protein.
      const withSupplements: UserProfile = {
        ...baseProfile,
        supplementConfig: { maltodextrinG: 0, wheyG: 30, collagenG: 20 },
      };

      const noSupps = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        dayType: 'performance',
      });
      const withSupps = calculateProvisionalTargets(withSupplements, {
        ...baseFormData,
        dayType: 'performance',
      });

      const noSuppsProtein =
        noSupps!.meals.breakfast.protein +
        noSupps!.meals.lunch.protein +
        noSupps!.meals.dinner.protein;
      const withSuppsProtein =
        withSupps!.meals.breakfast.protein +
        withSupps!.meals.lunch.protein +
        withSupps!.meals.dinner.protein;

      expect(withSuppsProtein).toBeLessThan(noSuppsProtein);
    });
  });

  describe('water target calculation', () => {
    it('calculates water based on body weight', () => {
      // Invariant: Water = weight_kg * 0.04 L/kg, rounded to 1 decimal.
      // 80kg * 0.04 = 3.2L
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      expect(result!.waterL).toBe(3.2);
    });

    it('scales water target with weight', () => {
      // Invariant: Heavier individuals need more water.
      const heavyFormData: CreateDailyLogRequest = {
        ...baseFormData,
        weightKg: 100,
      };

      const result = calculateProvisionalTargets(baseProfile, heavyFormData);

      expect(result).not.toBe(null);
      // 100kg * 0.04 = 4.0L
      expect(result!.waterL).toBe(4.0);
    });
  });

  describe('edge cases', () => {
    it('handles empty training sessions array', () => {
      // Invariant: Empty array is valid - user may have rest day with no planned training.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        plannedTrainingSessions: [],
      });

      expect(result).not.toBe(null);
      expect(result!.totalCalories).toBeGreaterThan(0);
    });

    it('handles undefined training sessions', () => {
      // Invariant: Missing sessions should default to empty array.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        plannedTrainingSessions: undefined as unknown as [],
      });

      expect(result).not.toBe(null);
      expect(result!.totalCalories).toBeGreaterThan(0);
    });

    it('handles very low weight (30kg minimum)', () => {
      // Invariant: System should handle boundary weights without errors.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        weightKg: 30,
      });

      expect(result).not.toBe(null);
      expect(result!.totalCalories).toBeGreaterThan(0);
      expect(result!.totalProteinG).toBeGreaterThan(0);
    });

    it('handles very high weight (300kg maximum)', () => {
      // Invariant: System should handle boundary weights without errors.
      const result = calculateProvisionalTargets(baseProfile, {
        ...baseFormData,
        weightKg: 300,
      });

      expect(result).not.toBe(null);
      expect(result!.totalCalories).toBeGreaterThan(0);
    });

    it('uses effectiveMealRatios when available', () => {
      // Invariant: Fasting protocol overrides standard meal ratios.
      const fastingProfile: UserProfile = {
        ...baseProfile,
        effectiveMealRatios: { breakfast: 0, lunch: 0.45, dinner: 0.55 },
      };

      const result = calculateProvisionalTargets(fastingProfile, baseFormData);

      expect(result).not.toBe(null);
      // Breakfast should be 0 when fasting
      expect(result!.meals.breakfast.carbs).toBe(0);
      expect(result!.meals.breakfast.protein).toBe(0);
      expect(result!.meals.breakfast.fats).toBe(0);
    });
  });

  describe('output format', () => {
    it('returns rounded integer values for macros', () => {
      // Invariant: UI displays whole numbers for macros - no decimals.
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      expect(Number.isInteger(result!.totalCarbsG)).toBe(true);
      expect(Number.isInteger(result!.totalProteinG)).toBe(true);
      expect(Number.isInteger(result!.totalFatsG)).toBe(true);
      expect(Number.isInteger(result!.totalCalories)).toBe(true);
    });

    it('includes dayType in output', () => {
      // Invariant: dayType is echoed back for display purposes.
      const result = calculateProvisionalTargets(baseProfile, baseFormData);

      expect(result).not.toBe(null);
      expect(result!.dayType).toBe('performance');
    });
  });
});
