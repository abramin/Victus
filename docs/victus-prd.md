# Victus PRD
## Adaptive Daily Nutrition Planning App

**Version:** 2.0  
**Author:** Alex (via Claude)  
**Date:** January 1, 2026

---

## 1. Product Overview

### 1.1 Purpose
Victus is a web application that provides daily personalized macro targets based on:
- Current biometrics (weight, body fat, RHR, sleep quality)
- Planned training for the day
- Historical data to adaptively refine TDEE and optimize recommendations
- Training load accumulation for periodization-aware nutrition
- **Long-term planning with adaptive recalibration** (NEW in v2.0)

### 1.2 Core Value Proposition
Unlike static nutrition calculators, Victus learns from your actual weight/intake history to provide increasingly accurate recommendations. It understands that yesterday's heavy training session means today might need different nutrition than a simple "workout day" formula suggests.

**New in v2.0**: Victus now maintains both a *plan* (what should happen to reach your goal) and a *projection* (what is actually happening based on your data), showing where they diverge and offering recalibration options.

### 1.3 Key Differentiators from Spreadsheet Model
| Spreadsheet | Victus |
|-------------|--------|
| Fixed weekly macro progression | Adaptive TDEE from weight trends |
| Binary day types (workout/rest) | Structured training classification with load accumulation |
| No feedback loop | Learns from planned vs actual outcomes |
| Manual data entry in cells | Daily input form with history visualization |
| Static 29-week projection | **Dual-track plan vs reality with recalibration** |

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
- Input my daily macro targets in grams (and see derived g/kg and %)
- Set my known/estimated TDEE (not rely on formula alone)
- Adjust meal distribution ratios
- Set training type definitions
```

### 2.4 Long-Term Planning (NEW)
```
As a user, I want to:
- Set a goal weight and timeframe (e.g., 82kg in 29 weeks)
- See a weekly plan with avg calories and macros for each week
- See how my actual progress compares to the plan
- Get recalibration suggestions when I'm off-track
- Choose how to respond: adjust deficit, extend timeline, or revise goal
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
  bodyFatPercent?: number; // Optional, enables Katch-McArdle BMR

  // BMR equation preference
  bmrEquation: 'mifflin_st_jeor' | 'katch_mcardle' | 'oxford_henry' | 'harris_benedict';

  // TDEE Configuration (NEW - user-adjustable)
  // User can override calculated TDEE with known value from wearables
  manualTDEE?: number; // If set, use this instead of formula
  tdeeSource: 'formula' | 'manual' | 'adaptive'; // Which TDEE to use
  
  // Goals (changed periodically)
  goal: 'lose_weight' | 'maintain' | 'gain_weight';
  targetWeightKg: number;
  planDurationWeeks: number; // e.g., 29 weeks
  planStartDate: Date;
  
  // Base macro inputs (UPDATED - absolute grams, not ratios)
  // User inputs these directly; ratios are derived
  dailyCarbsG: number;    // e.g., 300g
  dailyProteinG: number;  // e.g., 196g
  dailyFatsG: number;     // e.g., 73g
  
  // Meal distribution (1% intervals)
  mealRatios: {
    breakfast: number; // e.g., 0.30 (30%)
    lunch: number;     // e.g., 0.30 (30%)
    dinner: number;    // e.g., 0.40 (40%)
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

  // Supplement configuration (for points calculation)
  // These represent "fixed" macro contributions that are subtracted
  // before converting remaining macros to meal points
  supplements: {
    // Intra-workout (used on performance days only)
    maltodextrinG: number;   // Intra-workout carbs, e.g., 25g (96% carbs)
    wheyG: number;           // Whey protein, e.g., 30g (88% protein)

    // Daily supplements (used on all day types)
    collagenG: number;       // Collagen peptides, e.g., 20g (90% protein)
  };
}

// Derived values (calculated, not stored)
interface DerivedProfileMetrics {
  // From absolute grams
  carbsPerKg: number;      // dailyCarbsG / currentWeight
  proteinPerKg: number;    // dailyProteinG / currentWeight
  fatsPerKg: number;       // dailyFatsG / currentWeight
  
  // Macro percentages
  carbPercent: number;     // carbCalories / totalCalories
  proteinPercent: number;  // proteinCalories / totalCalories
  fatPercent: number;      // fatCalories / totalCalories
  
  // Calorie calculations
  totalDailyCalories: number; // (C*4.1 + P*4.3 + F*9.3)
  
  // Deficit/surplus relative to TDEE
  effectiveTDEE: number;   // From manual, formula, or adaptive
  dailyBalance: number;    // totalDailyCalories - effectiveTDEE
  weeklyBalance: number;   // dailyBalance * 7
  projectedWeeklyChangeKg: number; // weeklyBalance / 7700
}

function calculateDerivedMetrics(
  profile: UserProfile,
  currentWeight: number
): DerivedProfileMetrics {
  const carbCalories = profile.dailyCarbsG * 4.1;
  const proteinCalories = profile.dailyProteinG * 4.3;
  const fatCalories = profile.dailyFatsG * 9.3;
  const totalCalories = carbCalories + proteinCalories + fatCalories;
  
  // Get effective TDEE based on source preference
  let effectiveTDEE: number;
  switch (profile.tdeeSource) {
    case 'manual':
      effectiveTDEE = profile.manualTDEE || calculateBMR(profile, currentWeight, profile.bmrEquation) * 1.5;
      break;
    case 'adaptive':
      // Will be overridden by adaptive algorithm when sufficient data exists
      effectiveTDEE = profile.manualTDEE || calculateBMR(profile, currentWeight, profile.bmrEquation) * 1.5;
      break;
    case 'formula':
    default:
      effectiveTDEE = calculateBMR(profile, currentWeight, profile.bmrEquation) * 1.5; // Default activity multiplier
  }
  
  const dailyBalance = totalCalories - effectiveTDEE;
  
  return {
    carbsPerKg: profile.dailyCarbsG / currentWeight,
    proteinPerKg: profile.dailyProteinG / currentWeight,
    fatsPerKg: profile.dailyFatsG / currentWeight,
    carbPercent: carbCalories / totalCalories,
    proteinPercent: proteinCalories / totalCalories,
    fatPercent: fatCalories / totalCalories,
    totalDailyCalories: totalCalories,
    effectiveTDEE,
    dailyBalance,
    weeklyBalance: dailyBalance * 7,
    projectedWeeklyChangeKg: (dailyBalance * 7) / 7700
  };
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
  
  // Planned training sessions (supports multiple activities per day)
  // e.g., morning Qigong + GMB, afternoon strength training
  plannedTrainingSessions: TrainingSession[];

  // User-selected day type (determines macro strategy)
  dayType: 'performance' | 'fatburner' | 'metabolize';

  // Actual training sessions (logged later)
  actualTrainingSessions?: TrainingSession[];
  
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
  estimatedTDEE: number; // Pre-adjustment TDEE for transparency

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

  // MET value for weight-adjusted calorie calculation
  // Formula: Calories = (MET - 1) × weight(kg) × duration(hours)
  // Source: 2024 Compendium of Physical Activities
  met: number;

  // Load score for accumulation (arbitrary units, relative)
  loadScore: number;
}

// Default configurations (MET values from 2024 Compendium of Physical Activities)
// Note: DayType is now user-selected, not derived from training type
const TRAINING_CONFIGS: TrainingTypeConfig[] = [
  { type: 'rest', met: 1.0, loadScore: 0 },
  { type: 'qigong', met: 2.5, loadScore: 0.5 },
  { type: 'walking', met: 3.5, loadScore: 1 },
  { type: 'gmb', met: 4.0, loadScore: 3 },
  { type: 'run', met: 9.8, loadScore: 3 },
  { type: 'row', met: 7.0, loadScore: 3 },
  { type: 'cycle', met: 6.8, loadScore: 2 },
  { type: 'hiit', met: 12.8, loadScore: 5 },
  { type: 'strength', met: 5.0, loadScore: 5 },
  { type: 'calisthenics', met: 4.0, loadScore: 3 },
  { type: 'mobility', met: 2.5, loadScore: 0.5 },
  { type: 'mixed', met: 6.0, loadScore: 4 },
];
```

### 3.4 Long-Term Plan (NEW)
```typescript
interface NutritionPlan {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Plan parameters
  startDate: Date;
  startWeight: number;
  goalWeight: number;
  durationWeeks: number;
  
  // Calculated at plan creation
  requiredWeeklyChangeKg: number; // (goalWeight - startWeight) / durationWeeks
  requiredDailyDeficit: number;   // requiredWeeklyChangeKg * 7700 / 7
  
  // Weekly targets (generated at plan creation, refined over time)
  weeklyTargets: WeeklyTarget[];
  
  // Plan status
  status: 'active' | 'completed' | 'abandoned';
  
  // Recalibration history
  recalibrations: Recalibration[];
}

interface WeeklyTarget {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  
  // Projected values (from plan)
  projectedWeight: number;
  projectedTDEE: number;
  targetIntake: number;
  
  // Macro targets for this week
  avgCarbsG: number;
  avgProteinG: number;
  avgFatsG: number;
  
  // Derived percentages (for display)
  carbPercent: number;
  proteinPercent: number;
  fatPercent: number;
  
  // Actuals (filled in as week progresses)
  actualAvgWeight?: number;
  actualAvgIntake?: number;
  daysLogged: number;
}

interface Recalibration {
  id: string;
  date: Date;
  weekNumber: number;
  
  // State at recalibration
  plannedWeight: number;
  actualWeight: number;
  variance: number;
  variancePercent: number;
  
  // What was chosen
  action: RecalibrationAction;
  
  // New plan parameters after recalibration
  newGoalWeight?: number;
  newEndDate?: Date;
  newDailyDeficit?: number;
}

type RecalibrationAction = 
  | { type: 'increase_deficit'; additionalKcal: number }
  | { type: 'extend_timeline'; additionalWeeks: number }
  | { type: 'revise_goal'; newGoalWeight: number }
  | { type: 'keep_current' };
```

### 3.5 Dual-Track Analysis (NEW)
```typescript
interface DualTrackAnalysis {
  // Current state
  currentWeek: number;
  currentWeight: number;
  plannedWeight: number;
  
  // Variance
  variance: number;           // currentWeight - plannedWeight (positive = behind)
  variancePercent: number;    // variance / plannedWeight * 100
  isWithinTolerance: boolean; // abs(variancePercent) < tolerancePercent
  
  // Actual trend (from data)
  actualWeeklyRate: number;   // kg/week from regression
  actualTDEE: number;         // Estimated from weight change + intake
  adherenceRatio: number;     // actualRate / plannedRate
  
  // Projections
  planProjection: WeeklyProjection[];     // If you follow the plan
  trendProjection: WeeklyProjection[];    // If current trend continues
  
  // Convergence analysis
  convergenceWeek: number | null;  // When tracks would meet, if ever
  trendEndWeight: number;          // Where you'd end up at current rate
  
  // Recalibration options (only if outside tolerance)
  recalibrationNeeded: boolean;
  options: RecalibrationOption[];
}

interface WeeklyProjection {
  weekNumber: number;
  date: Date;
  projectedWeight: number;
  projectedCalories: number;
  projectedCarbsG: number;
  projectedProteinG: number;
  projectedFatsG: number;
}

interface RecalibrationOption {
  type: 'increase_deficit' | 'extend_timeline' | 'revise_goal' | 'keep_current';
  description: string;
  
  // What changes
  newDailyDeficit?: number;
  newEndDate?: Date;
  newGoalWeight?: number;
  
  // Impact
  impactDescription: string;
  feasibility: 'easy' | 'moderate' | 'aggressive' | 'extreme';
}
```

### 3.6 Validation Rules
- Daily logs must be for today or past dates; future-dated logs are rejected at the API/domain boundary.
- Enum fields are validated and constrained: training type and day type values must be one of the allowed enums.
- Macro ratios can be set in 1% increments (0.01 precision).
- Plan duration must be at least 4 weeks and at most 104 weeks.
- Recalibration tolerance default is 3% but user-configurable (1-10%).

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

// NEW: Calculate macro ratios from absolute gram inputs
function calculateMacroRatios(
  carbsG: number,
  proteinG: number,
  fatsG: number
): { carbRatio: number; proteinRatio: number; fatRatio: number } {
  const carbCal = carbsG * 4.1;
  const proteinCal = proteinG * 4.3;
  const fatCal = fatsG * 9.3;
  const totalCal = carbCal + proteinCal + fatCal;
  
  return {
    carbRatio: carbCal / totalCal,
    proteinRatio: proteinCal / totalCal,
    fatRatio: fatCal / totalCal
  };
}
```

### 4.1a Protein-First Calculation (Evidence-Based)

Modern approach: calculate protein based on g/kg body weight targets, not percentage of calories.

```typescript
interface ProteinRecommendation {
  minGPerKg: number;
  optimalGPerKg: number;
  maxGPerKg: number;
  source: string;
}

function getProteinRecommendation(
  goal: Goal,
  isTrainingDay: boolean,
  deficitSeverity: number
): ProteinRecommendation {
  if (goal === 'lose_weight') {
    if (deficitSeverity > 0.25) {
      return { minGPerKg: 2.0, optimalGPerKg: 2.4, maxGPerKg: 3.0, source: 'Helms 2014, Longland 2016' };
    }
    return { minGPerKg: 1.8, optimalGPerKg: 2.2, maxGPerKg: 2.6, source: 'Phillips 2016' };
  }
  if (goal === 'gain_weight') {
    return isTrainingDay
      ? { minGPerKg: 1.6, optimalGPerKg: 2.0, maxGPerKg: 2.2, source: 'Morton 2018' }
      : { minGPerKg: 1.4, optimalGPerKg: 1.8, maxGPerKg: 2.0, source: 'Morton 2018' };
  }
  return isTrainingDay
    ? { minGPerKg: 1.4, optimalGPerKg: 1.8, maxGPerKg: 2.0, source: 'ISSN Position Stand' }
    : { minGPerKg: 1.2, optimalGPerKg: 1.6, maxGPerKg: 1.8, source: 'ISSN Position Stand' };
}
```

### 4.1b Fat Floor Enforcement

```typescript
function getFatMinimum(weightKg: number): number {
  return weightKg * 0.7; // g/kg minimum for hormonal health
}
```

### 4.2 Day Type Multipliers (Protected Protein)

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
      lose_weight: { carbs: 0.60, protein: 1.00, fats: 0.85 },
      gain_weight: { carbs: 0.60, protein: 1.00, fats: 0.85 },
      maintain: { carbs: 0.60, protein: 1.00, fats: 0.85 }
    },
    performance: {
      lose_weight: { carbs: 1.30, protein: 1.00, fats: 1.00 },
      gain_weight: { carbs: 1.30, protein: 1.00, fats: 1.00 },
      maintain: { carbs: 1.30, protein: 1.00, fats: 1.00 }
    },
    metabolize: {
      lose_weight: { carbs: 1.50, protein: 1.00, fats: 1.10 },
      gain_weight: { carbs: 1.50, protein: 1.00, fats: 1.10 },
      maintain: { carbs: 1.50, protein: 1.00, fats: 1.10 }
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

Meal points are **not** simple grams-to-points conversions. The spreadsheet:
1. Subtracts "fixed food/supplement" contributions from daily macro grams
2. Multiplies by a points-per-gram factor
3. Multiplies by the meal split %
4. Rounds to the nearest 5 (like Excel's MROUND)

#### Fixed Contribution Assumptions
| Source | Macro | Assumed Content |
|--------|-------|-----------------|
| Fruit | Carbs | 10% carbs by weight |
| Vegetables | Carbs | 3% carbs by weight |
| Maltodextrin (intra-workout) | Carbs | 96% carbs by weight |
| Collagen | Protein | 90% protein by weight |
| Whey | Protein | 88% protein by weight |

#### Points-per-Gram Factors
- Carbs: **1.15**
- Protein: **4.35**
- Fat: **3.5**

#### Supplement Configuration
```typescript
interface SupplementConfig {
  // Intra-workout (performance days only)
  maltodextrinG: number;      // Intra-workout carbs (e.g., 25g)
  wheyG: number;              // Whey protein (e.g., 30g)

  // Daily supplements
  collagenG: number;          // Collagen peptides (e.g., 20g)
}
```

#### Calculation Functions

```typescript
// Round to nearest increment (like Excel MROUND)
function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function calculateCarbPoints(
  dailyCarbsG: number,
  mealRatio: number,
  dayType: 'performance' | 'fatburner' | 'metabolize',
  fruitG: number,
  veggiesG: number,
  maltodextrinG: number,
  config: { carbMultiplier: number }
): number {
  // Fixed carb contributions to subtract
  const veggieCarbs = veggiesG * 0.03;
  const fruitCarbs = fruitG * 0.10;

  let availableCarbs: number;
  if (dayType === 'performance') {
    // Performance days: also subtract maltodextrin (intra-workout carbs)
    const maltoCarbs = maltodextrinG * 0.96;
    availableCarbs = dailyCarbsG - veggieCarbs - fruitCarbs - maltoCarbs;
  } else {
    // Fatburner/Metabolize days: no intra-workout carbs
    availableCarbs = dailyCarbsG - veggieCarbs - fruitCarbs;
  }

  return roundToNearest(availableCarbs * config.carbMultiplier * mealRatio, 5);
}

function calculateProteinPoints(
  dailyProteinG: number,
  mealRatio: number,
  dayType: 'performance' | 'fatburner' | 'metabolize',
  collagenG: number,
  wheyG: number,
  config: { proteinMultiplier: number }
): number {
  // Fixed protein contributions to subtract
  const collagenProtein = collagenG * 0.90;

  let availableProtein: number;
  if (dayType === 'performance') {
    // Performance days: subtract collagen AND whey
    const wheyProtein = wheyG * 0.88;
    availableProtein = dailyProteinG - collagenProtein - wheyProtein;
  } else {
    // Fatburner/Metabolize days: subtract collagen only (no whey)
    availableProtein = dailyProteinG - collagenProtein;
  }

  return roundToNearest(availableProtein * config.proteinMultiplier * mealRatio, 5);
}

function calculateFatPoints(
  dailyFatsG: number,
  mealRatio: number,
  config: { fatMultiplier: number }
): number {
  // Fat has no fixed contributions to subtract
  return roundToNearest(dailyFatsG * config.fatMultiplier * mealRatio, 5);
}

// Main conversion function
function convertToMealPoints(
  macrosG: { carbsG: number; proteinG: number; fatsG: number },
  mealRatio: number,
  dayType: 'performance' | 'fatburner' | 'metabolize',
  fruitG: number,
  veggiesG: number,
  supplements: SupplementConfig,
  config: UserProfile['pointsConfig']
): MacroPoints {
  return {
    carbs: calculateCarbPoints(
      macrosG.carbsG,
      mealRatio,
      dayType,
      fruitG,
      veggiesG,
      supplements.maltodextrinG,
      config
    ),
    protein: calculateProteinPoints(
      macrosG.proteinG,
      mealRatio,
      dayType,
      supplements.collagenG,
      supplements.wheyG,
      config
    ),
    fats: calculateFatPoints(
      macrosG.fatsG,
      mealRatio,
      config
    )
  };
}
```

#### Example Calculation

For a **performance day** with:
- Daily macros: 300g carbs, 196g protein, 73g fat
- Breakfast ratio: 30%
- Fruit: 600g, Veggies: 500g
- Supplements: maltodextrin 25g, collagen 20g, whey 30g

**Carbs:**
```
availableCarbs = 300 - (500 * 0.03) - (600 * 0.10) - (25 * 0.96)
               = 300 - 15 - 60 - 24 = 201g
carbPoints = MROUND(201 * 1.15 * 0.30, 5) = MROUND(69.35, 5) = 70
```

**Protein:**
```
availableProtein = 196 - (20 * 0.90) - (30 * 0.88)
                 = 196 - 18 - 26.4 = 151.6g
proteinPoints = MROUND(131.6 * 4.35 * 0.30, 5) = MROUND(171.74, 5) = 170
```

**Fat:**
```
fatPoints = MROUND(73 * 3.5 * 0.30, 5) = MROUND(76.65, 5) = 75
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
  const maxFruitFromCarbs = totalCarbsG * 0.3 / 0.10;
  const maxVeggiesFromCarbs = totalCarbsG * 0.1 / 0.03;
  
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

## 5. Adaptive Algorithms

### 5.0 BMR Equation Options

```typescript
type BMREquation = 'mifflin_st_jeor' | 'katch_mcardle' | 'oxford_henry' | 'harris_benedict';

function calculateBMR(
  profile: UserProfile,
  weightKg: number,
  equation: BMREquation
): number {
  const age = calculateAge(profile.birthDate);

  switch (equation) {
    case 'katch_mcardle':
      if (profile.bodyFatPercent) {
        const lbm = weightKg * (1 - profile.bodyFatPercent / 100);
        return 370 + (21.6 * lbm);
      }
    case 'mifflin_st_jeor':
      return profile.sex === 'male'
        ? (10 * weightKg) + (6.25 * profile.height_cm) - (5 * age) + 5
        : (10 * weightKg) + (6.25 * profile.height_cm) - (5 * age) - 161;

    case 'oxford_henry':
      if (profile.sex === 'male') {
        return age < 30 ? (14.4 * weightKg + 313) : (11.4 * weightKg + 541);
      }
      return age < 30 ? (10.4 * weightKg + 615) : (8.18 * weightKg + 502);

    case 'harris_benedict':
      return profile.sex === 'male'
        ? 88.362 + (13.397 * weightKg) + (4.799 * profile.height_cm) - (5.677 * age)
        : 447.593 + (9.247 * weightKg) + (3.098 * profile.height_cm) - (4.330 * age);
  }
}
```

### 5.1 Adaptive TDEE Estimation

```typescript
interface TDEEEstimation {
  estimatedTDEE: number;
  confidence: number;
  dataPointsUsed: number;
}

function estimateAdaptiveTDEE(
  history: DailyLog[],
  profile: UserProfile,
  minDaysRequired: number = 14
): TDEEEstimation {
  // If user has manual TDEE and prefers it, use that
  if (profile.tdeeSource === 'manual' && profile.manualTDEE) {
    return {
      estimatedTDEE: profile.manualTDEE,
      confidence: 0.8, // High confidence in user-provided data
      dataPointsUsed: 0
    };
  }
  
  if (history.length < minDaysRequired) {
    const fallbackTDEE = profile.manualTDEE || 
      calculateBMR(profile, history[0]?.weightKg || profile.targetWeightKg, profile.bmrEquation) * 1.5;
    return {
      estimatedTDEE: fallbackTDEE,
      confidence: 0.3,
      dataPointsUsed: 0
    };
  }
  
  const recentHistory = history.slice(-28);
  const weightTrend = calculateWeightTrend(recentHistory);
  const avgDailyIntake = calculateAverageIntake(recentHistory);
  
  const weeklyCalorieBalance = weightTrend.weeklyChangeKg * 7700;
  const dailyCalorieBalance = weeklyCalorieBalance / 7;
  const estimatedTDEE = avgDailyIntake - dailyCalorieBalance;
  
  const confidence = calculateConfidence(recentHistory, weightTrend);
  
  return {
    estimatedTDEE: Math.round(estimatedTDEE),
    confidence,
    dataPointsUsed: recentHistory.length
  };
}

function calculateAverageIntake(history: DailyLog[]): number {
  const totalIntake = history.reduce((sum, log) => 
    sum + log.calculatedTargets.totalCalories, 0
  );
  return totalIntake / history.length;
}

function calculateConfidence(history: DailyLog[], trend: WeightTrend): number {
  // Base confidence on R² and data quantity
  let confidence = 0.3;
  
  // More data = more confidence
  if (history.length >= 14) confidence += 0.2;
  if (history.length >= 21) confidence += 0.1;
  if (history.length >= 28) confidence += 0.1;
  
  // Better fit = more confidence
  if (trend.rSquared > 0.5) confidence += 0.15;
  if (trend.rSquared > 0.7) confidence += 0.1;
  if (trend.rSquared > 0.85) confidence += 0.05;
  
  return Math.min(confidence, 1.0);
}

interface WeightTrend {
  weeklyChangeKg: number;
  rSquared: number;
  startWeight: number;
  endWeight: number;
}

function calculateWeightTrend(history: DailyLog[]): WeightTrend {
  const weights = history.map((log, i) => ({ x: i, y: log.weightKg }));
  const regression = linearRegression(weights);
  
  return {
    weeklyChangeKg: regression.slope * 7,
    rSquared: regression.rSquared,
    startWeight: regression.predict(0),
    endWeight: regression.predict(weights.length - 1)
  };
}
```

### 5.2 Training Load Accumulation

```typescript
interface TrainingLoadState {
  acuteLoad: number;
  chronicLoad: number;
  acuteChronicRatio: number;
  recoveryScore: number;
}

function calculateTrainingLoad(
  history: DailyLog[],
  trainingConfigs: TrainingTypeConfig[]
): TrainingLoadState {
  const now = new Date();
  const last7Days = history.filter(log => daysBetween(log.date, now) <= 7);
  const last28Days = history.filter(log => daysBetween(log.date, now) <= 28);

  // Calculate load for a single session
  const getSessionLoad = (session: TrainingSession, config?: TrainingTypeConfig): number => {
    const duration = session.actualDurationMin || session.plannedDurationMin;
    const intensity = session.perceivedIntensity || 3;
    return (config?.loadScore || 1) * duration * (intensity / 3);
  };

  // Sum load across all training sessions for a day
  const getDayLoad = (log: DailyLog): number => {
    const sessions = log.actualTrainingSessions || log.plannedTrainingSessions;
    return sessions.reduce((sum, session) => {
      const config = trainingConfigs.find(c => c.type === session.type);
      return sum + getSessionLoad(session, config);
    }, 0);
  };

  const acuteLoad = last7Days.reduce((sum, log) => sum + getDayLoad(log), 0) / 7;
  const chronicLoad = last28Days.reduce((sum, log) => sum + getDayLoad(log), 0) / 28;
  const acuteChronicRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;

  // A day is a rest day only if ALL sessions are rest (or empty array)
  const restDaysLast7 = last7Days.filter(log => {
    const sessions = log.actualTrainingSessions || log.plannedTrainingSessions;
    return sessions.length === 0 || sessions.every(s => s.type === 'rest');
  }).length;
  
  const recoveryScore = calculateRecoveryScore(restDaysLast7, acuteChronicRatio, last7Days);
  
  return { acuteLoad, chronicLoad, acuteChronicRatio, recoveryScore };
}

function calculateRecoveryScore(
  restDaysLast7: number,
  acr: number,
  recentLogs: DailyLog[]
): number {
  let score = 50;
  
  if (restDaysLast7 >= 2 && restDaysLast7 <= 3) score += 20;
  else if (restDaysLast7 === 1) score += 10;
  else if (restDaysLast7 === 0) score -= 15;
  else if (restDaysLast7 > 4) score += 5;
  
  if (acr >= 0.8 && acr <= 1.3) score += 20;
  else if (acr < 0.8) score += 10;
  else if (acr > 1.3 && acr <= 1.5) score -= 10;
  else if (acr > 1.5) score -= 25;
  
  const avgSleep = recentLogs.reduce((sum, log) => sum + log.sleepQuality, 0) / recentLogs.length;
  score += (avgSleep - 50) * 0.2;
  
  return Math.max(0, Math.min(100, score));
}
```

### 5.3 Daily Adjustment Algorithm

```typescript
function calculateDailyTargets(
  profile: UserProfile,
  todayInput: {
    weightKg: number;
    bodyFatPercent?: number;
    sleepQuality: number;
    restingHeartRate?: number;
    plannedTrainingSessions: TrainingSession[];  // Multiple sessions per day
    dayType: 'performance' | 'fatburner' | 'metabolize';
  },
  history: DailyLog[],
  trainingConfigs: TrainingTypeConfig[]
): DailyTargets {
  // 1. Get adaptive TDEE
  const tdeeEstimate = estimateAdaptiveTDEE(history, profile);
  
  // 2. Calculate training load state
  const loadState = calculateTrainingLoad(history, trainingConfigs);
  
  // 3. Day type comes from user selection now
  const dayType = todayInput.dayType;
  
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
  
  // 6. Calculate base macros from profile's absolute values
  const macroRatios = calculateMacroRatios(
    profile.dailyCarbsG,
    profile.dailyProteinG,
    profile.dailyFatsG
  );
  
  const baseMacros = {
    carbsG: profile.dailyCarbsG * (todayInput.weightKg * adjustedKcalFactor) / 
            (profile.dailyCarbsG * 4.1 + profile.dailyProteinG * 4.3 + profile.dailyFatsG * 9.3) * 
            (profile.dailyCarbsG * 4.1) / 4.1,
    proteinG: profile.dailyProteinG,
    fatsG: profile.dailyFatsG,
    totalCalories: todayInput.weightKg * adjustedKcalFactor
  };
  
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
    estimatedTDEE: tdeeEstimate.estimatedTDEE,
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
  
  if (loadState.acuteChronicRatio > 1.3) {
    adjustments.trainingLoad = 1.05;
  } else if (loadState.acuteChronicRatio < 0.7) {
    adjustments.trainingLoad = 0.97;
  } else {
    adjustments.trainingLoad = 1.0;
  }
  
  if (loadState.recoveryScore < 40) {
    adjustments.recovery = goal === 'lose_weight' ? 1.05 : 1.0;
  } else if (loadState.recoveryScore > 80) {
    adjustments.recovery = goal === 'lose_weight' ? 0.98 : 1.0;
  } else {
    adjustments.recovery = 1.0;
  }
  
  if (todayInput.sleepQuality <= 40) {
    adjustments.sleep = 1.03;
  } else if (todayInput.sleepQuality >= 85) {
    adjustments.sleep = 0.99;
  } else {
    adjustments.sleep = 1.0;
  }
  
  const yesterday = history.find(log => daysBetween(log.date, new Date()) === 1);
  if (yesterday) {
    // Check if any of yesterday's sessions had high load
    const yesterdaySessions = yesterday.actualTrainingSessions || yesterday.plannedTrainingSessions;
    const maxLoadScore = yesterdaySessions.reduce((max, session) => {
      const config = TRAINING_CONFIGS.find(c => c.type === session.type);
      return Math.max(max, config?.loadScore || 0);
    }, 0);
    if (maxLoadScore >= 5) {
      adjustments.yesterdayRecovery = 1.03;
    } else {
      adjustments.yesterdayRecovery = 1.0;
    }
  } else {
    adjustments.yesterdayRecovery = 1.0;
  }
  
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
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
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

## 6. Long-Term Planning Algorithms (NEW)

### 6.1 Plan Creation

```typescript
function createNutritionPlan(
  profile: UserProfile,
  currentWeight: number,
  goalWeight: number,
  durationWeeks: number,
  startDate: Date = new Date()
): NutritionPlan {
  const totalChange = goalWeight - currentWeight;
  const requiredWeeklyChangeKg = totalChange / durationWeeks;
  const requiredDailyDeficit = (requiredWeeklyChangeKg * 7700) / 7;
  
  // Validate: cap at safe limits
  const maxSafeDeficit = profile.manualTDEE 
    ? profile.manualTDEE * 0.25 
    : 750; // ~1.5 lb/week max
  
  const safeDeficit = Math.min(Math.abs(requiredDailyDeficit), maxSafeDeficit) * 
    Math.sign(requiredDailyDeficit);
  
  // Generate weekly targets
  const weeklyTargets = generateWeeklyTargets(
    profile,
    currentWeight,
    goalWeight,
    durationWeeks,
    safeDeficit,
    startDate
  );
  
  return {
    id: generateId(),
    userId: profile.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    startDate,
    startWeight: currentWeight,
    goalWeight,
    durationWeeks,
    requiredWeeklyChangeKg,
    requiredDailyDeficit: safeDeficit,
    weeklyTargets,
    status: 'active',
    recalibrations: []
  };
}

function generateWeeklyTargets(
  profile: UserProfile,
  startWeight: number,
  goalWeight: number,
  durationWeeks: number,
  dailyDeficit: number,
  startDate: Date
): WeeklyTarget[] {
  const targets: WeeklyTarget[] = [];
  const weeklyChange = (dailyDeficit * 7) / 7700;
  
  // Get base TDEE
  const baseTDEE = profile.manualTDEE || 
    calculateBMR(profile, startWeight, profile.bmrEquation) * 1.5;
  
  for (let week = 1; week <= durationWeeks; week++) {
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (week - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    // Project weight for this week (linear interpolation)
    const projectedWeight = startWeight + (weeklyChange * week);
    
    // TDEE scales roughly with weight
    const projectedTDEE = baseTDEE * (projectedWeight / startWeight);
    
    // Target intake = TDEE - deficit
    const targetIntake = projectedTDEE - dailyDeficit;
    
    // Calculate macros maintaining profile ratios
    const macroRatios = calculateMacroRatios(
      profile.dailyCarbsG,
      profile.dailyProteinG,
      profile.dailyFatsG
    );
    
    const avgCarbsG = (targetIntake * macroRatios.carbRatio) / 4.1;
    const avgProteinG = (targetIntake * macroRatios.proteinRatio) / 4.3;
    const avgFatsG = (targetIntake * macroRatios.fatRatio) / 9.3;
    
    targets.push({
      weekNumber: week,
      startDate: weekStartDate,
      endDate: weekEndDate,
      projectedWeight: Math.round(projectedWeight * 10) / 10,
      projectedTDEE: Math.round(projectedTDEE),
      targetIntake: Math.round(targetIntake),
      avgCarbsG: Math.round(avgCarbsG),
      avgProteinG: Math.round(avgProteinG),
      avgFatsG: Math.round(avgFatsG),
      carbPercent: macroRatios.carbRatio,
      proteinPercent: macroRatios.proteinRatio,
      fatPercent: macroRatios.fatRatio,
      daysLogged: 0
    });
  }
  
  return targets;
}
```

### 6.2 Dual-Track Analysis

```typescript
function analyzeDualTrack(
  plan: NutritionPlan,
  history: DailyLog[],
  currentDate: Date = new Date(),
  tolerancePercent: number = 3
): DualTrackAnalysis {
  // Determine current week
  const daysSinceStart = daysBetween(plan.startDate, currentDate);
  const currentWeek = Math.ceil(daysSinceStart / 7);
  
  if (currentWeek < 1 || currentWeek > plan.durationWeeks) {
    throw new Error('Current date is outside plan timeframe');
  }
  
  // Get current and planned weight
  const currentWeight = history.length > 0 
    ? history[history.length - 1].weightKg 
    : plan.startWeight;
  
  const plannedWeight = plan.weeklyTargets[currentWeek - 1].projectedWeight;
  
  // Calculate variance
  const variance = currentWeight - plannedWeight;
  const variancePercent = (variance / plannedWeight) * 100;
  const isWithinTolerance = Math.abs(variancePercent) < tolerancePercent;
  
  // Calculate actual trend from history
  const recentHistory = history.slice(-21); // Last 3 weeks
  let actualWeeklyRate = 0;
  let actualTDEE = plan.weeklyTargets[currentWeek - 1].projectedTDEE;
  
  if (recentHistory.length >= 7) {
    const weightTrend = calculateWeightTrend(recentHistory);
    actualWeeklyRate = weightTrend.weeklyChangeKg;
    
    // Estimate actual TDEE from weight change + intake
    const avgIntake = calculateAverageIntake(recentHistory);
    const impliedDeficit = (actualWeeklyRate * 7700) / 7;
    actualTDEE = avgIntake - impliedDeficit;
  }
  
  const adherenceRatio = plan.requiredWeeklyChangeKg !== 0
    ? actualWeeklyRate / plan.requiredWeeklyChangeKg
    : 1;
  
  // Generate projections
  const weeksRemaining = plan.durationWeeks - currentWeek;
  
  const planProjection = generateProjection(
    currentWeight,
    plan.requiredWeeklyChangeKg,
    weeksRemaining,
    plan.weeklyTargets.slice(currentWeek - 1),
    currentDate
  );
  
  const trendProjection = generateProjection(
    currentWeight,
    actualWeeklyRate,
    weeksRemaining,
    plan.weeklyTargets.slice(currentWeek - 1),
    currentDate
  );
  
  // Find convergence point
  const convergenceWeek = findConvergenceWeek(planProjection, trendProjection);
  const trendEndWeight = currentWeight + (actualWeeklyRate * weeksRemaining);
  
  // Generate recalibration options if needed
  const recalibrationNeeded = !isWithinTolerance;
  const options = recalibrationNeeded
    ? generateRecalibrationOptions(
        plan,
        currentWeight,
        currentWeek,
        actualWeeklyRate,
        actualTDEE
      )
    : [];
  
  return {
    currentWeek,
    currentWeight,
    plannedWeight,
    variance,
    variancePercent,
    isWithinTolerance,
    actualWeeklyRate,
    actualTDEE: Math.round(actualTDEE),
    adherenceRatio,
    planProjection,
    trendProjection,
    convergenceWeek,
    trendEndWeight: Math.round(trendEndWeight * 10) / 10,
    recalibrationNeeded,
    options
  };
}

function generateProjection(
  startWeight: number,
  weeklyChangeRate: number,
  weeks: number,
  basePlan: WeeklyTarget[],
  startDate: Date
): WeeklyProjection[] {
  const projections: WeeklyProjection[] = [];
  
  for (let i = 0; i < weeks && i < basePlan.length; i++) {
    const projectedWeight = startWeight + (weeklyChangeRate * (i + 1));
    const weekPlan = basePlan[i];
    
    // Scale calories with projected weight
    const weightRatio = projectedWeight / weekPlan.projectedWeight;
    const projectedCalories = weekPlan.targetIntake * weightRatio;
    
    projections.push({
      weekNumber: weekPlan.weekNumber,
      date: weekPlan.startDate,
      projectedWeight: Math.round(projectedWeight * 10) / 10,
      projectedCalories: Math.round(projectedCalories),
      projectedCarbsG: Math.round(weekPlan.avgCarbsG * weightRatio),
      projectedProteinG: Math.round(weekPlan.avgProteinG * weightRatio),
      projectedFatsG: Math.round(weekPlan.avgFatsG * weightRatio)
    });
  }
  
  return projections;
}

function findConvergenceWeek(
  planProjection: WeeklyProjection[],
  trendProjection: WeeklyProjection[]
): number | null {
  for (let i = 0; i < Math.min(planProjection.length, trendProjection.length); i++) {
    const planWeight = planProjection[i].projectedWeight;
    const trendWeight = trendProjection[i].projectedWeight;
    
    // Check if they've crossed or are very close
    if (Math.abs(planWeight - trendWeight) < 0.2) {
      return planProjection[i].weekNumber;
    }
  }
  
  return null;
}
```

### 6.3 Recalibration Options

```typescript
function generateRecalibrationOptions(
  plan: NutritionPlan,
  currentWeight: number,
  currentWeek: number,
  actualWeeklyRate: number,
  actualTDEE: number
): RecalibrationOption[] {
  const options: RecalibrationOption[] = [];
  const weeksRemaining = plan.durationWeeks - currentWeek;
  const weightToGo = plan.goalWeight - currentWeight;
  
  // Option A: Increase deficit to catch up
  const catchUpRate = weightToGo / weeksRemaining;
  const catchUpDeficit = (catchUpRate * 7700) / 7;
  const currentDeficit = (actualWeeklyRate * 7700) / 7;
  const additionalDeficit = Math.abs(catchUpDeficit) - Math.abs(currentDeficit);
  
  if (additionalDeficit > 0 && additionalDeficit < 400) {
    options.push({
      type: 'increase_deficit',
      description: `Increase deficit by ${Math.round(additionalDeficit)} kcal/day`,
      newDailyDeficit: Math.round(Math.abs(catchUpDeficit)),
      impactDescription: `Reach ${plan.goalWeight}kg by original end date`,
      feasibility: additionalDeficit < 150 ? 'easy' : 
                   additionalDeficit < 250 ? 'moderate' : 'aggressive'
    });
  } else if (additionalDeficit >= 400) {
    options.push({
      type: 'increase_deficit',
      description: `Would require ${Math.round(additionalDeficit)} kcal/day more deficit`,
      newDailyDeficit: Math.round(Math.abs(catchUpDeficit)),
      impactDescription: `Not recommended - too aggressive`,
      feasibility: 'extreme'
    });
  }
  
  // Option B: Extend timeline
  const weeksNeeded = actualWeeklyRate !== 0 
    ? Math.abs(weightToGo / actualWeeklyRate)
    : weeksRemaining * 2;
  const additionalWeeks = Math.ceil(weeksNeeded - weeksRemaining);
  
  if (additionalWeeks > 0 && additionalWeeks <= 52) {
    const newEndDate = new Date(plan.startDate);
    newEndDate.setDate(newEndDate.getDate() + (plan.durationWeeks + additionalWeeks) * 7);
    
    options.push({
      type: 'extend_timeline',
      description: `Extend by ${additionalWeeks} week${additionalWeeks > 1 ? 's' : ''}`,
      newEndDate,
      impactDescription: `Reach ${plan.goalWeight}kg at current pace`,
      feasibility: additionalWeeks <= 4 ? 'easy' : 
                   additionalWeeks <= 8 ? 'moderate' : 'aggressive'
    });
  }
  
  // Option C: Revise goal weight
  const achievableWeight = currentWeight + (actualWeeklyRate * weeksRemaining);
  
  if (Math.abs(achievableWeight - plan.goalWeight) > 0.5) {
    options.push({
      type: 'revise_goal',
      description: `Revise goal to ${achievableWeight.toFixed(1)}kg`,
      newGoalWeight: Math.round(achievableWeight * 10) / 10,
      impactDescription: `Achievable at current pace by original end date`,
      feasibility: 'easy'
    });
  }
  
  // Option D: Keep current (always available)
  options.push({
    type: 'keep_current',
    description: 'Continue with current plan',
    impactDescription: `Projected end weight: ${(currentWeight + actualWeeklyRate * weeksRemaining).toFixed(1)}kg`,
    feasibility: 'easy'
  });
  
  return options;
}
```

### 6.4 Apply Recalibration

```typescript
function applyRecalibration(
  plan: NutritionPlan,
  option: RecalibrationOption,
  currentWeight: number,
  currentWeek: number
): NutritionPlan {
  const recalibration: Recalibration = {
    id: generateId(),
    date: new Date(),
    weekNumber: currentWeek,
    plannedWeight: plan.weeklyTargets[currentWeek - 1].projectedWeight,
    actualWeight: currentWeight,
    variance: currentWeight - plan.weeklyTargets[currentWeek - 1].projectedWeight,
    variancePercent: ((currentWeight - plan.weeklyTargets[currentWeek - 1].projectedWeight) / 
                      plan.weeklyTargets[currentWeek - 1].projectedWeight) * 100,
    action: option
  };
  
  let updatedPlan = { ...plan };
  
  switch (option.type) {
    case 'increase_deficit':
      // Regenerate remaining weeks with new deficit
      updatedPlan.requiredDailyDeficit = option.newDailyDeficit!;
      updatedPlan.weeklyTargets = [
        ...plan.weeklyTargets.slice(0, currentWeek - 1),
        ...regenerateRemainingWeeks(plan, currentWeight, currentWeek, option.newDailyDeficit!)
      ];
      break;
      
    case 'extend_timeline':
      // Add additional weeks
      const additionalWeeks = Math.ceil(
        (option.newEndDate!.getTime() - plan.weeklyTargets[plan.durationWeeks - 1].endDate.getTime()) / 
        (7 * 24 * 60 * 60 * 1000)
      );
      updatedPlan.durationWeeks = plan.durationWeeks + additionalWeeks;
      updatedPlan.weeklyTargets = [
        ...plan.weeklyTargets,
        ...generateAdditionalWeeks(plan, additionalWeeks)
      ];
      break;
      
    case 'revise_goal':
      updatedPlan.goalWeight = option.newGoalWeight!;
      const newWeeklyChange = (option.newGoalWeight! - currentWeight) / 
                              (plan.durationWeeks - currentWeek);
      updatedPlan.requiredWeeklyChangeKg = newWeeklyChange;
      updatedPlan.requiredDailyDeficit = (newWeeklyChange * 7700) / 7;
      updatedPlan.weeklyTargets = [
        ...plan.weeklyTargets.slice(0, currentWeek - 1),
        ...regenerateRemainingWeeks(plan, currentWeight, currentWeek, updatedPlan.requiredDailyDeficit)
      ];
      break;
      
    case 'keep_current':
      // No changes to plan
      break;
  }
  
  updatedPlan.recalibrations = [...plan.recalibrations, recalibration];
  updatedPlan.updatedAt = new Date();
  
  return updatedPlan;
}

function regenerateRemainingWeeks(
  plan: NutritionPlan,
  currentWeight: number,
  fromWeek: number,
  newDailyDeficit: number
): WeeklyTarget[] {
  // Similar to generateWeeklyTargets but starting from current state
  const weeksRemaining = plan.durationWeeks - fromWeek + 1;
  const weeklyChange = (newDailyDeficit * 7) / 7700;
  
  const targets: WeeklyTarget[] = [];
  const baseTDEE = plan.weeklyTargets[fromWeek - 1].projectedTDEE;
  
  for (let i = 0; i < weeksRemaining; i++) {
    const week = fromWeek + i;
    const baseTarget = plan.weeklyTargets[week - 1];
    
    const projectedWeight = currentWeight + (weeklyChange * (i + 1));
    const projectedTDEE = baseTDEE * (projectedWeight / currentWeight);
    const targetIntake = projectedTDEE - newDailyDeficit;
    
    targets.push({
      ...baseTarget,
      projectedWeight: Math.round(projectedWeight * 10) / 10,
      projectedTDEE: Math.round(projectedTDEE),
      targetIntake: Math.round(targetIntake),
      avgCarbsG: Math.round((targetIntake * baseTarget.carbPercent) / 4.1),
      avgProteinG: Math.round((targetIntake * baseTarget.proteinPercent) / 4.3),
      avgFatsG: Math.round((targetIntake * baseTarget.fatPercent) / 9.3)
    });
  }
  
  return targets;
}

function generateAdditionalWeeks(
  plan: NutritionPlan,
  additionalWeeks: number
): WeeklyTarget[] {
  const lastWeek = plan.weeklyTargets[plan.weeklyTargets.length - 1];
  const targets: WeeklyTarget[] = [];
  
  for (let i = 1; i <= additionalWeeks; i++) {
    const weekStartDate = new Date(lastWeek.endDate);
    weekStartDate.setDate(weekStartDate.getDate() + 1 + (i - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    targets.push({
      ...lastWeek,
      weekNumber: lastWeek.weekNumber + i,
      startDate: weekStartDate,
      endDate: weekEndDate,
      daysLogged: 0,
      actualAvgWeight: undefined,
      actualAvgIntake: undefined
    });
  }
  
  return targets;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

---

## 7. API Design

### 7.1 REST Endpoints

```
Authentication (JWT-based, simple for single user initially)
POST   /api/auth/login

User Profile
GET    /api/profile
PUT    /api/profile
DELETE /api/profile
PATCH  /api/profile/goals
PATCH  /api/profile/macros          # Update absolute gram values
PATCH  /api/profile/tdee            # Update TDEE source and manual value

Daily Logs
POST   /api/logs
GET    /api/logs
GET    /api/logs/today
DELETE /api/logs/today
GET    /api/logs/:date
PATCH  /api/logs/:date/actual-training    # Update actual sessions array

Calculations
POST   /api/calculate/daily-targets
GET    /api/stats/tdee-history
GET    /api/stats/weight-trend
GET    /api/stats/training-load

Long-Term Planning (NEW)
POST   /api/plans                    # Create new plan
GET    /api/plans/active             # Get active plan
GET    /api/plans/:id                # Get specific plan
GET    /api/plans/:id/analysis       # Get dual-track analysis
POST   /api/plans/:id/recalibrate    # Apply recalibration
PATCH  /api/plans/:id/status         # Mark completed/abandoned
GET    /api/plans                    # List all plans (history)
```

### 7.2 Request/Response Examples

```typescript
// PUT /api/profile (updated format)
// Request:
{
  "height_cm": 180,
  "birthDate": "1979-03-15",
  "sex": "male",
  "bmrEquation": "mifflin_st_jeor",
  "manualTDEE": 3067,
  "tdeeSource": "manual",
  "goal": "lose_weight",
  "targetWeightKg": 82,
  "planDurationWeeks": 29,
  "dailyCarbsG": 300,
  "dailyProteinG": 196,
  "dailyFatsG": 73,
  "mealRatios": {
    "breakfast": 0.30,
    "lunch": 0.30,
    "dinner": 0.40
  },
  "fruitTargetG": 600,
  "veggieTargetG": 500,
  "supplements": {
    "maltodextrinG": 25,
    "wheyG": 30,
    "collagenG": 20
  }
}

// Response includes derived values:
{
  "id": "profile_123",
  "height_cm": 180,
  "birthDate": "1979-03-15",
  // ... all input fields ...
  "derived": {
    "carbsPerKg": 3.37,
    "proteinPerKg": 2.20,
    "fatsPerKg": 0.82,
    "carbPercent": 0.453,
    "proteinPercent": 0.310,
    "fatPercent": 0.237,
    "totalDailyCalories": 2713,
    "effectiveTDEE": 3067,
    "dailyBalance": -354,
    "weeklyBalance": -2478,
    "projectedWeeklyChangeKg": -0.32
  }
}

// POST /api/plans
// Request:
{
  "goalWeight": 82,
  "durationWeeks": 29
}

// Response:
{
  "id": "plan_abc123",
  "startDate": "2026-01-01",
  "startWeight": 89,
  "goalWeight": 82,
  "durationWeeks": 29,
  "requiredWeeklyChangeKg": -0.24,
  "requiredDailyDeficit": 265,
  "status": "active",
  "weeklyTargets": [
    {
      "weekNumber": 1,
      "startDate": "2026-01-01",
      "endDate": "2026-01-07",
      "projectedWeight": 88.8,
      "projectedTDEE": 3050,
      "targetIntake": 2785,
      "avgCarbsG": 310,
      "avgProteinG": 203,
      "avgFatsG": 75,
      "carbPercent": 0.453,
      "proteinPercent": 0.310,
      "fatPercent": 0.237,
      "daysLogged": 0
    },
    // ... weeks 2-29 ...
  ]
}

// GET /api/plans/:id/analysis
// Response:
{
  "currentWeek": 4,
  "currentWeight": 88.3,
  "plannedWeight": 87.9,
  "variance": 0.4,
  "variancePercent": 0.46,
  "isWithinTolerance": true,
  "actualWeeklyRate": -0.18,
  "actualTDEE": 2980,
  "adherenceRatio": 0.75,
  "planProjection": [...],
  "trendProjection": [...],
  "convergenceWeek": null,
  "trendEndWeight": 83.5,
  "recalibrationNeeded": false,
  "options": []
}

// Week 12, outside tolerance:
{
  "currentWeek": 12,
  "currentWeight": 87.2,
  "plannedWeight": 86.0,
  "variance": 1.2,
  "variancePercent": 1.40,
  "isWithinTolerance": false,
  "actualWeeklyRate": -0.15,
  "actualTDEE": 2920,
  "adherenceRatio": 0.63,
  "recalibrationNeeded": true,
  "options": [
    {
      "type": "increase_deficit",
      "description": "Increase deficit by 150 kcal/day",
      "newDailyDeficit": 415,
      "impactDescription": "Reach 82kg by original end date",
      "feasibility": "moderate"
    },
    {
      "type": "extend_timeline",
      "description": "Extend by 8 weeks",
      "newEndDate": "2026-09-17",
      "impactDescription": "Reach 82kg at current pace",
      "feasibility": "moderate"
    },
    {
      "type": "revise_goal",
      "description": "Revise goal to 84.5kg",
      "newGoalWeight": 84.5,
      "impactDescription": "Achievable at current pace by original end date",
      "feasibility": "easy"
    },
    {
      "type": "keep_current",
      "description": "Continue with current plan",
      "impactDescription": "Projected end weight: 84.8kg",
      "feasibility": "easy"
    }
  ]
}
```

---

## 8. Database Schema (SQLite)

```sql
-- User profile (updated)
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY,
  height_cm REAL NOT NULL,
  birth_date DATE NOT NULL,
  sex TEXT CHECK(sex IN ('male', 'female')) NOT NULL,
  body_fat_percent REAL,
  bmr_equation TEXT DEFAULT 'mifflin_st_jeor' CHECK(bmr_equation IN (
    'mifflin_st_jeor', 'katch_mcardle', 'oxford_henry', 'harris_benedict'
  )),
  
  -- TDEE configuration (NEW)
  manual_tdee REAL,
  tdee_source TEXT DEFAULT 'formula' CHECK(tdee_source IN ('formula', 'manual', 'adaptive')),
  
  goal TEXT CHECK(goal IN ('lose_weight', 'maintain', 'gain_weight')) NOT NULL,
  target_weight_kg REAL,
  plan_duration_weeks INTEGER DEFAULT 29,
  plan_start_date DATE,
  
  -- Macros as absolute grams (UPDATED)
  daily_carbs_g REAL DEFAULT 300,
  daily_protein_g REAL DEFAULT 196,
  daily_fats_g REAL DEFAULT 73,
  
  -- Meal ratios (1% precision)
  breakfast_ratio REAL DEFAULT 0.30,
  lunch_ratio REAL DEFAULT 0.30,
  dinner_ratio REAL DEFAULT 0.40,
  
  -- Points multipliers
  carb_multiplier REAL DEFAULT 1.15,
  protein_multiplier REAL DEFAULT 4.35,
  fat_multiplier REAL DEFAULT 3.5,
  
  -- F&V targets
  fruit_target_g REAL DEFAULT 600,
  veggie_target_g REAL DEFAULT 500,

  -- Supplement configuration (for points calculation)
  -- These represent "fixed" macro contributions subtracted before meal point conversion
  maltodextrin_g REAL DEFAULT 0,    -- Intra-workout carbs (performance days), 96% carbs
  whey_g REAL DEFAULT 0,            -- Whey protein (performance days), 88% protein
  collagen_g REAL DEFAULT 0,        -- Collagen peptides (all days), 90% protein

  -- Recalibration settings
  recalibration_tolerance_percent REAL DEFAULT 3.0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily log entries (UPDATED: training moved to separate table)
CREATE TABLE daily_logs (
  id INTEGER PRIMARY KEY,
  log_date DATE UNIQUE NOT NULL,
  weight_kg REAL NOT NULL,
  body_fat_percent REAL,
  resting_heart_rate INTEGER,
  sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 100),
  sleep_hours REAL,

  day_type TEXT CHECK(day_type IN ('performance', 'fatburner', 'metabolize')),

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
  
  estimated_tdee REAL,
  tdee_confidence REAL,
  acute_load REAL,
  chronic_load REAL,
  acr REAL,
  recovery_score REAL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training sessions (NEW: supports multiple sessions per day)
-- e.g., morning Qigong, afternoon strength training
CREATE TABLE training_sessions (
  id INTEGER PRIMARY KEY,
  daily_log_id INTEGER NOT NULL,
  session_order INTEGER NOT NULL,  -- 1, 2, 3... for ordering within a day
  is_planned BOOLEAN NOT NULL,     -- true = planned, false = actual
  training_type TEXT NOT NULL CHECK(training_type IN (
    'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle',
    'hiit', 'strength', 'calisthenics', 'mobility', 'mixed'
  )),
  duration_min INTEGER NOT NULL,
  perceived_intensity INTEGER CHECK(perceived_intensity BETWEEN 1 AND 5),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);

CREATE INDEX idx_training_sessions_log ON training_sessions(daily_log_id);
CREATE INDEX idx_training_sessions_planned ON training_sessions(daily_log_id, is_planned);

-- Nutrition plans (NEW)
CREATE TABLE nutrition_plans (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  start_weight REAL NOT NULL,
  goal_weight REAL NOT NULL,
  duration_weeks INTEGER NOT NULL,
  required_weekly_change_kg REAL NOT NULL,
  required_daily_deficit REAL NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profile(id)
);

-- Weekly targets for plans (NEW)
CREATE TABLE weekly_targets (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  projected_weight REAL NOT NULL,
  projected_tdee REAL NOT NULL,
  target_intake REAL NOT NULL,
  avg_carbs_g REAL NOT NULL,
  avg_protein_g REAL NOT NULL,
  avg_fats_g REAL NOT NULL,
  carb_percent REAL NOT NULL,
  protein_percent REAL NOT NULL,
  fat_percent REAL NOT NULL,
  actual_avg_weight REAL,
  actual_avg_intake REAL,
  days_logged INTEGER DEFAULT 0,
  FOREIGN KEY (plan_id) REFERENCES nutrition_plans(id),
  UNIQUE(plan_id, week_number)
);

-- Recalibration history (NEW)
CREATE TABLE recalibrations (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  recalibration_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  planned_weight REAL NOT NULL,
  actual_weight REAL NOT NULL,
  variance REAL NOT NULL,
  variance_percent REAL NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN (
    'increase_deficit', 'extend_timeline', 'revise_goal', 'keep_current'
  )),
  action_details TEXT, -- JSON blob for action-specific data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES nutrition_plans(id)
);

-- Indexes
CREATE INDEX idx_logs_date ON daily_logs(log_date);
CREATE INDEX idx_plans_user ON nutrition_plans(user_id);
CREATE INDEX idx_plans_status ON nutrition_plans(status);
CREATE INDEX idx_weekly_targets_plan ON weekly_targets(plan_id);
CREATE INDEX idx_recalibrations_plan ON recalibrations(plan_id);
```

---

## 9. UI Components

### 9.1 Main Views

**Daily Input View (Home)**
- Morning check-in card
  - Weight input (numeric, kg)
  - Body fat % (optional, numeric)
  - Sleep quality (1-100 score)
  - Sleep hours (optional, numeric)
  - RHR (optional, numeric)
- Day type selector (performance/fatburner/metabolize)
- Training sessions (supports multiple per day)
  - List of planned sessions with add/remove
  - Each session: training type dropdown + duration input
  - Example: Qigong 20min, GMB 30min, Strength 60min
- Submit button → Shows calculated targets

**Today's Targets View**
- Summary card with total calories and day type badge
- Macros bar chart (C/P/F grams)
- Meal cards (breakfast/lunch/dinner) with C/P/F points
- Additional targets (fruit, vegetables, water)
- "Log Actual Training" button (update each session's actual duration/intensity)

**Plan Overview View (NEW)**
- Plan summary card
  - Start weight → Goal weight
  - Timeline with progress indicator
  - Current week highlight
- Dual-track chart
  - Plan line (what should happen)
  - Projection line (what is happening)
  - Actual weight points
- Weekly targets table
  - Avg Cal/day, C/P/F grams, percentages per week
  - Rows colored by completion status
- Variance indicator with recalibration prompt if needed

**Recalibration Modal (NEW)**
- Current state summary (plan vs reality)
- Options cards with feasibility indicators
- Impact preview for each option
- Confirm/Cancel actions

**History View**
- Weight chart with trend line
- Training load chart (acute/chronic/ACR)
- TDEE estimation chart with confidence band
- Calendar heatmap

**Settings View (UPDATED)**
- Profile section (height, birthdate, sex)
- TDEE Configuration section (NEW)
  - Source selector (formula/manual/adaptive)
  - Manual TDEE input field
  - Current estimate display
- Macro Input section (UPDATED)
  - Absolute gram inputs (carbs, protein, fats)
  - Derived values display (g/kg, %, total calories)
  - Deficit/surplus indicator
- Meal distribution (1% increment sliders)
- Fruit/Veggie targets
- Recalibration tolerance setting

### 9.2 Component Breakdown

```
/src
  /components
    /daily-input
      WeightInput.tsx
      SleepQualityInput.tsx
      DayTypeSelector.tsx
      TrainingSessionsList.tsx  # Add/remove multiple sessions
      DailyInputForm.tsx
    /targets
      MacroSummaryCard.tsx
      MealCard.tsx
      AdditionalTargetsCard.tsx
      DayTypeIndicator.tsx
    /planning (NEW)
      PlanSummaryCard.tsx
      DualTrackChart.tsx
      WeeklyTargetsTable.tsx
      VarianceIndicator.tsx
      RecalibrationModal.tsx
      RecalibrationOptionCard.tsx
    /history
      WeightChart.tsx
      TrainingLoadChart.tsx
      TDEEChart.tsx
      CalendarHeatmap.tsx
      LogDetailModal.tsx
    /settings
      ProfileForm.tsx
      TDEEConfigForm.tsx (NEW)
      MacroInputForm.tsx (UPDATED)
      MealDistributionForm.tsx
      TrainingConfigList.tsx
    /common
      NumberInput.tsx
      PercentInput.tsx (NEW - 1% increments)
      StarRating.tsx
      ProgressBar.tsx
      Card.tsx
      FeasibilityBadge.tsx (NEW)
  /pages
    Home.tsx
    Plan.tsx (NEW)
    History.tsx
    Settings.tsx
  /hooks
    useDailyLog.ts
    useProfile.ts
    usePlan.ts (NEW)
    useDualTrack.ts (NEW)
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

## 10. Tech Stack

### Backend
- **Go** (aligns with Credo work)
- **SQLite** (simple, file-based)
- **Chi or Gin** for HTTP routing
- **GORM** or raw SQL for database

### Frontend
- **React + TypeScript**
- **Tailwind CSS**
- **Recharts** for charts
- **React Query** for API state

### Development
- **Docker Compose** for local dev
- **SQLite file** mounted as volume

---

## 11. MVP Scope

### Phase 1: Core Loop (Week 1-2)
- [ ] Database schema + migrations
- [ ] User profile CRUD with new macro input format
- [ ] Daily log creation with calculation
- [ ] Basic daily input form with day type selector
- [ ] Today's targets display

### Phase 2: Planning Foundation (Week 3-4)
- [ ] Plan creation and storage
- [ ] Weekly targets generation
- [ ] Plan overview view with weekly table
- [ ] Simple weight history chart

### Phase 3: Adaptive Features (Week 5-6)
- [ ] Adaptive TDEE calculation
- [ ] Dual-track analysis
- [ ] Plan vs projection chart
- [ ] Training load tracking

### Phase 4: Recalibration (Week 7-8)
- [ ] Variance detection
- [ ] Recalibration options generation
- [ ] Recalibration modal and apply
- [ ] Recalibration history

### Phase 5: Polish (Week 9+)
- [ ] Settings/configuration UI
- [ ] Data export (CSV/JSON)
- [ ] Mobile-responsive design
- [ ] PWA support

---

## 12. Open Questions / Future Considerations

1. **Garmin integration**: Auto-import weight, sleep, RHR from Garmin Connect API.

2. **Food logging integration**: Track actual intake vs targets with MyFitnessPal/Cronometer.

3. **Smart recalibration prompts**: Weekly check-ins vs on-demand vs automatic triggers.

4. **Multiple plans**: Support for sequential plans with different goals (cut → maintain → bulk).

5. **Meal suggestions**: Given point targets, suggest actual meals from a database.

---

## Appendix A: Spreadsheet Formula Reference

(Preserved from v1 - see original PRD for full formulas)
