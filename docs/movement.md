This PRD outlines the architecture for the **Victus Adaptive Movement Engine**, transforming the app from a static program tracker into a biometric-aware coach that synthesizes workouts in real-time based on your "Neural Battery" (CNS Status) and joint integrity.

---

# PRD: Victus Adaptive Movement Engine

## 1. Executive Summary

**Objective:** To provide a "Smart Fill" capability for training gaps where the system generates custom, ability-appropriate sessions using a **Movement Taxonomy**. The engine adapts difficulty based on CNS readiness and implements real-time form correction via Ollama based on user feedback.

---

## 2. Core Components

### 2.1 The Movement Taxonomy (The "Ingredient" Library)

To enable adaptive generation, every exercise is treated as a "Move Ingredient" with specific metadata.

**JSON Schema Definition:**

```json
{
  "movements": [
    {
      "id": "gmb_bear_crawl",
      "name": "Bear Crawl",
      "category": "Locomotion",
      "tags": ["GMB", "Elements"],
      "difficulty": 3,
      "primary_load": "Shoulder/Core",
      "joint_stress": { "wrist": 0.7, "shoulder": 0.4 },
      "progression_id": "locomotion_linear"
    },
    {
      "id": "cali_muscle_up",
      "name": "Muscle Up",
      "category": "Power",
      "tags": ["CaliMove", "Advanced"],
      "difficulty": 9,
      "primary_load": "Upper Pull/Push",
      "joint_stress": { "elbow": 0.8, "shoulder": 0.7 },
      "progression_id": "pull_vertical"
    }
  ]
}

```

### 2.2 The CNS "Neural Battery" UI Widget

Before a session starts, the user is presented with their **Neural Readiness**. This widget determines the "Intensity Ceiling" for the adaptive generator.

* **Visual:** A vertical, glowing battery icon or a circular "Neural Gauage".
* **Logic:**
* **Green (80-100%):** "CNS Primed. High-intensity power blocks enabled."
* **Amber (50-79%):** "Nervous System Taxed. Capping RPE at 7. Focus on Skill Flow."
* **Red (<50%):** "Recovery Required. Suggesting Active Recovery/Mobility session."



---

## 3. Ollama "Form Correction" Protocol

When a user provides an **Echo Log** (voice or text) stating they struggled with a move (e.g., *"My lower back arched during the leg raises"*), Ollama triggers a **Tactical Correction**.

**System Prompt for Ollama:**

> "You are the Victus Movement Specialist. A user reported a technical failure: {{user_input}} during {{exercise_name}}.
> **Instructions:** > 1. Identify the likely mechanical error (e.g., lack of core bracing).
> 2. Provide a 1-sentence 'Cue' for the next session (e.g., 'Pin your lower back to the floor').
> 3. Suggest a 1-level 'Regression' from the Movement Taxonomy if the failure was due to strength (e.g., 'Switch to Knee-Tucks')."

---

## 4. Adaptive Implementation Logic

| Feature | Trigger | Adaptive Action |
| --- | --- | --- |
| **Joint Guard** | `joint_integrity < 0.5` | Automatically filters out exercises in the Taxonomy with high stress on that joint. |
| **Fuel Link** | Workout Saved | Updates the **Kitchen Fuel Budget** by adding `Active Burn` (Load Score × Weight × 0.25). |
| **Progression** | 3 Successful Sessions | Increments the `difficulty` level for that specific movement ID in the user's profile. |

---

## 5. UI Ergonomics & Navigation

* **Pre-Workout:** Show the **Neural Battery** alongside the session duration selector.
* **During Workout:** High-density "Next Move" cards that display the **Ollama Cue** (Form Correction) from the previous session.
* **Post-Workout:** **Echo Logging** prompt to capture "Tactical Sensation" data for the Body Map.

---

{
  "movements": [
    { "id": "gmb_bear", "name": "Bear Crawl", "category": "Locomotion", "difficulty": 3, "joint_stress": { "wrist": 0.7, "shoulder": 0.4 }, "progression_id": "loco_01" },
    { "id": "gmb_monkey", "name": "Sideways Monkey", "category": "Locomotion", "difficulty": 4, "joint_stress": { "wrist": 0.6, "ankle": 0.5 }, "progression_id": "loco_02" },
    { "id": "gmb_frogger", "name": "Frogger", "category": "Locomotion", "difficulty": 4, "joint_stress": { "wrist": 0.8, "knee": 0.4 }, "progression_id": "loco_03" },
    { "id": "cali_pushup_knees", "name": "Knee Push-ups", "category": "Push", "difficulty": 2, "joint_stress": { "wrist": 0.4, "elbow": 0.3 }, "progression_id": "push_horiz_01" },
    { "id": "cali_pushup_std", "name": "Standard Push-up", "category": "Push", "difficulty": 4, "joint_stress": { "wrist": 0.6, "elbow": 0.4 }, "progression_id": "push_horiz_02" },
    { "id": "cali_dips_bench", "name": "Bench Dips", "category": "Push", "difficulty": 3, "joint_stress": { "shoulder": 0.7, "elbow": 0.5 }, "progression_id": "push_vert_01" },
    { "id": "cali_dips_pbar", "name": "Parallel Bar Dips", "category": "Push", "difficulty": 6, "joint_stress": { "shoulder": 0.8, "elbow": 0.6 }, "progression_id": "push_vert_02" },
    { "id": "cali_pullup_neg", "name": "Negative Pull-ups", "category": "Pull", "difficulty": 4, "joint_stress": { "elbow": 0.6, "shoulder": 0.4 }, "progression_id": "pull_vert_01" },
    { "id": "cali_pullup_std", "name": "Standard Pull-up", "category": "Pull", "difficulty": 6, "joint_stress": { "elbow": 0.5, "shoulder": 0.4 }, "progression_id": "pull_vert_02" },
    { "id": "cali_rows_inv", "name": "Inverted Rows", "category": "Pull", "difficulty": 3, "joint_stress": { "elbow": 0.3, "shoulder": 0.2 }, "progression_id": "pull_horiz_01" },
    { "id": "cali_rows_arch", "name": "Archer Rows", "category": "Pull", "difficulty": 7, "joint_stress": { "elbow": 0.7, "shoulder": 0.6 }, "progression_id": "pull_horiz_02" },
    { "id": "cali_squat_air", "name": "Air Squat", "category": "Legs", "difficulty": 2, "joint_stress": { "knee": 0.3, "ankle": 0.2 }, "progression_id": "legs_01" },
    { "id": "cali_squat_pistol", "name": "Pistol Squat", "category": "Legs", "difficulty": 8, "joint_stress": { "knee": 0.8, "ankle": 0.7 }, "progression_id": "legs_02" },
    { "id": "cali_lunge_std", "name": "Reverse Lunge", "category": "Legs", "difficulty": 3, "joint_stress": { "knee": 0.4, "hip": 0.2 }, "progression_id": "legs_03" },
    { "id": "cali_plank_elbow", "name": "Elbow Plank", "category": "Core", "difficulty": 2, "joint_stress": { "lower_back": 0.4 }, "progression_id": "core_01" },
    { "id": "cali_hollow_body", "name": "Hollow Body Hold", "category": "Core", "difficulty": 5, "joint_stress": { "lower_back": 0.6 }, "progression_id": "core_02" },
    { "id": "cali_leg_raises", "name": "Hanging Leg Raises", "category": "Core", "difficulty": 7, "joint_stress": { "shoulder": 0.5, "lower_back": 0.4 }, "progression_id": "core_03" },
    { "id": "cali_lsit_floor", "name": "Floor L-Sit", "category": "Core", "difficulty": 8, "joint_stress": { "wrist": 0.9, "elbow": 0.4 }, "progression_id": "core_04" },
    { "id": "cali_pike_press", "name": "Pike Push-up", "category": "Push", "difficulty": 6, "joint_stress": { "shoulder": 0.7, "wrist": 0.7 }, "progression_id": "push_ovh_01" },
    { "id": "cali_handstand_wall", "name": "Wall Handstand", "category": "Skill", "difficulty": 7, "joint_stress": { "wrist": 0.9, "shoulder": 0.6 }, "progression_id": "skill_01" }
  ]
}