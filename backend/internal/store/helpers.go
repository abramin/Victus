package store

import (
	"context"
	"database/sql"
	"strings"
)

// sqlExecer abstracts sql.DB and sql.Tx for executing queries.
type sqlExecer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

// isUniqueConstraint checks if error is a SQLite unique constraint violation.
func isUniqueConstraint(err error) bool {
	return strings.Contains(err.Error(), "UNIQUE constraint")
}
