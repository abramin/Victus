package db

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// RunMigrations applies all database migrations.
// This function is idempotent - safe to run multiple times.
func RunMigrations(db *sql.DB) error {
	// Enable foreign key enforcement (SQLite disables by default)
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	migrations := []string{
		createUserProfileTable,
		createDailyLogsTable,
		createTrainingConfigsTable,
		createTrainingSessionsTable,
		createPlannedDayTypesTable,
		createFoodReferenceTable,
		createNutritionPlansTable,
		createWeeklyTargetsTable,
		// Adaptive Load & Body Map feature
		createMuscleGroupsTable,
		createTrainingArchetypesTable,
		createMuscleFatigueTable,
		createFatigueEventsTable,
		// Training Program Management feature
		createTrainingProgramsTable,
		createProgramWeeksTable,
		createProgramDaysTable,
		createProgramInstallationsTable,
		// Metabolic Flux Engine feature
		createMetabolicHistoryTable,
		// Garmin Data Ingestion feature
		createMonthlySummariesTable,
		// Semantic Body (Phase 4) - body part issues from workout notes
		createBodyPartIssuesTable,
	}

	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
		}
	}

	// Run ALTER TABLE migrations separately to handle "duplicate column" errors gracefully
	alterMigrations := []string{
		addBMREquationColumn,
		addBodyFatPercentColumn,
		addCurrentWeightColumn,
		addTimeframeWeeksColumn,
		// Supplement columns (Issue #32)
		addMaltodextrinColumn,
		addWheyColumn,
		addCollagenColumn,
		// EAA columns deprecated - kept for backward compatibility with existing databases
		// addEAAMorningColumn,
		// addEAAEveningColumn,
		// TDEE source columns (Issue #8 - Adaptive TDEE)
		addTDEESourceColumn,
		addManualTDEEColumn,
		addTDEESourceUsedColumn,
		addTDEEConfidenceColumn,
		addDataPointsUsedColumn,
		addFormulaTDEEColumn,
		// Recalibration tolerance (Issue #12 - Settings UI)
		addRecalibrationToleranceColumn,
		// Active calories burned for Deficit Protection feature
		addActiveCaloriesBurnedColumn,
		// Steps count for Victus Sync (HealthKit integration)
		addStepsColumn,
		// Plan name column for user-defined plan names
		addPlanNameColumn,
		// Daily log notes for LLM pattern recognition
		addDailyLogNotesColumn,
		// Fasting protocol (Intermittent Fasting feature)
		addFastingProtocolColumn,
		addEatingWindowStartColumn,
		addEatingWindowEndColumn,
		addFastingOverrideColumn,
		addFastedItemsKcalColumn,
		// Adaptive Load & Body Map feature
		addArchetypeIDColumn,
		// HRV-based CNS Auto-Regulation feature
		addHRVColumn,
		// Macro Tetris Solver feature - nutritional data
		addProteinGPer100Column,
		addCarbsGPer100Column,
		addFatGPer100Column,
		addServingUnitColumn,
		addServingSizeGColumn,
		addIsPantryStapleColumn,
		// Consumed macros tracking (Macro Tetris Solver - meal logging)
		addConsumedCaloriesColumn,
		addConsumedProteinGColumn,
		addConsumedCarbsGColumn,
		addConsumedFatGColumn,
		// Per-meal consumed macros tracking (Kitchen sync feature)
		addBreakfastConsumedKcalColumn,
		addBreakfastConsumedProteinColumn,
		addBreakfastConsumedCarbsColumn,
		addBreakfastConsumedFatColumn,
		addLunchConsumedKcalColumn,
		addLunchConsumedProteinColumn,
		addLunchConsumedCarbsColumn,
		addLunchConsumedFatColumn,
		addDinnerConsumedKcalColumn,
		addDinnerConsumedProteinColumn,
		addDinnerConsumedCarbsColumn,
		addDinnerConsumedFatColumn,
	}

	for _, migration := range alterMigrations {
		if _, err := db.Exec(migration); err != nil {
			// Ignore "duplicate column name" errors (column already exists)
			if !strings.Contains(err.Error(), "duplicate column name") {
				return fmt.Errorf("alter migration failed: %w", err)
			}
		}
	}

	// Migrate existing single training data to sessions table (idempotent via INSERT OR IGNORE)
	if _, err := db.Exec(migrateTrainingToSessions); err != nil {
		return fmt.Errorf("training sessions data migration failed: %w", err)
	}

	// Fix unique constraint on training_sessions to include is_planned (Issue #31 fix)
	// This is needed for existing databases that have the old constraint
	if err := migrateTrainingSessionsConstraint(db); err != nil {
		return fmt.Errorf("training sessions constraint migration failed: %w", err)
	}

	// Update nutrition plan status values to use "abandoned" instead of "cancelled"
	if err := migratePlanStatusCancelledToAbandoned(db); err != nil {
		return fmt.Errorf("nutrition plan status migration failed: %w", err)
	}

	// Seed nutritional data for Macro Tetris Solver feature
	if err := seedFoodNutritionalData(db); err != nil {
		return fmt.Errorf("food nutritional data migration failed: %w", err)
	}

	return nil
}

const createUserProfileTable = `
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    height_cm REAL NOT NULL,
    birth_date TEXT NOT NULL,
    sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
    goal TEXT NOT NULL CHECK (goal IN ('lose_weight', 'maintain', 'gain_weight')),
    target_weight_kg REAL NOT NULL,
    target_weekly_change_kg REAL NOT NULL,
    carb_ratio REAL NOT NULL DEFAULT 0.45,
    protein_ratio REAL NOT NULL DEFAULT 0.30,
    fat_ratio REAL NOT NULL DEFAULT 0.25,
    breakfast_ratio REAL NOT NULL DEFAULT 0.30,
    lunch_ratio REAL NOT NULL DEFAULT 0.30,
    dinner_ratio REAL NOT NULL DEFAULT 0.40,
    carb_multiplier REAL NOT NULL DEFAULT 1.15,
    protein_multiplier REAL NOT NULL DEFAULT 4.35,
    fat_multiplier REAL NOT NULL DEFAULT 3.5,
    fruit_target_g REAL NOT NULL DEFAULT 600,
    veggie_target_g REAL NOT NULL DEFAULT 500,
    bmr_equation TEXT NOT NULL DEFAULT 'mifflin_st_jeor',
    body_fat_percent REAL,
    tdee_source TEXT NOT NULL DEFAULT 'formula',
    manual_tdee REAL DEFAULT 0,
    recalibration_tolerance REAL NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    CHECK (abs((carb_ratio + protein_ratio + fat_ratio) - 1.0) < 0.01),
    CHECK (abs((breakfast_ratio + lunch_ratio + dinner_ratio) - 1.0) < 0.01)
);
`

const createDailyLogsTable = `
CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date TEXT UNIQUE NOT NULL,
    weight_kg REAL NOT NULL,
    body_fat_percent REAL,
    resting_heart_rate INTEGER,
    sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 100),
    sleep_hours REAL,

    -- Planned training
    planned_training_type TEXT NOT NULL,
    planned_duration_min INTEGER NOT NULL,

    -- Calculated outputs (stored for history)
    total_carbs_g INTEGER,
    total_protein_g INTEGER,
    total_fats_g INTEGER,
    total_calories INTEGER,
    breakfast_carb_points INTEGER,
    breakfast_protein_points INTEGER,
    breakfast_fat_points INTEGER,
    lunch_carb_points INTEGER,
    lunch_protein_points INTEGER,
    lunch_fat_points INTEGER,
    dinner_carb_points INTEGER,
    dinner_protein_points INTEGER,
    dinner_fat_points INTEGER,
    fruit_g INTEGER,
    veggies_g INTEGER,
    water_l REAL,
    day_type TEXT,
    estimated_tdee INTEGER,
    formula_tdee INTEGER,

    -- Adaptive TDEE metadata (Issue #8)
    tdee_source_used TEXT DEFAULT 'formula',
    tdee_confidence REAL DEFAULT 0,
    data_points_used INTEGER DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    CHECK (weight_kg BETWEEN 30 AND 300),
    CHECK (body_fat_percent IS NULL OR body_fat_percent BETWEEN 3 AND 70),
    CHECK (resting_heart_rate IS NULL OR resting_heart_rate BETWEEN 30 AND 200),
    CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24),
    CHECK (planned_duration_min BETWEEN 0 AND 480)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date);
`

const createTrainingConfigsTable = `
CREATE TABLE IF NOT EXISTS training_configs (
    id INTEGER PRIMARY KEY,
    type TEXT UNIQUE NOT NULL CHECK(type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    met REAL NOT NULL DEFAULT 5.0,
    load_score REAL NOT NULL DEFAULT 3
);

-- Seed default training configs with MET values from 2024 Compendium of Physical Activities
INSERT OR IGNORE INTO training_configs (type, met, load_score) VALUES
    ('rest', 1.0, 0),
    ('qigong', 2.5, 0.5),
    ('walking', 3.5, 1),
    ('gmb', 4.0, 3),
    ('run', 9.8, 3),
    ('row', 7.0, 3),
    ('cycle', 6.8, 2),
    ('hiit', 12.8, 5),
    ('strength', 5.0, 5),
    ('calisthenics', 4.0, 3),
    ('mobility', 2.5, 0.5),
    ('mixed', 6.0, 4);
`

// ALTER TABLE migrations for existing databases (split for SQLite compatibility)
const addBMREquationColumn = `ALTER TABLE user_profile ADD COLUMN bmr_equation TEXT NOT NULL DEFAULT 'mifflin_st_jeor'`
const addBodyFatPercentColumn = `ALTER TABLE user_profile ADD COLUMN body_fat_percent REAL`
const addCurrentWeightColumn = `ALTER TABLE user_profile ADD COLUMN current_weight_kg REAL`
const addTimeframeWeeksColumn = `ALTER TABLE user_profile ADD COLUMN timeframe_weeks INTEGER DEFAULT 0`

// Supplement configuration columns (Issue #32)
const addMaltodextrinColumn = `ALTER TABLE user_profile ADD COLUMN maltodextrin_g REAL DEFAULT 0`
const addWheyColumn = `ALTER TABLE user_profile ADD COLUMN whey_g REAL DEFAULT 0`
const addCollagenColumn = `ALTER TABLE user_profile ADD COLUMN collagen_g REAL DEFAULT 0`
const addEAAMorningColumn = `ALTER TABLE user_profile ADD COLUMN eaa_morning_g REAL DEFAULT 0`
const addEAAEveningColumn = `ALTER TABLE user_profile ADD COLUMN eaa_evening_g REAL DEFAULT 0`

// TDEE source configuration columns (Issue #8 - Adaptive TDEE)
const addTDEESourceColumn = `ALTER TABLE user_profile ADD COLUMN tdee_source TEXT NOT NULL DEFAULT 'formula'`
const addManualTDEEColumn = `ALTER TABLE user_profile ADD COLUMN manual_tdee REAL DEFAULT 0`

// Recalibration tolerance (Issue #12 - Settings UI)
const addRecalibrationToleranceColumn = `ALTER TABLE user_profile ADD COLUMN recalibration_tolerance REAL NOT NULL DEFAULT 3`

// Adaptive TDEE metadata columns for daily_logs (Issue #8)
const addTDEESourceUsedColumn = `ALTER TABLE daily_logs ADD COLUMN tdee_source_used TEXT DEFAULT 'formula'`
const addTDEEConfidenceColumn = `ALTER TABLE daily_logs ADD COLUMN tdee_confidence REAL DEFAULT 0`
const addDataPointsUsedColumn = `ALTER TABLE daily_logs ADD COLUMN data_points_used INTEGER DEFAULT 0`
const addFormulaTDEEColumn = `ALTER TABLE daily_logs ADD COLUMN formula_tdee INTEGER`

// Active calories burned for Deficit Protection feature
const addActiveCaloriesBurnedColumn = `ALTER TABLE daily_logs ADD COLUMN active_calories_burned INTEGER`

// Steps count for Victus Sync (HealthKit integration)
const addStepsColumn = `ALTER TABLE daily_logs ADD COLUMN steps INTEGER`

// Plan name column for user-defined plan names (Single Source of Truth feature)
const addPlanNameColumn = `ALTER TABLE nutrition_plans ADD COLUMN name TEXT DEFAULT ''`

// Daily log notes column for LLM pattern recognition
const addDailyLogNotesColumn = `ALTER TABLE daily_logs ADD COLUMN notes TEXT DEFAULT ''`

// Fasting protocol columns (Intermittent Fasting feature)
const addFastingProtocolColumn = `ALTER TABLE user_profile ADD COLUMN fasting_protocol TEXT NOT NULL DEFAULT 'standard'`
const addEatingWindowStartColumn = `ALTER TABLE user_profile ADD COLUMN eating_window_start TEXT NOT NULL DEFAULT '08:00'`
const addEatingWindowEndColumn = `ALTER TABLE user_profile ADD COLUMN eating_window_end TEXT NOT NULL DEFAULT '20:00'`

// Daily log fasting override for "break fast early" feature
const addFastingOverrideColumn = `ALTER TABLE daily_logs ADD COLUMN fasting_override TEXT`
const addFastedItemsKcalColumn = `ALTER TABLE daily_logs ADD COLUMN fasted_items_kcal INTEGER DEFAULT 0`

// Adaptive Load & Body Map feature - archetype column for training sessions
const addArchetypeIDColumn = `ALTER TABLE training_sessions ADD COLUMN archetype_id INTEGER REFERENCES training_archetypes(id)`

// HRV-based CNS Auto-Regulation feature
const addHRVColumn = `ALTER TABLE daily_logs ADD COLUMN hrv_ms INTEGER`

// Macro Tetris Solver feature - nutritional data per food
const addProteinGPer100Column = `ALTER TABLE food_reference ADD COLUMN protein_g_per_100 REAL DEFAULT 0`
const addCarbsGPer100Column = `ALTER TABLE food_reference ADD COLUMN carbs_g_per_100 REAL DEFAULT 0`
const addFatGPer100Column = `ALTER TABLE food_reference ADD COLUMN fat_g_per_100 REAL DEFAULT 0`
const addServingUnitColumn = `ALTER TABLE food_reference ADD COLUMN serving_unit TEXT DEFAULT 'g'`
const addServingSizeGColumn = `ALTER TABLE food_reference ADD COLUMN serving_size_g REAL DEFAULT 100`
const addIsPantryStapleColumn = `ALTER TABLE food_reference ADD COLUMN is_pantry_staple BOOLEAN DEFAULT 0`

// Consumed macros tracking (Macro Tetris Solver - meal logging)
const addConsumedCaloriesColumn = `ALTER TABLE daily_logs ADD COLUMN consumed_calories INTEGER DEFAULT 0`
const addConsumedProteinGColumn = `ALTER TABLE daily_logs ADD COLUMN consumed_protein_g INTEGER DEFAULT 0`
const addConsumedCarbsGColumn = `ALTER TABLE daily_logs ADD COLUMN consumed_carbs_g INTEGER DEFAULT 0`
const addConsumedFatGColumn = `ALTER TABLE daily_logs ADD COLUMN consumed_fat_g INTEGER DEFAULT 0`

// Per-meal consumed macros tracking (Kitchen sync feature)
const addBreakfastConsumedKcalColumn = `ALTER TABLE daily_logs ADD COLUMN breakfast_consumed_kcal INTEGER DEFAULT 0`
const addBreakfastConsumedProteinColumn = `ALTER TABLE daily_logs ADD COLUMN breakfast_consumed_protein_g INTEGER DEFAULT 0`
const addBreakfastConsumedCarbsColumn = `ALTER TABLE daily_logs ADD COLUMN breakfast_consumed_carbs_g INTEGER DEFAULT 0`
const addBreakfastConsumedFatColumn = `ALTER TABLE daily_logs ADD COLUMN breakfast_consumed_fat_g INTEGER DEFAULT 0`
const addLunchConsumedKcalColumn = `ALTER TABLE daily_logs ADD COLUMN lunch_consumed_kcal INTEGER DEFAULT 0`
const addLunchConsumedProteinColumn = `ALTER TABLE daily_logs ADD COLUMN lunch_consumed_protein_g INTEGER DEFAULT 0`
const addLunchConsumedCarbsColumn = `ALTER TABLE daily_logs ADD COLUMN lunch_consumed_carbs_g INTEGER DEFAULT 0`
const addLunchConsumedFatColumn = `ALTER TABLE daily_logs ADD COLUMN lunch_consumed_fat_g INTEGER DEFAULT 0`
const addDinnerConsumedKcalColumn = `ALTER TABLE daily_logs ADD COLUMN dinner_consumed_kcal INTEGER DEFAULT 0`
const addDinnerConsumedProteinColumn = `ALTER TABLE daily_logs ADD COLUMN dinner_consumed_protein_g INTEGER DEFAULT 0`
const addDinnerConsumedCarbsColumn = `ALTER TABLE daily_logs ADD COLUMN dinner_consumed_carbs_g INTEGER DEFAULT 0`
const addDinnerConsumedFatColumn = `ALTER TABLE daily_logs ADD COLUMN dinner_consumed_fat_g INTEGER DEFAULT 0`

// Training sessions table for multiple sessions per day (Issue #31)
const createTrainingSessionsTable = `
CREATE TABLE IF NOT EXISTS training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_log_id INTEGER NOT NULL,
    session_order INTEGER NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT 1,
    training_type TEXT NOT NULL CHECK(training_type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 0 AND 480),
    perceived_intensity INTEGER CHECK (perceived_intensity IS NULL OR perceived_intensity BETWEEN 1 AND 10),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE,
    UNIQUE(daily_log_id, session_order, is_planned)
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_daily_log ON training_sessions(daily_log_id);
`

// Planned day types for weekly microcycle planning (Cockpit Dashboard feature)
const createPlannedDayTypesTable = `
CREATE TABLE IF NOT EXISTS planned_day_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_date TEXT UNIQUE NOT NULL,
    day_type TEXT NOT NULL CHECK (day_type IN ('performance', 'fatburner', 'metabolize')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_planned_day_types_date ON planned_day_types(plan_date);
`

// Food reference table for Kitchen Cheat Sheet (Cockpit Dashboard feature)
// Plate_Multiplier is used to convert macro points to plate portions
const createFoodReferenceTable = `
CREATE TABLE IF NOT EXISTS food_reference (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK (category IN ('high_carb', 'high_protein', 'high_fat')),
    food_item TEXT NOT NULL,
    plate_multiplier REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(category, food_item)
);

-- Seed initial food reference data
INSERT OR IGNORE INTO food_reference (category, food_item, plate_multiplier) VALUES
    -- High-Carb sources
    ('high_carb', 'Oats', 1.00),
    ('high_carb', 'Semolina', 1.00),
    ('high_carb', 'Quinoa/Amaranth', 1.00),
    ('high_carb', 'Chickpeas', 1.00),
    ('high_carb', 'Pumpkin Seeds', 1.00),
    ('high_carb', 'Brown Rice', 1.00),
    ('high_carb', 'Wholegrain Bread', 1.00),
    ('high_carb', 'Wholegrain Pasta', 1.00),
    ('high_carb', 'Rye Bread', 1.00),
    ('high_carb', 'Pita', 1.00),
    ('high_carb', 'Potatoes', 1.00),
    ('high_carb', 'Sweet Potatoes', 1.00),
    ('high_carb', 'Yams', 1.00),
    ('high_carb', 'Low-fat Milk', 1.00),
    -- High-Protein sources
    ('high_protein', 'Whey Protein', 0.25),
    ('high_protein', 'Low-fat Curd/Quark', 0.25),
    ('high_protein', 'Nutritional Yeast', 0.25),
    ('high_protein', 'Cottage Cheese', 0.25),
    ('high_protein', 'Spirulina', 0.25),
    ('high_protein', 'Egg White', 0.25),
    ('high_protein', 'Chicken/Turkey Breast', 0.25),
    ('high_protein', 'Tofu', 0.25),
    ('high_protein', 'Soy Milk', NULL),
    ('high_protein', 'Edamame', 0.25),
    ('high_protein', 'Salmon/Tuna/Perch', 0.25),
    ('high_protein', 'Lentils', 0.25),
    ('high_protein', 'Scampi/Prawns', 0.25),
    ('high_protein', 'Low-fat Yoghurt', 0.25),
    ('high_protein', 'Seitan', 0.25),
    ('high_protein', 'Low-fat Greek Yoghurt', 0.50),
    ('high_protein', 'Tempeh', 0.25),
    -- High-Fat sources
    ('high_fat', 'Flaxseed/Linseed Oil', 0.25),
    ('high_fat', 'Olive Oil', 0.25),
    ('high_fat', 'MCT Oil', 0.25),
    ('high_fat', 'Walnut Oil', 0.25),
    ('high_fat', 'Nuts', 0.25),
    ('high_fat', 'Sesame Seeds', 0.25),
    ('high_fat', 'Tahini', 0.25),
    ('high_fat', 'Nut Butter', 0.25),
    ('high_fat', 'Flax Seeds', 0.25),
    ('high_fat', 'Chia Seeds', 0.25),
    ('high_fat', 'Hempseeds', 0.25),
    ('high_fat', 'Avocado', 0.25);
`

// Migrate existing single training data to sessions table
const migrateTrainingToSessions = `
INSERT OR IGNORE INTO training_sessions (daily_log_id, session_order, is_planned, training_type, duration_min)
SELECT id, 1, 1, planned_training_type, planned_duration_min
FROM daily_logs
WHERE planned_training_type IS NOT NULL AND planned_training_type != '';
`

// Nutrition Plans table for long-term goal tracking (Issue #27)
const createNutritionPlansTable = `
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL,
    start_weight_kg REAL NOT NULL CHECK (start_weight_kg BETWEEN 30 AND 300),
    goal_weight_kg REAL NOT NULL CHECK (goal_weight_kg BETWEEN 30 AND 300),
    duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 4 AND 104),
    required_weekly_change_kg REAL NOT NULL,
    required_daily_deficit_kcal REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_status ON nutrition_plans(status);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_start_date ON nutrition_plans(start_date);
`

// Weekly Targets table for plan milestones (Issue #27)
const createWeeklyTargetsTable = `
CREATE TABLE IF NOT EXISTS weekly_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    projected_weight_kg REAL NOT NULL,
    projected_tdee INTEGER NOT NULL,
    target_intake_kcal INTEGER NOT NULL,
    target_carbs_g INTEGER NOT NULL,
    target_protein_g INTEGER NOT NULL,
    target_fats_g INTEGER NOT NULL,
    actual_weight_kg REAL,
    actual_intake_kcal INTEGER,
    days_logged INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (plan_id) REFERENCES nutrition_plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_weekly_targets_plan ON weekly_targets(plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_targets_dates ON weekly_targets(start_date, end_date);
`

// Muscle Groups table for body map visualization (Adaptive Load feature)
const createMuscleGroupsTable = `
CREATE TABLE IF NOT EXISTS muscle_groups (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    svg_path_id TEXT NOT NULL
);

-- Seed 15 muscle groups for body map
INSERT OR IGNORE INTO muscle_groups (id, name, display_name, svg_path_id) VALUES
    (1, 'chest', 'Chest', 'muscle-chest'),
    (2, 'front_delt', 'Front Delts', 'muscle-front-delt'),
    (3, 'triceps', 'Triceps', 'muscle-triceps'),
    (4, 'side_delt', 'Side Delts', 'muscle-side-delt'),
    (5, 'lats', 'Lats', 'muscle-lats'),
    (6, 'traps', 'Traps', 'muscle-traps'),
    (7, 'biceps', 'Biceps', 'muscle-biceps'),
    (8, 'rear_delt', 'Rear Delts', 'muscle-rear-delt'),
    (9, 'forearms', 'Forearms', 'muscle-forearms'),
    (10, 'quads', 'Quads', 'muscle-quads'),
    (11, 'glutes', 'Glutes', 'muscle-glutes'),
    (12, 'hamstrings', 'Hamstrings', 'muscle-hamstrings'),
    (13, 'calves', 'Calves', 'muscle-calves'),
    (14, 'lower_back', 'Lower Back', 'muscle-lower-back'),
    (15, 'core', 'Core/Abs', 'muscle-core');
`

// Training Archetypes table for workout pattern-based fatigue (Adaptive Load feature)
const createTrainingArchetypesTable = `
CREATE TABLE IF NOT EXISTS training_archetypes (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    muscle_coefficients TEXT NOT NULL
);

-- Seed 8 workout archetypes with muscle coefficients (JSON)
INSERT OR IGNORE INTO training_archetypes (id, name, display_name, muscle_coefficients) VALUES
    (1, 'push', 'Push', '{"chest":1.0,"front_delt":1.0,"triceps":0.7,"side_delt":0.7,"core":0.4}'),
    (2, 'pull', 'Pull', '{"lats":1.0,"traps":1.0,"biceps":0.7,"rear_delt":0.7,"forearms":0.4}'),
    (3, 'legs', 'Legs', '{"quads":1.0,"glutes":1.0,"hamstrings":0.7,"calves":0.7,"lower_back":0.4}'),
    (4, 'upper', 'Upper Body', '{"chest":0.7,"lats":0.7,"front_delt":0.7,"traps":0.5,"biceps":0.5,"triceps":0.5}'),
    (5, 'lower', 'Lower Body', '{"quads":0.8,"glutes":0.8,"hamstrings":0.8,"calves":0.6,"lower_back":0.4}'),
    (6, 'full_body', 'Full Body', '{"chest":0.5,"lats":0.5,"quads":0.5,"glutes":0.5,"front_delt":0.4,"hamstrings":0.4,"core":0.4}'),
    (7, 'cardio_impact', 'Cardio (Impact)', '{"calves":1.0,"hamstrings":1.0,"quads":0.7,"glutes":0.7,"core":0.4}'),
    (8, 'cardio_low', 'Cardio (Low Impact)', '{"quads":0.5,"glutes":0.5,"hamstrings":0.3,"calves":0.3}');
`

// Muscle Fatigue table for current fatigue state (Adaptive Load feature)
const createMuscleFatigueTable = `
CREATE TABLE IF NOT EXISTS muscle_fatigue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    muscle_group_id INTEGER NOT NULL,
    fatigue_percent REAL NOT NULL DEFAULT 0 CHECK (fatigue_percent BETWEEN 0 AND 100),
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id),
    UNIQUE(muscle_group_id)
);

CREATE INDEX IF NOT EXISTS idx_muscle_fatigue_muscle ON muscle_fatigue(muscle_group_id);
`

// Fatigue Events table for historical tracking (Adaptive Load feature)
const createFatigueEventsTable = `
CREATE TABLE IF NOT EXISTS fatigue_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    training_session_id INTEGER NOT NULL,
    archetype_id INTEGER NOT NULL,
    total_load REAL NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (training_session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (archetype_id) REFERENCES training_archetypes(id)
);

CREATE INDEX IF NOT EXISTS idx_fatigue_events_session ON fatigue_events(training_session_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_events_applied ON fatigue_events(applied_at);
`

// Training Programs table for structured training protocols (Program Management feature)
const createTrainingProgramsTable = `
CREATE TABLE IF NOT EXISTS training_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
    training_days_per_week INTEGER NOT NULL CHECK (training_days_per_week BETWEEN 1 AND 7),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    focus TEXT NOT NULL CHECK (focus IN ('hypertrophy', 'strength', 'conditioning', 'general')),
    equipment TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'template' CHECK (status IN ('template', 'draft', 'published')),
    is_template BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_training_programs_status ON training_programs(status);
CREATE INDEX IF NOT EXISTS idx_training_programs_difficulty ON training_programs(difficulty);
CREATE INDEX IF NOT EXISTS idx_training_programs_focus ON training_programs(focus);
`

// Program Weeks table for periodization structure (Program Management feature)
const createProgramWeeksTable = `
CREATE TABLE IF NOT EXISTS program_weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    label TEXT NOT NULL,
    is_deload BOOLEAN NOT NULL DEFAULT 0,
    volume_scale REAL NOT NULL DEFAULT 1.0 CHECK (volume_scale BETWEEN 0.3 AND 2.0),
    intensity_scale REAL NOT NULL DEFAULT 1.0 CHECK (intensity_scale BETWEEN 0.3 AND 2.0),
    FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
    UNIQUE(program_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_program_weeks_program ON program_weeks(program_id);
`

// Program Days table for training day templates (Program Management feature)
const createProgramDaysTable = `
CREATE TABLE IF NOT EXISTS program_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number >= 1),
    label TEXT NOT NULL,
    training_type TEXT NOT NULL CHECK(training_type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    duration_min INTEGER NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 15 AND 180),
    load_score REAL NOT NULL DEFAULT 3.0 CHECK (load_score BETWEEN 1 AND 5),
    nutrition_day TEXT NOT NULL DEFAULT 'performance' CHECK (nutrition_day IN ('performance', 'fatburner', 'metabolize')),
    notes TEXT,
    FOREIGN KEY (week_id) REFERENCES program_weeks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_program_days_week ON program_days(week_id);
`

// Program Installations table for user's active program (Program Management feature)
const createProgramInstallationsTable = `
CREATE TABLE IF NOT EXISTS program_installations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    week_day_mapping TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
    current_week INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (program_id) REFERENCES training_programs(id)
);

CREATE INDEX IF NOT EXISTS idx_program_installations_status ON program_installations(status);
CREATE INDEX IF NOT EXISTS idx_program_installations_program ON program_installations(program_id);
`

// Metabolic History table for Flux Engine audit trail (Metabolic Flux Engine feature)
const createMetabolicHistoryTable = `
CREATE TABLE IF NOT EXISTS metabolic_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_log_id INTEGER NOT NULL,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now')),

    -- TDEE Values
    calculated_tdee INTEGER NOT NULL,
    previous_tdee INTEGER,
    delta_kcal INTEGER,
    tdee_source TEXT NOT NULL CHECK (tdee_source IN ('flux', 'formula', 'manual')),

    -- Constraints Applied
    was_swing_constrained BOOLEAN NOT NULL DEFAULT 0,
    bmr_floor_applied BOOLEAN NOT NULL DEFAULT 0,
    adherence_gate_passed BOOLEAN NOT NULL DEFAULT 1,

    -- Calculation Metadata
    confidence REAL NOT NULL DEFAULT 0,
    data_points_used INTEGER NOT NULL DEFAULT 0,
    ema_weight_kg REAL,
    bmr_value REAL NOT NULL,

    -- Weekly Notification
    notification_pending BOOLEAN NOT NULL DEFAULT 0,
    notification_dismissed_at TEXT,

    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metabolic_history_log ON metabolic_history(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_metabolic_history_notification ON metabolic_history(notification_pending);
CREATE INDEX IF NOT EXISTS idx_metabolic_history_calculated_at ON metabolic_history(calculated_at);
`

// Monthly Summaries table for Garmin aggregate data import (Garmin Data Ingestion feature)
const createMonthlySummariesTable = `
CREATE TABLE IF NOT EXISTS monthly_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK(activity_type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    session_count INTEGER,
    total_calories INTEGER,
    avg_calories_per_session INTEGER,
    data_source TEXT NOT NULL,
    raw_activity_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(year_month, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_monthly_summaries_year_month ON monthly_summaries(year_month);
`

// Body Part Issues table for Semantic Body (Phase 4) - stores detected issues from workout notes
const createBodyPartIssuesTable = `
CREATE TABLE IF NOT EXISTS body_part_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    body_part TEXT NOT NULL,
    symptom TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 3),
    raw_text TEXT NOT NULL,
    session_id INTEGER REFERENCES training_sessions(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_body_part_issues_date ON body_part_issues(date);
CREATE INDEX IF NOT EXISTS idx_body_part_issues_body_part ON body_part_issues(body_part);
CREATE INDEX IF NOT EXISTS idx_body_part_issues_session ON body_part_issues(session_id);
`

// migrateTrainingSessionsConstraint fixes the unique constraint on training_sessions
// to include is_planned, allowing both planned and actual sessions with the same order.
// This is idempotent - it checks if migration is needed before running.
func migrateTrainingSessionsConstraint(db *sql.DB) error {
	// Check if the current unique constraint includes is_planned by looking at the index
	// SQLite stores constraint info in sqlite_master
	var sql string
	err := db.QueryRow(`
		SELECT sql FROM sqlite_master 
		WHERE type='table' AND name='training_sessions'
	`).Scan(&sql)
	if err != nil {
		// Table doesn't exist yet, will be created with correct constraint
		return nil
	}

	// If the constraint already includes is_planned, no migration needed
	if strings.Contains(sql, "UNIQUE(daily_log_id, session_order, is_planned)") {
		return nil
	}

	// Need to recreate the table with the correct constraint
	// SQLite doesn't support ALTER CONSTRAINT, so we use the standard migration pattern
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Disable foreign key checks during migration
	if _, err := tx.Exec("PRAGMA foreign_keys = OFF"); err != nil {
		return err
	}

	// Create new table with correct constraint
	if _, err := tx.Exec(`
		CREATE TABLE training_sessions_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			daily_log_id INTEGER NOT NULL,
			session_order INTEGER NOT NULL,
			is_planned BOOLEAN NOT NULL DEFAULT 1,
			training_type TEXT NOT NULL CHECK(training_type IN (
				'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
				'strength', 'calisthenics', 'mobility', 'mixed'
			)),
			duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 0 AND 480),
			perceived_intensity INTEGER CHECK (perceived_intensity IS NULL OR perceived_intensity BETWEEN 1 AND 10),
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE,
			UNIQUE(daily_log_id, session_order, is_planned)
		)
	`); err != nil {
		return err
	}

	// Copy data from old table
	if _, err := tx.Exec(`
		INSERT INTO training_sessions_new 
			(id, daily_log_id, session_order, is_planned, training_type, duration_min, perceived_intensity, notes, created_at)
		SELECT id, daily_log_id, session_order, is_planned, training_type, duration_min, perceived_intensity, notes, created_at
		FROM training_sessions
	`); err != nil {
		return err
	}

	// Drop old table
	if _, err := tx.Exec("DROP TABLE training_sessions"); err != nil {
		return err
	}

	// Rename new table
	if _, err := tx.Exec("ALTER TABLE training_sessions_new RENAME TO training_sessions"); err != nil {
		return err
	}

	// Recreate index
	if _, err := tx.Exec("CREATE INDEX IF NOT EXISTS idx_training_sessions_daily_log ON training_sessions(daily_log_id)"); err != nil {
		return err
	}

	// Re-enable foreign key checks
	if _, err := tx.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return err
	}

	return tx.Commit()
}

// migratePlanStatusCancelledToAbandoned updates nutrition_plans status values and constraints.
// This is needed for existing databases that still use "cancelled".
func migratePlanStatusCancelledToAbandoned(db *sql.DB) error {
	var schema string
	err := db.QueryRow(`
		SELECT sql FROM sqlite_master
		WHERE type='table' AND name='nutrition_plans'
	`).Scan(&schema)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}

	if strings.Contains(schema, "'abandoned'") {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("PRAGMA foreign_keys = OFF"); err != nil {
		return err
	}

	if _, err := tx.Exec(`
		CREATE TABLE nutrition_plans_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			start_date TEXT NOT NULL,
			start_weight_kg REAL NOT NULL CHECK (start_weight_kg BETWEEN 30 AND 300),
			goal_weight_kg REAL NOT NULL CHECK (goal_weight_kg BETWEEN 30 AND 300),
			duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 4 AND 104),
			required_weekly_change_kg REAL NOT NULL,
			required_daily_deficit_kcal REAL NOT NULL,
			status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`); err != nil {
		return err
	}

	if _, err := tx.Exec(`
		INSERT INTO nutrition_plans_new (
			id, start_date, start_weight_kg, goal_weight_kg, duration_weeks,
			required_weekly_change_kg, required_daily_deficit_kcal, status, created_at, updated_at
		)
		SELECT
			id, start_date, start_weight_kg, goal_weight_kg, duration_weeks,
			required_weekly_change_kg, required_daily_deficit_kcal,
			CASE status WHEN 'cancelled' THEN 'abandoned' ELSE status END,
			created_at, updated_at
		FROM nutrition_plans
	`); err != nil {
		return err
	}

	if _, err := tx.Exec("DROP TABLE nutrition_plans"); err != nil {
		return err
	}

	if _, err := tx.Exec("ALTER TABLE nutrition_plans_new RENAME TO nutrition_plans"); err != nil {
		return err
	}

	if _, err := tx.Exec("CREATE INDEX IF NOT EXISTS idx_nutrition_plans_status ON nutrition_plans(status)"); err != nil {
		return err
	}
	if _, err := tx.Exec("CREATE INDEX IF NOT EXISTS idx_nutrition_plans_start_date ON nutrition_plans(start_date)"); err != nil {
		return err
	}

	if _, err := tx.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return err
	}

	return tx.Commit()
}

// seedFoodNutritionalData populates protein/carbs/fat values for all food reference items.
// Data sourced from USDA FoodData Central. This is idempotent - only updates rows with protein_g_per_100=0.
func seedFoodNutritionalData(db *sql.DB) error {
	// Check if migration is needed (any food with protein_g_per_100 = 0 and is a seeded item)
	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM food_reference WHERE protein_g_per_100 = 0 OR protein_g_per_100 IS NULL`).Scan(&count)
	if err != nil || count == 0 {
		return nil // Already migrated or table doesn't exist
	}

	// USDA nutritional data per 100g (raw/dry where applicable)
	// Format: food_item, protein, carbs, fat, serving_unit, serving_size_g, is_pantry_staple
	nutritionData := []struct {
		foodItem       string
		proteinG       float64
		carbsG         float64
		fatG           float64
		servingUnit    string
		servingSizeG   float64
		isPantryStaple bool
	}{
		// High-Carb sources
		{"Oats", 13.2, 67.7, 6.5, "g", 40, true},
		{"Semolina", 12.7, 72.8, 1.1, "g", 100, false},
		{"Quinoa/Amaranth", 14.1, 64.2, 6.1, "g", 100, true},
		{"Chickpeas", 20.5, 62.9, 6.0, "g", 100, true},
		{"Pumpkin Seeds", 30.2, 10.7, 49.1, "g", 30, true},
		{"Brown Rice", 7.5, 76.2, 2.7, "g", 100, true},
		{"Wholegrain Bread", 13.4, 41.3, 4.2, "slice", 40, true},
		{"Wholegrain Pasta", 13.0, 71.3, 2.5, "g", 100, true},
		{"Rye Bread", 8.5, 48.3, 3.3, "slice", 35, true},
		{"Pita", 9.1, 55.7, 1.2, "piece", 60, false},
		{"Potatoes", 2.0, 17.5, 0.1, "g", 150, true},
		{"Sweet Potatoes", 1.6, 20.1, 0.1, "g", 150, true},
		{"Yams", 1.5, 27.9, 0.2, "g", 150, false},
		{"Low-fat Milk", 3.4, 5.0, 1.0, "ml", 250, true},
		// High-Protein sources
		{"Whey Protein", 80.0, 7.0, 3.0, "scoop", 30, true},
		{"Low-fat Curd/Quark", 12.0, 4.0, 0.3, "g", 150, true},
		{"Nutritional Yeast", 50.0, 36.0, 4.0, "tbsp", 15, true},
		{"Cottage Cheese", 11.1, 3.4, 4.3, "g", 100, true},
		{"Spirulina", 57.5, 23.9, 7.7, "tbsp", 7, false},
		{"Egg White", 10.9, 0.7, 0.2, "large", 33, true},
		{"Chicken/Turkey Breast", 31.0, 0.0, 3.6, "g", 120, true},
		{"Tofu", 8.1, 1.9, 4.8, "g", 100, true},
		{"Soy Milk", 3.3, 6.0, 1.8, "ml", 250, false},
		{"Edamame", 11.9, 8.6, 5.2, "g", 100, true},
		{"Salmon/Tuna/Perch", 25.4, 0.0, 8.1, "g", 120, true},
		{"Lentils", 25.8, 60.1, 1.1, "g", 100, true},
		{"Scampi/Prawns", 24.0, 0.2, 0.3, "g", 100, false},
		{"Low-fat Yoghurt", 5.7, 7.0, 0.7, "g", 150, true},
		{"Seitan", 75.0, 14.0, 1.9, "g", 100, false},
		{"Low-fat Greek Yoghurt", 10.0, 3.6, 0.7, "g", 150, true},
		{"Tempeh", 19.0, 9.4, 10.8, "g", 100, false},
		// High-Fat sources
		{"Flaxseed/Linseed Oil", 0.0, 0.0, 100.0, "tbsp", 14, true},
		{"Olive Oil", 0.0, 0.0, 100.0, "tbsp", 14, true},
		{"MCT Oil", 0.0, 0.0, 100.0, "tbsp", 14, false},
		{"Walnut Oil", 0.0, 0.0, 100.0, "tbsp", 14, false},
		{"Nuts", 20.0, 21.6, 54.0, "g", 30, true},
		{"Sesame Seeds", 17.7, 23.5, 49.7, "tbsp", 9, true},
		{"Tahini", 17.0, 21.2, 53.8, "tbsp", 15, true},
		{"Nut Butter", 25.0, 20.0, 50.0, "tbsp", 32, true},
		{"Flax Seeds", 18.3, 28.9, 42.2, "tbsp", 10, true},
		{"Chia Seeds", 16.5, 42.1, 30.7, "tbsp", 12, true},
		{"Hempseeds", 31.6, 8.7, 48.8, "tbsp", 30, true},
		{"Avocado", 2.0, 8.5, 14.7, "half", 100, true},
	}

	// Update each food with nutritional data
	stmt, err := db.Prepare(`
		UPDATE food_reference
		SET protein_g_per_100 = ?, carbs_g_per_100 = ?, fat_g_per_100 = ?,
		    serving_unit = ?, serving_size_g = ?, is_pantry_staple = ?,
		    updated_at = datetime('now')
		WHERE food_item = ?
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare nutrition update: %w", err)
	}
	defer stmt.Close()

	for _, food := range nutritionData {
		isPantry := 0
		if food.isPantryStaple {
			isPantry = 1
		}
		if _, err := stmt.Exec(
			food.proteinG, food.carbsG, food.fatG,
			food.servingUnit, food.servingSizeG, isPantry,
			food.foodItem,
		); err != nil {
			return fmt.Errorf("failed to update nutrition for %s: %w", food.foodItem, err)
		}
	}

	return nil
}
