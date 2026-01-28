package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Config holds database configuration values.
type Config struct {
	DatabaseURL string // PostgreSQL connection URL (postgres://user:pass@host:port/dbname)
}

// DB wraps sql.DB with transaction support.
type DB struct {
	*sql.DB
}

// DBTX is the interface for database operations, compatible with *sql.DB and *sql.Tx.
type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error)
}

// Connect opens a PostgreSQL database connection with retry/backoff.
// Polls until postgres is reachable or maxRetries is exhausted.
// Requires DATABASE_URL environment variable or config.DatabaseURL to be set.
func Connect(cfg Config) (*DB, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = cfg.DatabaseURL
	}

	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	const maxRetries = 30
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		db, err := sql.Open("pgx", dbURL)
		if err != nil {
			return nil, fmt.Errorf("opening postgres database: %w", err)
		}

		if err := db.Ping(); err != nil {
			db.Close()
			lastErr = err
			if attempt < maxRetries {
				log.Printf("waiting for database (attempt %d/%d): %v", attempt, maxRetries, err)
				time.Sleep(time.Second)
			}
			continue
		}

		// Configure connection pool for concurrent access
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(5)

		return &DB{DB: db}, nil
	}

	return nil, fmt.Errorf("pinging postgres database after %d attempts: %w", maxRetries, lastErr)
}

// BeginTx starts a transaction.
func (d *DB) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error) {
	return d.DB.BeginTx(ctx, opts)
}
