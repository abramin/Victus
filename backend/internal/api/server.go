package api

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"victus/internal/service"
	"victus/internal/store"
)

// Server wraps HTTP server configuration and routing.
type Server struct {
	mux                  *http.ServeMux
	profileService       *service.ProfileService
	dailyLogService      *service.DailyLogService
	trainingConfigStore  *store.TrainingConfigStore
	planService          *service.NutritionPlanService
	analysisService      *service.AnalysisService
	fatigueService       *service.FatigueService
	programService       *service.TrainingProgramService
	metabolicService     *service.MetabolicService
	solverService        *service.SolverService
	weeklyDebriefService *service.WeeklyDebriefService
	importService        *service.ImportService
	bodyIssueService     *service.BodyIssueService
	auditService         *service.AuditService
	echoService          *service.EchoService
	ollamaService        *service.OllamaService
	movementService      *service.MovementService
	systemicLoadService  *service.SystemicLoadService
	plannedDayTypeStore  *store.PlannedDayTypeStore
	plannerSessionStore  *store.PlannerSessionStore
	foodReferenceStore   *store.FoodReferenceStore
	monthlySummaryStore  *store.MonthlySummaryStore
}

// NewServer configures routes and middleware.
func NewServer(db store.DBTX) *Server {
	profileStore := store.NewProfileStore(db)
	dailyLogStore := store.NewDailyLogStore(db)
	trainingSessionStore := store.NewTrainingSessionStore(db)
	trainingConfigStore := store.NewTrainingConfigStore(db)
	planStore := store.NewNutritionPlanStore(db)
	plannedDayTypeStore := store.NewPlannedDayTypeStore(db)
	plannerSessionStore := store.NewPlannerSessionStore(db)
	foodReferenceStore := store.NewFoodReferenceStore(db)
	fatigueStore := store.NewFatigueStore(db)
	programStore := store.NewTrainingProgramStore(db)
	metabolicStore := store.NewMetabolicStore(db)
	monthlySummaryStore := store.NewMonthlySummaryStore(db)
	bodyIssueStore := store.NewBodyIssueStore(db)
	movementStore := store.NewMovementStore(db)

	// Create services
	dailyLogService := service.NewDailyLogService(dailyLogStore, trainingSessionStore, profileStore)
	dailyLogService.SetMetabolicStore(metabolicStore) // Enable Flux Engine

	// Create Ollama service for AI recipe naming (uses localhost:11434 by default)
	ollamaURL := os.Getenv("OLLAMA_URL")
	ollamaService := service.NewOllamaService(ollamaURL)
	dailyLogService.SetOllamaService(ollamaService) // Enable AI insights

	// Create fatigue service with body issue integration
	fatigueService := service.NewFatigueService(fatigueStore)
	fatigueService.SetBodyIssueStore(bodyIssueStore) // Enable Semantic Body fatigue modifiers

	// Create movement service for Adaptive Movement Engine
	movementService := service.NewMovementService(movementStore, fatigueService)

	// Create solver service for Macro Tetris feature
	solverService := service.NewSolverService(foodReferenceStore, ollamaService, fatigueService)

	// Create weekly debrief service for Mission Report feature
	weeklyDebriefService := service.NewWeeklyDebriefService(
		dailyLogStore, trainingSessionStore, profileStore, metabolicStore, ollamaService,
	)

	// Create audit service for Strategy Auditor (Check Engine light)
	auditService := service.NewAuditService(fatigueStore, dailyLogStore, plannedDayTypeStore, ollamaURL)

	// Create systemic load service for Systemic Gyroscope (Load Balancing)
	systemicLoadService := service.NewSystemicLoadService(dailyLogService, fatigueService, ollamaService)

	mux := http.NewServeMux()
	srv := &Server{
		mux:                  mux,
		profileService:       service.NewProfileService(profileStore),
		dailyLogService:      dailyLogService,
		trainingConfigStore:  trainingConfigStore,
		planService:          service.NewNutritionPlanService(planStore, profileStore),
		analysisService:      service.NewAnalysisService(planStore, profileStore, dailyLogStore),
		fatigueService:       fatigueService,
		programService:       service.NewTrainingProgramService(programStore, plannedDayTypeStore),
		metabolicService:     service.NewMetabolicService(metabolicStore, dailyLogStore),
		solverService:        solverService,
		weeklyDebriefService: weeklyDebriefService,
		importService:        service.NewImportService(dailyLogStore, monthlySummaryStore),
		bodyIssueService:     service.NewBodyIssueService(bodyIssueStore),
		auditService:         auditService,
		ollamaService:        ollamaService,
		movementService:      movementService,
		systemicLoadService:  systemicLoadService,
		plannedDayTypeStore:  plannedDayTypeStore,
		plannerSessionStore:  plannerSessionStore,
		foodReferenceStore:   foodReferenceStore,
		monthlySummaryStore:  monthlySummaryStore,
	}

	// Enable AI phase insights for plans
	srv.planService.SetOllamaService(ollamaService)

	// Create echo service for Neural Echo feature
	echoService := service.NewEchoService(trainingSessionStore, bodyIssueStore, dailyLogStore, ollamaService)
	srv.echoService = echoService

	// Health
	mux.HandleFunc("/api/health", srv.healthHandler)

	// Profile routes
	mux.HandleFunc("GET /api/profile", srv.getProfile)
	mux.HandleFunc("PUT /api/profile", srv.upsertProfile)
	mux.HandleFunc("DELETE /api/profile", srv.deleteProfile)

	// Daily log routes
	mux.HandleFunc("POST /api/logs", srv.createDailyLog)
	mux.HandleFunc("GET /api/logs", srv.getLogsRange)
	mux.HandleFunc("GET /api/logs/today", srv.getTodayLog)
	mux.HandleFunc("GET /api/logs/{date}", srv.getLogByDate)
	mux.HandleFunc("DELETE /api/logs/today", srv.deleteTodayLog)
	mux.HandleFunc("PATCH /api/logs/{date}/actual-training", srv.updateActualTraining)
	mux.HandleFunc("PATCH /api/logs/{date}/active-calories", srv.updateActiveCalories)
	mux.HandleFunc("PATCH /api/logs/{date}/fasting-override", srv.updateFastingOverride)
	mux.HandleFunc("PATCH /api/logs/{date}/health-sync", srv.syncHealthData)
	mux.HandleFunc("PATCH /api/logs/{date}/consumed-macros", srv.addConsumedMacros)
	mux.HandleFunc("DELETE /api/logs/{date}/consumed-macros/{meal}", srv.clearMealConsumedMacros)
	mux.HandleFunc("GET /api/logs/{date}/insight", srv.getDayInsight)

	// Training config routes
	mux.HandleFunc("GET /api/training-configs", srv.getTrainingConfigs)

	// Body status / fatigue routes (Adaptive Load feature)
	mux.HandleFunc("GET /api/body-status", srv.getBodyStatus)
	mux.HandleFunc("GET /api/archetypes", srv.getArchetypes)
	mux.HandleFunc("POST /api/fatigue/apply", srv.applyFatigueByParams)
	mux.HandleFunc("POST /api/sessions/{id}/apply-load", srv.applySessionLoad)

	// Stats routes
	mux.HandleFunc("GET /api/stats/weight-trend", srv.getWeightTrend)
	mux.HandleFunc("GET /api/stats/history", srv.getHistorySummary)

	// Calendar routes
	mux.HandleFunc("GET /api/calendar/summary", srv.getCalendarSummary)

	// Planned day types routes (Cockpit Dashboard)
	mux.HandleFunc("GET /api/planned-days", srv.getPlannedDays)
	mux.HandleFunc("PUT /api/planned-days/{date}", srv.upsertPlannedDay)
	mux.HandleFunc("DELETE /api/planned-days/{date}", srv.deletePlannedDay)

	// Planned sessions routes (Workout Planner → Command Center)
	mux.HandleFunc("GET /api/planned-sessions/{date}", srv.getPlannedSessions)

	// Food reference routes (Cockpit Dashboard)
	mux.HandleFunc("GET /api/food-reference", srv.getFoodReference)
	mux.HandleFunc("PATCH /api/food-reference/{id}", srv.updateFoodReference)

	// Macro Tetris Solver route
	mux.HandleFunc("POST /api/solver/solve", srv.solveMacros)

	// Nutrition plan routes (Issue #27)
	mux.HandleFunc("POST /api/plans", srv.createPlan)
	mux.HandleFunc("GET /api/plans", srv.listPlans)
	mux.HandleFunc("GET /api/plans/active", srv.getActivePlan)
	mux.HandleFunc("GET /api/plans/current-week", srv.getCurrentWeekTarget)
	mux.HandleFunc("GET /api/plans/active/analysis", srv.analyzeActivePlan)
	mux.HandleFunc("GET /api/plans/{id}", srv.getPlanByID)
	mux.HandleFunc("GET /api/plans/{id}/analysis", srv.analyzePlan)
	mux.HandleFunc("GET /api/plans/{id}/phase-insight", srv.getPhaseInsight)
	mux.HandleFunc("POST /api/plans/{id}/complete", srv.completePlan)
	mux.HandleFunc("POST /api/plans/{id}/abandon", srv.abandonPlan)
	mux.HandleFunc("POST /api/plans/{id}/pause", srv.pausePlan)
	mux.HandleFunc("POST /api/plans/{id}/resume", srv.resumePlan)
	mux.HandleFunc("POST /api/plans/{id}/recalibrate", srv.recalibratePlan)
	mux.HandleFunc("GET /api/plans/{id}/recalibrations", srv.getRecalibrationHistory)
	mux.HandleFunc("DELETE /api/plans/{id}", srv.deletePlan)

	// Training program routes (Program Management feature)
	mux.HandleFunc("GET /api/training-programs", srv.listPrograms)
	mux.HandleFunc("POST /api/training-programs", srv.createProgram)
	mux.HandleFunc("GET /api/training-programs/{id}", srv.getProgramByID)
	mux.HandleFunc("DELETE /api/training-programs/{id}", srv.deleteProgram)
	mux.HandleFunc("GET /api/training-programs/{id}/waveform", srv.getProgramWaveform)
	mux.HandleFunc("POST /api/training-programs/{id}/install", srv.installProgram)

	// Program installation routes
	mux.HandleFunc("GET /api/program-installations/active", srv.getActiveInstallation)
	mux.HandleFunc("GET /api/program-installations/{id}", srv.getInstallationByID)
	mux.HandleFunc("POST /api/program-installations/{id}/abandon", srv.abandonInstallation)
	mux.HandleFunc("DELETE /api/program-installations/{id}", srv.deleteInstallation)
	mux.HandleFunc("GET /api/program-installations/{id}/sessions", srv.getScheduledSessions)

	// Metabolic Flux Engine routes
	mux.HandleFunc("GET /api/metabolic/chart", srv.getMetabolicChart)
	mux.HandleFunc("GET /api/metabolic/notification", srv.getMetabolicNotification)
	mux.HandleFunc("POST /api/metabolic/notification/{id}/dismiss", srv.dismissMetabolicNotification)

	// Weekly Debrief routes (Mission Report feature)
	mux.HandleFunc("GET /api/debrief/weekly", srv.getWeeklyDebrief)
	mux.HandleFunc("GET /api/debrief/weekly/{date}", srv.getWeeklyDebriefByDate)
	mux.HandleFunc("GET /api/debrief/current", srv.getCurrentWeekDebrief)

	// Garmin Data Import routes
	mux.HandleFunc("POST /api/import/garmin", srv.uploadGarminData)
	mux.HandleFunc("GET /api/stats/monthly-summaries", srv.getMonthlySummaries)

	// Body Issues routes (Semantic Tagger - Phase 4)
	mux.HandleFunc("POST /api/body-issues", srv.createBodyIssues)
	mux.HandleFunc("GET /api/body-issues/active", srv.getActiveBodyIssues)
	mux.HandleFunc("GET /api/body-issues/modifiers", srv.getFatigueModifiers)
	mux.HandleFunc("GET /api/body-issues/vocabulary", srv.getSemanticVocabulary)

	// Strategy Auditor routes (Check Engine light - Phase 4.2)
	mux.HandleFunc("GET /api/audit/status", srv.getAuditStatus)

	// Systemic Gyroscope routes (Load Balancing)
	mux.HandleFunc("GET /api/systemic-load", srv.getSystemicLoad)

	// Movement taxonomy routes (Adaptive Movement Engine)
	mux.HandleFunc("GET /api/movements", srv.listMovements)
	mux.HandleFunc("GET /api/movements/filtered", srv.getFilteredMovements)
	mux.HandleFunc("GET /api/movements/{id}", srv.getMovementByID)
	mux.HandleFunc("GET /api/movements/{id}/progress", srv.getMovementProgress)
	mux.HandleFunc("POST /api/movements/{id}/complete-session", srv.completeMovementSession)
	mux.HandleFunc("GET /api/neural-battery", srv.getNeuralBattery)
	mux.HandleFunc("POST /api/movements/analyze-form", srv.analyzeFormCorrection)

	// Echo logging routes (Neural Echo feature)
	srv.registerEchoRoutes()

	// Voice command routes (Neural Voice Command feature)
	voiceHandler := NewVoiceCommandHandler(ollamaService, bodyIssueStore, dailyLogService, foodReferenceStore)
	mux.HandleFunc("POST /api/voice/parse", voiceHandler.ParseVoiceCommand)

	return srv
}

// Handler returns the root HTTP handler with middleware applied.
func (s *Server) Handler() http.Handler {
	return corsMiddleware(loggingMiddleware(s.mux))
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]string{
		"status":  "ok",
		"service": "backend",
		"time":    time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// responseWriter wraps http.ResponseWriter to capture the status code for logging.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)
		duration := time.Since(start)
		log.Printf("%s %s %d %dms %s", r.Method, r.URL.Path, rw.status, duration.Milliseconds(), r.RemoteAddr)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	allowedMethods := os.Getenv("CORS_ALLOWED_METHODS")
	if allowedMethods == "" {
		allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
	}

	allowedHeaders := os.Getenv("CORS_ALLOWED_HEADERS")
	if allowedHeaders == "" {
		allowedHeaders = "Content-Type,Authorization"
	}

	maxAge := os.Getenv("CORS_MAX_AGE")
	if maxAge == "" {
		maxAge = "3600"
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", allowedMethods)
		w.Header().Set("Access-Control-Allow-Headers", allowedHeaders)
		w.Header().Set("Access-Control-Max-Age", maxAge)

		if r.Method == http.MethodOptions {
			if origin := r.Header.Get("Origin"); origin != "" && allowedOrigin == "*" {
				// Reflect origin when wildcard to satisfy credentialed requests without allowing all.
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			status := http.StatusNoContent
			if v, err := strconv.Atoi(maxAge); err == nil && v == 0 {
				status = http.StatusOK
			}
			w.WriteHeader(status)
			return
		}

		next.ServeHTTP(w, r)
	})
}
