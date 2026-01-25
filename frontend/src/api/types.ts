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
  bmrEquation?: BMREquation;    // mifflin_st_jeor (default), katch_mcardle, oxford_henry, harris_benedict
  bodyFatPercent?: number;      // For Katch-McArdle equation (optional, 3-70%)
  tdeeSource?: TDEESource;      // formula (default), manual, or adaptive
  manualTDEE?: number;          // User-provided TDEE (when tdeeSource is 'manual')
  recalibrationTolerance?: number; // Plan variance tolerance percentage (1-10%, default 3%)
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

// RecoveryScoreBreakdown contains recovery score with component breakdown.
export interface RecoveryScoreBreakdown {
  score: number;          // Total score 0-100
  restComponent: number;  // Rest days component (0-35)
  acrComponent: number;   // ACR zone component (0-30)
  sleepComponent: number; // Sleep quality component (0-20)
  rhrComponent?: number;  // RHR deviation component (0-15)
}

// AdjustmentMultipliers contains adjustment factors for daily TDEE.
export interface AdjustmentMultipliers {
  trainingLoad: number;       // Based on ACR thresholds
  recoveryScore: number;      // Based on recovery score
  sleepQuality: number;       // Based on today's sleep quality
  yesterdayIntensity: number; // Based on yesterday's max load score
  total: number;              // Product of all multipliers, rounded to 2 decimals
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

export interface DailyTargetsRangePoint {
  date: string;
  calculatedTargets: DailyTargets;
  activeCaloriesBurned?: number;
  plannedSessions?: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
}

export interface DailyTargetsRangeResponse {
  days: DailyTargetsRangePoint[];
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
  tdeeSourceUsed: TDEESource;     // Which TDEE source was used for this day
  tdeeConfidence?: number;        // 0-1 confidence level for adaptive TDEE
  dataPointsUsed?: number;        // Number of data points used for adaptive calculation
  recoveryScore?: RecoveryScoreBreakdown;       // Recovery score breakdown
  adjustmentMultipliers?: AdjustmentMultipliers; // Adjustment multipliers breakdown
  activeCaloriesBurned?: number;                // User-entered active calories from wearable
  bmrPrecisionMode?: boolean;                   // True if Katch-McArdle auto-selected using recent body fat
  bodyFatUsedDate?: string;                     // Date of body fat measurement used for precision BMR
  notes?: string;                               // Daily notes/observations
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
  notes?: string;
}

export interface UpdateActualTrainingRequest {
  actualSessions: Omit<ActualTrainingSession, 'sessionOrder'>[];
}

export interface UpdateActiveCaloriesRequest {
  activeCaloriesBurned: number | null;
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

export interface HistoryPoint {
  date: string;
  weightKg: number;
  estimatedTDEE: number;
  tdeeConfidence: number;
  hasTraining: boolean;

  // Per-day training details for compliance tracking
  plannedSessionCount: number;
  actualSessionCount: number;
  plannedDurationMin: number;
  actualDurationMin: number;

  // Annotated history: notes from training sessions
  notes?: string;

  // Body composition for lean mass vs fat mass visualization
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

// Planned Day Types (Cockpit Dashboard)
export interface PlannedDay {
  date: string;
  dayType: DayType;
}

export interface PlannedDaysResponse {
  days: PlannedDay[];
}

// Food Reference Types (Cockpit Dashboard)
export type FoodCategory = 'high_carb' | 'high_protein' | 'high_fat';

export interface FoodReference {
  id: number;
  category: FoodCategory;
  foodItem: string;
  plateMultiplier: number | null;
}

export interface FoodReferenceResponse {
  foods: FoodReference[];
}

// Nutrition Plan Types (Issue #27, #28)
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
  name?: string; // User-defined plan name (e.g., "Summer Cut")
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
  name?: string; // User-defined plan name
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
  name?: string; // User-defined plan name (optional)
  startDate: string;
  startWeightKg: number;
  goalWeightKg: number;
  durationWeeks: number;
}

// Dual-Track Analysis Types (Issue #29)
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
