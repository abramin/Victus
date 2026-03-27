package api

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"strconv"

	"victus/internal/domain"
)

// getGMBSession handles GET /api/gmb/session
//
// Query params:
//
//	level    string  "standard" | "accelerated"  (default: "standard")
//	focus    string  theme name or empty          (default: random)
//	duration int     15 | 30 | 45                 (default: 45)
//	seed     int64   reproducible seed            (default: random)
func (s *Server) getGMBSession(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	level := q.Get("level")
	if level == "" {
		level = "standard"
	}
	if level != "standard" && level != "accelerated" {
		http.Error(w, `{"error":"invalid level, must be standard or accelerated"}`, http.StatusBadRequest)
		return
	}

	focus := q.Get("focus")

	duration := 45
	if d := q.Get("duration"); d != "" {
		v, err := strconv.Atoi(d)
		if err != nil || (v != 15 && v != 30 && v != 45) {
			http.Error(w, `{"error":"invalid duration, must be 15, 30, or 45"}`, http.StatusBadRequest)
			return
		}
		duration = v
	}

	var seed int64
	if s := q.Get("seed"); s != "" {
		v, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			http.Error(w, `{"error":"invalid seed"}`, http.StatusBadRequest)
			return
		}
		seed = v
	} else {
		seed = rand.Int63() //nolint:gosec
	}

	result := domain.GenerateGMBSession(
		level,
		focus,
		seed,
		duration,
		domain.DefaultCatalogue,
		domain.DefaultPhasePool,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
