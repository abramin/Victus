package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// WeeklyDebriefService handles generation of weekly debrief reports.
type WeeklyDebriefService struct {
	logStore       *store.DailyLogStore
	sessionStore   *store.TrainingSessionStore
	profileStore   *store.ProfileStore
	metabolicStore *store.MetabolicStore
	ollamaService  *OllamaService
}

// NewWeeklyDebriefService creates a new WeeklyDebriefService.
func NewWeeklyDebriefService(
	ls *store.DailyLogStore,
	ss *store.TrainingSessionStore,
	ps *store.ProfileStore,
	ms *store.MetabolicStore,
	os *OllamaService,
) *WeeklyDebriefService {
	return &WeeklyDebriefService{
		logStore:       ls,
		sessionStore:   ss,
		profileStore:   ps,
		metabolicStore: ms,
		ollamaService:  os,
	}
}

// GenerateWeeklyDebrief generates a complete weekly debrief for the specified week.
// If weekEndDate is zero, uses the most recent completed week (last Sunday).
func (s *WeeklyDebriefService) GenerateWeeklyDebrief(
	ctx context.Context,
	weekEndDate time.Time,
) (*domain.WeeklyDebrief, error) {
	// Calculate week boundaries (Monday to Sunday)
	if weekEndDate.IsZero() {
		weekEndDate = getMostRecentSunday(time.Now())
	}
	weekStartDate := getWeekStartDate(weekEndDate)

	startDateStr := weekStartDate.Format("2006-01-02")
	endDateStr := weekEndDate.Format("2006-01-02")

	// Fetch all data needed for the debrief
	profile, err := s.profileStore.Get(ctx)
	if err != nil {
		return nil, err
	}

	// Get daily logs for the week
	logs, err := s.logStore.ListByDateRange(ctx, startDateStr, endDateStr)
	if err != nil {
		return nil, err
	}

	// Get training sessions for each log
	for i := range logs {
		planned, err := s.sessionStore.GetPlannedByLogID(ctx, logs[i].ID)
		if err == nil {
			logs[i].PlannedSessions = planned
		}
		actual, err := s.sessionStore.GetActualByLogID(ctx, logs[i].ID)
		if err == nil {
			logs[i].ActualSessions = actual
		}
	}

	// Get flux history for metabolic trend (1 week = 7 days)
	var fluxHistory []domain.FluxChartPoint
	if s.metabolicStore != nil {
		points, err := s.metabolicStore.ListForChart(ctx, 1)
		if err == nil {
			fluxHistory = points
		}
	}

	// Build the debrief input for calculations and LLM
	debriefInput := domain.DebriefInput{
		WeekStartDate: startDateStr,
		WeekEndDate:   endDateStr,
		Profile:       profile,
		DailyLogs:     logs,
		FluxHistory:   fluxHistory,
	}

	// Calculate vitality score
	vitalityScore := domain.CalculateVitalityScore(logs, fluxHistory, profile)

	// Build daily breakdown
	dailyBreakdown := domain.BuildDebriefDayPoints(logs)

	// Generate tactical recommendations
	recommendations := domain.GenerateTacticalRecommendations(debriefInput)

	// Build the debrief
	debrief := &domain.WeeklyDebrief{
		WeekStartDate:   startDateStr,
		WeekEndDate:     endDateStr,
		VitalityScore:   vitalityScore,
		Recommendations: recommendations,
		DailyBreakdown:  dailyBreakdown,
		GeneratedAt:     time.Now().UTC().Format(time.RFC3339),
	}

	// Generate narrative (LLM with fallback)
	debrief.Narrative = s.ollamaService.GenerateDebriefNarrative(ctx, debriefInput, debrief)

	return debrief, nil
}

// GetCurrentWeekInProgress returns a partial debrief for the current incomplete week.
// Useful for "sneak peek" functionality mid-week.
func (s *WeeklyDebriefService) GetCurrentWeekInProgress(ctx context.Context) (*domain.WeeklyDebrief, error) {
	now := time.Now()
	weekStartDate := getWeekStartDate(now)
	yesterday := now.AddDate(0, 0, -1)

	// Use yesterday as end date (don't include today which is incomplete)
	if yesterday.Before(weekStartDate) {
		// It's Monday, no data yet for current week
		return nil, store.ErrInsufficientData
	}

	return s.GenerateWeeklyDebrief(ctx, yesterday)
}

// getMostRecentSunday returns the most recent Sunday (including today if it's Sunday).
func getMostRecentSunday(t time.Time) time.Time {
	weekday := int(t.Weekday())
	if weekday == 0 {
		// It's Sunday
		return t
	}
	// Go back to previous Sunday
	daysBack := weekday
	return t.AddDate(0, 0, -daysBack)
}

// getWeekStartDate returns the Monday of the week containing the given date.
func getWeekStartDate(t time.Time) time.Time {
	weekday := int(t.Weekday())
	if weekday == 0 {
		// Sunday - go back 6 days to Monday
		return t.AddDate(0, 0, -6)
	}
	// Go back to Monday (weekday 1 = Monday, so go back weekday-1 days)
	return t.AddDate(0, 0, -(weekday - 1))
}

// ParseWeekDate parses a date string and returns the week containing it.
// Returns the Monday start and Sunday end of that week.
func ParseWeekDate(dateStr string) (start time.Time, end time.Time, err error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	start = getWeekStartDate(t)
	end = start.AddDate(0, 0, 6) // Sunday
	return start, end, nil
}
