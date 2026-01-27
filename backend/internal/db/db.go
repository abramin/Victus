package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	_ "modernc.org/sqlite"
)

// DBType represents the database type.
type DBType string

const (
	DBTypeSQLite   DBType = "sqlite"
	DBTypePostgres DBType = "postgres"
)

// Config holds database configuration values.
type Config struct {
	Path        string // For SQLite
	DatabaseURL string // For PostgreSQL (postgres://user:pass@host:port/dbname)
}

// DB wraps sql.DB with database type info.
type DB struct {
	*sql.DB
	Type DBType
}

// Connect opens a database connection using the provided configuration.
// If DATABASE_URL environment variable is set, uses PostgreSQL.
// Otherwise falls back to SQLite with the provided path.
func Connect(cfg Config) (*DB, error) {
	// Check for DATABASE_URL first (PostgreSQL)
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = cfg.DatabaseURL
	}

	if dbURL != "" && strings.HasPrefix(dbURL, "postgres") {
		return connectPostgres(dbURL)
	}

	// Fall back to SQLite
	return connectSQLite(cfg.Path)
}

func connectPostgres(dbURL string) (*DB, error) {
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return nil, fmt.Errorf("opening postgres database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pinging postgres database: %w", err)
	}

	// Configure connection pool for concurrent access
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &DB{DB: db, Type: DBTypePostgres}, nil
}

func connectSQLite(path string) (*DB, error) {
	if path == "" {
		return nil, fmt.Errorf("database path is required")
	}

	dsn := path

	// Handle in-memory database: use shared cache so all connections
	// access the same in-memory database (critical for connection pooling)
	if path == ":memory:" {
		dsn = "file::memory:?cache=shared"
	}

	dir := filepath.Dir(path)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("creating database directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening sqlite database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("pinging sqlite database: %w", err)
	}

	// Enable WAL mode for better concurrent write handling
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
	db.SetMaxOpenConns(1)

	return &DB{DB: db, Type: DBTypeSQLite}, nil
}
