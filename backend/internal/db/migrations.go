package db

import (
	"database/sql"
	"fmt"
	"strings"
)

// RunMigrations applies all database migrations.
// This function is idempotent - safe to run multiple times.
func RunMigrations(db *sql.DB) error {
	migrations := []string{
		createUserProfileTable,
		createDailyLogsTable,
		createTrainingConfigsTable,
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
	}

	for _, migration := range alterMigrations {
		if _, err := db.Exec(migration); err != nil {
			// Ignore "duplicate column name" errors (column already exists)
			if !strings.Contains(err.Error(), "duplicate column name") {
				return fmt.Errorf("alter migration failed: %w", err)
			}
		}
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
    estimated_cal_per_min REAL NOT NULL DEFAULT 5,
    load_score REAL NOT NULL DEFAULT 3
);

-- Seed default training configs (from PRD Section 3.3)
INSERT OR IGNORE INTO training_configs (type, estimated_cal_per_min, load_score) VALUES
    ('rest', 0, 0),
    ('qigong', 2, 0.5),
    ('walking', 4, 1),
    ('gmb', 5, 3),
    ('run', 8, 3),
    ('row', 8, 3),
    ('cycle', 6, 2),
    ('hiit', 12, 5),
    ('strength', 7, 5),
    ('calisthenics', 5, 3),
    ('mobility', 2, 0.5),
    ('mixed', 6, 4);
`

// ALTER TABLE migrations for existing databases (split for SQLite compatibility)
const addBMREquationColumn = `ALTER TABLE user_profile ADD COLUMN bmr_equation TEXT NOT NULL DEFAULT 'mifflin_st_jeor'`
const addBodyFatPercentColumn = `ALTER TABLE user_profile ADD COLUMN body_fat_percent REAL`
const addCurrentWeightColumn = `ALTER TABLE user_profile ADD COLUMN current_weight_kg REAL`
const addTimeframeWeeksColumn = `ALTER TABLE user_profile ADD COLUMN timeframe_weeks INTEGER DEFAULT 0`
