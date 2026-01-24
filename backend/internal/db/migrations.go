package db

import (
	"database/sql"
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

// Migrate existing single training data to sessions table
const migrateTrainingToSessions = `
INSERT OR IGNORE INTO training_sessions (daily_log_id, session_order, is_planned, training_type, duration_min)
SELECT id, 1, 1, planned_training_type, planned_duration_min
FROM daily_logs
WHERE planned_training_type IS NOT NULL AND planned_training_type != '';
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
