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
	if err := db.RunMigrations(database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	config := SeedConfig{
		DBPath:        dbPath,
		StartDate:     time.Now().AddDate(0, 0, -28), // Start 4 weeks ago
		WeeksOfData:   4,
		InitialWeight: 78.0,  // kg - realistic starting weight
		UserHeight:    175.0, // cm
		UserBirthDate: time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC),
		UserSex:       "male",
		UserGoal:      "lose_weight",
	}

	fmt.Println("🌱 Seeding Victus database with 4 weeks of data...")
	fmt.Printf("Database: %s\n", config.DBPath)
	fmt.Printf("Start Date: %s\n", config.StartDate.Format("2006-01-02"))

	if err := seedDatabase(database, config); err != nil {
		log.Fatalf("Seeding failed: %v", err)
	}

	fmt.Println("✅ Seeding completed successfully!")
}

func seedDatabase(db *sql.DB, config SeedConfig) error {
	// Clear existing data to allow fresh seed
	_, _ = db.Exec("DELETE FROM training_sessions")
	_, _ = db.Exec("DELETE FROM daily_logs")
	_, _ = db.Exec("DELETE FROM user_profile")

	// Create or clear existing profile
	if err := createUserProfile(db, config); err != nil {
		return fmt.Errorf("failed to create user profile: %w", err)
	}

	// Generate daily logs for 4 weeks
	if err := generateDailyLogs(db, config); err != nil {
		return fmt.Errorf("failed to generate daily logs: %w", err)
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

func generateDailyLogs(db *sql.DB, config SeedConfig) error {
	rand.Seed(time.Now().UnixNano())

	totalDays := config.WeeksOfData * 7
	currentWeight := config.InitialWeight

	// Training plan: mix of intensity levels throughout the week
	trainingPatterns := [][]string{
		{"strength", "rest", "run", "strength", "mobility", "cycle", "strength"}, // Week 1
		{"rest", "row", "strength", "mobility", "hiit", "strength", "strength"},  // Week 2
		{"strength", "strength", "rest", "run", "strength", "mobility", "cycle"}, // Week 3
		{"hiit", "strength", "mobility", "strength", "rest", "row", "strength"},  // Week 4
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
		})
		if err != nil {
			return fmt.Errorf("failed to insert daily log for %s: %w", dateStr, err)
		}

		// Insert training sessions (some days have multiple)
		if trainingType != "rest" {
			if err := insertTrainingSession(db, logID, trainingType, durationMin, true); err != nil {
				return fmt.Errorf("failed to insert training session for %s (type=%s): %w", dateStr, trainingType, err)
			}

			// 30% chance of a secondary session (usually lower intensity)
			if rand.Float64() < 0.3 {
				secondaryType := getSecondaryTraining(trainingType)
				secondaryDuration := rand.Intn(30) + 15
				if err := insertTrainingSession(db, logID, secondaryType, secondaryDuration, true); err != nil {
					return fmt.Errorf("failed to insert secondary training session for %s (type=%s): %w", dateStr, secondaryType, err)
				}
			}
		}

		if (day+1)%7 == 0 {
			fmt.Printf("✓ Week %d complete (Days 1-%d) | Weight: %.1f kg\n", (day/7)+1, day+1, currentWeight)
		}
	}

	return nil
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
	trainingDurationMin int
	carbTargetG         int
	proteinTargetG      int
	fatTargetG          int
	estimatedTDEE       int
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
		day_type, estimated_tdee,
		tdee_source_used, tdee_confidence, data_points_used,
		created_at, updated_at
	) VALUES (
		?, ?, ?, ?,
		?, ?,
		?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?, ?,
		?, ?,
		'formula', 0, 0,
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
		params.dayType, params.estimatedTDEE,
		now, now,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

func insertTrainingSession(db *sql.DB, logID int64, trainingType string, durationMin int, isPlanned bool) error {
	query := `
	INSERT INTO training_sessions (
		daily_log_id, session_order, is_planned, training_type, duration_min, perceived_intensity, created_at
	) VALUES (
		?, ?, ?, ?, ?, ?, ?
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
		return err
	}

	order := maxOrder + 1
	intensity := rand.Intn(4) + 6 // RPE 6-9 (realistic training intensity)
	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	_, err = db.Exec(query, logID, order, plannedInt, trainingType, durationMin, intensity, now)
	return err
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
