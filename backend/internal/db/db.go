package db

import (
	"context"
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

// DB wraps sql.DB with database type info and query rebinding.
type DB struct {
	*sql.DB
	Type DBType
}

// Rebind converts ? placeholders to $1, $2, ... for PostgreSQL.
// For SQLite, returns the query unchanged.
func (d *DB) Rebind(query string) string {
	if d.Type != DBTypePostgres {
		return query
	}
	return rebindPostgres(query)
}

// rebindPostgres converts ? placeholders to $1, $2, etc.
func rebindPostgres(query string) string {
	var result strings.Builder
	result.Grow(len(query) + 10)
	argNum := 1
	for i := 0; i < len(query); i++ {
		if query[i] == '?' {
			result.WriteString(fmt.Sprintf("$%d", argNum))
			argNum++
		} else {
			result.WriteByte(query[i])
		}
	}
	return result.String()
}

// DBTX is the interface for database operations, compatible with *sql.DB and *sql.Tx.
type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// RebindDB wraps a sql.DB and automatically rebinds queries for PostgreSQL.
type RebindDB struct {
	db     *sql.DB
	dbType DBType
}

// NewRebindDB creates a new RebindDB wrapper.
func (d *DB) NewRebindDB() *RebindDB {
	return &RebindDB{db: d.DB, dbType: d.Type}
}

// Underlying returns the underlying *sql.DB for operations that need it directly.
func (r *RebindDB) Underlying() *sql.DB {
	return r.db
}

func (r *RebindDB) rebind(query string) string {
	if r.dbType != DBTypePostgres {
		return query
	}
	return rebindPostgres(query)
}

// ExecContext executes a query with automatic rebinding.
func (r *RebindDB) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return r.db.ExecContext(ctx, r.rebind(query), args...)
}

// QueryContext executes a query with automatic rebinding.
func (r *RebindDB) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return r.db.QueryContext(ctx, r.rebind(query), args...)
}

// QueryRowContext executes a query with automatic rebinding.
func (r *RebindDB) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	return r.db.QueryRowContext(ctx, r.rebind(query), args...)
}

// Exec executes a query with automatic rebinding (non-context version).
func (r *RebindDB) Exec(query string, args ...any) (sql.Result, error) {
	return r.db.Exec(r.rebind(query), args...)
}

// Query executes a query with automatic rebinding (non-context version).
func (r *RebindDB) Query(query string, args ...any) (*sql.Rows, error) {
	return r.db.Query(r.rebind(query), args...)
}

// QueryRow executes a query with automatic rebinding (non-context version).
func (r *RebindDB) QueryRow(query string, args ...any) *sql.Row {
	return r.db.QueryRow(r.rebind(query), args...)
}

// BeginTx starts a transaction.
func (r *RebindDB) BeginTx(ctx context.Context, opts *sql.TxOptions) (*sql.Tx, error) {
	return r.db.BeginTx(ctx, opts)
}

// Close closes the database connection.
func (r *RebindDB) Close() error {
	return r.db.Close()
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
