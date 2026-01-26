package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"victus/internal/api/requests"
	"victus/internal/store"
)

// listPrograms handles GET /api/training-programs
func (s *Server) listPrograms(w http.ResponseWriter, r *http.Request) {
	filters := store.ProgramFilters{
		Difficulty: r.URL.Query().Get("difficulty"),
		Focus:      r.URL.Query().Get("focus"),
		Status:     r.URL.Query().Get("status"),
	}

	if templateOnly := r.URL.Query().Get("templatesOnly"); templateOnly == "true" {
		isTemplate := true
		filters.IsTemplate = &isTemplate
	}

	programs, err := s.programService.List(r.Context(), filters)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	response := make([]requests.ProgramSummaryResponse, len(programs))
	for i, p := range programs {
		response[i] = requests.ProgramToSummaryResponse(p)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// getProgramByID handles GET /api/training-programs/{id}
func (s *Server) getProgramByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Program ID must be a number")
		return
	}

	program, err := s.programService.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrProgramNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Training program not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.ProgramToResponse(program))
}

// createProgram handles POST /api/training-programs
func (s *Server) createProgram(w http.ResponseWriter, r *http.Request) {
	var req requests.CreateProgramRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	input := requests.ProgramInputFromRequest(req)
	now := time.Now()

	program, err := s.programService.Create(r.Context(), input, now)
	if err != nil {
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requests.ProgramToResponse(program))
}

// deleteProgram handles DELETE /api/training-programs/{id}
func (s *Server) deleteProgram(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Program ID must be a number")
		return
	}

	if err := s.programService.Delete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrProgramNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Training program not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getProgramWaveform handles GET /api/training-programs/{id}/waveform
func (s *Server) getProgramWaveform(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Program ID must be a number")
		return
	}

	waveform, err := s.programService.GetWaveformData(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrProgramNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Training program not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.WaveformToResponse(waveform))
}

// installProgram handles POST /api/training-programs/{id}/install
func (s *Server) installProgram(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Program ID must be a number")
		return
	}

	var req requests.InstallProgramRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	input := requests.InstallInputFromRequest(id, req)
	now := time.Now()

	installation, err := s.programService.Install(r.Context(), input, now)
	if err != nil {
		if errors.Is(err, store.ErrProgramNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Training program not found")
			return
		}
		if errors.Is(err, store.ErrActiveInstallationExists) {
			writeError(w, http.StatusConflict, "active_installation_exists", "An active program installation already exists. Abandon it first.")
			return
		}
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requests.InstallationToResponse(installation, now))
}

// getActiveInstallation handles GET /api/program-installations/active
func (s *Server) getActiveInstallation(w http.ResponseWriter, r *http.Request) {
	installation, err := s.programService.GetActiveInstallation(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrInstallationNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "No active program installation exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.InstallationToResponse(installation, time.Now()))
}

// getInstallationByID handles GET /api/program-installations/{id}
func (s *Server) getInstallationByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Installation ID must be a number")
		return
	}

	installation, err := s.programService.GetInstallationByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrInstallationNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Program installation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.InstallationToResponse(installation, time.Now()))
}

// abandonInstallation handles POST /api/program-installations/{id}/abandon
func (s *Server) abandonInstallation(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Installation ID must be a number")
		return
	}

	if err := s.programService.AbandonInstallation(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrInstallationNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Program installation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// deleteInstallation handles DELETE /api/program-installations/{id}
func (s *Server) deleteInstallation(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Installation ID must be a number")
		return
	}

	if err := s.programService.DeleteInstallation(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrInstallationNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Program installation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getScheduledSessions handles GET /api/program-installations/{id}/sessions
func (s *Server) getScheduledSessions(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Installation ID must be a number")
		return
	}

	sessions, err := s.programService.GetScheduledSessions(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrInstallationNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Program installation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.ScheduledSessionsToResponse(sessions))
}
