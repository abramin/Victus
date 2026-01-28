PRD: Victus Program Architect (Phased Migration)
Phase 1: Data Architecture & "Pattern" Logic
Objective: Replace static set/rep inputs with a recursive JSON structure capable of "Pattern-Based" automated progression.

Pattern-Based Strength (5x5):

Define a ProgressionPattern object.

Variables: base_weight, increment_unit (e.g., 2.5kg), success_threshold (e.g., all 5 sets completed), and deload_frequency.

Logic: The system must calculate the next session's targets dynamically based on the previous session's logged adherence.

Skill-Based Structure (GMB/Calimove):

Introduce TimeOnTension (TM) ranges instead of integer "Reps".

Variables: min_seconds, max_seconds, and rpe_target.

Phase 2: The "Block Constructor" UI
Objective: Transform the flat list view into a segmented "Session Flow" based on the GMB method.

The Segmented Canvas:

Divide the Session Builder into three distinct drop-zones: PREPARE, PRACTICE, and PUSH.

Drag-and-Drop Interaction:

Users drag exercise "Nodes" from the Library into these segments.

Prepare: Mobility and activation (e.g., Hip Circles, Wrist Prep).

Practice: Skill acquisition and technical transitions (e.g., Bear to Monkey).

Push: Strength endurance and conditioning (e.g., Frogger, 3-Point Bridge).

Visual Continuity: Use a vertical "Signal Line" connecting the blocks to represent chronological flow.

Phase 3: High-Fidelity "Active Session" UI
Objective: Replicate the high-contrast, data-dense look of Calimove exercise cards within the Neural OS aesthetic.

The Calimove "Exercise Card" Component:

Header: Exercise Title + Set Tracker (e.g., "EX. 3 of 4").

Hero Zone: Large Image/GIF of the move.

Data Overlay:

TM (Target Minutes): Display as a prominent range (e.g., "30-80 TM").

RPE Dial: A semi-circular gauge in the corner (1–10 scale).

Control Bar: A footer containing the active timer (seconds) and a "Hold" or "Done" button.

The "Rest" Intervention:

Implement full-screen "Rest" states between sets (e.g., "REST FOR 90 SEC").

Visual: Bright green high-contrast bar with a countdown timer.

Phase 4: The "Ghost Load" Simulator
Objective: Provide visual feedback on how a custom program will impact the user's weekly fatigue.

Predictive Load Visualization:

As the user adjusts "Intensity" sliders (Step 3), the Body Map should glow in real-time to show expected soreness zones.

Auto-Regulation Warnings:

If a user schedules three "RPE 9" days in a row, the UI must trigger a "Neural Overload" warning badge.