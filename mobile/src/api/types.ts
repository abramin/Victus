// TypeScript types for Victus API
// Ported from frontend/src/api/types.ts

export type Sex = 'male' | 'female';
export type Goal = 'lose_weight' | 'maintain' | 'gain_weight';
export type TDEESource = 'formula' | 'manual' | 'adaptive';
export type BMREquation = 'mifflin_st_jeor' | 'katch_mcardle' | 'oxford_henry' | 'harris_benedict';

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

export interface SupplementConfig {
  maltodextrinG: number;
  wheyG: number;
  collagenG: number;
}

export interface UserProfile {
  height_cm: number;
  birthDate: string;
  sex: Sex;
  goal: Goal;
  currentWeightKg?: number;
  targetWeightKg: number;
  timeframeWeeks?: number;
  targetWeeklyChangeKg: number;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  mealRatios: MealRatios;
  pointsConfig: PointsConfig;
  supplementConfig: SupplementConfig;
  fruitTargetG: number;
  veggieTargetG: number;
  bmrEquation?: BMREquation;
  bodyFatPercent?: number;
  tdeeSource?: TDEESource;
  manualTDEE?: number;
  recalibrationTolerance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface APIError {
  error: string;
  message?: string;
}

// Daily Log Types
export type TrainingType =
  | 'rest'
  | 'qigong'
  | 'walking'
  | 'gmb'
  | 'run'
  | 'row'
  | 'cycle'
  | 'hiit'
  | 'strength'
  | 'calisthenics'
  | 'mobility'
  | 'mixed';

export type DayType = 'performance' | 'fatburner' | 'metabolize';

export type SleepQuality = number;

export interface TrainingSession {
  sessionOrder?: number;
  type: TrainingType;
  durationMin: number;
  notes?: string;
}

export interface ActualTrainingSession {
  sessionOrder?: number;
  type: TrainingType;
  durationMin: number;
  perceivedIntensity?: number; // RPE 1-10
  notes?: string;
}

export interface TrainingSummary {
  sessionCount: number;
  totalDurationMin: number;
  totalLoadScore: number;
  summary: string;
}

export interface RecoveryScoreBreakdown {
  score: number;
  restComponent: number;
  acrComponent: number;
  sleepComponent: number;
  rhrComponent?: number;
}

export interface AdjustmentMultipliers {
  trainingLoad: number;
  recoveryScore: number;
  sleepQuality: number;
  yesterdayIntensity: number;
  total: number;
}

export interface MacroPoints {
  carbs: number;
  protein: number;
  fats: number;
}

export interface MealTargets {
  breakfast: MacroPoints;
  lunch: MacroPoints;
  dinner: MacroPoints;
}

export interface DailyTargets {
  totalCarbsG: number;
  totalProteinG: number;
  totalFatsG: number;
  totalCalories: number;
  meals: MealTargets;
  fruitG: number;
  veggiesG: number;
  waterL: number;
  dayType: DayType;
}

export interface DailyLog {
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  restingHeartRate?: number;
  sleepQuality: SleepQuality;
  sleepHours?: number;
  plannedTrainingSessions: TrainingSession[];
  actualTrainingSessions?: ActualTrainingSession[];
  trainingSummary: TrainingSummary;
  dayType: DayType;
  calculatedTargets: DailyTargets;
  estimatedTDEE: number;
  formulaTDEE?: number;
  tdeeSourceUsed: TDEESource;
  tdeeConfidence?: number;
  dataPointsUsed?: number;
  recoveryScore?: RecoveryScoreBreakdown;
  adjustmentMultipliers?: AdjustmentMultipliers;
  activeCaloriesBurned?: number;
  bmrPrecisionMode?: boolean;
  bodyFatUsedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDailyLogRequest {
  date?: string;
  weightKg: number;
  bodyFatPercent?: number;
  restingHeartRate?: number;
  sleepQuality: SleepQuality;
  sleepHours?: number;
  plannedTrainingSessions: TrainingSession[];
  dayType: DayType;
}

export interface UpdateActualTrainingRequest {
  actualSessions: Omit<ActualTrainingSession, 'sessionOrder'>[];
}

export interface UpdateActiveCaloriesRequest {
  activeCaloriesBurned: number | null;
}

export interface TrainingConfig {
  type: TrainingType;
  met: number;
  loadScore: number;
}

// Weight Trend Types
export type WeightTrendRange = '7d' | '30d' | '90d' | 'all';

export interface WeightTrendPoint {
  date: string;
  weightKg: number;
}

export interface WeightTrendSummary {
  weeklyChangeKg: number;
  rSquared: number;
  startWeightKg: number;
  endWeightKg: number;
}

export interface WeightTrendResponse {
  points: WeightTrendPoint[];
  trend?: WeightTrendSummary;
}

export interface HistoryPoint {
  date: string;
  weightKg: number;
  estimatedTDEE: number;
  tdeeConfidence: number;
  hasTraining: boolean;
  plannedSessionCount: number;
  actualSessionCount: number;
  plannedDurationMin: number;
  actualDurationMin: number;
  notes?: string;
  bodyFatPercent?: number;
  leanMassKg?: number;
  fatMassKg?: number;
}

export interface TrainingSummaryRange {
  planned: TrainingSummary;
  actual: TrainingSummary;
}

export interface HistoryResponse {
  points: HistoryPoint[];
  trend?: WeightTrendSummary;
  trainingSummary: TrainingSummaryRange;
}

// Planned Day Types
export interface PlannedDay {
  date: string;
  dayType: DayType;
}

export interface PlannedDaysResponse {
  days: PlannedDay[];
}

// Food Reference Types
export type FoodCategory = 'high_carb' | 'high_protein' | 'high_fat' | 'vegetable' | 'fruit';

export interface FoodReference {
  id: number;
  category: FoodCategory;
  foodItem: string;
  plateMultiplier: number | null;
}

export interface FoodReferenceResponse {
  foods: FoodReference[];
}

// Nutrition Plan Types
export type PlanStatus = 'active' | 'completed' | 'abandoned' | 'paused';

export interface WeeklyTarget {
  weekNumber: number;
  startDate: string;
  endDate: string;
  projectedWeightKg: number;
  projectedTDEE: number;
  targetIntakeKcal: number;
  targetCarbsG: number;
  targetProteinG: number;
  targetFatsG: number;
  actualWeightKg?: number;
  actualIntakeKcal?: number;
  daysLogged: number;
}

export interface NutritionPlan {
  id: number;
  name?: string;
  startDate: string;
  startWeightKg: number;
  goalWeightKg: number;
  durationWeeks: number;
  requiredWeeklyChangeKg: number;
  requiredDailyDeficitKcal: number;
  status: PlanStatus;
  currentWeek: number;
  weeklyTargets: WeeklyTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface NutritionPlanSummary {
  id: number;
  name?: string;
  startDate: string;
  startWeightKg: number;
  goalWeightKg: number;
  durationWeeks: number;
  requiredWeeklyChangeKg: number;
  requiredDailyDeficitKcal: number;
  status: PlanStatus;
  currentWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  name?: string;
  startDate: string;
  startWeightKg: number;
  goalWeightKg: number;
  durationWeeks: number;
}

// Dual-Track Analysis Types
export type RecalibrationOptionType = 'increase_deficit' | 'extend_timeline' | 'revise_goal' | 'keep_current';
export type FeasibilityTag = 'Achievable' | 'Moderate' | 'Ambitious';

export interface RecalibrationOption {
  type: RecalibrationOptionType;
  feasibilityTag: FeasibilityTag;
  newParameter: string;
  impact: string;
}

export interface ProjectionPoint {
  weekNumber: number;
  date: string;
  weightKg: number;
}

export interface LandingPointProjection {
  weightKg: number;
  date: string;
  varianceFromGoalKg: number;
  onTrackForGoal: boolean;
}

export interface DualTrackAnalysis {
  planId: number;
  analysisDate: string;
  currentWeek: number;
  plannedWeightKg: number;
  actualWeightKg: number;
  varianceKg: number;
  variancePercent: number;
  tolerancePercent: number;
  recalibrationNeeded: boolean;
  options?: RecalibrationOption[];
  planProjection: ProjectionPoint[];
  trendProjection?: ProjectionPoint[];
  landingPoint?: LandingPointProjection;
}
