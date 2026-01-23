# Victus PRD (User + Acceptance Criteria Focus)
## Adaptive Daily Nutrition Planning App

**Version:** 2.0 (rewrite)  
**Author:** Alex  
**Base PRD date:** January 1, 2026  
**Rewrite date:** 2026-01-23

This document rewrites the existing PRD into a more user-journey and acceptance-criteria driven spec **without changing any specified behavior**. All numeric constants, formulas, and rounding rules are retained.

---

## 0. Definitions and Conventions

### 0.1 Terminology
- **Daily targets**: macros (grams + calories), meal points (C/P/F points per meal), fruit/veg grams, water liters.
- **Day Type**: user-selected daily strategy affecting macro distribution:
  - `performance` (higher carbs)
  - `fatburner` (lower carbs)
  - `metabolize` (refeed/high day)
- **Training session**: a planned or actual activity with a type, duration, and optional perceived intensity.
- **TDEE source**:
  - `formula`: derived from BMR equation * 1.2 + exercise calories.
  - `manual`: user-provided TDEE.
  - `adaptive`: estimated from weight trend + intake history when enough data exists.

### 0.2 Units and rounding
- Weight: **kg** (store as `REAL`; display can show 1 decimal).
- Durations: **minutes** (integer).
- Meal points: integers, **rounded to nearest 5** (Excel `MROUND` equivalent).
- Fruit/veg grams: **rounded to nearest 5g**.
- Water: liters, **rounded to 0.1L**.
- Energy conversion constants (retained):
  - carbs **4.1 kcal/g**
  - protein **4.3 kcal/g**
  - fats **9.3 kcal/g**
- Weight change energy constant: **7700 kcal per kg** (retained).

---

## 1. Product Goal and Non-Goals

### 1.1 Goal
Victus helps a single user:
1. **Decide daily intake** (meal points + fruit/veg + water) from morning inputs and planned training.
2. **Review progress** (weight trend, estimated TDEE, load) and understand “plan vs reality.”
3. **Run a long-term plan** (goal weight + duration) with variance detection and recalibration options.

### 1.2 Non-goals (explicit)
- Food logging by item, barcode scanning, or calorie tracking UI.
- Social features, multi-user families, coaching marketplace.
- Medical advice, diagnosis, or treatment recommendations.

---

## 2. Primary User Journeys (Concrete Scenarios)

### 2.1 Morning daily check-in → targets
**Scenario A: Typical training day**
- Input: date=today, weight=89.4kg, sleep=78, RHR=52, dayType=`performance`
- Planned sessions: Qigong 30m, GMB 30m, Strength 60m
- Output: totals (g + kcal), per-meal points (breakfast/lunch/dinner), fruit/veg grams, water liters, and explanation breakdown:
  - which TDEE source was used
  - confidence (if adaptive)
  - day-type multipliers applied
  - supplements deducted from points (if configured)

**Scenario B: Minimal input (optional fields missing)**
- Input: weight=89.4kg, sleep=60, dayType=`fatburner`
- Planned sessions: none (or `rest`)
- Output still computed. Missing optional fields do not block target generation.

### 2.2 End-of-day: log actual training
- User edits the day’s sessions: actual duration and perceived intensity (RPE 1–5).
- Output: day record is updated for history and future adaptive calculations (TDEE, training load).

### 2.3 Weekly review
- User views:
  - weight chart with trendline and regression rate (kg/week)
  - estimated TDEE + confidence over time
  - planned vs actual training load (acute/chronic)

### 2.4 Long-term plan: plan vs projection
- User creates plan: startWeight, goalWeight, durationWeeks (e.g., 29), startDate.
- Victus generates weekly targets (projected weight, projected TDEE, target intake, macro grams per week).
- Each week, Victus compares current weight vs planned weight:
  - if variance is within tolerance, no recalibration prompt
  - if outside tolerance, show recalibration options:
    - increase deficit, extend timeline, revise goal, keep current

---

## 3. Functional Requirements with Acceptance Criteria

### 3.1 Daily log creation and editing

**Behavior**
- A daily log may be created for **today or any past date**.
- A daily log **must not** be created for a future date (domain boundary validation).
- If a log exists for a date, saving again updates it (idempotent “upsert” by date).

**Acceptance criteria**
- Given the user selects a future date, when they submit, then the API rejects with a validation error and no data is stored.
- Given no log exists for today, when the user submits morning inputs, then a daily log is created and targets are stored.
- Given a log exists for today, when the user re-submits with a new weight, then the same date log is updated and targets are recalculated.

**Code proposals**
- Domain guard:
  ```ts
  function assertNotFuture(dateOnly: Date, today: Date): void {
    if (dateOnly > stripTime(today)) throw new Error("daily_log.future_date_not_allowed");
  }
  ```
- Storage key: `log_date` unique index (already in schema). fileciteturn1file17

---

### 3.2 Planned training sessions (multiple per day)

**Behavior**
- Daily logs support **0..N planned sessions**.
- Each session has: `type`, `plannedDurationMin`, and optional `notes`.
- A day is considered a “rest day” for load purposes only if sessions are empty OR all sessions are `rest` (retained). fileciteturn1file1

**Acceptance criteria**
- Given the user adds three planned sessions, when they save, then all three are persisted with stable ordering.
- Given a day has sessions `[rest, qigong]`, when load is calculated, then the day is **not** treated as a rest day.
- Given a user deletes a planned session and saves, then only the remaining sessions exist for that day.

**Code proposals**
- DB model already supports `training_sessions(session_order, is_planned)` and indexes. fileciteturn1file10
- Deterministic ordering rule: `session_order` is 1..N at save time.

---

### 3.3 Day type selection

**Behavior**
- Day type is **user-selected**, not derived from training type.
- Day type is one of: `performance | fatburner | metabolize`.

**Acceptance criteria**
- Given day type is missing, when user submits daily check-in, then validation fails with a clear message.
- Given an invalid day type string, when user submits, then validation fails (enum constraint at API/domain boundary).

**Code proposals**
- Keep the DB `CHECK(day_type IN (...))` and validate in the API layer before DB insert. fileciteturn1file10

---

### 3.4 Daily targets calculation (macros, fruit/veg, water, meal points)

This section defines the “single source of truth” calculation pipeline. All constants and formulas are retained from the existing PRD.

#### 3.4.1 Inputs used
- Required: `weightKg`, `dayType`, `plannedTrainingSessions[]`
- Optional: `bodyFatPercent`, `sleepQuality`, `restingHeartRate`, `sleepHours`
- Profile inputs used:
  - macro grams: `dailyCarbsG`, `dailyProteinG`, `dailyFatsG`
  - meal ratios (breakfast/lunch/dinner)
  - supplement config
  - fruit/veg targets
  - points multipliers
  - TDEE source config and BMR equation selection

#### 3.4.2 TDEE selection
**Behavior**
- If `tdeeSource=manual` and `manualTDEE` exists: use it (confidence=0.8, dataPointsUsed=0).
- If insufficient history (<14 samples **and** span <14 days): fallback to `manualTDEE` if set, else formula TDEE (BMR equation * 1.2 + exercise calories) (confidence=0.3).
- Else: use adaptive estimate from recent history using weight trend (date deltas) + intake proxy (target calories), with an adherence adjustment and confidence penalty when plan vs trend diverges.
- `estimatedTDEE` is the effective TDEE used for targets; `formulaTDEE` is stored for transparency and fallback diagnostics.

**Acceptance criteria**
- Given `tdeeSource=manual` and `manualTDEE=2800`, when targets are computed, then `estimatedTDEE=2800` and `tdee_confidence=0.8`.
- Given `tdeeSource=adaptive` and only 10 days exist over a 10-day span, when targets are computed, then fallback method is used and `tdee_confidence=0.3`.
- Given `tdeeSource=adaptive` and 6 samples exist over a 20-day span, when targets are computed, then adaptive is used with low confidence (<=0.3) and `dataPointsUsed=6`.
- Given 28 days exist, when targets are computed, then the app uses the adaptive method with `dataPointsUsed=28` and returns a confidence in [0,1].

#### 3.4.3 Day-type multipliers (protected protein)
**Behavior**
- Multipliers (retained): fileciteturn1file13
  - `fatburner`: carbs*0.60, protein*1.00, fats*0.85
  - `performance`: carbs*1.30, protein*1.00, fats*1.00
  - `metabolize`: carbs*1.50, protein*1.00, fats*1.10

**Acceptance criteria**
- Given base macros are C=200g, P=180g, F=70g, when dayType=`fatburner`, then resulting macros are 120g/180g/59.5g before rounding.
- Protein must not be reduced by day type multipliers (multiplier is 1.00 in all cases).

#### 3.4.4 Fruit and vegetables targets
**Behavior (retained)**
- Compute maximum fruit/veg allowed by carb budget:
  - maxFruitFromCarbs = totalCarbsG*0.3 / 0.10
  - maxVeggiesFromCarbs = totalCarbsG*0.1 / 0.03
- `fatburner` uses a fruit multiplier of 0.7, others 1.0.
- Final fruit/veg are `min(preferenceTarget * dayMultiplier, maxFromCarbs)` and rounded to nearest 5g. fileciteturn1file9

**Acceptance criteria**
- Given totalCarbsG and preferences, when dayType is `fatburner`, then fruit target is reduced by 30% (multiplier 0.7) before the `min(...)` cap.
- Fruit and veg outputs are multiples of 5g.

#### 3.4.5 Meal points conversion
**Behavior (retained)**
- Meal points are derived by:
  1. subtracting fixed contributions (fruit/veg and supplements),
  2. multiplying by points-per-gram factors,
  3. multiplying by meal ratio,
  4. rounding to nearest 5. fileciteturn1file8
- Fixed contributions (retained):
  - fruit carbs: 10% by weight
  - veg carbs: 3% by weight
  - maltodextrin carbs: 96% by weight (performance days only)
  - collagen protein: 90% by weight
  - whey protein: 88% by weight (performance days only)
- Points multipliers (retained):
  - carbs: 1.15
  - protein: 4.35
  - fats: 3.5

**Acceptance criteria**
- Given the PRD example values, when calculating breakfast points for a performance day, then:
  - carbs points = 70
  - protein points = 170
  - fat points = 75 fileciteturn1file9
- Given dayType is not `performance`, when calculating carb/protein points, then maltodextrin and whey are not subtracted.
- Meal points are multiples of 5.

#### 3.4.6 Water target
**Behavior (retained)**
- waterL = roundTo1Decimal(weightKg * 0.04)

**Acceptance criteria**
- Given weightKg=90, then waterL=3.6.

---

### 3.5 Training load and recovery score

**Behavior**
- Acute load is last 7 days average; chronic load is last 28 days average; ACR=acute/chronic (retained approach). fileciteturn1file1
- Session load = loadScore * duration * (RPE/3), using actualDuration if present, else plannedDuration. fileciteturn1file1
- Recovery score is computed using rest days in last 7, ACR thresholds, and average sleep quality. fileciteturn1file1

**Acceptance criteria**
- Given a week of logs with no actual training recorded, when calculating load, then planned sessions are used.
- Given chronicLoad=0, when calculating ACR, then ACR defaults to 1 (per current logic).
- Recovery score is clamped to [0, 100].

---

### 3.6 Adaptive daily adjustments
**Behavior**
- Adjustments multiply the base kcal factor using:
  - training load (ACR thresholds),
  - recovery score thresholds,
  - sleep quality thresholds,
  - “yesterday max loadScore >= 5” factor. fileciteturn1file15
- Total multiplier is rounded to 2 decimals.

**Acceptance criteria**
- Given totalMultiplier is computed, then each component multiplier is surfaced in the UI as a breakdown (same values used in calculation).
- Given the same inputs and history, recalculating targets is deterministic.

---

### 3.7 Long-term plan creation and weekly targets

**Behavior (retained)**
- A plan is defined by startDate, startWeight, goalWeight, durationWeeks.
- requiredWeeklyChangeKg = (goalWeight - startWeight) / durationWeeks
- requiredDailyDeficit = requiredWeeklyChangeKg * 7700 / 7
- Weekly targets are generated using the existing algorithm (linear interpolation of weight, projectedTDEE scaling with weight, targetIntake = projectedTDEE - dailyDeficit, macro grams from ratios). fileciteturn1file18

**Acceptance criteria**
- Given a plan is created, when weekly targets are generated, then:
  - there are exactly `durationWeeks` weekly targets,
  - week 1 startDate equals plan startDate,
  - each week spans 7 days (endDate = startDate + 6 days),
  - `targetIntake = projectedTDEE - requiredDailyDeficit` for that week.
- Given projectedWeight is computed, it is rounded to 0.1kg.

---

### 3.8 Dual-track analysis and recalibration

**Behavior (retained)**
- Determine currentWeek based on days since plan start (ceil(days/7)).
- Determine plannedWeight from weeklyTargets[currentWeek-1].
- Compute variance and variancePercent; compare absolute variancePercent to tolerance.
- If outside tolerance, present recalibration options: increase deficit, extend timeline, revise goal, keep current. fileciteturn1file12
- Tolerance default is 3%, user-configurable 1–10%. fileciteturn1file4

**Acceptance criteria**
- Given currentWeek is outside plan timeframe, when analysis runs, then an error is raised and UI shows a friendly “plan ended” state.
- Given variancePercent is within tolerance, then `recalibrationNeeded=false` and options are hidden.
- Given variancePercent exceeds tolerance, then `recalibrationNeeded=true` and all four option types are present.
- Given the user selects an option, then a recalibration record is persisted with the action type and details (JSON blob) and the plan’s derived fields update accordingly. fileciteturn1file3

---

## 4. Data Model (Canonical)

The canonical data model is the existing PRD model, with these additional determinism notes:
- `DailyLog.calculatedTargets` is stored as the computed output “as of that day,” so historical views are stable even if algorithms evolve later.
- `DailyLog.estimatedTDEE`, `DailyLog.formulaTDEE`, and other adaptive fields are stored alongside targets to preserve the model state at the time of calculation.

Reference TypeScript interfaces remain as in the base PRD. fileciteturn1file1

---

## 5. API Surface (Proposed)

This is a proposal for endpoints that map cleanly to the acceptance criteria.

### 5.1 Daily logs
- `PUT /api/daily-logs/<class 'datetime.date'>` upsert daily log (including planned sessions and day type) and returns calculated targets
- `GET /api/daily-logs?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PUT /api/daily-logs/<class 'datetime.date'>/actual-training` update actual sessions

### 5.2 Plans
- `POST /api/plans` create plan + generate weekly targets
- `GET /api/plans/active`
- `GET /api/plans/<built-in function id>/analysis` dual-track analysis for current date (or supplied date)
- `POST /api/plans/<built-in function id>/recalibrations` persist selected recalibration action

---

## 6. UI Requirements (Acceptance Criteria Oriented)

### 6.0 Day-View Component (Reusable)
The `DayTargetsPanel` is a foundational component used across multiple views to display daily meal targets consistently.

**Purpose**
- Unified display of calculated meal targets
- Reusable in: today's targets, plan projections, historical day details

**Visual Structure**
```
┌─────────────────────────────────────────────┐
│ [Title]                    [Day Type Badge] │
│ [Date Label]                                │
│ [Helper Text (optional)]                    │
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │Breakfast│ │  Lunch  │ │ Dinner  │        │
│ │ 210 pts │ │ 210 pts │ │ 280 pts │        │
│ │ C  P  F │ │ C  P  F │ │ C  P  F │        │
│ │ 70 170 75│ │70 170 75│ │95 230 100│      │
│ │Fruit Veg│ │Fruit Veg│ │Fruit Veg│        │
│ │180g 150g│ │180g 150g│ │240g 200g│        │
│ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────┤
│ Total: 700 pts | Fruit: 600g | Veg: 500g   │
│ Water: 3.6L                                 │
└─────────────────────────────────────────────┘
```

**Props Interface**
- `title: string` - Panel heading (e.g., "Today's Targets", "Plan for Week 1")
- `dateLabel: string` - Date/week identifier
- `dayType: DayType` - performance | fatburner | metabolize
- `mealTargets: MealTargets` - Points per meal (C/P/F)
- `mealRatios: MealRatios` - Breakfast/lunch/dinner % for fruit/veg distribution
- `totalFruitG: number` - Total fruit grams
- `totalVeggiesG: number` - Total veggie grams
- `waterL?: number` - Optional water liters
- `compact?: boolean` - Render in smaller size for comparison views
- `helperText?: string` - Optional context message

**Color Coding (Canonical)**
- Day type badges:
  - Performance: blue background (bg-blue-900/40), blue text (text-blue-300)
  - Fatburner: orange background (bg-orange-900/40), orange text (text-orange-300)
  - Metabolize: emerald background (bg-emerald-900/40), emerald text (text-emerald-300)
- Macro points:
  - Carbs: orange (text-orange-400)
  - Protein: purple (text-purple-400)
  - Fats: slate (text-slate-300)
- Fruit/veg:
  - Fruit: green (text-green-400)
  - Veg: emerald (text-emerald-400)

**Behavior**
- Automatically distributes total fruit/veg across meals using meal ratios
- Calculates total points per meal (carbs + protein + fats)
- Displays all values rounded to multiples of 5 (for points) or appropriate precision (for grams)

**Acceptance Criteria**
- Component renders identically given the same props regardless of context
- Fruit and veg distribution matches calculation: `splitTarget(total, ratios)` where remainders go to dinner
- All rendered values match stored database values (no client-side recalculation)
- Compact mode reduces font sizes and padding while maintaining readability

---

### 6.1 Daily check-in screen
**Must**
- Provide required inputs with clear validation (weight, day type).
- Allow adding/removing planned sessions; each session has type + duration.
- After save, navigate to day-view showing calculated targets.

**Acceptance criteria**
- When the user saves, the app navigates to the day-view (DayTargetsPanel) and shows a "calculated at" timestamp.
- The day-view includes access to a "calculation details" panel exposing:
  - TDEE source used, value, confidence
  - adjustment multipliers breakdown
  - fixed deductions applied for points

### 6.2 Targets view (Day-view component)
**Must**
- Display as a reusable `DayTargetsPanel` component that shows:
  - Title and date label
  - Day type badge (color-coded: performance=blue, fatburner=orange, metabolize=emerald)
  - Three meal cards (breakfast/lunch/dinner) showing:
    - Individual meal point totals
    - Carb/protein/fat points per meal (color-coded: carbs=orange, protein=purple, fats=slate)
    - Fruit and veggie grams allocated per meal (based on meal ratios)
  - Summary stats bar showing:
    - Total points across all meals
    - Total fruit grams
    - Total veggies grams
    - Water target in liters (if provided)
- Support compact mode for use in comparison views
- Allow optional helper text for context (e.g., "This is your plan for today")

**Acceptance criteria**
- Meal points shown match the stored values in `daily_logs` (not recomputed on render).
- All points values are multiples of 5.
- Fruit and veg grams are distributed across meals using the meal ratios (breakfast/lunch/dinner percentages).
- The day type badge uses the correct color scheme and label.
- Component can be used in multiple contexts (daily targets, plan projection, historical view).

### 6.3 History views
**Must**
- Weight chart with date ranges (7/30/90/all) and trendline.
- Display `estimatedTDEE` and confidence over the same range.
- Planned vs actual training summary.
- Daily log detail modal showing:
  - DayTargetsPanel for that historical date (compact mode)
  - Morning inputs (weight, sleep, RHR, etc.)
  - Planned vs actual training sessions
  - Calculation details (TDEE, multipliers) at time of calculation

**Acceptance criteria**
- Trendline rate uses the same regression approach as adaptive TDEE weight trend logic.
- Selecting a date opens a log details modal that displays stored inputs, sessions, and targets using DayTargetsPanel.
- Historical DayTargetsPanel uses stored `calculatedTargets` from database, preserving the calculation as it was performed on that date.

### 6.4 Plan views
**Must**
- Plan creation form (goal weight, duration weeks, start date).
- Plan overview with weekly target table and plan vs projection chart.
- Recalibration prompt only when needed.

**Acceptance criteria**
- The plan overview clearly labels “Plan projection” vs “Current trend projection.”
- Recalibration options show a short feasibility tag and the implied new parameter (kcal, weeks, or goal). fileciteturn1file17

---

## 7. Persistence (SQLite reference schema)

The SQLite schema from the base PRD remains the reference and is compatible with the acceptance criteria above. fileciteturn1file17

---

## Appendix A. Canonical Calculation References (Do Not Change)

This appendix lists the “must remain identical” constants and formulas.

### A.1 Meal points constants
- Fruit carbs: 10% by weight
- Veg carbs: 3% by weight
- Maltodextrin carbs: 96% by weight (performance only)
- Collagen protein: 90% by weight
- Whey protein: 88% by weight (performance only)
- Multipliers: carbs 1.15, protein 4.35, fat 3.5
- Rounding: nearest 5

### A.2 Fruit/veg caps
- maxFruitFromCarbs = totalCarbsG*0.3 / 0.10
- maxVeggiesFromCarbs = totalCarbsG*0.1 / 0.03
- fatburner fruit multiplier: 0.7
- rounding: nearest 5g

### A.3 Weight change constant
- weeklyCalorieBalance = weeklyChangeKg * 7700

---

## Appendix B. Implementation Notes (Optional)

If implementing the “improved daily targets” pipeline in a Go domain package, keep constants and behavior aligned with this PRD. The current reference includes:
- multiple BMR equation options
- MET-based exercise calories with net MET subtraction (avoid double counting)
- protein recommendation ranges and fat floor
- goal-based deficit/surplus caps

Reference: calculations_improved.md. fileciteturn1file6
---

## Appendix C. Day-View Component Implementation Reference

The DayTargetsPanel component implementation provides a canonical display format for daily meal targets.

### C.1 Component Structure
```typescript
interface DayTargetsPanelProps {
  title: string;
  dateLabel: string;
  dayType: DayType;
  mealTargets: MealTargets;
  mealRatios: MealRatios;
  totalFruitG: number;
  totalVeggiesG: number;
  waterL?: number;
  compact?: boolean;
  helperText?: string;
}
```

### C.2 Fruit/Veg Distribution Algorithm
The component distributes total fruit and vegetables across meals using this algorithm:

```typescript
function splitTarget(total: number, ratios: MealRatios) {
  const breakfast = Math.max(0, Math.round(total * ratios.breakfast));
  const lunch = Math.max(0, Math.round(total * ratios.lunch));
  // Dinner gets the remainder to ensure total is exact
  const dinner = Math.max(0, total - breakfast - lunch);
  
  return { breakfast, lunch, dinner };
}
```

This ensures:
- No floating point errors accumulate
- Total always sums exactly to the input
- Dinner absorbs any rounding discrepancies

### C.3 Usage Contexts
The DayTargetsPanel is used in:
1. **Today's targets** - After daily check-in calculation
2. **Historical day view** - When viewing a past date's log details
3. **Plan comparison** - Side-by-side showing plan week vs actual
4. **Recalibration preview** - Showing projected targets under different scenarios

### C.4 Styling Constants (Canonical)
All instances must use these exact Tailwind classes for consistency:

**Day Type Badges:**
```typescript
const DAY_TYPE_BADGE: Record<DayType, { label: string; className: string }> = {
  performance: { 
    label: 'Performance', 
    className: 'bg-blue-900/40 text-blue-300 border-blue-800' 
  },
  fatburner: { 
    label: 'Fatburner', 
    className: 'bg-orange-900/40 text-orange-300 border-orange-800' 
  },
  metabolize: { 
    label: 'Metabolize', 
    className: 'bg-emerald-900/40 text-emerald-300 border-emerald-800' 
  },
};
```

**Macro Color Coding:**
- Carbs: `text-orange-400`
- Protein: `text-purple-400`
- Fats: `text-slate-300`

**Fruit/Veg Color Coding:**
- Fruit: `text-green-400`
- Vegetables: `text-emerald-400`

### C.5 Accessibility Requirements
- All color coding must be supplemented with text labels
- Point totals and values must be readable without relying on color alone
- Compact mode must maintain minimum 11px font size for readability
- Interactive elements (if added) must have proper ARIA labels

