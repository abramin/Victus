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
  fruitTargetG: number;
  veggieTargetG: number;
  bmrEquation?: BMREquation;    // mifflin_st_jeor (default), katch_mcardle, oxford_henry, harris_benedict
  bodyFatPercent?: number;      // For Katch-McArdle equation (optional, 3-70%)
  tdeeSource?: TDEESource;      // formula (default), manual, or adaptive
  manualTDEE?: number;          // User-provided TDEE (when tdeeSource is 'manual')
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

// Sleep quality score (1-100).
export type SleepQuality = number;

// Deprecated: Use TrainingSession for multi-session support
export interface PlannedTraining {
  type: TrainingType;
  plannedDurationMin: number;
}

// TrainingSession represents a single training session within a day.
// A day can have multiple sessions (e.g., morning Qigong + afternoon strength).
export interface TrainingSession {
  sessionOrder?: number;
  type: TrainingType;
  durationMin: number;
  notes?: string;
}

// ActualTrainingSession represents an actual training session logged after completion.
export interface ActualTrainingSession {
  sessionOrder?: number;
  type: TrainingType;
  durationMin: number;
  perceivedIntensity?: number; // RPE 1-10
  notes?: string;
}

// TrainingSummary provides aggregate info about training sessions.
export interface TrainingSummary {
  sessionCount: number;
  totalDurationMin: number;
  totalLoadScore: number;
  summary: string; // e.g., "3 sessions, 110 min total"
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
  tdeeSourceUsed: TDEESource;     // Which TDEE source was used for this day
  tdeeConfidence?: number;        // 0-1 confidence level for adaptive TDEE
  dataPointsUsed?: number;        // Number of data points used for adaptive calculation
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

// Training Config Types
export interface TrainingConfig {
  type: TrainingType;
  met: number; // Metabolic Equivalent of Task for calorie calculations
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
