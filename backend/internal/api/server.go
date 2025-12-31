package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"victus/internal/store"
)

// Server wraps HTTP server configuration and routing.
type Server struct {
	mux           *http.ServeMux
	profileStore  *store.ProfileStore
	dailyLogStore *store.DailyLogStore
}

// NewServer configures routes and middleware.
func NewServer(db *sql.DB) *Server {
	mux := http.NewServeMux()
	srv := &Server{
		mux:           mux,
		profileStore:  store.NewProfileStore(db),
		dailyLogStore: store.NewDailyLogStore(db),
	}

	// Health
	mux.HandleFunc("/api/health", srv.healthHandler)

	// Profile routes
	mux.HandleFunc("GET /api/profile", srv.getProfile)
	mux.HandleFunc("PUT /api/profile", srv.upsertProfile)
	mux.HandleFunc("DELETE /api/profile", srv.deleteProfile)

	// Daily log routes
	mux.HandleFunc("POST /api/logs", srv.createDailyLog)
	mux.HandleFunc("GET /api/logs/today", srv.getTodayLog)
	mux.HandleFunc("DELETE /api/logs/today", srv.deleteTodayLog)

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

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start)
		log.Printf("%s %s %s %dms", r.Method, r.URL.Path, r.RemoteAddr, duration.Milliseconds())
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	allowedMethods := os.Getenv("CORS_ALLOWED_METHODS")
	if allowedMethods == "" {
		allowedMethods = "GET,POST,PUT,DELETE,OPTIONS"
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
