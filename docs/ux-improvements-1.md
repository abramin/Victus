Here is the synchronized **UX Design Specification (v2.0)**. This document resolves all previous contradictions and consolidates the "Task-Centric" architecture, incorporating the new Kitchen, Today, Strategy, and Schedule views with their specific visualizations.

---

# Victus UX Specification v2.0

**Design Philosophy:** Task-Centric Architecture.
**Core Principle:** Separate "Planning" (Strategy) from "Doing" (Execution).

## 1. Global Navigation & Site Map

The application is reorganized into four distinct modes to match user intent:

| View Name | Old Name | User Goal | Primary Content |
| --- | --- | --- | --- |
| **Today** | Daily Update | **"Status Check"** | Biometrics, Training Log, Activity/Deficit Monitor. |
| **Kitchen** | Meal Points | **"Execution"** | Meal Targets, Supplements, Food Reference (Interactive). |
| **Strategy** | Plan | **"The War Room"** | Long-term Progress, Plan vs. Reality, Weekly Roadmap. |
| **Schedule** | Calendar | **"Tactics"** | Monthly View, Carb Cycling Rhythm, Macro Visuals. |
| **History** | History | **"Analysis"** | Weight Trend, TDEE Analysis, Long-term Adherence. |

---

## 2. View: Today (The Command Center)

**Purpose:** The daily "Home Base" for inputs (morning) and status tracking (all day).

### 2.1 Layout Structure (Vertical Flow)

1. **Top Row: Context & Biometrics**
* **Morning Check-in:** Compact card showing Weight, Sleep Quality, RHR.
* **Day Type Badge:** Prominent display (e.g., `[ 🔥 Fatburner ]`) with a sub-label explaining the strategy (e.g., "Low carbs for rest day").
* **Smart Suggestion (Logic):** If Recovery < 45%, display a "Strategy Warning" suggesting a switch to *Metabolize* or *Rest*.


2. **Middle Row: Training Log**
* **Prospective Mode (Morning):** Shows planned sessions (e.g., "Qigong 30m").
* **Retrospective Mode (Evening/Post-Workout):** "Log Workout" card.
* **Interaction:** "Quick Complete" button to mark planned sessions as done. Slider for RPE (Intensity) with real-time **Load Score** calculation.


3. **Bottom Row: Activity Monitor (The Deficit Gauge)**
* **Visualization:** **Bullet Chart** (Target vs Actual).
* **Background Bar (Grey):** Target Active Calories (from Planned METs).
* **Foreground Bar (Blue):** Actual Active Calories (Garmin API).
* **Marker (Red Line):** Minimum threshold to secure deficit.
* **Animation:** Bar grows on load; "Pulses" if deficit is at risk in the evening.



---

## 3. View: Kitchen (The Execution Hub)

**Purpose:** A dedicated tool for meal preparation. Combines "Targets" with "Tools".

### 3.1 Layout Structure (Split Screen)

#### **Left Column: The Targets**

* **Context:** Simplified Day Type Badge.
* **Meal Cards (Breakfast / Lunch / Dinner):**
* **Visual:** **Progress Bar** for Points (e.g., `[=====--] 210/250 pts`).
* **Data:** Points (Primary), Calories (Secondary - e.g., "~650 kcal"), Macro Grams (Tertiary).
* *Note:* No activity data here. Purely food.


* **Supplements Card:** Toggles for Whey, Collagen, Intra-workout.

#### **Right Column: The Food Library (New)**

* **Search & Filter:** `[Search...] [Carb] [Prot] [Fat] [Veg]`.
* **The List:** Scrollable list of approved foods (from CSV source).
* **Sticky Header: The "Portion Visualizer":**
* **Component:** **Interactive Pie Chart** (Recharts/Nivo).
* **Behavior:** When a user hovers/clicks a food (e.g., "Chicken"), the pie chart animates to show the **Plate Multiplier**:
* **Quarter Plate (0.25):** 90° slice fills.
* **Half Plate (0.50):** 180° slice fills.
* **Full Plate (1.0):** Full circle fills.


* **Why:** Connects abstract "Points" to physical "Plate Real Estate."



---

## 4. View: Strategy (The War Room)

**Purpose:** High-level Plan Overview. Focuses on Weight & Time.

### 4.1 Components

1. **Plan Status Card:**
* Visual Timeline: `[Start] ---- [You Are Here] ---- [Goal]`.
* Metrics: "Weeks Remaining," "Kg Lost," "Variance %."


2. **Plan vs. Reality Chart (Dual-Track):**
* **Line 1 (Grey Dashed):** The Ideal Linear Plan.
* **Line 2 (Blue Solid):** Actual Smoothed Weight Trend.
* **Shaded Area:** **"Cone of Uncertainty"** (Tolerance Zone, e.g., ±3%).
* *Logic:* If Blue Line exits Shaded Area -> Trigger Recalibration Alert.


3. **Weekly Roadmap (Accordion Table):**
* **Rows:** One row per week (W1, W2... W12).
* **Columns:** Status (Done/Current/Future), Target Weight, Calorie Budget.
* **Interaction:** Click row to expand details (Specific Macro Ratios for that phase).


4. **Recalibration Modal (Conditional):**
* Only appears if `recalibrationNeeded=true`.
* **UX:** Presents "Trade-offs" rather than just a button.
* Option A: **Harder** (Lower Calories, Same Date).
* Option B: **Longer** (Same Calories, Later Date).
* Option C: **Easier** (Revise Goal Weight).





---

## 5. View: Schedule (The Tactical Calendar)

**Purpose:** Monthly view for visualizing the "Macro Rhythm" (Carb Cycling).

### 5.1 The Grid Layout

* **Standard Calendar:** Month view grid.
* **Visual Logic (The "Heatmap"):**
* **Fatburner Days:** Cell background tinted **Faint Orange**.
* **Performance Days:** Cell background tinted **Faint Blue**.
* **Metabolize Days:** Cell background tinted **Faint Green**.
* *Result:* User sees the "Wave" pattern of the month instantly.



### 5.2 Cell Content: The Macro Donut

* **Visualization:** **Mini Donut Chart** (Recharts/Nivo) inside *every* cell.
* **Segments:**
* **Orange:** Carbs % (Visually dominant on Perf days).
* **Purple:** Protein %.
* **Grey:** Fats %.


* **Center Label:** Date Number.
* **Interaction:** Clicking a cell triggers a **Layout Animation** (Framer Motion) expanding the cell to show the specific grams/calories for that day.

---

## 6. Technical Implementation Summary

| Feature | Recommended Library | Data Source |
| --- | --- | --- |
| **Macro Donuts** (Schedule) | `Recharts` (`<PieChart>`) or `Nivo` (`<ResponsivePie>`) | `WeeklyTargets` (derived) |
| **Portion Plate** (Kitchen) | `Recharts` (`<Pie>`) | `FoodCSV` (`Plate_Multiplier`) |
| **Activity Bullet** (Today) | `Nivo` (`<Bullet>`) or CSS Grid | `Garmin` vs `PlannedMETs` |
| **Plan Chart** (Strategy) | `Recharts` (`<ComposedChart>` Area + Line) | `PlanHistory` vs `WeightTrend` |
| **Cell Expansion** (Schedule) | `Framer Motion` (`layoutId` prop) | UI State |
| **Recalibration Modal** | `Framer Motion` (`<AnimatePresence>`) | `PlanAnalysis` Logic |

This document supersedes previous separate discussions. Use this as the definitive blueprint for the "Kitchen," "Today," "Strategy," and "Schedule" views.