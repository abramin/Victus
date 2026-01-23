/**
 * Test fixtures for Cypress/Cucumber tests.
 * Contains boundary values, test profiles, and daily logs for comprehensive testing.
 */

// =============================================================================
// BOUNDARY VALUES (from constants/index.ts)
// =============================================================================

export const BOUNDARIES = {
  weight: {
    min: 30,
    max: 300,
    belowMin: 29,
    aboveMax: 301,
    valid: 75,
  },
  height: {
    min: 100,
    max: 250,
    belowMin: 99,
    aboveMax: 251,
    valid: 175,
  },
  bodyFat: {
    min: 3,
    max: 70,
    belowMin: 2,
    aboveMax: 71,
    valid: 15,
  },
  heartRate: {
    min: 30,
    max: 200,
    belowMin: 29,
    aboveMax: 201,
    valid: 60,
  },
  sleepHours: {
    min: 0,
    max: 24,
    belowMin: -1,
    aboveMax: 25,
    valid: 7,
  },
  sleepQuality: {
    min: 1,
    max: 100,
    belowMin: 0,
    aboveMax: 101,
    valid: 75,
  },
  weeklyChange: {
    min: -2.0,
    max: 2.0,
    aggressiveLoss: -1.5,
    aggressiveGain: 1.0,
    valid: -0.5,
  },
  timeframe: {
    min: 1,
    max: 520,
    valid: 12,
  },
  tdee: {
    min: 1000,
    max: 6000,
    valid: 2500,
  },
  rpe: {
    min: 1,
    max: 10,
    valid: 5,
  },
  duration: {
    min: 0,
    max: 480, // 8 hours
    valid: 60,
  },
} as const;

// =============================================================================
// ENUM OPTIONS
// =============================================================================

export const OPTIONS = {
  sex: ['male', 'female'] as const,
  goal: ['lose_weight', 'maintain', 'gain_weight'] as const,
  activityLevel: ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const,
  dayType: ['performance', 'fatburner', 'metabolize'] as const,
  bmrEquation: ['mifflin_st_jeor', 'katch_mcardle', 'oxford_henry', 'harris_benedict'] as const,
  tdeeSource: ['formula', 'manual', 'adaptive'] as const,
  trainingType: [
    'rest', 'qigong', 'walking', 'gmb', 'run', 'row',
    'cycle', 'hiit', 'strength', 'calisthenics', 'mobility', 'mixed',
  ] as const,
} as const;

// =============================================================================
// TEST PROFILES
// =============================================================================

const baseProfile = {
  height_cm: 180,
  birthDate: '1990-01-01',
  sex: 'male' as const,
  goal: 'maintain' as const,
  targetWeightKg: 82,
  targetWeeklyChangeKg: 0,
};

export const PROFILES = {
  valid: baseProfile,

  // Sex variations
  male: { ...baseProfile, sex: 'male' as const },
  female: { ...baseProfile, sex: 'female' as const },

  // Goal variations
  loseWeight: { ...baseProfile, goal: 'lose_weight' as const, targetWeeklyChangeKg: -0.5 },
  maintain: { ...baseProfile, goal: 'maintain' as const, targetWeeklyChangeKg: 0 },
  gainWeight: { ...baseProfile, goal: 'gain_weight' as const, targetWeeklyChangeKg: 0.3 },

  // Activity level variations
  sedentary: { ...baseProfile, activityLevel: 'sedentary' as const },
  light: { ...baseProfile, activityLevel: 'light' as const },
  moderate: { ...baseProfile, activityLevel: 'moderate' as const },
  active: { ...baseProfile, activityLevel: 'active' as const },
  veryActive: { ...baseProfile, activityLevel: 'very_active' as const },

  // BMR equation variations
  mifflinStJeor: { ...baseProfile, bmrEquation: 'mifflin_st_jeor' as const },
  katchMcArdle: { ...baseProfile, bmrEquation: 'katch_mcardle' as const, bodyFatPercent: 15 },
  oxfordHenry: { ...baseProfile, bmrEquation: 'oxford_henry' as const },
  harrisBenedict: { ...baseProfile, bmrEquation: 'harris_benedict' as const },

  // TDEE source variations
  formulaTdee: { ...baseProfile, tdeeSource: 'formula' as const },
  manualTdee: { ...baseProfile, tdeeSource: 'manual' as const, manualTdee: 2500 },
  adaptiveTdee: { ...baseProfile, tdeeSource: 'adaptive' as const },

  // Boundary profiles
  minHeight: { ...baseProfile, height_cm: BOUNDARIES.height.min },
  maxHeight: { ...baseProfile, height_cm: BOUNDARIES.height.max },
  minBodyFat: { ...baseProfile, bodyFatPercent: BOUNDARIES.bodyFat.min },
  maxBodyFat: { ...baseProfile, bodyFatPercent: BOUNDARIES.bodyFat.max },

  // Aggressive goal profiles
  aggressiveLoss: {
    ...baseProfile,
    goal: 'lose_weight' as const,
    targetWeeklyChangeKg: BOUNDARIES.weeklyChange.aggressiveLoss,
  },
  aggressiveGain: {
    ...baseProfile,
    goal: 'gain_weight' as const,
    targetWeeklyChangeKg: BOUNDARIES.weeklyChange.aggressiveGain,
  },

  // With supplements
  withSupplements: {
    ...baseProfile,
    goal: 'lose_weight' as const,
    targetWeeklyChangeKg: -0.5,
    supplements: {
      maltodextrinG: 25,
      wheyG: 30,
      collagenG: 20,
    },
  },

  // Invalid profiles
  invalidHeight: { ...baseProfile, height_cm: BOUNDARIES.height.belowMin },
  invalidBodyFat: { ...baseProfile, bodyFatPercent: BOUNDARIES.bodyFat.aboveMax },
} as const;

// =============================================================================
// TEST DAILY LOGS
// =============================================================================

const today = new Date().toISOString().split('T')[0];

const baseDailyLog = {
  date: today,
  weightKg: 82.5,
  sleepQuality: 80,
  plannedTrainingSessions: [{ type: 'strength' as const, durationMin: 60 }],
  dayType: 'performance' as const,
};

export const DAILY_LOGS = {
  valid: baseDailyLog,

  // Day type variations
  performance: { ...baseDailyLog, dayType: 'performance' as const },
  fatburner: { ...baseDailyLog, dayType: 'fatburner' as const },
  metabolize: { ...baseDailyLog, dayType: 'metabolize' as const },

  // Training variations
  restDay: {
    ...baseDailyLog,
    dayType: 'fatburner' as const,
    plannedTrainingSessions: [{ type: 'rest' as const, durationMin: 0 }],
  },
  hiitDay: {
    ...baseDailyLog,
    plannedTrainingSessions: [{ type: 'hiit' as const, durationMin: 30 }],
  },
  multipleTraining: {
    ...baseDailyLog,
    plannedTrainingSessions: [
      { type: 'strength' as const, durationMin: 45 },
      { type: 'walking' as const, durationMin: 30 },
      { type: 'mobility' as const, durationMin: 15 },
    ],
  },
  allTrainingTypes: {
    ...baseDailyLog,
    plannedTrainingSessions: [
      { type: 'strength' as const, durationMin: 30 },
      { type: 'hiit' as const, durationMin: 20 },
      { type: 'walking' as const, durationMin: 30 },
      { type: 'mobility' as const, durationMin: 15 },
      { type: 'qigong' as const, durationMin: 20 },
    ],
  },

  // With optional fields
  withAllFields: {
    ...baseDailyLog,
    bodyFatPercent: 15,
    restingHeartRate: 55,
    sleepHours: 7.5,
  },

  // Boundary logs
  minWeight: { ...baseDailyLog, weightKg: BOUNDARIES.weight.min },
  maxWeight: { ...baseDailyLog, weightKg: BOUNDARIES.weight.max },
  minSleepQuality: { ...baseDailyLog, sleepQuality: BOUNDARIES.sleepQuality.min },
  maxSleepQuality: { ...baseDailyLog, sleepQuality: BOUNDARIES.sleepQuality.max },
  maxSleepHours: { ...baseDailyLog, sleepHours: BOUNDARIES.sleepHours.max },
  minBodyFat: { ...baseDailyLog, bodyFatPercent: BOUNDARIES.bodyFat.min },
  maxBodyFat: { ...baseDailyLog, bodyFatPercent: BOUNDARIES.bodyFat.max },
  minHeartRate: { ...baseDailyLog, restingHeartRate: BOUNDARIES.heartRate.min },
  maxHeartRate: { ...baseDailyLog, restingHeartRate: BOUNDARIES.heartRate.max },

  // Invalid logs
  weightBelowMin: { ...baseDailyLog, weightKg: BOUNDARIES.weight.belowMin },
  weightAboveMax: { ...baseDailyLog, weightKg: BOUNDARIES.weight.aboveMax },
  sleepQualityBelowMin: { ...baseDailyLog, sleepQuality: BOUNDARIES.sleepQuality.belowMin },
  sleepQualityAboveMax: { ...baseDailyLog, sleepQuality: BOUNDARIES.sleepQuality.aboveMax },
  invalidTrainingType: {
    ...baseDailyLog,
    plannedTrainingSessions: [{ type: 'invalid_type' as never, durationMin: 60 }],
  },
} as const;

// =============================================================================
// ACTUAL TRAINING SESSIONS
// =============================================================================

export const ACTUAL_SESSIONS = {
  valid: [
    { type: 'strength' as const, durationMin: 25, perceivedIntensity: 7, notes: 'Felt strong' },
    { type: 'walking' as const, durationMin: 15 },
  ],
  minRpe: [
    { type: 'strength' as const, durationMin: 60, perceivedIntensity: BOUNDARIES.rpe.min },
  ],
  maxRpe: [
    { type: 'hiit' as const, durationMin: 30, perceivedIntensity: BOUNDARIES.rpe.max },
  ],
  longDuration: [
    { type: 'run' as const, durationMin: 120, perceivedIntensity: 6 },
  ],
  maxDuration: [
    { type: 'cycle' as const, durationMin: BOUNDARIES.duration.max, perceivedIntensity: 5 },
  ],
  empty: [] as never[],
} as const;

// =============================================================================
// WEIGHT TREND DATA
// =============================================================================

export const TREND_RANGES = ['7d', '30d', '90d', 'all'] as const;

export const WEIGHT_TRENDS = {
  losing: {
    description: 'Weight decreasing over time',
    weights: [85.0, 84.7, 84.5, 84.2, 84.0, 83.8, 83.5],
  },
  gaining: {
    description: 'Weight increasing over time',
    weights: [75.0, 75.3, 75.5, 75.8, 76.0, 76.3, 76.5],
  },
  maintaining: {
    description: 'Weight stable over time',
    weights: [80.0, 80.1, 79.9, 80.2, 79.8, 80.1, 80.0],
  },
  singlePoint: {
    description: 'Only one data point',
    weights: [82.0],
  },
  empty: {
    description: 'No data points',
    weights: [] as number[],
  },
} as const;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ERROR_CODES = {
  profileRequired: 'profile_required',
  validationError: 'validation_error',
  notFound: 'not_found',
  alreadyExists: 'already_exists',
  invalidRange: 'invalid_range',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const buildDailyLogForDate = (date: Date, weightKg: number) => ({
  ...baseDailyLog,
  date: formatDate(date),
  weightKg,
});

export const getDateOffset = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return formatDate(date);
};

export const createWeightTrendLogs = (weights: number[], startDaysAgo: number) => {
  return weights.map((weight, index) => ({
    ...baseDailyLog,
    date: getDateOffset(-(startDaysAgo - index)),
    weightKg: weight,
  }));
};
