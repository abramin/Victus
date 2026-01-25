package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// Config holds database configuration values.
type Config struct {
	Path string
}

// Connect opens a SQLite database using the provided configuration.
// If the directory for the database does not exist it will be created.
func Connect(cfg Config) (*sql.DB, error) {
	if cfg.Path == "" {
		return nil, fmt.Errorf("database path is required")
	}

	dsn := cfg.Path

	// Handle in-memory database: use shared cache so all connections
	// access the same in-memory database (critical for connection pooling)
	if cfg.Path == ":memory:" {
		dsn = "file::memory:?cache=shared"
	}

	dir := filepath.Dir(cfg.Path)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("creating database directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	// Enable WAL mode for better concurrent write handling
	// Without this, concurrent writes cause "database is locked" errors
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		db.Close()
		return nil, fmt.Errorf("enabling WAL mode: %w", err)
	}

	// Set busy timeout to wait for locks instead of failing immediately
	if _, err := db.Exec("PRAGMA busy_timeout=5000"); err != nil {
		db.Close()
		return nil, fmt.Errorf("setting busy timeout: %w", err)
	}

	// Limit to single connection - SQLite only supports one writer at a time
	// This serializes all database operations, preventing lock contention
	db.SetMaxOpenConns(1)

	return db, nil
}
