package store

import (
	"context"
	"database/sql"
	"strings"
)

// sqlExecer abstracts sql.DB and sql.Tx for executing queries.
type sqlExecer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// isUniqueConstraint checks if error is a unique constraint violation (PostgreSQL).
func isUniqueConstraint(err error) bool {
	// PostgreSQL unique violation error codes/messages
	return strings.Contains(err.Error(), "duplicate key value violates unique constraint") ||
		strings.Contains(err.Error(), "UNIQUE constraint") // Keep for any edge cases
}
