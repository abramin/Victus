package store

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"victus/internal/domain"
)

// Plan store errors
var (
	ErrPlanNotFound      = errors.New("nutrition plan not found")
	ErrActivePlanExists  = errors.New("an active nutrition plan already exists")
)

// NutritionPlanStore handles database operations for nutrition plans.
type NutritionPlanStore struct {
	db DBTX
}

// NewNutritionPlanStore creates a new NutritionPlanStore.
func NewNutritionPlanStore(db DBTX) *NutritionPlanStore {
	return &NutritionPlanStore{db: db}
}

// Create creates a new nutrition plan with its weekly targets.
// Returns ErrActivePlanExists if an active plan already exists.
func (s *NutritionPlanStore) Create(ctx context.Context, plan *domain.NutritionPlan) (int64, error) {
	// Check for existing active plan
	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM nutrition_plans WHERE status = 'active'").Scan(&count)
	if err != nil {
		return 0, err
	}
	if count > 0 {
		return 0, ErrActivePlanExists
	}

	// Start transaction for plan + weekly targets
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// Insert plan
	const planQuery = `
		INSERT INTO nutrition_plans (
			name, start_date, start_weight_kg, goal_weight_kg, duration_weeks,
			required_weekly_change_kg, required_daily_deficit_kcal, status,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
	`

	result, err := tx.ExecContext(ctx, planQuery,
		plan.Name,
		plan.StartDate.Format("2006-01-02"),
		plan.StartWeightKg,
		plan.GoalWeightKg,
		plan.DurationWeeks,
		plan.RequiredWeeklyChangeKg,
		plan.RequiredDailyDeficitKcal,
		plan.Status,
	)
	if err != nil {
		return 0, err
	}

	planID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	// Insert weekly targets
	const targetQuery = `
		INSERT INTO weekly_targets (
			plan_id, week_number, start_date, end_date,
			projected_weight_kg, projected_tdee, target_intake_kcal,
			target_carbs_g, target_protein_g, target_fats_g,
			days_logged
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
	`

	for _, target := range plan.WeeklyTargets {
		_, err := tx.ExecContext(ctx, targetQuery,
			planID,
			target.WeekNumber,
			target.StartDate.Format("2006-01-02"),
			target.EndDate.Format("2006-01-02"),
			target.ProjectedWeightKg,
			target.ProjectedTDEE,
			target.TargetIntakeKcal,
			target.TargetCarbsG,
			target.TargetProteinG,
			target.TargetFatsG,
		)
		if err != nil {
			return 0, err
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return planID, nil
}

// GetByID retrieves a nutrition plan by ID with its weekly targets.
func (s *NutritionPlanStore) GetByID(ctx context.Context, id int64) (*domain.NutritionPlan, error) {
	const query = `
		SELECT
			id, COALESCE(name, ''), start_date, start_weight_kg, goal_weight_kg, duration_weeks,
			required_weekly_change_kg, required_daily_deficit_kcal, status,
			created_at, updated_at
		FROM nutrition_plans
		WHERE id = ?
	`

	var plan domain.NutritionPlan
	var startDate, createdAt, updatedAt string

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&plan.ID,
		&plan.Name,
		&startDate,
		&plan.StartWeightKg,
		&plan.GoalWeightKg,
		&plan.DurationWeeks,
		&plan.RequiredWeeklyChangeKg,
		&plan.RequiredDailyDeficitKcal,
		&plan.Status,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPlanNotFound
	}
	if err != nil {
		return nil, err
	}

	plan.StartDate, _ = time.Parse("2006-01-02", startDate)
	plan.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
	plan.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

	// Load weekly targets
	targets, err := s.getWeeklyTargets(ctx, plan.ID)
	if err != nil {
		return nil, err
	}
	plan.WeeklyTargets = targets

	return &plan, nil
}

// GetActive retrieves the currently active nutrition plan.
func (s *NutritionPlanStore) GetActive(ctx context.Context) (*domain.NutritionPlan, error) {
	const query = `
		SELECT id FROM nutrition_plans WHERE status = 'active' LIMIT 1
	`

	var id int64
	err := s.db.QueryRowContext(ctx, query).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPlanNotFound
	}
	if err != nil {
		return nil, err
	}

	return s.GetByID(ctx, id)
}

// UpdateStatus updates the status of a nutrition plan.
func (s *NutritionPlanStore) UpdateStatus(ctx context.Context, id int64, status domain.PlanStatus) error {
	const query = `
		UPDATE nutrition_plans
		SET status = ?, updated_at = datetime('now')
		WHERE id = ?
	`

	result, err := s.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrPlanNotFound
	}

	return nil
}

// UpdateWeeklyActuals updates the actual weight and intake for a weekly target.
func (s *NutritionPlanStore) UpdateWeeklyActuals(ctx context.Context, planID int64, weekNumber int, actualWeight *float64, actualIntake *int, daysLogged int) error {
	const query = `
		UPDATE weekly_targets
		SET actual_weight_kg = ?, actual_intake_kcal = ?, days_logged = ?
		WHERE plan_id = ? AND week_number = ?
	`

	result, err := s.db.ExecContext(ctx, query, actualWeight, actualIntake, daysLogged, planID, weekNumber)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrPlanNotFound
	}

	return nil
}

// UpdatePlan updates a nutrition plan and replaces its weekly targets.
// Used during recalibration to apply new goals, duration, or calorie targets.
func (s *NutritionPlanStore) UpdatePlan(ctx context.Context, plan *domain.NutritionPlan) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update plan fields
	const updatePlanQuery = `
		UPDATE nutrition_plans
		SET goal_weight_kg = ?, duration_weeks = ?,
			required_weekly_change_kg = ?, required_daily_deficit_kcal = ?,
			updated_at = datetime('now')
		WHERE id = ?
	`

	result, err := tx.ExecContext(ctx, updatePlanQuery,
		plan.GoalWeightKg,
		plan.DurationWeeks,
		plan.RequiredWeeklyChangeKg,
		plan.RequiredDailyDeficitKcal,
		plan.ID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return ErrPlanNotFound
	}

	// Delete existing weekly targets
	_, err = tx.ExecContext(ctx, "DELETE FROM weekly_targets WHERE plan_id = ?", plan.ID)
	if err != nil {
		return err
	}

	// Insert new weekly targets
	const insertTargetQuery = `
		INSERT INTO weekly_targets (
			plan_id, week_number, start_date, end_date,
			projected_weight_kg, projected_tdee, target_intake_kcal,
			target_carbs_g, target_protein_g, target_fats_g,
			actual_weight_kg, actual_intake_kcal, days_logged
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	for _, target := range plan.WeeklyTargets {
		_, err := tx.ExecContext(ctx, insertTargetQuery,
			plan.ID,
			target.WeekNumber,
			target.StartDate.Format("2006-01-02"),
			target.EndDate.Format("2006-01-02"),
			target.ProjectedWeightKg,
			target.ProjectedTDEE,
			target.TargetIntakeKcal,
			target.TargetCarbsG,
			target.TargetProteinG,
			target.TargetFatsG,
			target.ActualWeightKg,
			target.ActualIntakeKcal,
			target.DaysLogged,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// Delete removes a nutrition plan and its weekly targets (cascade).
func (s *NutritionPlanStore) Delete(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, "DELETE FROM nutrition_plans WHERE id = ?", id)
	return err
}

// ListAll retrieves all nutrition plans ordered by start date descending.
func (s *NutritionPlanStore) ListAll(ctx context.Context) ([]*domain.NutritionPlan, error) {
	const query = `
		SELECT
			id, COALESCE(name, ''), start_date, start_weight_kg, goal_weight_kg, duration_weeks,
			required_weekly_change_kg, required_daily_deficit_kcal, status,
			created_at, updated_at
		FROM nutrition_plans
		ORDER BY start_date DESC
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*domain.NutritionPlan
	for rows.Next() {
		var plan domain.NutritionPlan
		var startDate, createdAt, updatedAt string

		err := rows.Scan(
			&plan.ID,
			&plan.Name,
			&startDate,
			&plan.StartWeightKg,
			&plan.GoalWeightKg,
			&plan.DurationWeeks,
			&plan.RequiredWeeklyChangeKg,
			&plan.RequiredDailyDeficitKcal,
			&plan.Status,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			return nil, err
		}

		plan.StartDate, _ = time.Parse("2006-01-02", startDate)
		plan.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdAt)
		plan.UpdatedAt, _ = time.Parse("2006-01-02 15:04:05", updatedAt)

		plans = append(plans, &plan)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return plans, nil
}

// getWeeklyTargets retrieves all weekly targets for a plan.
func (s *NutritionPlanStore) getWeeklyTargets(ctx context.Context, planID int64) ([]domain.WeeklyTarget, error) {
	const query = `
		SELECT
			id, plan_id, week_number, start_date, end_date,
			projected_weight_kg, projected_tdee, target_intake_kcal,
			target_carbs_g, target_protein_g, target_fats_g,
			actual_weight_kg, actual_intake_kcal, days_logged
		FROM weekly_targets
		WHERE plan_id = ?
		ORDER BY week_number ASC
	`

	rows, err := s.db.QueryContext(ctx, query, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []domain.WeeklyTarget
	for rows.Next() {
		var target domain.WeeklyTarget
		var startDate, endDate string
		var actualWeight sql.NullFloat64
		var actualIntake sql.NullInt64

		err := rows.Scan(
			&target.ID,
			&target.PlanID,
			&target.WeekNumber,
			&startDate,
			&endDate,
			&target.ProjectedWeightKg,
			&target.ProjectedTDEE,
			&target.TargetIntakeKcal,
			&target.TargetCarbsG,
			&target.TargetProteinG,
			&target.TargetFatsG,
			&actualWeight,
			&actualIntake,
			&target.DaysLogged,
		)
		if err != nil {
			return nil, err
		}

		target.StartDate, _ = time.Parse("2006-01-02", startDate)
		target.EndDate, _ = time.Parse("2006-01-02", endDate)

		if actualWeight.Valid {
			w := actualWeight.Float64
			target.ActualWeightKg = &w
		}
		if actualIntake.Valid {
			i := int(actualIntake.Int64)
			target.ActualIntakeKcal = &i
		}

		targets = append(targets, target)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return targets, nil
}

