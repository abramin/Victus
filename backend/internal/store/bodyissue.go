package store

import (
	"context"
	"database/sql"
	"time"

	"victus/internal/domain"
)

// BodyIssueStore handles database operations for body part issues.
type BodyIssueStore struct {
	db DBTX
}

// NewBodyIssueStore creates a new BodyIssueStore.
func NewBodyIssueStore(db DBTX) *BodyIssueStore {
	return &BodyIssueStore{db: db}
}

// Create inserts a new body part issue into the database.
func (s *BodyIssueStore) Create(ctx context.Context, input domain.BodyPartIssueInput) (*domain.BodyPartIssue, error) {
	severity := domain.GetSymptomSeverity(input.Symptom)
	if severity == 0 {
		severity = domain.IssueSeverityMinor // Default to minor if symptom not recognized
	}

	const query = `
		INSERT INTO body_part_issues (date, body_part, symptom, severity, raw_text, session_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
	`

	result, err := s.db.ExecContext(ctx, query,
		input.Date,
		input.BodyPart,
		input.Symptom,
		severity,
		input.RawText,
		input.SessionID,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return s.GetByID(ctx, id)
}

// CreateBatch inserts multiple body part issues in a single transaction.
func (s *BodyIssueStore) CreateBatch(ctx context.Context, inputs []domain.BodyPartIssueInput) ([]domain.BodyPartIssue, error) {
	if len(inputs) == 0 {
		return []domain.BodyPartIssue{}, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	const query = `
		INSERT INTO body_part_issues (date, body_part, symptom, severity, raw_text, session_id, created_at)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
	`

	var ids []int64
	for _, input := range inputs {
		severity := domain.GetSymptomSeverity(input.Symptom)
		if severity == 0 {
			severity = domain.IssueSeverityMinor
		}

		result, err := tx.ExecContext(ctx, query,
			input.Date,
			input.BodyPart,
			input.Symptom,
			severity,
			input.RawText,
			input.SessionID,
		)
		if err != nil {
			return nil, err
		}

		id, err := result.LastInsertId()
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Fetch all created issues
	issues := make([]domain.BodyPartIssue, 0, len(ids))
	for _, id := range ids {
		issue, err := s.GetByID(ctx, id)
		if err != nil {
			return nil, err
		}
		if issue != nil {
			issues = append(issues, *issue)
		}
	}

	return issues, nil
}

// GetByID retrieves a body part issue by its ID.
func (s *BodyIssueStore) GetByID(ctx context.Context, id int64) (*domain.BodyPartIssue, error) {
	const query = `
		SELECT id, date, body_part, symptom, severity, raw_text, session_id, created_at
		FROM body_part_issues
		WHERE id = ?
	`

	var issue domain.BodyPartIssue
	var createdAtStr string

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&issue.ID,
		&issue.Date,
		&issue.BodyPart,
		&issue.Symptom,
		&issue.Severity,
		&issue.RawText,
		&issue.SessionID,
		&createdAtStr,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	issue.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
	return &issue, nil
}

// GetByDateRange retrieves all body part issues within a date range.
func (s *BodyIssueStore) GetByDateRange(ctx context.Context, startDate, endDate string) ([]domain.BodyPartIssue, error) {
	const query = `
		SELECT id, date, body_part, symptom, severity, raw_text, session_id, created_at
		FROM body_part_issues
		WHERE date >= ? AND date <= ?
		ORDER BY date DESC, created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []domain.BodyPartIssue
	for rows.Next() {
		var issue domain.BodyPartIssue
		var createdAtStr string

		if err := rows.Scan(
			&issue.ID,
			&issue.Date,
			&issue.BodyPart,
			&issue.Symptom,
			&issue.Severity,
			&issue.RawText,
			&issue.SessionID,
			&createdAtStr,
		); err != nil {
			return nil, err
		}

		issue.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// GetActiveIssues retrieves all body part issues that are still active (within decay period).
// Issues older than IssueDecayDays are considered inactive.
func (s *BodyIssueStore) GetActiveIssues(ctx context.Context) ([]domain.BodyPartIssue, error) {
	const query = `
		SELECT id, date, body_part, symptom, severity, raw_text, session_id, created_at
		FROM body_part_issues
		WHERE date >= date('now', '-' || ? || ' days')
		ORDER BY date DESC, created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, domain.IssueDecayDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []domain.BodyPartIssue
	for rows.Next() {
		var issue domain.BodyPartIssue
		var createdAtStr string

		if err := rows.Scan(
			&issue.ID,
			&issue.Date,
			&issue.BodyPart,
			&issue.Symptom,
			&issue.Severity,
			&issue.RawText,
			&issue.SessionID,
			&createdAtStr,
		); err != nil {
			return nil, err
		}

		issue.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// GetActiveIssuesByMuscle retrieves active issues for a specific muscle group.
func (s *BodyIssueStore) GetActiveIssuesByMuscle(ctx context.Context, muscle domain.MuscleGroup) ([]domain.BodyPartIssue, error) {
	const query = `
		SELECT id, date, body_part, symptom, severity, raw_text, session_id, created_at
		FROM body_part_issues
		WHERE body_part = ?
		  AND date >= date('now', '-' || ? || ' days')
		ORDER BY date DESC, created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, muscle, domain.IssueDecayDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []domain.BodyPartIssue
	for rows.Next() {
		var issue domain.BodyPartIssue
		var createdAtStr string

		if err := rows.Scan(
			&issue.ID,
			&issue.Date,
			&issue.BodyPart,
			&issue.Symptom,
			&issue.Severity,
			&issue.RawText,
			&issue.SessionID,
			&createdAtStr,
		); err != nil {
			return nil, err
		}

		issue.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAtStr)
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// Delete removes a body part issue by ID.
func (s *BodyIssueStore) Delete(ctx context.Context, id int64) error {
	const query = `DELETE FROM body_part_issues WHERE id = ?`
	_, err := s.db.ExecContext(ctx, query, id)
	return err
}

// DeleteByDate removes all body part issues for a specific date.
func (s *BodyIssueStore) DeleteByDate(ctx context.Context, date string) error {
	const query = `DELETE FROM body_part_issues WHERE date = ?`
	_, err := s.db.ExecContext(ctx, query, date)
	return err
}
