// Package testutil provides shared test utilities for PostgreSQL integration tests.
package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"victus/internal/db"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// PostgresContainer wraps a testcontainers PostgreSQL instance.
type PostgresContainer struct {
	container *postgres.PostgresContainer
	DB        *sql.DB
}

// SetupPostgres creates a new PostgreSQL container for testing.
// The container is automatically cleaned up when the test completes.
func SetupPostgres(t *testing.T) *PostgresContainer {
	t.Helper()

	ctx := context.Background()

	container, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("victus_test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	// Get connection string
	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		container.Terminate(ctx)
		t.Fatalf("failed to get connection string: %v", err)
	}

	// Open database connection
	database, err := sql.Open("pgx", connStr)
	if err != nil {
		container.Terminate(ctx)
		t.Fatalf("failed to open database: %v", err)
	}

	// Run migrations
	if err := db.RunMigrations(database); err != nil {
		database.Close()
		container.Terminate(ctx)
		t.Fatalf("failed to run migrations: %v", err)
	}

	pc := &PostgresContainer{
		container: container,
		DB:        database,
	}

	// Register cleanup
	t.Cleanup(func() {
		pc.Close()
	})

	return pc
}

// Close terminates the PostgreSQL container and closes the database connection.
func (pc *PostgresContainer) Close() {
	if pc.DB != nil {
		pc.DB.Close()
	}
	if pc.container != nil {
		pc.container.Terminate(context.Background())
	}
}

// ClearTables truncates all user data tables for test isolation.
// Preserves seeded reference data (training_configs, muscle_groups, etc.).
func (pc *PostgresContainer) ClearTables(ctx context.Context) error {
	tables := []string{
		"fatigue_events",
		"body_part_issues",
		"muscle_fatigue",
		"training_sessions",
		"program_installations",
		"program_days",
		"program_weeks",
		"training_programs",
		"metabolic_history",
		"monthly_summaries",
		"weekly_targets",
		"nutrition_plans",
		"planned_day_types",
		"daily_logs",
		"user_profile",
	}

	for _, table := range tables {
		_, err := pc.DB.ExecContext(ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
		if err != nil {
			return fmt.Errorf("failed to truncate %s: %w", table, err)
		}
	}

	return nil
}
