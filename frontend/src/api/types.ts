export type Sex = 'male' | 'female';
export type Goal = 'lose_weight' | 'maintain' | 'gain_weight';
export type TDEESource = 'formula' | 'manual' | 'adaptive';
export type BMREquation = 'mifflin_st_jeor' | 'katch_mcardle' | 'oxford_henry' | 'harris_benedict';
export type FastingProtocol = 'standard' | '16_8' | '20_4';

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
  fastingProtocol?: FastingProtocol;  // standard (default), 16_8, or 20_4
  eatingWindowStart?: string;          // HH:MM format (e.g., "12:00")
  eatingWindowEnd?: string;            // HH:MM format (e.g., "20:00")
  effectiveMealRatios?: MealRatios;    // Meal ratios adjusted for fasting protocol
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

// CNS (Central Nervous System) status types for HRV-based auto-regulation
export type CNSStatus = 'optimized' | 'strained' | 'depleted';

// CNSStatusBreakdown contains HRV analysis results.
export interface CNSStatusBreakdown {
  currentHrv: number;    // Today's HRV in ms
  baselineHrv: number;   // 7-day moving average
  deviationPct: number;  // (current - baseline) / baseline
  status: CNSStatus;     // optimized, strained, depleted
}

// TrainingOverride contains recommended training modification when CNS is depleted.
export interface TrainingOverride {
  shouldOverride: boolean;
  recommendedType: TrainingType;
  recommendedDurationMin: number;
  originalType: TrainingType;
  originalDurationMin: number;
  reason: string;
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
  hrvMs?: number;                              // Heart Rate Variability in milliseconds
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
  cnsStatus?: CNSStatusBreakdown;               // CNS status from HRV analysis
  trainingOverrides?: TrainingOverride[];       // Training adjustments when CNS depleted
  activeCaloriesBurned?: number;                // User-entered active calories from wearable
  bmrPrecisionMode?: boolean;                   // True if Katch-McArdle auto-selected using recent body fat
  bodyFatUsedDate?: string;                     // Date of body fat measurement used for precision BMR
  notes?: string;                               // Daily notes/observations
  fastingOverride?: FastingProtocol;            // Override for fasting protocol (nil = use profile default)
  fastedItemsKcal?: number;                     // Calories logged during fasting window
  consumedCalories: number;                     // Total consumed calories
  consumedProteinG: number;                     // Total consumed protein in grams
  consumedCarbsG: number;                       // Total consumed carbs in grams
  consumedFatG: number;                         // Total consumed fat in grams
  mealsConsumed: MealsConsumed;                 // Per-meal consumed macros
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Per-meal consumed macros.
 */
export interface MealConsumedMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Consumed macros for all meals.
 */
export interface MealsConsumed {
  breakfast: MealConsumedMacros;
  lunch: MealConsumedMacros;
  dinner: MealConsumedMacros;
}

/**
 * Request body for adding consumed macros (additive).
 * If meal is specified, also updates per-meal consumed values.
 */
export interface AddConsumedMacrosRequest {
  meal?: 'breakfast' | 'lunch' | 'dinner';  // Optional: specify which meal this is for
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface CreateDailyLogRequest {
  date?: string;
  weightKg: number;
  bodyFatPercent?: number;
  restingHeartRate?: number;
  hrvMs?: number;                 // Heart Rate Variability in milliseconds
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

export interface UpdateFastingOverrideRequest {
  fastingOverride: FastingProtocol | null;
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
  trainingLoad?: number; // Total training load score for the day

  // Annotated history: notes from training sessions
  notes?: string;

  // Body composition for lean mass vs fat mass visualization
  bodyFatPercent?: number;
  leanMassKg?: number;
  fatMassKg?: number;

  // Recovery metrics for correlation analysis
  restingHeartRate?: number;
  sleepHours?: number;
  hrvMs?: number; // Heart Rate Variability in milliseconds
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

// Body Map / Fatigue Types (Adaptive Load feature)
export type MuscleGroup =
  | 'chest'
  | 'front_delt'
  | 'triceps'
  | 'side_delt'
  | 'lats'
  | 'traps'
  | 'biceps'
  | 'rear_delt'
  | 'forearms'
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'calves'
  | 'lower_back'
  | 'core';

export type Archetype =
  | 'push'
  | 'pull'
  | 'legs'
  | 'upper'
  | 'lower'
  | 'full_body'
  | 'cardio_impact'
  | 'cardio_low';

export type FatigueStatus = 'fresh' | 'stimulated' | 'fatigued' | 'overreached';

export interface MuscleFatigue {
  muscleGroupId: number;
  muscle: MuscleGroup;
  displayName: string;
  fatiguePercent: number;
  status: FatigueStatus;
  color: string;
  lastUpdated?: string;
}

export interface BodyStatus {
  muscles: MuscleFatigue[];
  overallScore: number;
  asOfTime: string;
}

export interface FatigueInjection {
  muscle: MuscleGroup;
  displayName: string;
  injectedPercent: number;
  newTotal: number;
  status: FatigueStatus;
}

export interface SessionFatigueReport {
  sessionId: number;
  archetype: Archetype;
  totalLoad: number;
  injections: FatigueInjection[];
  appliedAt: string;
}

export interface ArchetypeConfig {
  id: number;
  name: Archetype;
  displayName: string;
  coefficients: Record<MuscleGroup, number>;
}

export interface ApplyLoadRequest {
  archetype: Archetype;
  durationMin: number;
  rpe?: number;
}

// =============================================================================
// BIOLOGICAL GUARDRAIL TYPES
// =============================================================================

/** Guardrail warning codes */
export type GuardrailCode = 'LOW_PROTEIN' | 'LOW_FAT' | 'LOW_CARB_TRAINING';

/** Guardrail severity levels */
export type GuardrailSeverity = 'caution' | 'critical';

/**
 * GuardrailWarning represents a biological safety warning.
 * These are advisories (not blockers) - users can acknowledge and override.
 */
export interface GuardrailWarning {
  code: GuardrailCode;
  message: string;
  actualGPerKg: number;
  minGPerKg: number;
  severity: GuardrailSeverity;
}

// =============================================================================
// TRAINING PROGRAM TYPES (Program Management feature)
// =============================================================================

export type ProgramDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ProgramFocus = 'hypertrophy' | 'strength' | 'conditioning' | 'general';
export type EquipmentType = 'barbell' | 'dumbbell' | 'bodyweight' | 'machine' | 'kettlebell' | 'bands' | 'cables';
export type ProgramStatus = 'template' | 'draft' | 'published';
export type InstallationStatus = 'active' | 'completed' | 'abandoned';

/**
 * ProgramDay represents a single training day template within a week.
 */
export interface ProgramDay {
  id: number;
  dayNumber: number;
  label: string;
  trainingType: TrainingType;
  durationMin: number;
  loadScore: number;
  nutritionDay: DayType;
  notes?: string;
}

/**
 * ProgramWeek represents one week within a training program.
 */
export interface ProgramWeek {
  id: number;
  weekNumber: number;
  label: string;
  isDeload: boolean;
  volumeScale: number;
  intensityScale: number;
  days: ProgramDay[];
}

/**
 * TrainingProgram represents a structured training protocol (e.g., "5/3/1", "PPL").
 */
export interface TrainingProgram {
  id: number;
  name: string;
  description?: string;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  difficulty: ProgramDifficulty;
  focus: ProgramFocus;
  equipment: EquipmentType[];
  tags: string[];
  coverImageUrl?: string;
  status: ProgramStatus;
  isTemplate: boolean;
  weeks?: ProgramWeek[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ProgramSummary is a condensed program view for list endpoints.
 */
export interface ProgramSummary {
  id: number;
  name: string;
  description?: string;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  difficulty: ProgramDifficulty;
  focus: ProgramFocus;
  equipment: EquipmentType[];
  tags: string[];
  coverImageUrl?: string;
  status: ProgramStatus;
  isTemplate: boolean;
}

/**
 * WaveformPoint represents a single data point for the periodization waveform chart.
 */
export interface WaveformPoint {
  weekNumber: number;
  label: string;
  volume: number;
  intensity: number;
  isDeload: boolean;
}

/**
 * ProgramInstallation represents a user's active program assignment.
 */
export interface ProgramInstallation {
  id: number;
  programId: number;
  program?: ProgramSummary;
  startDate: string;
  weekDayMapping: number[];
  currentWeek: number;
  status: InstallationStatus;
  totalSessionsScheduled: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ScheduledSession represents a training session scheduled for a specific date.
 */
export interface ScheduledSession {
  date: string;
  weekNumber: number;
  dayNumber: number;
  label: string;
  trainingType: TrainingType;
  durationMin: number;
  loadScore: number;
  nutritionDay: DayType;
}

/**
 * CreateProgramRequest is the request body for creating a custom program.
 */
/** Input type for program days when creating a program */
export interface ProgramDayInput {
  dayNumber: number;
  label: string;
  trainingType: TrainingType;
  durationMin: number;
  loadScore: number;
  nutritionDay: DayType;
  notes?: string;
}

/** Input type for program weeks when creating a program */
export interface ProgramWeekInput {
  weekNumber: number;
  label: string;
  isDeload: boolean;
  volumeScale: number;
  intensityScale: number;
  days: ProgramDayInput[];
}

export interface CreateProgramRequest {
  name: string;
  description?: string;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  difficulty: ProgramDifficulty;
  focus: ProgramFocus;
  equipment: EquipmentType[];
  tags: string[];
  coverImageUrl?: string;
  weeks: ProgramWeekInput[];
}

/**
 * InstallProgramRequest is the request body for installing a program.
 */
export interface InstallProgramRequest {
  startDate: string;
  weekDayMapping: number[];
}

// =============================================================================
// METABOLIC FLUX ENGINE TYPES
// =============================================================================

/** Metabolic trend direction */
export type MetabolicTrend = 'upregulated' | 'downregulated' | 'stable';

/**
 * FluxChartPoint represents a single data point on the Metabolism Graph.
 */
export interface FluxChartPoint {
  date: string;
  calculatedTDEE: number;
  averageIntake: number;
  confidence: number;
  wasConstrained: boolean;
}

/**
 * FluxChartData contains all data for the Metabolism Graph visualization.
 */
export interface FluxChartData {
  points: FluxChartPoint[];
  latestTDEE: number;
  averageTDEE: number;
  deltaKcal: number;
  trend: MetabolicTrend;
  insightText: string;
}

/**
 * FluxNotification represents a pending weekly strategy update notification.
 */
export interface FluxNotification {
  id: number;
  previousTDEE: number;
  newTDEE: number;
  deltaKcal: number;
  reason: string;
  createdAt: string;
}

// =============================================================================
// MACRO TETRIS SOLVER TYPES
// =============================================================================

/**
 * PlannedTrainingForSolver represents a training session for solver context.
 */
export interface PlannedTrainingForSolver {
  type: TrainingType;
  durationMin: number;
}

/**
 * SolverRequest is the request body for the macro solver.
 */
export interface SolverRequest {
  remainingProteinG: number;
  remainingCarbsG: number;
  remainingFatG: number;
  remainingCalories: number;
  // Optional training context for semantic refinement
  dayType?: DayType;
  plannedTraining?: PlannedTrainingForSolver[];
  mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

/**
 * SolverIngredient represents a food ingredient in a solver solution.
 */
export interface SolverIngredient {
  foodId: number;
  foodName: string;
  amountG: number;
  display: string; // Human-readable: "1 Large Egg" or "120g"
}

/**
 * SolverMacros represents the macro values provided by a solution.
 */
export interface SolverMacros {
  proteinG: number;
  carbsG: number;
  fatG: number;
  caloriesKcal: number;
}

/**
 * SemanticRefinement contains AI-enhanced recipe presentation.
 * Generated by Ollama's "Chef-in-the-Loop" semantic refiner.
 */
export interface SemanticRefinement {
  missionTitle: string; // Creative tactical name (e.g., "BIO-RECOVERY PUDDING: ALPHA-1")
  tacticalPrep: string; // Single-sentence preparation instruction
  absurdityAlert?: string; // Logistic alert for excessive amounts (null if no concerns)
  contextualInsight: string; // "Why this works" based on training context
  generatedByLlm: boolean; // True if generated by Ollama, false if fallback
}

/**
 * SolverSolution represents a single meal suggestion from the solver.
 */
export interface SolverSolution {
  ingredients: SolverIngredient[];
  totalMacros: SolverMacros;
  matchScore: number; // 0-100 where 100 is perfect match
  recipeName: string;
  whyText: string;
  refinement?: SemanticRefinement; // AI-enhanced recipe presentation
}

/**
 * SolverResponse is the response from the macro solver API.
 */
export interface SolverResponse {
  solutions: SolverSolution[];
  computed: boolean;
}

// =============================================================================
// Weekly Debrief Types (Mission Report)
// =============================================================================

/**
 * MetabolicFlux represents the metabolic trend for the week.
 */
export interface MetabolicFlux {
  startTDEE: number;
  endTDEE: number;
  deltaKcal: number;
  trend: 'upregulated' | 'downregulated' | 'stable';
}

/**
 * VitalityScore represents the weekly vitality score (Module A).
 */
export interface VitalityScore {
  overall: number; // 0-100 composite score
  mealAdherence: number; // % meals within targets
  trainingAdherence: number; // % planned sessions completed
  weightDelta: number; // kg change
  trendWeight: number; // EMA-filtered trend weight
  metabolicFlux: MetabolicFlux;
}

/**
 * DebriefNarrative contains the AI or template-generated weekly summary.
 */
export interface DebriefNarrative {
  text: string;
  generatedByLlm: boolean;
}

/**
 * TacticalRecommendation is an actionable suggestion for the coming week.
 */
export interface TacticalRecommendation {
  priority: number; // 1-3
  category: 'training' | 'nutrition' | 'recovery';
  summary: string;
  rationale: string;
  actionItems: string[];
}

/**
 * DebriefDay contains per-day data for the weekly breakdown.
 */
export interface DebriefDay {
  date: string;
  dayName: string;
  dayType: DayType;
  targetCalories: number;
  consumedCalories: number;
  calorieDelta: number;
  targetProteinG: number;
  consumedProteinG: number;
  proteinPercent: number;
  plannedSessions: number;
  actualSessions: number;
  trainingLoad: number;
  avgRpe?: number;
  hrvMs?: number;
  cnsStatus?: CNSStatus;
  sleepQuality: number;
  sleepHours?: number;
  notes?: string;
}

/**
 * WeeklyDebrief represents a complete weekly summary (Mission Report).
 */
export interface WeeklyDebrief {
  weekStartDate: string;
  weekEndDate: string;
  vitalityScore: VitalityScore;
  narrative: DebriefNarrative;
  recommendations: TacticalRecommendation[];
  dailyBreakdown: DebriefDay[];
  generatedAt: string;
}

// =============================================================================
// GARMIN DATA IMPORT TYPES
// =============================================================================

/**
 * GarminImportResult contains the outcome of a Garmin data import operation.
 */
export interface GarminImportResult {
  /** Sleep records (includes RHR, HRV, sleep score) successfully imported */
  sleepRecordsImported: number;
  sleepRecordsSkipped: number;
  /** Weight/body composition records imported */
  weightRecordsImported: number;
  weightRecordsSkipped: number;
  /** Standalone HRV records (Estado de VFC) imported */
  hrvRecordsImported: number;
  hrvRecordsSkipped: number;
  /** Standalone RHR records imported */
  rhrRecordsImported: number;
  rhrRecordsSkipped: number;
  /** Monthly activity summary records created */
  monthlySummariesCreated: number;
  monthlySummariesUpdated: number;
  /** Non-fatal warnings encountered during import */
  warnings?: string[];
  /** Fatal errors for specific records */
  errors?: string[];
}

/**
 * MonthlySummary represents aggregated monthly activity data from Garmin.
 */
export interface MonthlySummary {
  id: number;
  yearMonth: string; // Format: "2025-08"
  activityType: TrainingType;
  sessionCount: number;
  totalCalories: number;
  avgCaloriesPerSession: number;
  dataSource: string;
  rawActivityName: string;
  createdAt: string;
}

// =============================================================================
// SEMANTIC BODY (PHASE 4) - BODY PART ISSUES
// =============================================================================

/**
 * IssueSeverity represents the severity level of a body part issue.
 * 1 = Minor (+5% fatigue): tight, stiff, restricted, weak
 * 2 = Moderate (+10% fatigue): sore, ache, tender, fatigued, cramping
 * 3 = Severe (+15% fatigue): pain, sharp, burning, tingling, numb, swollen, clicky
 */
export type IssueSeverity = 1 | 2 | 3;

/**
 * BodyPartIssue represents a detected issue from workout notes.
 */
export interface BodyPartIssue {
  id: number;
  date: string;
  bodyPart: MuscleGroup;
  symptom: string;
  severity: IssueSeverity;
  rawText: string;
  sessionId?: number;
  createdAt: string;
}

/**
 * CreateBodyIssueInput represents a single body part issue to create.
 */
export interface CreateBodyIssueInput {
  bodyPart: string;
  symptom: string;
  rawText: string;
  sessionId?: number;
}

/**
 * CreateBodyIssuesRequest represents the request body for creating body part issues.
 */
export interface CreateBodyIssuesRequest {
  date: string;
  issues: CreateBodyIssueInput[];
}

/**
 * CreateBodyIssuesResponse represents the response after creating body part issues.
 */
export interface CreateBodyIssuesResponse {
  issues: BodyPartIssue[];
  count: number;
}

/**
 * MuscleFatigueModifier represents the fatigue contribution from body issues.
 */
export interface MuscleFatigueModifier {
  muscle: MuscleGroup;
  displayName: string;
  modifier: number;
  issueCount: number;
}

// =============================================================================
// STRATEGY AUDITOR TYPES (Phase 4.2 - Check Engine Light)
// =============================================================================

/**
 * AuditRuleID identifies a specific mismatch rule.
 */
export type AuditRuleID =
  | 'high_fatigue_low_carbs'
  | 'cns_depleted_performance'
  | 'heavy_training_low_protein'
  | 'recovery_overreached';

/**
 * AuditSeverity indicates how critical a mismatch is.
 */
export type AuditSeverity = 'warning' | 'critical';

/**
 * AuditMismatch represents a detected strategy mismatch.
 */
export interface AuditMismatch {
  id: AuditRuleID;
  rule: string;
  severity: AuditSeverity;
  summary: string;
  explanation?: string;
  relatedData?: Record<string, unknown>;
}

/**
 * AuditStatus represents the current audit state for the Check Engine light.
 */
export interface AuditStatus {
  hasMismatch: boolean;
  severity?: AuditSeverity;
  mismatches: AuditMismatch[];
  checkedAt: string;
}
