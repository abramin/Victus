package db

import (
	"database/sql"
	"fmt"
	"strings"
)

// RunMigrations applies all database migrations.
func RunMigrations(db *sql.DB) error {
	return RunPostgresMigrations(db)
}

// RunPostgresMigrations applies all database migrations for PostgreSQL.
func RunPostgresMigrations(db *sql.DB) error {
	migrations := []string{
		pgCreateUserProfileTable,
		pgCreateDailyLogsTable,
		pgCreateTrainingConfigsTable,
		pgCreatePlannedDayTypesTable,
		pgCreateFoodReferenceTable,
		pgCreateNutritionPlansTable,
		pgCreateWeeklyTargetsTable,
		pgCreateMuscleGroupsTable,
		pgCreateTrainingArchetypesTable,
		pgCreateTrainingSessionsTable,     // After training_archetypes (references it)
		pgCreateMuscleFatigueTable,
		pgCreateFatigueEventsTable,        // After training_sessions (references it)
		pgCreateTrainingProgramsTable,
		pgCreateProgramWeeksTable,
		pgCreateProgramDaysTable,
		pgCreateProgramInstallationsTable,
		pgCreateMetabolicHistoryTable,
		pgCreateMonthlySummariesTable,
		pgCreateBodyPartIssuesTable,       // After training_sessions (references it)
		pgCreatePlannedSessionsTable,      // Ad-hoc workout planner sessions
	}

	for i, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("postgres migration %d failed: %w", i, err)
		}
	}

	// Run ALTER TABLE migrations
	for _, migration := range pgAlterMigrations {
		if _, err := db.Exec(migration); err != nil {
			// Ignore "already exists" errors
			if !strings.Contains(err.Error(), "already exists") &&
				!strings.Contains(err.Error(), "duplicate column") {
				return fmt.Errorf("postgres alter migration failed: %w", err)
			}
		}
	}

	// Seed data
	if err := pgSeedTrainingConfigs(db); err != nil {
		return fmt.Errorf("seeding training configs failed: %w", err)
	}
	if err := pgSeedMuscleGroups(db); err != nil {
		return fmt.Errorf("seeding muscle groups failed: %w", err)
	}
	if err := pgSeedTrainingArchetypes(db); err != nil {
		return fmt.Errorf("seeding training archetypes failed: %w", err)
	}
	if err := pgSeedFoodReference(db); err != nil {
		return fmt.Errorf("seeding food reference failed: %w", err)
	}

	return nil
}

const pgCreateUserProfileTable = `
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
    current_weight_kg REAL,
    timeframe_weeks INTEGER DEFAULT 0,
    maltodextrin_g REAL DEFAULT 0,
    whey_g REAL DEFAULT 0,
    collagen_g REAL DEFAULT 0,
    tdee_source TEXT NOT NULL DEFAULT 'formula',
    manual_tdee REAL DEFAULT 0,
    recalibration_tolerance REAL NOT NULL DEFAULT 3,
    fasting_protocol TEXT NOT NULL DEFAULT 'standard',
    eating_window_start TEXT NOT NULL DEFAULT '08:00',
    eating_window_end TEXT NOT NULL DEFAULT '20:00',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (abs((carb_ratio + protein_ratio + fat_ratio) - 1.0) < 0.01),
    CHECK (abs((breakfast_ratio + lunch_ratio + dinner_ratio) - 1.0) < 0.01)
)`

const pgCreateDailyLogsTable = `
CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY,
    log_date TEXT UNIQUE NOT NULL,
    weight_kg REAL NOT NULL,
    body_fat_percent REAL,
    resting_heart_rate INTEGER,
    sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 100),
    sleep_hours REAL,
    planned_training_type TEXT NOT NULL,
    planned_duration_min INTEGER NOT NULL,
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
    tdee_source_used TEXT DEFAULT 'formula',
    tdee_confidence REAL DEFAULT 0,
    data_points_used INTEGER DEFAULT 0,
    active_calories_burned INTEGER,
    steps INTEGER,
    notes TEXT DEFAULT '',
    fasting_override TEXT,
    fasted_items_kcal INTEGER DEFAULT 0,
    hrv_ms INTEGER,
    consumed_calories INTEGER DEFAULT 0,
    consumed_protein_g INTEGER DEFAULT 0,
    consumed_carbs_g INTEGER DEFAULT 0,
    consumed_fat_g INTEGER DEFAULT 0,
    breakfast_consumed_kcal INTEGER DEFAULT 0,
    breakfast_consumed_protein_g INTEGER DEFAULT 0,
    breakfast_consumed_carbs_g INTEGER DEFAULT 0,
    breakfast_consumed_fat_g INTEGER DEFAULT 0,
    lunch_consumed_kcal INTEGER DEFAULT 0,
    lunch_consumed_protein_g INTEGER DEFAULT 0,
    lunch_consumed_carbs_g INTEGER DEFAULT 0,
    lunch_consumed_fat_g INTEGER DEFAULT 0,
    dinner_consumed_kcal INTEGER DEFAULT 0,
    dinner_consumed_protein_g INTEGER DEFAULT 0,
    dinner_consumed_carbs_g INTEGER DEFAULT 0,
    dinner_consumed_fat_g INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (weight_kg BETWEEN 30 AND 300),
    CHECK (body_fat_percent IS NULL OR body_fat_percent BETWEEN 3 AND 70),
    CHECK (resting_heart_rate IS NULL OR resting_heart_rate BETWEEN 30 AND 200),
    CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24),
    CHECK (planned_duration_min BETWEEN 0 AND 480)
);
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(log_date)`

const pgCreateTrainingConfigsTable = `
CREATE TABLE IF NOT EXISTS training_configs (
    id SERIAL PRIMARY KEY,
    type TEXT UNIQUE NOT NULL CHECK(type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    met REAL NOT NULL DEFAULT 5.0,
    load_score REAL NOT NULL DEFAULT 3
)`

const pgCreateTrainingSessionsTable = `
CREATE TABLE IF NOT EXISTS training_sessions (
    id SERIAL PRIMARY KEY,
    daily_log_id INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    session_order INTEGER NOT NULL,
    is_planned BOOLEAN NOT NULL DEFAULT true,
    training_type TEXT NOT NULL CHECK(training_type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 0 AND 480),
    perceived_intensity INTEGER CHECK (perceived_intensity IS NULL OR perceived_intensity BETWEEN 1 AND 10),
    notes TEXT,
    archetype_id INTEGER REFERENCES training_archetypes(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(daily_log_id, session_order, is_planned)
);
CREATE INDEX IF NOT EXISTS idx_training_sessions_daily_log ON training_sessions(daily_log_id)`

const pgCreatePlannedDayTypesTable = `
CREATE TABLE IF NOT EXISTS planned_day_types (
    id SERIAL PRIMARY KEY,
    plan_date TEXT UNIQUE NOT NULL,
    day_type TEXT NOT NULL CHECK (day_type IN ('performance', 'fatburner', 'metabolize')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_planned_day_types_date ON planned_day_types(plan_date)`

const pgCreateFoodReferenceTable = `
CREATE TABLE IF NOT EXISTS food_reference (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('high_carb', 'high_protein', 'high_fat')),
    food_item TEXT NOT NULL,
    plate_multiplier REAL,
    protein_g_per_100 REAL DEFAULT 0,
    carbs_g_per_100 REAL DEFAULT 0,
    fat_g_per_100 REAL DEFAULT 0,
    serving_unit TEXT DEFAULT 'g',
    serving_size_g REAL DEFAULT 100,
    is_pantry_staple BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(category, food_item)
)`

const pgCreateNutritionPlansTable = `
CREATE TABLE IF NOT EXISTS nutrition_plans (
    id SERIAL PRIMARY KEY,
    name TEXT DEFAULT '',
    start_date TEXT NOT NULL,
    start_weight_kg REAL NOT NULL CHECK (start_weight_kg BETWEEN 30 AND 300),
    goal_weight_kg REAL NOT NULL CHECK (goal_weight_kg BETWEEN 30 AND 300),
    duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 4 AND 104),
    required_weekly_change_kg REAL NOT NULL,
    required_daily_deficit_kcal REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_status ON nutrition_plans(status);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_start_date ON nutrition_plans(start_date)`

const pgCreateWeeklyTargetsTable = `
CREATE TABLE IF NOT EXISTS weekly_targets (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(plan_id, week_number)
);
CREATE INDEX IF NOT EXISTS idx_weekly_targets_plan ON weekly_targets(plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_targets_dates ON weekly_targets(start_date, end_date)`

const pgCreateMuscleGroupsTable = `
CREATE TABLE IF NOT EXISTS muscle_groups (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    svg_path_id TEXT NOT NULL
)`

const pgCreateTrainingArchetypesTable = `
CREATE TABLE IF NOT EXISTS training_archetypes (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    muscle_coefficients TEXT NOT NULL
)`

const pgCreateMuscleFatigueTable = `
CREATE TABLE IF NOT EXISTS muscle_fatigue (
    id SERIAL PRIMARY KEY,
    muscle_group_id INTEGER NOT NULL REFERENCES muscle_groups(id),
    fatigue_percent REAL NOT NULL DEFAULT 0 CHECK (fatigue_percent BETWEEN 0 AND 100),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(muscle_group_id)
);
CREATE INDEX IF NOT EXISTS idx_muscle_fatigue_muscle ON muscle_fatigue(muscle_group_id)`

const pgCreateFatigueEventsTable = `
CREATE TABLE IF NOT EXISTS fatigue_events (
    id SERIAL PRIMARY KEY,
    training_session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    archetype_id INTEGER NOT NULL REFERENCES training_archetypes(id),
    total_load REAL NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fatigue_events_session ON fatigue_events(training_session_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_events_applied ON fatigue_events(applied_at)`

const pgCreateTrainingProgramsTable = `
CREATE TABLE IF NOT EXISTS training_programs (
    id SERIAL PRIMARY KEY,
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
    is_template BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_training_programs_status ON training_programs(status);
CREATE INDEX IF NOT EXISTS idx_training_programs_difficulty ON training_programs(difficulty);
CREATE INDEX IF NOT EXISTS idx_training_programs_focus ON training_programs(focus)`

const pgCreateProgramWeeksTable = `
CREATE TABLE IF NOT EXISTS program_weeks (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1),
    label TEXT NOT NULL,
    is_deload BOOLEAN NOT NULL DEFAULT false,
    volume_scale REAL NOT NULL DEFAULT 1.0 CHECK (volume_scale BETWEEN 0.3 AND 2.0),
    intensity_scale REAL NOT NULL DEFAULT 1.0 CHECK (intensity_scale BETWEEN 0.3 AND 2.0),
    UNIQUE(program_id, week_number)
);
CREATE INDEX IF NOT EXISTS idx_program_weeks_program ON program_weeks(program_id)`

const pgCreateProgramDaysTable = `
CREATE TABLE IF NOT EXISTS program_days (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1),
    label TEXT NOT NULL,
    training_type TEXT NOT NULL CHECK(training_type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    duration_min INTEGER NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 15 AND 180),
    load_score REAL NOT NULL DEFAULT 3.0 CHECK (load_score BETWEEN 1 AND 5),
    nutrition_day TEXT NOT NULL DEFAULT 'performance' CHECK (nutrition_day IN ('performance', 'fatburner', 'metabolize')),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_program_days_week ON program_days(week_id)`

const pgCreateProgramInstallationsTable = `
CREATE TABLE IF NOT EXISTS program_installations (
    id SERIAL PRIMARY KEY,
    program_id INTEGER NOT NULL REFERENCES training_programs(id),
    start_date TEXT NOT NULL,
    week_day_mapping TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
    current_week INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_program_installations_status ON program_installations(status);
CREATE INDEX IF NOT EXISTS idx_program_installations_program ON program_installations(program_id)`

const pgCreateMetabolicHistoryTable = `
CREATE TABLE IF NOT EXISTS metabolic_history (
    id SERIAL PRIMARY KEY,
    daily_log_id INTEGER NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    calculated_tdee INTEGER NOT NULL,
    previous_tdee INTEGER,
    delta_kcal INTEGER,
    tdee_source TEXT NOT NULL CHECK (tdee_source IN ('flux', 'formula', 'manual')),
    was_swing_constrained BOOLEAN NOT NULL DEFAULT false,
    bmr_floor_applied BOOLEAN NOT NULL DEFAULT false,
    adherence_gate_passed BOOLEAN NOT NULL DEFAULT true,
    confidence REAL NOT NULL DEFAULT 0,
    data_points_used INTEGER NOT NULL DEFAULT 0,
    ema_weight_kg REAL,
    bmr_value REAL NOT NULL,
    notification_pending BOOLEAN NOT NULL DEFAULT false,
    notification_dismissed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_metabolic_history_log ON metabolic_history(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_metabolic_history_notification ON metabolic_history(notification_pending);
CREATE INDEX IF NOT EXISTS idx_metabolic_history_calculated_at ON metabolic_history(calculated_at)`

const pgCreateMonthlySummariesTable = `
CREATE TABLE IF NOT EXISTS monthly_summaries (
    id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(year_month, activity_type)
);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_year_month ON monthly_summaries(year_month)`

const pgCreateBodyPartIssuesTable = `
CREATE TABLE IF NOT EXISTS body_part_issues (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    body_part TEXT NOT NULL,
    symptom TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 3),
    raw_text TEXT NOT NULL,
    session_id INTEGER REFERENCES training_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_body_part_issues_date ON body_part_issues(date);
CREATE INDEX IF NOT EXISTS idx_body_part_issues_body_part ON body_part_issues(body_part);
CREATE INDEX IF NOT EXISTS idx_body_part_issues_session ON body_part_issues(session_id)`

const pgCreatePlannedSessionsTable = `
CREATE TABLE IF NOT EXISTS planned_sessions (
    id SERIAL PRIMARY KEY,
    plan_date TEXT NOT NULL,
    session_order INTEGER NOT NULL DEFAULT 1,
    training_type TEXT NOT NULL CHECK(training_type IN (
        'rest', 'qigong', 'walking', 'gmb', 'run', 'row', 'cycle', 'hiit',
        'strength', 'calisthenics', 'mobility', 'mixed'
    )),
    duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 0 AND 480),
    load_score REAL NOT NULL DEFAULT 3.0,
    rpe INTEGER CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(plan_date, session_order)
);
CREATE INDEX IF NOT EXISTS idx_planned_sessions_date ON planned_sessions(plan_date)`

var pgAlterMigrations = []string{
	// Add progression_config column to program_days for optional pattern-based progression
	`ALTER TABLE program_days ADD COLUMN IF NOT EXISTS progression_config TEXT`,
	// Add session_exercises column to program_days for block constructor phase assignments
	`ALTER TABLE program_days ADD COLUMN IF NOT EXISTS session_exercises TEXT`,
	// Add last_recalibrated_at column to nutrition_plans for tracking recalibration cooldown
	`ALTER TABLE nutrition_plans ADD COLUMN IF NOT EXISTS last_recalibrated_at TIMESTAMP`,
	// Echo logging: draft flag for quick-submit sessions pending enrichment
	`ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false`,
	// Echo logging: raw natural language echo text from user
	`ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS raw_echo_log TEXT`,
	// Echo logging: parsed metadata (achievements, rpe_offset, etc.)
	`ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS extra_metadata JSONB`,
}

func pgSeedTrainingConfigs(db *sql.DB) error {
	configs := []struct {
		Type      string
		MET       float64
		LoadScore float64
	}{
		{"rest", 1.0, 0},
		{"qigong", 2.5, 0.5},
		{"walking", 3.5, 1},
		{"gmb", 4.0, 3},
		{"run", 9.8, 3},
		{"row", 7.0, 3},
		{"cycle", 6.8, 2},
		{"hiit", 12.8, 5},
		{"strength", 5.0, 5},
		{"calisthenics", 4.0, 3},
		{"mobility", 2.5, 0.5},
		{"mixed", 6.0, 4},
	}

	for _, c := range configs {
		_, err := db.Exec(`
			INSERT INTO training_configs (type, met, load_score)
			VALUES ($1, $2, $3)
			ON CONFLICT (type) DO NOTHING
		`, c.Type, c.MET, c.LoadScore)
		if err != nil {
			return err
		}
	}
	return nil
}

func pgSeedMuscleGroups(db *sql.DB) error {
	groups := []struct {
		ID          int
		Name        string
		DisplayName string
		SVGPathID   string
	}{
		{1, "chest", "Chest", "muscle-chest"},
		{2, "front_delt", "Front Delts", "muscle-front-delt"},
		{3, "triceps", "Triceps", "muscle-triceps"},
		{4, "side_delt", "Side Delts", "muscle-side-delt"},
		{5, "lats", "Lats", "muscle-lats"},
		{6, "traps", "Traps", "muscle-traps"},
		{7, "biceps", "Biceps", "muscle-biceps"},
		{8, "rear_delt", "Rear Delts", "muscle-rear-delt"},
		{9, "forearms", "Forearms", "muscle-forearms"},
		{10, "quads", "Quads", "muscle-quads"},
		{11, "glutes", "Glutes", "muscle-glutes"},
		{12, "hamstrings", "Hamstrings", "muscle-hamstrings"},
		{13, "calves", "Calves", "muscle-calves"},
		{14, "lower_back", "Lower Back", "muscle-lower-back"},
		{15, "core", "Core/Abs", "muscle-core"},
	}

	for _, g := range groups {
		_, err := db.Exec(`
			INSERT INTO muscle_groups (id, name, display_name, svg_path_id)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO NOTHING
		`, g.ID, g.Name, g.DisplayName, g.SVGPathID)
		if err != nil {
			return err
		}
	}
	return nil
}

func pgSeedTrainingArchetypes(db *sql.DB) error {
	archetypes := []struct {
		ID           int
		Name         string
		DisplayName  string
		Coefficients string
	}{
		{1, "push", "Push", `{"chest":1.0,"front_delt":1.0,"triceps":0.7,"side_delt":0.7,"core":0.4}`},
		{2, "pull", "Pull", `{"lats":1.0,"traps":1.0,"biceps":0.7,"rear_delt":0.7,"forearms":0.4}`},
		{3, "legs", "Legs", `{"quads":1.0,"glutes":1.0,"hamstrings":0.7,"calves":0.7,"lower_back":0.4}`},
		{4, "upper", "Upper Body", `{"chest":0.7,"lats":0.7,"front_delt":0.7,"traps":0.5,"biceps":0.5,"triceps":0.5}`},
		{5, "lower", "Lower Body", `{"quads":0.8,"glutes":0.8,"hamstrings":0.8,"calves":0.6,"lower_back":0.4}`},
		{6, "full_body", "Full Body", `{"chest":0.5,"lats":0.5,"quads":0.5,"glutes":0.5,"front_delt":0.4,"hamstrings":0.4,"core":0.4}`},
		{7, "cardio_impact", "Cardio (Impact)", `{"calves":1.0,"hamstrings":1.0,"quads":0.7,"glutes":0.7,"core":0.4}`},
		{8, "cardio_low", "Cardio (Low Impact)", `{"quads":0.5,"glutes":0.5,"hamstrings":0.3,"calves":0.3}`},
	}

	for _, a := range archetypes {
		_, err := db.Exec(`
			INSERT INTO training_archetypes (id, name, display_name, muscle_coefficients)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO NOTHING
		`, a.ID, a.Name, a.DisplayName, a.Coefficients)
		if err != nil {
			return err
		}
	}
	return nil
}

func pgSeedFoodReference(db *sql.DB) error {
	foods := []struct {
		Category        string
		FoodItem        string
		PlateMultiplier *float64
		ProteinG        float64
		CarbsG          float64
		FatG            float64
		ServingUnit     string
		ServingSizeG    float64
		IsPantryStaple  bool
	}{
		// High-Carb sources
		{"high_carb", "Oats", ptr(1.0), 13.2, 67.7, 6.5, "g", 40, true},
		{"high_carb", "Brown Rice", ptr(1.0), 7.5, 76.2, 2.7, "g", 100, true},
		{"high_carb", "Potatoes", ptr(1.0), 2.0, 17.5, 0.1, "g", 150, true},
		{"high_carb", "Sweet Potatoes", ptr(1.0), 1.6, 20.1, 0.1, "g", 150, true},
		{"high_carb", "Wholegrain Bread", ptr(1.0), 13.4, 41.3, 4.2, "slice", 40, true},
		{"high_carb", "Quinoa/Amaranth", ptr(1.0), 14.1, 64.2, 6.1, "g", 100, true},
		// High-Protein sources
		{"high_protein", "Whey Protein", ptr(0.25), 80.0, 7.0, 3.0, "scoop", 30, true},
		{"high_protein", "Chicken/Turkey Breast", ptr(0.25), 31.0, 0.0, 3.6, "g", 120, true},
		{"high_protein", "Salmon/Tuna/Perch", ptr(0.25), 25.4, 0.0, 8.1, "g", 120, true},
		{"high_protein", "Eggs", ptr(0.25), 13.0, 1.1, 11.0, "large", 50, true},
		{"high_protein", "Low-fat Greek Yoghurt", ptr(0.5), 10.0, 3.6, 0.7, "g", 150, true},
		{"high_protein", "Tofu", ptr(0.25), 8.1, 1.9, 4.8, "g", 100, true},
		{"high_protein", "Lentils", ptr(0.25), 25.8, 60.1, 1.1, "g", 100, true},
		// High-Fat sources
		{"high_fat", "Olive Oil", ptr(0.25), 0.0, 0.0, 100.0, "tbsp", 14, true},
		{"high_fat", "Nuts", ptr(0.25), 20.0, 21.6, 54.0, "g", 30, true},
		{"high_fat", "Avocado", ptr(0.25), 2.0, 8.5, 14.7, "half", 100, true},
		{"high_fat", "Chia Seeds", ptr(0.25), 16.5, 42.1, 30.7, "tbsp", 12, true},
		{"high_fat", "Nut Butter", ptr(0.25), 25.0, 20.0, 50.0, "tbsp", 32, true},
	}

	for _, f := range foods {
		var pm interface{} = nil
		if f.PlateMultiplier != nil {
			pm = *f.PlateMultiplier
		}
		_, err := db.Exec(`
			INSERT INTO food_reference (category, food_item, plate_multiplier, protein_g_per_100, carbs_g_per_100, fat_g_per_100, serving_unit, serving_size_g, is_pantry_staple)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (category, food_item) DO NOTHING
		`, f.Category, f.FoodItem, pm, f.ProteinG, f.CarbsG, f.FatG, f.ServingUnit, f.ServingSizeG, f.IsPantryStaple)
		if err != nil {
			return err
		}
	}
	return nil
}

func ptr(f float64) *float64 {
	return &f
}
