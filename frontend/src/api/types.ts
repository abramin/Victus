export type Sex = 'male' | 'female';
export type Goal = 'lose_weight' | 'maintain' | 'gain_weight';

export interface MealRatios {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface PointsConfig {
  carbMultiplier: number;
  proteinMultiplier: number;
  fatMultiplier: number;
}

export interface UserProfile {
  height_cm: number;
  birthDate: string;
  sex: Sex;
  goal: Goal;
  targetWeightKg: number;
  targetWeeklyChangeKg: number;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  mealRatios: MealRatios;
  pointsConfig: PointsConfig;
  fruitTargetG: number;
  veggieTargetG: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface APIError {
  error: string;
  message?: string;
}
