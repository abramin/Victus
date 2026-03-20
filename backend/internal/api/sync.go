package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// StartBackgroundJobs launches long-running background tasks (e.g. daily Garmin sync).
// Call this in a goroutine from main, passing a context cancelled on shutdown.
func (s *Server) StartBackgroundJobs(ctx context.Context) {
	s.garminSyncService.RunDailySchedule(ctx)
}

// syncGarminData handles POST /api/sync/garmin
// Optional query param: ?date=YYYY-MM-DD (defaults to today)
func (s *Server) syncGarminData(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	result, err := s.garminSyncService.SyncDate(r.Context(), date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "sync_error", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
