package main

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"path/filepath"
	"time"

	"victus/internal/db"

	_ "modernc.org/sqlite"
)

type SeedConfig struct {
	DBPath        string
	StartDate     time.Time
	WeeksOfData   int
	InitialWeight float64
	UserHeight    float64
	UserBirthDate time.Time
	UserSex       string
	UserGoal      string
}

func main() {
	// Create database connection
	dbPath := filepath.Join(".", "data", "victus.sqlite")
	database, err := db.Connect(db.Config{Path: dbPath})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations to ensure tables exist
	if err := db.RunMigrationsWithType(database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	config := SeedConfig{
		DBPath:        dbPath,
		StartDate:     time.Now().AddDate(0, 0, -30), // Start 30 days ago
		WeeksOfData:   5,                             // 5 weeks covers 30+ days
		InitialWeight: 78.0,                          // kg - realistic starting weight
		UserHeight:    175.0,                         // cm
		UserBirthDate: time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC),
		UserSex:       "male",
		UserGoal:      "lose_weight",
	}

	fmt.Println("🌱 Seeding Victus database with 30 days of data...")
	fmt.Printf("Database: %s\n", config.DBPath)
	fmt.Printf("Start Date: %s\n", config.StartDate.Format("2006-01-02"))

	if err := seedDatabase(database.DB, config); err != nil {
		log.Fatalf("Seeding failed: %v", err)
	}

	fmt.Println("✅ Seeding completed successfully!")
}

func seedDatabase(db *sql.DB, config SeedConfig) error {
	// Clear existing data to allow fresh seed (order matters for foreign keys)
	_, _ = db.Exec("DELETE FROM fatigue_events")
	_, _ = db.Exec("DELETE FROM muscle_fatigue")
	_, _ = db.Exec("DELETE FROM training_sessions")
	_, _ = db.Exec("DELETE FROM daily_logs")
	_, _ = db.Exec("DELETE FROM user_profile")
	_, _ = db.Exec("DELETE FROM weekly_targets")
	_, _ = db.Exec("DELETE FROM nutrition_plans")
	_, _ = db.Exec("DELETE FROM planned_day_types")

	// Create or clear existing profile
	if err := createUserProfile(db, config); err != nil {
		return fmt.Errorf("failed to create user profile: %w", err)
	}

	// Generate daily logs for 30 days
	dayTypes, fatigueSessions, err := generateDailyLogs(db, config)
	if err != nil {
		return fmt.Errorf("failed to generate daily logs: %w", err)
	}

	// Create nutrition plan with weekly targets
	if err := createNutritionPlan(db, config); err != nil {
		return fmt.Errorf("failed to create nutrition plan: %w", err)
	}

	// Seed historical plans (completed and abandoned)
	if err := seedPlanHistory(db, config); err != nil {
		return fmt.Errorf("failed to seed plan history: %w", err)
	}

	// Seed planned day types for past and future
	if err := seedPlannedDayTypes(db, config, dayTypes); err != nil {
		return fmt.Errorf("failed to seed planned day types: %w", err)
	}

	// Seed fatigue events and muscle fatigue state
	if err := seedFatigueData(db, fatigueSessions); err != nil {
		return fmt.Errorf("failed to seed fatigue data: %w", err)
	}

	return nil
}

func createUserProfile(db *sql.DB, config SeedConfig) error {
	// Note: Clear happens in seedDatabase
	targetWeightKg := 72.0
	targetWeeklyChangeKg := -0.5 // Lose 0.5 kg per week
	timeframeWeeks := 12

	birthDateStr := config.UserBirthDate.Format("2006-01-02")
	now := time.Now().UTC()
	createdAt := now.Format("2006-01-02 15:04:05")

	query := `
	INSERT INTO user_profile (
		id, height_cm, birth_date, sex, goal, 
		target_weight_kg, target_weekly_change_kg, timeframe_weeks,
		current_weight_kg,
		carb_ratio, protein_ratio, fat_ratio,
		breakfast_ratio, lunch_ratio, dinner_ratio,
		carb_multiplier, protein_multiplier, fat_multiplier,
		fruit_target_g, veggie_target_g,
		bmr_equation, body_fat_percent,
		tdee_source, manual_tdee,
		maltodextrin_g, whey_g, collagen_g,
		created_at, updated_at
	) VALUES (
		1, ?, ?, ?, ?,
		?, ?, ?,
		?,
		0.45, 0.30, 0.25,
		0.30, 0.30, 0.40,
		1.15, 4.35, 3.5,
		600, 500,
		'mifflin_st_jeor', 20.0,
		'formula', 0,
		10, 20, 5,
		?, ?
	)`

	_, err := db.Exec(query,
		config.UserHeight, birthDateStr, config.UserSex, config.UserGoal,
		targetWeightKg, targetWeeklyChangeKg, timeframeWeeks,
		config.InitialWeight,
		createdAt, createdAt,
	)

	if err != nil {
		return err
	}

	fmt.Println("✓ User profile created")
	return nil
}

func generateDailyLogs(db *sql.DB, config SeedConfig) (map[string]string, []trainingSessionResult, error) {
	rand.Seed(time.Now().UnixNano())

	totalDays := 30 // Fixed at 30 days
	currentWeight := config.InitialWeight
	dayTypes := make(map[string]string)               // Track day types for planned_day_types seeding
	fatigueSessions := []trainingSessionResult{}      // Track actual sessions for fatigue processing

	// Training plan: mix of intensity levels throughout the week (5 weeks)
	trainingPatterns := [][]string{
		{"strength", "rest", "run", "strength", "mobility", "cycle", "strength"},    // Week 1
		{"rest", "row", "strength", "mobility", "hiit", "strength", "strength"},     // Week 2
		{"strength", "strength", "rest", "run", "strength", "mobility", "cycle"},    // Week 3
		{"hiit", "strength", "mobility", "strength", "rest", "row", "strength"},     // Week 4
		{"strength", "run", "rest", "calisthenics", "mobility", "hiit", "strength"}, // Week 5
	}

	for day := 0; day < totalDays; day++ {
		date := config.StartDate.AddDate(0, 0, day)
		dateStr := date.Format("2006-01-02")

		// Slight weight fluctuation (±0.3 kg from trend) and gradual decrease
		weightVariation := (rand.Float64() - 0.5) * 0.6
		weekProgress := float64(day) / float64(totalDays)
		targetWeightLoss := (config.InitialWeight - 72.0) * weekProgress
		currentWeight = config.InitialWeight - targetWeightLoss + weightVariation

		// Realistic sleep (6-9 hours, weekends slightly better)
		sleepHours := 7.0 + (rand.Float64()-0.5)*2.0
		if (day % 7) > 4 { // Weekend
			sleepHours += 0.5
		}

		// Sleep quality correlates with sleep hours
		sleepQuality := int(45 + (sleepHours-6)*10 + (rand.Float64()-0.5)*15)
		sleepQuality = clamp(sleepQuality, 20, 95)

		// Resting heart rate (60-75 bpm, improves slightly with training)
		restingHeartRate := 72 - int(weekProgress*5) + rand.Intn(5)

		// HRV (Heart Rate Variability) in ms (rMSSD format)
		// Baseline: 55-75ms for moderately fit adults, improves with training
		// Lower HRV = more stress/fatigue, higher = better recovery
		hrvBaseline := 62.0 + weekProgress*8.0 // Improves from 62 to 70 over the month
		hrvVariation := (rand.Float64() - 0.5) * 20.0 // ±10ms normal variation

		// HRV correlates with sleep quality
		sleepEffect := (float64(sleepQuality) - 60.0) / 40.0 * 8.0 // ±8ms based on sleep

		// Previous day's training intensity affects today's HRV
		var trainingEffect float64
		if day > 0 {
			prevWeekIndex := (day - 1) / 7
			prevDayOfWeek := (day - 1) % 7
			prevTraining := trainingPatterns[prevWeekIndex][prevDayOfWeek]
			switch prevTraining {
			case "hiit", "strength":
				trainingEffect = -8.0 // Hard training lowers next-day HRV
			case "run", "row", "cycle":
				trainingEffect = -4.0 // Moderate effect
			case "rest", "mobility", "qigong":
				trainingEffect = 2.0 // Recovery improves HRV
			}
		}

		// Occasionally simulate a "depleted" day (10% chance) to test CNS override
		var depletedEffect float64
		if rand.Float64() < 0.10 {
			depletedEffect = -20.0 // Significant drop for testing CNS depleted state
		}

		hrvValue := int(hrvBaseline + hrvVariation + sleepEffect + trainingEffect + depletedEffect)
		hrvValue = clamp(hrvValue, 25, 120) // Keep within realistic bounds
		hrvMs := &hrvValue

		// Body fat (slight decrease due to training)
		bodyFatPercent := 20.0 - weekProgress*1.5 + (rand.Float64()-0.5)*0.5
		bodyFatPercent = clampFloat(bodyFatPercent, 10, 30)

		// Day type distribution: 40% performance, 35% fatburner, 25% metabolize
		dayTypeRoll := rand.Float64()
		var dayType string
		if dayTypeRoll < 0.4 {
			dayType = "performance"
		} else if dayTypeRoll < 0.75 {
			dayType = "fatburner"
		} else {
			dayType = "metabolize"
		}

		// Track day type for planned_day_types seeding
		dayTypes[dateStr] = dayType

		// Estimated TDEE (varies 2100-2500 based on day type)
		estimatedTDEE := 2300
		switch dayType {
		case "performance":
			estimatedTDEE = 2400 + rand.Intn(100)
		case "fatburner":
			estimatedTDEE = 2200 + rand.Intn(100)
		case "metabolize":
			estimatedTDEE = 2300 + rand.Intn(100)
		}

		// Get training for this day
		weekIndex := day / 7
		dayOfWeek := day % 7
		trainingType := trainingPatterns[weekIndex][dayOfWeek]
		durationMin := getTrainingDuration(trainingType)

		// Log macro targets based on day type (mock calculated values)
		carbTargetG, proteinTargetG, fatTargetG := getMacroTargets(estimatedTDEE)

		// Active calories from wearable (~50% of days have this data)
		var activeCalories *int
		if rand.Float64() < 0.5 {
			cal := 200 + rand.Intn(400) // 200-600 active calories
			activeCalories = &cal
		}

		// Water intake: 1.5-3.5L (higher on training days)
		waterL := 2.0 + rand.Float64()*1.0
		if trainingType != "rest" {
			waterL += 0.5
		}

		// Fruit/veggies: realistic variance around targets (600g fruit, 500g veggie)
		fruitG := 450 + rand.Intn(250)  // 450-700g (targeting 600g)
		veggiesG := 350 + rand.Intn(250) // 350-600g (targeting 500g)

		// TDEE confidence grows over time (adaptive learning simulation)
		tdeeConfidence := 0.3 + (float64(day)/30.0)*0.55 // 0.3 → 0.85
		dataPointsUsed := day + 1
		formulaTdee := estimatedTDEE - rand.Intn(100) + 50 // Slight variance from estimated

		// Insert daily log
		logID, err := insertDailyLog(db, dailyLogParams{
			date:                dateStr,
			weight:              currentWeight,
			bodyFatPercent:      bodyFatPercent,
			restingHeartRate:    restingHeartRate,
			sleepQuality:        sleepQuality,
			sleepHours:          sleepHours,
			dayType:             dayType,
			trainingType:        trainingType,
			trainingDurationMin: durationMin,
			carbTargetG:         carbTargetG,
			proteinTargetG:      proteinTargetG,
			fatTargetG:          fatTargetG,
			estimatedTDEE:       estimatedTDEE,
			activeCalories:      activeCalories,
			waterL:              waterL,
			fruitG:              fruitG,
			veggiesG:            veggiesG,
			tdeeConfidence:      tdeeConfidence,
			dataPointsUsed:      dataPointsUsed,
			formulaTdee:         formulaTdee,
			hrvMs:               hrvMs,
		})
		if err != nil {
			return nil, nil, fmt.Errorf("failed to insert daily log for %s: %w", dateStr, err)
		}

		// Insert planned training sessions
		if trainingType != "rest" {
			if _, err := insertTrainingSession(db, logID, trainingType, durationMin, true, date); err != nil {
				return nil, nil, fmt.Errorf("failed to insert planned training session for %s (type=%s): %w", dateStr, trainingType, err)
			}

			// 30% chance of a secondary planned session (usually lower intensity)
			if rand.Float64() < 0.3 {
				secondaryType := getSecondaryTraining(trainingType)
				secondaryDuration := rand.Intn(30) + 15
				if _, err := insertTrainingSession(db, logID, secondaryType, secondaryDuration, true, date); err != nil {
					return nil, nil, fmt.Errorf("failed to insert secondary planned training session for %s (type=%s): %w", dateStr, secondaryType, err)
				}
			}

			// Insert actual training sessions (~80% compliance)
			if rand.Float64() < 0.8 {
				// Actual duration varies slightly from planned (±10 min)
				actualDuration := durationMin + rand.Intn(21) - 10
				if actualDuration < 10 {
					actualDuration = 10
				}
				sessionResult, err := insertTrainingSession(db, logID, trainingType, actualDuration, false, date)
				if err != nil {
					return nil, nil, fmt.Errorf("failed to insert actual training session for %s (type=%s): %w", dateStr, trainingType, err)
				}
				if sessionResult != nil {
					fatigueSessions = append(fatigueSessions, *sessionResult)
				}
			}
		} else {
			// 10% chance of unplanned training on rest days
			if rand.Float64() < 0.1 {
				unplannedType := getSecondaryTraining("rest")
				unplannedDuration := rand.Intn(30) + 20
				sessionResult, err := insertTrainingSession(db, logID, unplannedType, unplannedDuration, false, date)
				if err != nil {
					return nil, nil, fmt.Errorf("failed to insert unplanned training session for %s (type=%s): %w", dateStr, unplannedType, err)
				}
				if sessionResult != nil {
					fatigueSessions = append(fatigueSessions, *sessionResult)
				}
			}
		}

		if (day+1)%7 == 0 {
			fmt.Printf("✓ Week %d complete (Days 1-%d) | Weight: %.1f kg\n", (day/7)+1, day+1, currentWeight)
		}
	}

	return dayTypes, fatigueSessions, nil
}

type dailyLogParams struct {
	date                string
	weight              float64
	bodyFatPercent      float64
	restingHeartRate    int
	sleepQuality        int
	sleepHours          float64
	dayType             string
	trainingType        string
	activeCalories      *int
	trainingDurationMin int
	carbTargetG         int
	proteinTargetG      int
	fatTargetG          int
	estimatedTDEE       int
	// New nutritional tracking fields
	waterL         float64
	fruitG         int
	veggiesG       int
	tdeeConfidence float64
	dataPointsUsed int
	formulaTdee    int
	// HRV data
	hrvMs *int
}

func insertDailyLog(db *sql.DB, params dailyLogParams) (int64, error) {
	query := `
	INSERT INTO daily_logs (
		log_date, weight_kg, body_fat_percent, resting_heart_rate,
		sleep_quality, sleep_hours,
		planned_training_type, planned_duration_min,
		total_carbs_g, total_protein_g, total_fats_g,
		breakfast_carb_points, breakfast_protein_points, breakfast_fat_points,
		lunch_carb_points, lunch_protein_points, lunch_fat_points,
		dinner_carb_points, dinner_protein_points, dinner_fat_points,
		day_type, estimated_tdee, active_calories_burned,
		water_l, fruit_g, veggies_g,
		tdee_source_used, tdee_confidence, data_points_used, formula_tdee,
		hrv_ms,
		created_at, updated_at
	) VALUES (
		?, ?, ?, ?,
		?, ?,
		?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?, ?,
		'formula', ?, ?, ?,
		?,
		?, ?
	)`

	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	// Calculate meal distributions
	carbPerMeal := struct{ breakfast, lunch, dinner int }{
		breakfast: int(float64(params.carbTargetG) * 0.30),
		lunch:     int(float64(params.carbTargetG) * 0.35),
		dinner:    int(float64(params.carbTargetG) * 0.35),
	}
	proteinPerMeal := struct{ breakfast, lunch, dinner int }{
		breakfast: int(float64(params.proteinTargetG) * 0.25),
		lunch:     int(float64(params.proteinTargetG) * 0.35),
		dinner:    int(float64(params.proteinTargetG) * 0.40),
	}
	fatPerMeal := struct{ breakfast, lunch, dinner int }{
		breakfast: int(float64(params.fatTargetG) * 0.30),
		lunch:     int(float64(params.fatTargetG) * 0.35),
		dinner:    int(float64(params.fatTargetG) * 0.35),
	}

	result, err := db.Exec(query,
		params.date, params.weight, params.bodyFatPercent, params.restingHeartRate,
		params.sleepQuality, params.sleepHours,
		params.trainingType, params.trainingDurationMin,
		params.carbTargetG, params.proteinTargetG, params.fatTargetG,
		carbPerMeal.breakfast, proteinPerMeal.breakfast, fatPerMeal.breakfast,
		carbPerMeal.lunch, proteinPerMeal.lunch, fatPerMeal.lunch,
		carbPerMeal.dinner, proteinPerMeal.dinner, fatPerMeal.dinner,
		params.dayType, params.estimatedTDEE, params.activeCalories,
		params.waterL, params.fruitG, params.veggiesG,
		params.tdeeConfidence, params.dataPointsUsed, params.formulaTdee,
		params.hrvMs,
		now, now,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// trainingSessionResult holds info about an inserted session for fatigue processing
type trainingSessionResult struct {
	sessionID   int64
	archetypeID int
	durationMin int
	rpe         int
	sessionTime time.Time
}

func insertTrainingSession(db *sql.DB, logID int64, trainingType string, durationMin int, isPlanned bool, sessionDate time.Time) (*trainingSessionResult, error) {
	query := `
	INSERT INTO training_sessions (
		daily_log_id, session_order, is_planned, training_type, duration_min, perceived_intensity, notes, archetype_id, created_at
	) VALUES (
		?, ?, ?, ?, ?, ?, ?, ?, ?
	)`

	// Get current max order for this log
	var maxOrder int
	plannedInt := 0
	if isPlanned {
		plannedInt = 1
	}
	err := db.QueryRow(
		"SELECT COALESCE(MAX(session_order), 0) FROM training_sessions WHERE daily_log_id = ? AND is_planned = ?",
		logID, plannedInt,
	).Scan(&maxOrder)
	if err != nil {
		return nil, err
	}

	order := maxOrder + 1
	intensity := rand.Intn(4) + 6 // RPE 6-9 (realistic training intensity)
	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	// Add notes to ~20% of actual (non-planned) sessions
	var notes *string
	if !isPlanned && rand.Float64() < 0.2 {
		sessionNotes := []string{
			"Felt strong today",
			"Recovery session - took it easy",
			"New PR on deadlift!",
			"Tired but pushed through",
			"Great energy, increased weights",
			"Focused on form today",
			"Short on time, high intensity",
		}
		note := sessionNotes[rand.Intn(len(sessionNotes))]
		notes = &note
	}

	// Map training type to archetype
	archetypeID := mapTrainingTypeToArchetype(trainingType)
	var archetypeIDPtr *int
	if archetypeID > 0 {
		archetypeIDPtr = &archetypeID
	}

	result, err := db.Exec(query, logID, order, plannedInt, trainingType, durationMin, intensity, notes, archetypeIDPtr, now)
	if err != nil {
		return nil, err
	}

	sessionID, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	// Only return result for actual (non-planned) sessions with valid archetypes
	if !isPlanned && archetypeID > 0 {
		return &trainingSessionResult{
			sessionID:   sessionID,
			archetypeID: archetypeID,
			durationMin: durationMin,
			rpe:         intensity,
			sessionTime: sessionDate,
		}, nil
	}
	return nil, nil
}

func getTrainingDuration(trainingType string) int {
	switch trainingType {
	case "strength":
		return 45 + rand.Intn(30) // 45-75 min
	case "run":
		return 30 + rand.Intn(30) // 30-60 min
	case "cycle":
		return 30 + rand.Intn(30) // 30-60 min
	case "row":
		return 25 + rand.Intn(25) // 25-50 min
	case "hiit":
		return 20 + rand.Intn(15) // 20-35 min
	case "mobility":
		return 20 + rand.Intn(15) // 20-35 min
	case "walking":
		return 30 + rand.Intn(30) // 30-60 min
	case "qigong":
		return 20 + rand.Intn(20) // 20-40 min
	default:
		return 30
	}
}

func getSecondaryTraining(primary string) string {
	// Secondary sessions are usually low intensity
	secondaries := []string{"mobility", "walking", "qigong"}
	return secondaries[rand.Intn(len(secondaries))]
}

func getMacroTargets(tdee int) (carbs, protein, fat int) {
	// Typical macro distribution: 45% carbs, 30% protein, 25% fat
	carbs = int((float64(tdee) * 0.45) / 4)
	protein = int((float64(tdee) * 0.30) / 4)
	fat = int((float64(tdee) * 0.25) / 9)

	// Add some randomness (±5% per macro)
	variation := 0.95 + rand.Float64()*0.1
	carbs = int(float64(carbs) * variation)
	protein = int(float64(protein) * variation)
	fat = int(float64(fat) * variation)

	return
}

func clamp(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func clampFloat(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// Archetype IDs match the database seeded values in migrations.go
const (
	archetypePush        = 1
	archetypePull        = 2
	archetypeLegs        = 3
	archetypeUpper       = 4
	archetypeLower       = 5
	archetypeFullBody    = 6
	archetypeCardioImpact = 7
	archetypeCardioLow   = 8
)

// strengthRotation tracks which archetype to use for strength sessions (cycles through push/pull/legs)
var strengthRotationIndex = 0

// mapTrainingTypeToArchetype converts a training type to an archetype ID
func mapTrainingTypeToArchetype(trainingType string) int {
	switch trainingType {
	case "strength":
		// Rotate through push, pull, legs for strength sessions
		archetypes := []int{archetypePush, archetypePull, archetypeLegs}
		idx := strengthRotationIndex % 3
		strengthRotationIndex++
		return archetypes[idx]
	case "run":
		return archetypeCardioImpact
	case "cycle":
		return archetypeCardioLow
	case "row":
		return archetypePull
	case "hiit":
		return archetypeFullBody
	case "mobility":
		return archetypeCardioLow
	case "calisthenics":
		return archetypeFullBody
	case "walking":
		return archetypeCardioLow
	case "qigong":
		return archetypeCardioLow
	case "gmb":
		return archetypeFullBody
	case "rest":
		return 0 // No archetype for rest
	default:
		return archetypeFullBody // Default fallback
	}
}

// muscleCoefficients maps archetype IDs to muscle fatigue coefficients
// These match the JSON values in training_archetypes table
var muscleCoefficients = map[int]map[string]float64{
	archetypePush: {
		"chest": 1.0, "front_delt": 1.0, "triceps": 0.7, "side_delt": 0.7, "core": 0.4,
	},
	archetypePull: {
		"lats": 1.0, "traps": 1.0, "biceps": 0.7, "rear_delt": 0.7, "forearms": 0.4,
	},
	archetypeLegs: {
		"quads": 1.0, "glutes": 1.0, "hamstrings": 0.7, "calves": 0.7, "lower_back": 0.4,
	},
	archetypeUpper: {
		"chest": 0.7, "lats": 0.7, "front_delt": 0.7, "traps": 0.5, "biceps": 0.5, "triceps": 0.5,
	},
	archetypeLower: {
		"quads": 0.8, "glutes": 0.8, "hamstrings": 0.8, "calves": 0.6, "lower_back": 0.4,
	},
	archetypeFullBody: {
		"chest": 0.5, "lats": 0.5, "quads": 0.5, "glutes": 0.5, "front_delt": 0.4, "hamstrings": 0.4, "core": 0.4,
	},
	archetypeCardioImpact: {
		"calves": 1.0, "hamstrings": 1.0, "quads": 0.7, "glutes": 0.7, "core": 0.4,
	},
	archetypeCardioLow: {
		"quads": 0.5, "glutes": 0.5, "hamstrings": 0.3, "calves": 0.3,
	},
}

// muscleGroupIDs maps muscle names to their database IDs (from migrations.go)
var muscleGroupIDs = map[string]int{
	"chest":      1,
	"front_delt": 2,
	"triceps":    3,
	"side_delt":  4,
	"lats":       5,
	"traps":      6,
	"biceps":     7,
	"rear_delt":  8,
	"forearms":   9,
	"quads":      10,
	"glutes":     11,
	"hamstrings": 12,
	"calves":     13,
	"lower_back": 14,
	"core":       15,
}

// seedFatigueData processes training sessions and populates fatigue_events and muscle_fatigue tables
func seedFatigueData(db *sql.DB, sessions []trainingSessionResult) error {
	if len(sessions) == 0 {
		fmt.Println("⚠ No training sessions to process for fatigue")
		return nil
	}

	// Sort sessions by time (should already be in order, but ensure)
	// Sessions are already chronological from generateDailyLogs

	// Track current fatigue state per muscle (muscle_name -> fatigue_percent)
	muscleFatigue := make(map[string]float64)
	lastUpdateTime := sessions[0].sessionTime

	// Decay rate: 2% per hour (from domain/fatigue.go)
	const decayPerHour = 2.0

	// Process each session chronologically
	for _, session := range sessions {
		// Calculate total load: duration × (RPE/10) / 10
		totalLoad := float64(session.durationMin) * (float64(session.rpe) / 10.0) / 10.0

		// Get muscle coefficients for this archetype
		coefficients := muscleCoefficients[session.archetypeID]
		if coefficients == nil {
			continue
		}

		// Calculate hours elapsed since last update
		hoursElapsed := session.sessionTime.Sub(lastUpdateTime).Hours()

		// Apply decay to all muscles
		for muscle := range muscleFatigue {
			decayed := muscleFatigue[muscle] - (hoursElapsed * decayPerHour)
			if decayed < 0 {
				decayed = 0
			}
			muscleFatigue[muscle] = decayed
		}

		// Apply fatigue injection from this session
		for muscle, coefficient := range coefficients {
			injectionPercent := totalLoad * coefficient * 100.0
			currentFatigue := muscleFatigue[muscle]
			newFatigue := currentFatigue + injectionPercent
			if newFatigue > 100 {
				newFatigue = 100
			}
			muscleFatigue[muscle] = newFatigue
		}

		// Insert fatigue event record
		eventQuery := `
			INSERT INTO fatigue_events (training_session_id, archetype_id, total_load, applied_at)
			VALUES (?, ?, ?, ?)`
		appliedAt := session.sessionTime.Format("2006-01-02 15:04:05")
		_, err := db.Exec(eventQuery, session.sessionID, session.archetypeID, totalLoad, appliedAt)
		if err != nil {
			return fmt.Errorf("failed to insert fatigue event for session %d: %w", session.sessionID, err)
		}

		lastUpdateTime = session.sessionTime
	}

	// Apply final decay from last session to now
	now := time.Now()
	hoursElapsed := now.Sub(lastUpdateTime).Hours()
	for muscle := range muscleFatigue {
		decayed := muscleFatigue[muscle] - (hoursElapsed * decayPerHour)
		if decayed < 0 {
			decayed = 0
		}
		muscleFatigue[muscle] = decayed
	}

	// Insert current muscle fatigue state
	fatigueQuery := `
		INSERT INTO muscle_fatigue (muscle_group_id, fatigue_percent, last_updated)
		VALUES (?, ?, datetime('now'))`

	musclesWithFatigue := 0
	for muscle, fatigue := range muscleFatigue {
		if fatigue > 0 {
			muscleID := muscleGroupIDs[muscle]
			if muscleID == 0 {
				continue
			}
			_, err := db.Exec(fatigueQuery, muscleID, fatigue)
			if err != nil {
				return fmt.Errorf("failed to insert muscle fatigue for %s: %w", muscle, err)
			}
			musclesWithFatigue++
		}
	}

	fmt.Printf("✓ Fatigue data seeded (%d events, %d muscles with fatigue)\n", len(sessions), musclesWithFatigue)
	return nil
}

// createNutritionPlan creates a 12-week nutrition plan with weekly targets
func createNutritionPlan(db *sql.DB, config SeedConfig) error {
	now := time.Now().UTC()
	planStartDate := config.StartDate.Format("2006-01-02")
	createdAt := now.Format("2006-01-02 15:04:05")

	startWeight := config.InitialWeight
	goalWeight := 72.0
	durationWeeks := 12
	weeklyChange := (goalWeight - startWeight) / float64(durationWeeks)
	dailyDeficit := weeklyChange * 7700 / 7 // 7700 kcal per kg of fat

	query := `
	INSERT INTO nutrition_plans (
		name, start_date, start_weight_kg, goal_weight_kg, duration_weeks,
		required_weekly_change_kg, required_daily_deficit_kcal, status,
		created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`

	result, err := db.Exec(query,
		"Weight Loss Plan",
		planStartDate, startWeight, goalWeight, durationWeeks,
		weeklyChange, dailyDeficit,
		createdAt, createdAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert nutrition plan: %w", err)
	}

	planID, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("failed to get plan ID: %w", err)
	}

	// Create weekly targets for all 12 weeks
	for week := 1; week <= durationWeeks; week++ {
		weekStartDate := config.StartDate.AddDate(0, 0, (week-1)*7)
		weekEndDate := weekStartDate.AddDate(0, 0, 6)

		projectedWeight := startWeight + float64(week)*weeklyChange
		projectedTDEE := 2300 // Base TDEE
		targetIntake := projectedTDEE + int(dailyDeficit)
		targetCarbs := int((float64(targetIntake) * 0.45) / 4)
		targetProtein := int((float64(targetIntake) * 0.30) / 4)
		targetFat := int((float64(targetIntake) * 0.25) / 9)

		// Simulate actual data for completed weeks (weeks 1-4)
		// Week 5 is partial (in progress), weeks 6-12 are future projections
		var actualWeight, actualIntake interface{}
		daysLogged := 0
		if week <= 4 {
			// Completed weeks with full actual data
			actualW := projectedWeight + (rand.Float64()-0.5)*0.8
			actualI := targetIntake + rand.Intn(200) - 100
			actualWeight = actualW
			actualIntake = actualI
			daysLogged = 7
		} else if week == 5 {
			// Current week - partial data (2 days logged so far)
			actualW := projectedWeight + (rand.Float64()-0.5)*0.5
			actualI := targetIntake + rand.Intn(100) - 50
			actualWeight = actualW
			actualIntake = actualI
			daysLogged = 2
		}
		// weeks 6-12: no actual data (future projections only)

		weekQuery := `
		INSERT INTO weekly_targets (
			plan_id, week_number, start_date, end_date,
			projected_weight_kg, projected_tdee, target_intake_kcal,
			target_carbs_g, target_protein_g, target_fats_g,
			actual_weight_kg, actual_intake_kcal, days_logged,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

		_, err := db.Exec(weekQuery,
			planID, week, weekStartDate.Format("2006-01-02"), weekEndDate.Format("2006-01-02"),
			projectedWeight, projectedTDEE, targetIntake,
			targetCarbs, targetProtein, targetFat,
			actualWeight, actualIntake, daysLogged,
			createdAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert weekly target for week %d: %w", week, err)
		}
	}

	fmt.Printf("✓ Nutrition plan with %d weekly targets created\n", durationWeeks)
	return nil
}

// seedPlannedDayTypes seeds planned day types for past 30 days and future 7 days
func seedPlannedDayTypes(db *sql.DB, config SeedConfig, actualDayTypes map[string]string) error {
	now := time.Now()
	createdAt := now.UTC().Format("2006-01-02 15:04:05")

	query := `
	INSERT INTO planned_day_types (plan_date, day_type, created_at, updated_at)
	VALUES (?, ?, ?, ?)`

	// Insert past 30 days (matching actual day types)
	for dateStr, dayType := range actualDayTypes {
		_, err := db.Exec(query, dateStr, dayType, createdAt, createdAt)
		if err != nil {
			return fmt.Errorf("failed to insert planned day type for %s: %w", dateStr, err)
		}
	}

	// Insert future 7 days with planned day types
	dayTypes := []string{"performance", "fatburner", "metabolize"}
	for i := 1; i <= 7; i++ {
		futureDate := now.AddDate(0, 0, i)
		dateStr := futureDate.Format("2006-01-02")
		// Distribute day types: more performance on training days
		dayType := dayTypes[i%3]
		if i == 7 { // Sunday = rest/metabolize
			dayType = "metabolize"
		}

		_, err := db.Exec(query, dateStr, dayType, createdAt, createdAt)
		if err != nil {
			return fmt.Errorf("failed to insert future planned day type for %s: %w", dateStr, err)
		}
	}

	fmt.Printf("✓ Planned day types seeded (30 past + 7 future days)\n")
	return nil
}

// seedPlanHistory creates historical nutrition plans (completed and abandoned)
func seedPlanHistory(db *sql.DB, config SeedConfig) error {
	now := time.Now().UTC()
	createdAt := now.Format("2006-01-02 15:04:05")

	// Plan 1: Completed 8-week plan (ended 2 months ago)
	completedStartDate := config.StartDate.AddDate(0, -3, 0) // Started 3 months ago
	completedStartWeight := 82.0
	completedGoalWeight := 78.0
	completedDuration := 8
	completedWeeklyChange := (completedGoalWeight - completedStartWeight) / float64(completedDuration)
	completedDailyDeficit := completedWeeklyChange * 7700 / 7

	query := `
	INSERT INTO nutrition_plans (
		name, start_date, start_weight_kg, goal_weight_kg, duration_weeks,
		required_weekly_change_kg, required_daily_deficit_kcal, status,
		created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := db.Exec(query,
		"Summer Cut 2025",
		completedStartDate.Format("2006-01-02"), completedStartWeight, completedGoalWeight, completedDuration,
		completedWeeklyChange, completedDailyDeficit, "completed",
		createdAt, createdAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert completed plan: %w", err)
	}

	completedPlanID, _ := result.LastInsertId()

	// Add weekly targets for completed plan (all 8 weeks with actual data)
	for week := 1; week <= completedDuration; week++ {
		weekStartDate := completedStartDate.AddDate(0, 0, (week-1)*7)
		weekEndDate := weekStartDate.AddDate(0, 0, 6)
		projectedWeight := completedStartWeight + float64(week)*completedWeeklyChange
		projectedTDEE := 2400
		targetIntake := projectedTDEE + int(completedDailyDeficit)

		// All weeks completed with actual data
		actualWeight := projectedWeight + (rand.Float64()-0.5)*0.6
		actualIntake := targetIntake + rand.Intn(150) - 75

		weekQuery := `
		INSERT INTO weekly_targets (
			plan_id, week_number, start_date, end_date,
			projected_weight_kg, projected_tdee, target_intake_kcal,
			target_carbs_g, target_protein_g, target_fats_g,
			actual_weight_kg, actual_intake_kcal, days_logged,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

		_, err := db.Exec(weekQuery,
			completedPlanID, week, weekStartDate.Format("2006-01-02"), weekEndDate.Format("2006-01-02"),
			projectedWeight, projectedTDEE, targetIntake,
			int((float64(targetIntake)*0.45)/4), int((float64(targetIntake)*0.30)/4), int((float64(targetIntake)*0.25)/9),
			actualWeight, actualIntake, 7,
			createdAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert weekly target for completed plan week %d: %w", week, err)
		}
	}

	// Plan 2: Abandoned 6-week plan (started but stopped after 3 weeks)
	abandonedStartDate := config.StartDate.AddDate(0, -5, 0) // Started 5 months ago
	abandonedStartWeight := 85.0
	abandonedGoalWeight := 75.0
	abandonedDuration := 6
	abandonedWeeklyChange := (abandonedGoalWeight - abandonedStartWeight) / float64(abandonedDuration)
	abandonedDailyDeficit := abandonedWeeklyChange * 7700 / 7

	result, err = db.Exec(query,
		"New Year Resolution",
		abandonedStartDate.Format("2006-01-02"), abandonedStartWeight, abandonedGoalWeight, abandonedDuration,
		abandonedWeeklyChange, abandonedDailyDeficit, "abandoned",
		createdAt, createdAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert abandoned plan: %w", err)
	}

	abandonedPlanID, _ := result.LastInsertId()

	// Add weekly targets for abandoned plan (only 3 weeks have data)
	for week := 1; week <= abandonedDuration; week++ {
		weekStartDate := abandonedStartDate.AddDate(0, 0, (week-1)*7)
		weekEndDate := weekStartDate.AddDate(0, 0, 6)
		projectedWeight := abandonedStartWeight + float64(week)*abandonedWeeklyChange
		projectedTDEE := 2500
		targetIntake := projectedTDEE + int(abandonedDailyDeficit)

		var actualWeight, actualIntake interface{}
		daysLogged := 0
		if week <= 3 {
			// Only first 3 weeks have data (then abandoned)
			actualWeight = projectedWeight + (rand.Float64()-0.5)*1.0
			actualIntake = targetIntake + rand.Intn(300) - 150 // More variance (struggled with compliance)
			daysLogged = 7 - rand.Intn(2) // 5-7 days logged (inconsistent)
		}

		weekQuery := `
		INSERT INTO weekly_targets (
			plan_id, week_number, start_date, end_date,
			projected_weight_kg, projected_tdee, target_intake_kcal,
			target_carbs_g, target_protein_g, target_fats_g,
			actual_weight_kg, actual_intake_kcal, days_logged,
			created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

		_, err := db.Exec(weekQuery,
			abandonedPlanID, week, weekStartDate.Format("2006-01-02"), weekEndDate.Format("2006-01-02"),
			projectedWeight, projectedTDEE, targetIntake,
			int((float64(targetIntake)*0.45)/4), int((float64(targetIntake)*0.30)/4), int((float64(targetIntake)*0.25)/9),
			actualWeight, actualIntake, daysLogged,
			createdAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert weekly target for abandoned plan week %d: %w", week, err)
		}
	}

	fmt.Println("✓ Plan history seeded (1 completed, 1 abandoned)")
	return nil
}
