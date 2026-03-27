package api

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"strconv"

	"victus/internal/domain"
)

// getCalisthenicsSession handles GET /api/calisthenics/session
//
// Query params:
//
//	level     string  "1" | "2"             (default: "1")
//	exercises int     3 | 4 | 5             (default: 4)
//	seed      int64   reproducible seed     (default: random)
func (s *Server) getCalisthenicsSession(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	level := q.Get("level")
	if level == "" {
		level = "1"
	}
	if level != "1" && level != "2" {
		http.Error(w, `{"error":"invalid level, must be 1 or 2"}`, http.StatusBadRequest)
		return
	}

	exerciseCount := 4
	if e := q.Get("exercises"); e != "" {
		v, err := strconv.Atoi(e)
		if err != nil || (v != 3 && v != 4 && v != 5) {
			http.Error(w, `{"error":"invalid exercises, must be 3, 4, or 5"}`, http.StatusBadRequest)
			return
		}
		exerciseCount = v
	}

	var seed int64
	if sv := q.Get("seed"); sv != "" {
		v, err := strconv.ParseInt(sv, 10, 64)
		if err != nil {
			http.Error(w, `{"error":"invalid seed"}`, http.StatusBadRequest)
			return
		}
		seed = v
	} else {
		seed = rand.Int63() //nolint:gosec
	}

	result := domain.GenerateCalisthenicsSession(level, exerciseCount, seed)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
