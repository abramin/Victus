# MacroTrack PRD
## Adaptive Daily Nutrition Planning App

**Version:** 1.0  
**Author:** Alex (via Claude)  
**Date:** December 31, 2025

---

## 1. Product Overview

### 1.1 Purpose
MacroTrack is a web application that provides daily personalized macro targets based on:
- Current biometrics (weight, body fat, RHR, sleep quality)
- Planned training for the day
- Historical data to adaptively refine TDEE and optimize recommendations
- Training load accumulation for periodization-aware nutrition

### 1.2 Core Value Proposition
Unlike static nutrition calculators, MacroTrack learns from your actual weight/intake history to provide increasingly accurate recommendations. It understands that yesterday's heavy training session means today might need different nutrition than a simple "workout day" formula suggests.

### 1.3 Key Differentiators from Spreadsheet Model
| Spreadsheet | MacroTrack |
|-------------|------------|
| Fixed weekly macro progression | Adaptive TDEE from weight trends |
| Binary day types (workout/rest) | Structured training classification with load accumulation |
| No feedback loop | Learns from planned vs actual outcomes |
| Manual data entry in cells | Daily input form with history visualization |

---

## 2. User Stories

### 2.1 Daily Flow
```
As a user, I want to:
1. Open the app each morning
2. Enter today's weight, sleep quality, RHR, and body fat (if measured)
3. Select/describe my planned training for today
4. Receive my macro point targets for each meal
5. See my fruit and vegetable gram targets
6. Log my actual training at end of day (optional but recommended)
```

### 2.2 Historical Review
```
As a user, I want to:
- View my weight trend over time with predicted vs actual
- See how my estimated TDEE has evolved
- Compare planned vs actual training load
- Identify patterns (e.g., "heavy leg days followed by weight spikes")
```

### 2.3 Configuration
```
As a user, I want to:
- Set my base profile (height, age, sex, goal)
- Configure my macro ratio preferences
- Adjust meal distribution ratios
- Set training type definitions
```

---

## 3. Data Model

### 3.1 User Profile (Static/Semi-Static)
```typescript
interface UserProfile {
  id: string;
  createdAt: Date;
  
  // Biometrics (set once, rarely changed)
  height_cm: number;
  birthDate: Date;
  sex: 'male' | 'female';
  
  // Goals (changed periodically)
  goal: 'lose_weight' | 'maintain' | 'gain_weight';
  targetWeightKg: number;
  targetWeeklyChangeKg: number; // e.g., -0.5 for losing 0.5kg/week
  
  // Base macro ratios (user adjustable)
  carbRatio: number;   // e.g., 0.45
  proteinRatio: number; // e.g., 0.30
  fatRatio: number;     // e.g., 0.25
  
  // Meal distribution
  mealRatios: {
    breakfast: number; // e.g., 0.30
    lunch: number;     // e.g., 0.30
    dinner: number;    // e.g., 0.40
  };
  
  // Points conversion factors (from spreadsheet model)
  pointsConfig: {
    carbMultiplier: number;    // 1.15
    proteinMultiplier: number; // 4.35
    fatMultiplier: number;     // 3.5
  };
  
  // Fruit/Veg preferences
  fruitTargetG: number;  // e.g., 600
  veggieTargetG: number; // e.g., 500
}
```

### 3.2 Daily Log Entry
```typescript
interface DailyLog {
  id: string;
  date: Date; // Date only, no time
  userId: string;
  
  // Morning inputs
  weightKg: number;
  bodyFatPercent?: number;
  restingHeartRate?: number;
  sleepQuality: number; // 1-100 (Garmin score)
  sleepHours?: number;
  
  // Planned training
  plannedTraining: TrainingSession;

  // User-selected day type (determines macro strategy)
  dayType: 'performance' | 'fatburner' | 'metabolize';

  // Actual training (logged later)
  actualTraining?: TrainingSession;
  
  // Calculated outputs (stored for history)
  calculatedTargets: DailyTargets;
  
  // Adaptive model state at time of calculation
  estimatedTDEE: number;
  adaptiveMultipliers: AdaptiveMultipliers;
}

interface TrainingSession {
  type: TrainingType;
  plannedDurationMin: number;
  actualDurationMin?: number;
  perceivedIntensity?: 1 | 2 | 3 | 4 | 5; // RPE scale simplified
  notes?: string;
}

type TrainingType =
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

interface DailyTargets {
  // Total day macros (grams)
  totalCarbsG: number;
  totalProteinG: number;
  totalFatsG: number;
  totalCalories: number;
  
  // Meal breakdown (points)
  meals: {
    breakfast: MacroPoints;
    lunch: MacroPoints;
    dinner: MacroPoints;
  };
  
  // Additional targets
  fruitG: number;
  veggiesG: number;
  waterL: number;
  
  // Day classification
  dayType: 'performance' | 'fatburner' | 'metabolize';
}

interface MacroPoints {
  carbs: number;
  protein: number;
  fats: number;
}

interface AdaptiveMultipliers {
  tdeeAdjustment: number;      // Multiplier based on weight trend analysis
  acuteLoadFactor: number;     // Based on recent training load
  recoveryFactor: number;      // Based on sleep/HRV trends
}
```

### 3.3 Training Type Configuration
```typescript
interface TrainingTypeConfig {
  type: TrainingType;

  // Estimated calorie burn per minute (used for TDEE refinement)
  estimatedCalPerMin: number;

  // Load score for accumulation (arbitrary units, relative)
  loadScore: number;
}

// Default configurations
// Note: DayType is now user-selected, not derived from training type
const TRAINING_CONFIGS: TrainingTypeConfig[] = [
  { type: 'rest', estimatedCalPerMin: 0, loadScore: 0 },
  { type: 'qigong', estimatedCalPerMin: 2, loadScore: 0.5 },
  { type: 'walking', estimatedCalPerMin: 4, loadScore: 1 },
  { type: 'gmb', estimatedCalPerMin: 5, loadScore: 3 },
  { type: 'run', estimatedCalPerMin: 8, loadScore: 3 },
  { type: 'row', estimatedCalPerMin: 8, loadScore: 3 },
  { type: 'cycle', estimatedCalPerMin: 6, loadScore: 2 },
  { type: 'hiit', estimatedCalPerMin: 12, loadScore: 5 },
  { type: 'strength', estimatedCalPerMin: 7, loadScore: 5 },
  { type: 'calisthenics', estimatedCalPerMin: 5, loadScore: 3 },
  { type: 'mobility', estimatedCalPerMin: 2, loadScore: 0.5 },
  { type: 'mixed', estimatedCalPerMin: 6, loadScore: 4 },
];
```

---

## 4. Core Algorithms

### 4.1 Base Macro Calculation (From Spreadsheet)

This replicates the spreadsheet's core logic:

```typescript
function calculateBaseMacros(
  profile: UserProfile,
  currentWeight: number,
  kcalFactor: number // Starting point ~29-33 kcal/kg
): BaseMacros {
  const totalCalories = currentWeight * kcalFactor;
  
  return {
    carbsG: (totalCalories * profile.carbRatio) / 4.1,
    proteinG: (totalCalories * profile.proteinRatio) / 4.3,
    fatsG: (totalCalories * profile.fatRatio) / 9.3,
    totalCalories
  };
}
```

### 4.2 Day Type Multipliers (From Spreadsheet)

The spreadsheet applies multipliers based on day type and goal:

```typescript
interface DayTypeMultipliers {
  carbs: number;
  protein: number;
  fats: number;
}

function getDayTypeMultipliers(
  dayType: 'performance' | 'fatburner' | 'metabolize',
  goal: 'lose_weight' | 'gain_weight' | 'maintain'
): DayTypeMultipliers {
  const MULTIPLIERS = {
    fatburner: {
      lose_weight: { carbs: 0.8, protein: 0.8, fats: 0.8 },
      gain_weight: { carbs: 0.656, protein: 0.656, fats: 0.656 },
      maintain: { carbs: 0.72, protein: 0.72, fats: 0.72 }
    },
    performance: {
      lose_weight: { carbs: 1.15, protein: 1.15, fats: 1.15 },
      gain_weight: { carbs: 1.116, protein: 1.116, fats: 1.116 },
      maintain: { carbs: 1.13, protein: 1.13, fats: 1.13 }
    },
    metabolize: {
      lose_weight: { carbs: 1.2, protein: 1.2, fats: 1.2 },
      gain_weight: { carbs: 1.357, protein: 1.35, fats: 1.357 },
      maintain: { carbs: 1.28, protein: 1.27, fats: 1.28 }
    }
  };
  
  return MULTIPLIERS[dayType][goal];
}

function applyDayTypeMultipliers(
  baseMacros: BaseMacros,
  dayType: 'performance' | 'fatburner' | 'metabolize',
  goal: 'lose_weight' | 'gain_weight' | 'maintain'
): BaseMacros {
  const mult = getDayTypeMultipliers(dayType, goal);
  
  return {
    carbsG: baseMacros.carbsG * mult.carbs,
    proteinG: baseMacros.proteinG * mult.protein,
    fatsG: baseMacros.fatsG * mult.fats,
    totalCalories: 
      (baseMacros.carbsG * mult.carbs * 4.1) +
      (baseMacros.proteinG * mult.protein * 4.3) +
      (baseMacros.fatsG * mult.fats * 9.3)
  };
}
```

### 4.3 Macro Points Conversion (From Spreadsheet)

The spreadsheet uses a "points" system for meal planning:

```typescript
function convertToMealPoints(
  macrosG: { carbsG: number; proteinG: number; fatsG: number },
  mealRatio: number,
  fruitG: number,
  veggiesG: number,
  config: UserProfile['pointsConfig']
): MacroPoints {
  // Subtract fruit/veggie carbs from total available
  const fruitCarbs = fruitG * 0.10;   // ~10g carbs per 100g fruit
  const veggieCarbs = veggiesG * 0.03; // ~3g carbs per 100g veggies
  const availableCarbs = macrosG.carbsG - fruitCarbs - veggieCarbs;
  
  return {
    carbs: Math.round((availableCarbs * config.carbMultiplier * mealRatio) / 5) * 5,
    protein: Math.round((macrosG.proteinG * config.proteinMultiplier * mealRatio) / 5) * 5,
    fats: Math.round((macrosG.fatsG * config.fatMultiplier * mealRatio) / 5) * 5
  };
}
```

### 4.4 Fruit and Vegetable Calculation (From Spreadsheet)

```typescript
function calculateFruitVeggies(
  totalCarbsG: number,
  currentWeight: number,
  dayType: 'performance' | 'fatburner' | 'metabolize',
  goal: 'lose_weight' | 'gain_weight' | 'maintain',
  preferences: { fruitTargetG: number; veggieTargetG: number }
): { fruitG: number; veggiesG: number } {
  // The spreadsheet uses complex conditional logic
  // Simplified version that respects user preferences while staying carb-aware
  
  const maxFruitFromCarbs = totalCarbsG * 0.3 / 0.10; // Max 30% carbs from fruit
  const maxVeggiesFromCarbs = totalCarbsG * 0.1 / 0.03; // Max 10% carbs from veggies
  
  // Adjust based on day type
  const dayMultiplier = dayType === 'fatburner' ? 0.7 : 1.0;
  
  const fruitG = Math.min(
    preferences.fruitTargetG * dayMultiplier,
    maxFruitFromCarbs
  );
  
  const veggiesG = Math.min(
    preferences.veggieTargetG,
    maxVeggiesFromCarbs
  );
  
  return {
    fruitG: Math.round(fruitG / 5) * 5,
    veggiesG: Math.round(veggiesG / 5) * 5
  };
}
```

---

## 5. Adaptive Algorithms (NEW - Not in Spreadsheet)

### 5.1 Adaptive TDEE Estimation

The key innovation: use actual weight changes to refine TDEE estimates over time.

```typescript
interface TDEEEstimation {
  estimatedTDEE: number;
  confidence: number; // 0-1, increases with more data
  dataPointsUsed: number;
}

function estimateAdaptiveTDEE(
  history: DailyLog[],
  profile: UserProfile,
  minDaysRequired: number = 14
): TDEEEstimation {
  if (history.length < minDaysRequired) {
    // Fall back to standard formula
    return {
      estimatedTDEE: calculateMifflinStJeor(profile, history[0]?.weightKg || profile.targetWeightKg),
      confidence: 0.3,
      dataPointsUsed: 0
    };
  }
  
  // Calculate rolling weight change rate (kg/week)
  const recentHistory = history.slice(-28); // Last 4 weeks
  const weightTrend = calculateWeightTrend(recentHistory);
  
  // Estimate average daily caloric intake from targets
  // (Assumes user is following recommendations)
  const avgDailyIntake = calculateAverageIntake(recentHistory);
  
  // Weight change to calorie conversion
  // 1 kg body weight ≈ 7700 kcal (mixed fat/muscle)
  const weeklyCalorieBalance = weightTrend.weeklyChangeKg * 7700;
  const dailyCalorieBalance = weeklyCalorieBalance / 7;
  
  // TDEE = Intake - Balance
  // If losing weight: TDEE = Intake + |deficit|
  // If gaining weight: TDEE = Intake - surplus
  const estimatedTDEE = avgDailyIntake - dailyCalorieBalance;
  
  // Confidence based on:
  // - Data consistency (R² of weight trend)
  // - Amount of data
  // - Variance in daily weights
  const confidence = calculateConfidence(recentHistory, weightTrend);
  
  return {
    estimatedTDEE: Math.round(estimatedTDEE),
    confidence,
    dataPointsUsed: recentHistory.length
  };
}

function calculateWeightTrend(history: DailyLog[]): WeightTrend {
  // Use linear regression on weight data
  // Filter for consistent morning measurements
  const weights = history.map((log, i) => ({ x: i, y: log.weightKg }));
  
  const regression = linearRegression(weights);
  
  return {
    weeklyChangeKg: regression.slope * 7,
    rSquared: regression.rSquared,
    startWeight: regression.predict(0),
    endWeight: regression.predict(weights.length - 1)
  };
}

function calculateMifflinStJeor(profile: UserProfile, weightKg: number): number {
  const age = calculateAge(profile.birthDate);
  
  if (profile.sex === 'male') {
    return (10 * weightKg) + (6.25 * profile.height_cm) - (5 * age) + 5;
  } else {
    return (10 * weightKg) + (6.25 * profile.height_cm) - (5 * age) - 161;
  }
}
```

### 5.2 Training Load Accumulation

Track cumulative training stress to inform recovery needs:

```typescript
interface TrainingLoadState {
  acuteLoad: number;      // Last 7 days
  chronicLoad: number;    // Last 28 days
  acuteChronicRatio: number; // < 0.8 = undertrained, 0.8-1.3 = optimal, > 1.5 = injury risk
  recoveryScore: number;  // 0-100, based on recent rest days and intensity distribution
}

function calculateTrainingLoad(
  history: DailyLog[],
  trainingConfigs: TrainingTypeConfig[]
): TrainingLoadState {
  const now = new Date();
  const last7Days = history.filter(log => 
    daysBetween(log.date, now) <= 7
  );
  const last28Days = history.filter(log => 
    daysBetween(log.date, now) <= 28
  );
  
  // Calculate load using actual training if available, else planned
  const getLoad = (log: DailyLog): number => {
    const training = log.actualTraining || log.plannedTraining;
    const config = trainingConfigs.find(c => c.type === training.type);
    const duration = training.actualDurationMin || training.plannedDurationMin;
    const intensity = training.perceivedIntensity || 3;
    
    return (config?.loadScore || 1) * duration * (intensity / 3);
  };
  
  const acuteLoad = last7Days.reduce((sum, log) => sum + getLoad(log), 0) / 7;
  const chronicLoad = last28Days.reduce((sum, log) => sum + getLoad(log), 0) / 28;
  
  const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;
  
  // Recovery score based on rest days and intensity distribution
  const restDaysLast7 = last7Days.filter(log => 
    (log.actualTraining || log.plannedTraining).type === 'rest'
  ).length;
  
  const recoveryScore = calculateRecoveryScore(restDaysLast7, acuteChronicRatio, last7Days);
  
  return { acuteLoad, chronicLoad, acuteChronicRatio, recoveryScore };
}

function calculateRecoveryScore(
  restDaysLast7: number,
  acr: number,
  recentLogs: DailyLog[]
): number {
  let score = 50; // Base score
  
  // Rest days contribution (ideal: 2-3 per week)
  if (restDaysLast7 >= 2 && restDaysLast7 <= 3) score += 20;
  else if (restDaysLast7 === 1) score += 10;
  else if (restDaysLast7 === 0) score -= 15;
  else if (restDaysLast7 > 4) score += 5; // Too much rest isn't bad, just not optimal
  
  // ACR contribution
  if (acr >= 0.8 && acr <= 1.3) score += 20;
  else if (acr < 0.8) score += 10; // Undertrained is safe
  else if (acr > 1.3 && acr <= 1.5) score -= 10;
  else if (acr > 1.5) score -= 25;
  
  // Sleep quality contribution (if available)
  const avgSleep = recentLogs.reduce((sum, log) => sum + log.sleepQuality, 0) / recentLogs.length;
  score += (avgSleep - 50) * 0.2; // ±10 points based on sleep
  
  return Math.max(0, Math.min(100, score));
}
```

### 5.3 Daily Adjustment Algorithm

Combine all factors to adjust the day's targets:

```typescript
function calculateDailyTargets(
  profile: UserProfile,
  todayInput: {
    weightKg: number;
    bodyFatPercent?: number;
    sleepQuality: number;
    restingHeartRate?: number;
    plannedTraining: TrainingSession;
  },
  history: DailyLog[],
  trainingConfigs: TrainingTypeConfig[]
): DailyTargets {
  // 1. Get adaptive TDEE
  const tdeeEstimate = estimateAdaptiveTDEE(history, profile);
  
  // 2. Calculate training load state
  const loadState = calculateTrainingLoad(history, trainingConfigs);
  
  // 3. Determine day type from planned training
  const trainingConfig = trainingConfigs.find(c => c.type === todayInput.plannedTraining.type);
  const dayType = trainingConfig?.dayTypeMapping || 'fatburner';
  
  // 4. Calculate kcal factor from adaptive TDEE
  const baseKcalFactor = tdeeEstimate.estimatedTDEE / todayInput.weightKg;
  
  // 5. Apply adaptive adjustments
  const adjustments = calculateAdaptiveAdjustments(
    loadState,
    todayInput,
    history,
    profile.goal
  );
  
  const adjustedKcalFactor = baseKcalFactor * adjustments.totalMultiplier;
  
  // 6. Calculate base macros
  const baseMacros = calculateBaseMacros(profile, todayInput.weightKg, adjustedKcalFactor);
  
  // 7. Apply day type multipliers
  const dayMacros = applyDayTypeMultipliers(baseMacros, dayType, profile.goal);
  
  // 8. Calculate fruit/veggies
  const fv = calculateFruitVeggies(
    dayMacros.carbsG,
    todayInput.weightKg,
    dayType,
    profile.goal,
    { fruitTargetG: profile.fruitTargetG, veggieTargetG: profile.veggieTargetG }
  );
  
  // 9. Convert to meal points
  const meals = {
    breakfast: convertToMealPoints(dayMacros, profile.mealRatios.breakfast, fv.fruitG, fv.veggiesG, profile.pointsConfig),
    lunch: convertToMealPoints(dayMacros, profile.mealRatios.lunch, fv.fruitG, fv.veggiesG, profile.pointsConfig),
    dinner: convertToMealPoints(dayMacros, profile.mealRatios.dinner, fv.fruitG, fv.veggiesG, profile.pointsConfig)
  };
  
  return {
    totalCarbsG: Math.round(dayMacros.carbsG),
    totalProteinG: Math.round(dayMacros.proteinG),
    totalFatsG: Math.round(dayMacros.fatsG),
    totalCalories: Math.round(dayMacros.totalCalories),
    meals,
    fruitG: fv.fruitG,
    veggiesG: fv.veggiesG,
    waterL: Math.round(todayInput.weightKg * 0.04 * 10) / 10,
    dayType
  };
}

function calculateAdaptiveAdjustments(
  loadState: TrainingLoadState,
  todayInput: { sleepQuality: number; restingHeartRate?: number },
  history: DailyLog[],
  goal: 'lose_weight' | 'gain_weight' | 'maintain'
): { totalMultiplier: number; breakdown: Record<string, number> } {
  const adjustments: Record<string, number> = {};
  
  // 1. Training load adjustment
  // High ACR = need more fuel; Low ACR = can reduce slightly
  if (loadState.acuteChronicRatio > 1.3) {
    adjustments.trainingLoad = 1.05; // +5% for high load
  } else if (loadState.acuteChronicRatio < 0.7) {
    adjustments.trainingLoad = 0.97; // -3% for very low load
  } else {
    adjustments.trainingLoad = 1.0;
  }
  
  // 2. Recovery adjustment
  // Poor recovery = prioritize protein and reduce deficit
  if (loadState.recoveryScore < 40) {
    adjustments.recovery = goal === 'lose_weight' ? 1.05 : 1.0; // Reduce deficit when under-recovered
  } else if (loadState.recoveryScore > 80) {
    adjustments.recovery = goal === 'lose_weight' ? 0.98 : 1.0; // Can push harder when well-recovered
  } else {
    adjustments.recovery = 1.0;
  }
  
  // 3. Sleep adjustment
  // Poor sleep = cortisol/hunger issues, slight increase to prevent binging
  if (todayInput.sleepQuality <= 40) {
    adjustments.sleep = 1.03;
  } else if (todayInput.sleepQuality >= 85) {
    adjustments.sleep = 0.99;
  } else {
    adjustments.sleep = 1.0;
  }
  
  // 4. Yesterday's training effect
  // Heavy day yesterday = extra carbs for recovery
  const yesterday = history.find(log => 
    daysBetween(log.date, new Date()) === 1
  );
  if (yesterday) {
    const yesterdayTraining = yesterday.actualTraining || yesterday.plannedTraining;
    const config = TRAINING_CONFIGS.find(c => c.type === yesterdayTraining.type);
    if (config && config.loadScore >= 5) {
      adjustments.yesterdayRecovery = 1.03; // Boost for recovery from heavy day
    } else {
      adjustments.yesterdayRecovery = 1.0;
    }
  } else {
    adjustments.yesterdayRecovery = 1.0;
  }
  
  // Calculate total multiplier
  const totalMultiplier = Object.values(adjustments).reduce((a, b) => a * b, 1);
  
  return {
    totalMultiplier: Math.round(totalMultiplier * 100) / 100,
    breakdown: adjustments
  };
}
```

### 5.4 Linear Regression Utility

```typescript
interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
}

function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R²
  const meanY = sumY / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const ssResidual = points.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return {
    slope,
    intercept,
    rSquared,
    predict: (x: number) => slope * x + intercept
  };
}

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
```

---

## 6. API Design

### 6.1 REST Endpoints

```
Authentication (JWT-based, simple for single user initially)
POST   /api/auth/login

User Profile
GET    /api/profile
PUT    /api/profile
PATCH  /api/profile/goals
PATCH  /api/profile/ratios

Daily Logs
POST   /api/logs                     # Create today's entry
GET    /api/logs                     # List all logs (paginated)
GET    /api/logs/today               # Get today's log
GET    /api/logs/:date               # Get specific date's log
PATCH  /api/logs/:date/actual-training  # Update actual training

Calculations
POST   /api/calculate/daily-targets  # Get targets for given inputs
GET    /api/stats/tdee-history       # TDEE estimates over time
GET    /api/stats/weight-trend       # Weight trend analysis
GET    /api/stats/training-load      # Current load state
```

### 6.2 Request/Response Examples

```typescript
// POST /api/logs
// Request:
{
  "date": "2025-12-31",
  "weightKg": 88.5,
  "bodyFatPercent": 26.5,
  "sleepQuality": 80,
  "sleepHours": 7.5,
  "restingHeartRate": 58,
  "plannedTraining": {
    "type": "strength",
    "plannedDurationMin": 60
  },
  "dayType": "performance"
}

// Response:
{
  "id": "log_abc123",
  "date": "2025-12-31",
  "weightKg": 88.5,
  "calculatedTargets": {
    "totalCarbsG": 320,
    "totalProteinG": 210,
    "totalFatsG": 78,
    "totalCalories": 2780,
    "meals": {
      "breakfast": { "carbs": 80, "protein": 170, "fats": 80 },
      "lunch": { "carbs": 80, "protein": 170, "fats": 80 },
      "dinner": { "carbs": 110, "protein": 230, "fats": 110 }
    },
    "fruitG": 600,
    "veggiesG": 500,
    "waterL": 3.5,
    "dayType": "performance"
  },
  "estimatedTDEE": 2650,
  "adaptiveMultipliers": {
    "tdeeAdjustment": 1.0,
    "acuteLoadFactor": 1.03,
    "recoveryFactor": 1.0
  }
}
```

---

## 7. Database Schema (SQLite for simplicity)

```sql
-- User profile (single user initially)
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY,
  height_cm REAL NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT CHECK(sex IN ('male', 'female')) NOT NULL,
  goal TEXT CHECK(goal IN ('lose_weight', 'maintain', 'gain_weight')) NOT NULL,
  target_weight_kg REAL,
  target_weekly_change_kg REAL,
  carb_ratio REAL DEFAULT 0.45,
  protein_ratio REAL DEFAULT 0.30,
  fat_ratio REAL DEFAULT 0.25,
  breakfast_ratio REAL DEFAULT 0.30,
  lunch_ratio REAL DEFAULT 0.30,
  dinner_ratio REAL DEFAULT 0.40,
  carb_multiplier REAL DEFAULT 1.15,
  protein_multiplier REAL DEFAULT 4.35,
  fat_multiplier REAL DEFAULT 3.5,
  fruit_target_g REAL DEFAULT 600,
  veggie_target_g REAL DEFAULT 500,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily log entries
CREATE TABLE daily_logs (
  id INTEGER PRIMARY KEY,
  log_date DATE UNIQUE NOT NULL,
  weight_kg REAL NOT NULL,
  body_fat_percent REAL,
  resting_heart_rate INTEGER,
  sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 5),
  sleep_hours REAL,
  
  -- Planned training
  planned_training_type TEXT NOT NULL,
  planned_duration_min INTEGER NOT NULL,
  
  -- Actual training (nullable, filled in later)
  actual_training_type TEXT,
  actual_duration_min INTEGER,
  perceived_intensity INTEGER CHECK(perceived_intensity BETWEEN 1 AND 5),
  training_notes TEXT,
  
  -- Calculated outputs (stored for history)
  total_carbs_g REAL,
  total_protein_g REAL,
  total_fats_g REAL,
  total_calories REAL,
  breakfast_carb_points INTEGER,
  breakfast_protein_points INTEGER,
  breakfast_fat_points INTEGER,
  lunch_carb_points INTEGER,
  lunch_protein_points INTEGER,
  lunch_fat_points INTEGER,
  dinner_carb_points INTEGER,
  dinner_protein_points INTEGER,
  dinner_fat_points INTEGER,
  fruit_g REAL,
  veggies_g REAL,
  water_l REAL,
  day_type TEXT,
  
  -- Adaptive state at calculation time
  estimated_tdee REAL,
  tdee_confidence REAL,
  acute_load REAL,
  chronic_load REAL,
  acr REAL,
  recovery_score REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training type configurations (user-adjustable)
CREATE TABLE training_configs (
  id INTEGER PRIMARY KEY,
  type TEXT UNIQUE NOT NULL,
  day_type_mapping TEXT NOT NULL,
  estimated_cal_per_min REAL DEFAULT 5,
  load_score REAL DEFAULT 3,
  typical_recovery_days INTEGER DEFAULT 1
);

-- Index for quick date lookups
CREATE INDEX idx_logs_date ON daily_logs(log_date);
```

---

## 8. UI Components

### 8.1 Main Views

**Daily Input View (Home)**
- Morning check-in card
  - Weight input (numeric, kg)
  - Body fat % (optional, numeric)
- Sleep quality (1-100 score)
  - Sleep hours (optional, numeric)
  - RHR (optional, numeric)
- Training selection
  - Dropdown for training type
  - Duration slider/input (minutes)
- Submit button → Shows calculated targets

**Today's Targets View** (shown after submission)
- Summary card
  - Total calories / Day type badge
  - Macros bar chart (C/P/F grams)
- Meal cards (breakfast/lunch/dinner)
  - C/P/F points displayed prominently
- Additional targets card
  - Fruit (g)
  - Vegetables (g)
  - Water (L)
- "Log Actual Training" button (available end of day)

**History View**
- Weight chart (line graph, 30/90/all time toggles)
  - Actual weight points
  - Trend line overlay
  - Predicted weight based on targets (if following plan)
- Training load chart
  - Acute load (7-day)
  - Chronic load (28-day)
  - ACR indicator with zones
- TDEE estimation chart
  - Estimated TDEE over time
  - Confidence band
- Calendar heat map
  - Color by training type or intensity
  - Quick access to past logs

**Settings View**
- Profile section
  - Height, birthdate, sex
  - Goal selection
  - Target weight / weekly change
- Macro ratios section
  - C/P/F percentage sliders (must sum to 100)
- Meal distribution section
  - B/L/D percentage sliders (must sum to 100)
- Points multipliers section (advanced)
- Fruit/Veggie targets section
- Training type configuration section

### 8.2 Component Breakdown

```
/src
  /components
    /daily-input
      WeightInput.tsx
      SleepQualityInput.tsx
      TrainingSelector.tsx
      DailyInputForm.tsx
    /targets
      MacroSummaryCard.tsx
      MealCard.tsx
      AdditionalTargetsCard.tsx
      DayTypeIndicator.tsx
    /history
      WeightChart.tsx
      TrainingLoadChart.tsx
      TDEEChart.tsx
      CalendarHeatmap.tsx
      LogDetailModal.tsx
    /settings
      ProfileForm.tsx
      MacroRatiosForm.tsx
      MealDistributionForm.tsx
      TrainingConfigList.tsx
    /common
      NumberInput.tsx
      StarRating.tsx
      ProgressBar.tsx
      Card.tsx
  /pages
    Home.tsx
    History.tsx
    Settings.tsx
  /hooks
    useDailyLog.ts
    useProfile.ts
    useHistory.ts
    useCalculations.ts
  /api
    client.ts
    types.ts
  /utils
    dateUtils.ts
    mathUtils.ts
```

---

## 9. Tech Stack Recommendations

### Backend
- **Go** (aligns with your Credo work)
- **SQLite** (simple, file-based, no setup needed)
- **Chi or Gin** for HTTP routing
- **GORM** or raw SQL for database

### Frontend
- **React + TypeScript**
- **Tailwind CSS** for styling
- **Recharts** for charts
- **React Query** for API state management

### Development
- **Docker Compose** for local dev
- **SQLite file** mounted as volume for persistence

---

## 10. MVP Scope

### Phase 1: Core Loop (Week 1-2)
- [ ] Database schema + migrations
- [ ] User profile CRUD
- [ ] Daily log creation with calculation
- [ ] Basic daily input form
- [ ] Today's targets display
- [ ] Simple weight history chart

### Phase 2: Adaptive Features (Week 3-4)
- [ ] Adaptive TDEE calculation
- [ ] Training load tracking
- [ ] Yesterday's training effect
- [ ] Enhanced history views
- [ ] Planned vs actual training logging

### Phase 3: Polish (Week 5+)
- [ ] Settings/configuration UI
- [ ] Data export (CSV/JSON)
- [ ] Mobile-responsive design
- [ ] PWA support for home screen install

---

## 11. Open Questions / Future Considerations

1. **Multi-user support**: Currently single-user. Need auth system if expanding.

2. **Sync with wearables**: Garmin/Fitbit API integration for automatic weight/RHR/sleep data.

3. **Food logging integration**: Could integrate with MyFitnessPal or Cronometer API to track actual intake vs targets.

4. **ML-based recommendations**: With enough data, could train personal model for better predictions.

5. **Meal suggestions**: Given point targets, suggest actual meals from a database.

---

## Appendix A: Spreadsheet Formula Reference

For complete traceability, here are the key formulas extracted from the original spreadsheet:

### Macro Overview - Carbs (J5)
```excel
=IF(I5="fatburner",
  IF('Data Input'!$E$10='Data Input'!$N$1,
    'Data Input'!$G$17*0.8,
    'Data Input'!$G$17*0.656),
  IF(I5="performance",
    IF('Data Input'!$E$10='Data Input'!$N$1,
      'Data Input'!$G$17*1.15,
      'Data Input'!$G$17*1.116),
    IF('Data Input'!$E$10='Data Input'!$N$1,
      'Data Input'!$G$17*1.2,
      'Data Input'!$G$17*1.357)))
```

### Calendar - Breakfast Carb Points (B11)
```excel
=IF(H7="performance",
  MROUND(('Macro Overview'!$J5-(F14*0.03)-(F13*0.1)-(F15*0.96))*1.15*B9,$M$3),
  MROUND(('Macro Overview'!$J5-(F14*0.03)-(F13*0.1))*1.15*B9,$M$3))
```

### Calendar - Fruits (F13)
```excel
=IF(H7="fatburner",
  IF(MROUND('Data Input'!$D$26*7,10)>'Macro Overview'!$J5,
    MROUND('Macro Overview'!$J5/5*7,1),
    MROUND('Data Input'!$D$26*7,1)),
  IF(MROUND('Data Input'!$D$26*7,10)>'Macro Overview'!$J5,
    MROUND(('Macro Overview'!$J5-(F15*1))/5*10,1),
    MROUND('Data Input'!$D$26*7,1)))
```

### Calendar - Vegetables (F14)
```excel
=IF('Data Input'!$E$10='Data Input'!$N$2,
  IF(H7="metabolize",
    IF(MROUND('Data Input'!$D$17*6,1)>'Macro Overview'!$J5,
      MROUND('Macro Overview'!$J5/22/0.03,5),
      MROUND('Data Input'!$D$17*8,5)),
    IF(H7="performance",
      IF(MROUND('Data Input'!$D$17*10,1)>'Macro Overview'!$J5,
        MROUND('Macro Overview'!$J5/15/0.03,5),
        MROUND('Data Input'!$D$17*10,5)),
      IF(MROUND('Data Input'!$D$17*10,1)>'Macro Overview'!$J5,
        MROUND('Macro Overview'!$J5/9/0.03,5),
        MROUND('Data Input'!$D$17*10,5)))),
  IF(H7="metabolize",
    IF(MROUND('Data Input'!$D$17*6,1)>'Macro Overview'!$J5,
      MROUND('Macro Overview'!$J5/37/0.03,5),
      MROUND('Data Input'!$D$17*6,5)),
    IF(H7="performance",
      IF(MROUND('Data Input'!$D$17*10,1)>'Macro Overview'!$J5,
        MROUND('Macro Overview'!$J5/22/0.03,5),
        MROUND('Data Input'!$D$17*10,5)),
      IF(MROUND('Data Input'!$D$17*10,1)>'Macro Overview'!$J5,
        MROUND('Macro Overview'!$J5/21/0.03,5),
        MROUND('Data Input'!$D$17*10,5)))))
```

### Data Input - Weekly Calorie Calculation (I6)
```excel
=((F6*4.1)+(F7*4.3)+(F8*9.3))*E3
```
Where:
- F6 = Carbs per kg bodyweight
- F7 = Protein per kg bodyweight  
- F8 = Fats per kg bodyweight
- E3 = Starting weight
- 4.1 = kcal per gram carbs
- 4.3 = kcal per gram protein
- 9.3 = kcal per gram fat
