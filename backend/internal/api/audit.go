package api

import (
	"encoding/json"
	"net/http"
)

// getAuditStatus handles GET /api/audit/status
// Returns the current audit status including any detected mismatches.
func (s *Server) getAuditStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	status, err := s.auditService.GetAuditStatus(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}
