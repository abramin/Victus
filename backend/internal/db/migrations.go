package db

import (
	"database/sql"
	"fmt"
)

// RunMigrations applies all database migrations.
// This function is idempotent - safe to run multiple times.
func RunMigrations(db *sql.DB) error {
	migrations := []string{
		createUserProfileTable,
	}

	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i, err)
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
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    CHECK (abs((carb_ratio + protein_ratio + fat_ratio) - 1.0) < 0.01),
    CHECK (abs((breakfast_ratio + lunch_ratio + dinner_ratio) - 1.0) < 0.01)
);
`
