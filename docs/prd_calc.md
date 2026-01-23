# Victus PRD – Macro Units, Points, and Display Mode

## 1. Purpose

This document defines how macros, points, grams, and totals are represented and displayed in the Victus app.

The goal is to eliminate invalid aggregates (e.g. “Total Points”), ensure conceptual correctness, and guarantee consistency across all screens.

---

## 2. Core Concepts

### 2.1 Macros

Victus tracks three primary macros:

- Protein
- Fat
- Carbohydrates

Each macro has:
- A daily target
- Per-meal allocations
- A calorie contribution

---

### 2.2 Points

- Points are **macro-specific units**
- Points from different macros are **not interchangeable**
- Points must **never be summed across macros**

Examples:

- 100 Protein points may correspond to:
  - 100g chicken
  - 150g cottage cheese
  - 250g yogurt
  - 400g cooked lentils

- 100 Fat points may correspond to:
  - 50g nuts
  - 5 tsp olive oil

Therefore:
- `Protein points ≠ Fat points ≠ Carb points`
- A global “Total Points” value is meaningless and invalid

---

### 2.3 Grams

- Each macro also has a gram representation:
  - Protein in grams
  - Fat in grams
  - Carbohydrates in grams
- Gram values are mathematically equivalent to points for a given day
- Points and grams are two views over the same underlying data

---

### 2.4 Calories (Global Total)

- Calories are the **only valid cross-macro aggregate**
- Total daily calories must be identical regardless of:
  - Points view
  - Grams view
- Calories are always shown in summaries

---

## 3. Display Mode

### 3.1 Global Setting

The app has a single global display mode:

```ts
displayMode = "points" | "grams"
Configured in Settings only
No per-screen or per-meal overrides
Applies immediately across the entire app
3.2 Display Modes
Points Mode
Example daily plan:
Protein: 500 P
Fat: 200 F
Carbs: 400 C
Rules:
Points are shown per macro only
Macro prefix is mandatory (P, F, C)
No summed point totals exist
Grams Mode
Same plan:
Protein: 200 g
Fat: 80 g
Carbs: 200 g
Rules:
Values reconcile exactly with Points mode
Calories remain unchanged
4. Fruits and Vegetables
Fruits and vegetables are always displayed in grams
They are deducted from the carbohydrate budget
Deduction uses the existing carb-calculation formula
There are:
No fruit points
No vegetable points
No separate fruit/veg totals
5. Consistency Rules (Critical)
For a given day, the following must always reconcile exactly:
Meal view
Daily update
Plan view
Plan-day view
This must hold true in both:
Points mode
Grams mode
Invariant values:
Macro allocations
Fruit/vegetable carb deductions
Total calories
6. Explicit Non-Goals
The app must not:
Show a “Total Points” value anywhere
Sum points across macros
Convert points between macros
Show mixed units on the same screen
7. Data and Architecture Rules
Single source of truth
Macro allocation is stored in one canonical internal format
Display mode is a pure presentation concern
No mutation on toggle
Switching display mode never alters stored data
Labeling
Points always include macro prefix
Grams always include g
8. Acceptance Criteria
No UI or API exposes a global “Total Points”
Switching display mode updates all screens immediately
Calories are identical in Points and Grams modes
Fruits and vegetables consistently reduce carb allocation
All screens reconcile after toggling display mode
9. Migration Notes (If Needed)
Any existing stored “total points” values must be ignored or removed
UI components assuming a global points total must be refactored
Existing user plans must display identically after migration