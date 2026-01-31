package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"victus/internal/domain"
	"victus/internal/service"
	"victus/internal/store"

	_ "github.com/lib/pq"
)

// Minimal script to verify logic without "go test" permission issues
func main() {
	// Connect to DB (assuming local dev setup)
	connStr := "postgres://postgres:postgres@localhost:5432/victus?sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// Setup deps
	profileStore := store.NewProfileStore(db)
	sessionStore := store.NewTrainingSessionStore(db)
	logStore := store.NewDailyLogStore(db)
	logService := service.NewDailyLogService(logStore, sessionStore, profileStore)

	// 1. Create Profile
	now := time.Now()
	date := now.Format("2006-01-02")
	fmt.Printf("Using date: %s\n", date)

	// Ensure log exists
	input := domain.DailyLogInput{
		Date:     date,
		WeightKg: 80,
	}
	// Try creating (might exist)
	_, _ = logService.Create(ctx, input, now)

	// 2. Update Actual Training
	rpe5 := 5
	sessions := []domain.TrainingSession{
		{
			Type:               domain.TrainingTypeRun,
			DurationMin:        60,
			PerceivedIntensity: &rpe5,
		},
	}

	updatedLog, err := logService.UpdateActualTraining(ctx, date, sessions)
	if err != nil {
		log.Fatalf("UpdateActualTraining failed: %v", err)
	}

	// 3. Verify Active Burn
	if updatedLog.ActiveCaloriesBurned == nil {
		log.Fatalf("ActiveCaloriesBurned is NIL!")
	}

	// LoadScore: Run=3 * (60/60) * (5/3) = 5.0
	// Burn: 5.0 * 80 * 0.25 = 100
	expected := 100 // int(5.0 * 80.0 * 0.25)

	fmt.Printf("Active Calories Burned: %d (Expected: %d)\n", *updatedLog.ActiveCaloriesBurned, expected)

	if *updatedLog.ActiveCaloriesBurned != expected {
		log.Fatalf("MISMATCH! Expected %d, got %d", expected, *updatedLog.ActiveCaloriesBurned)
	}

	fmt.Println("SUCCESS: Logic verified correctly.")
}
