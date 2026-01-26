package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// getMetabolicChart returns TDEE history data for the Metabolism Graph.
// GET /api/metabolic/chart?weeks=12
func (s *Server) getMetabolicChart(w http.ResponseWriter, r *http.Request) {
	weeks := 12 // Default
	if weeksStr := r.URL.Query().Get("weeks"); weeksStr != "" {
		if parsed, err := strconv.Atoi(weeksStr); err == nil && parsed > 0 {
			weeks = parsed
		}
	}

	data, err := s.metabolicService.GetChartData(r.Context(), weeks)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// getMetabolicNotification returns any pending weekly strategy notification.
// GET /api/metabolic/notification
func (s *Server) getMetabolicNotification(w http.ResponseWriter, r *http.Request) {
	notification, err := s.metabolicService.GetPendingNotification(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if notification == nil {
		// Return null for no pending notification
		w.Write([]byte("null"))
		return
	}
	json.NewEncoder(w).Encode(notification)
}

// dismissMetabolicNotification marks a notification as dismissed.
// POST /api/metabolic/notification/{id}/dismiss
func (s *Server) dismissMetabolicNotification(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid notification ID", http.StatusBadRequest)
		return
	}

	if err := s.metabolicService.DismissNotification(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
