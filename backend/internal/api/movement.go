package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"victus/internal/domain"
)

func (s *Server) listMovements(w http.ResponseWriter, r *http.Request) {
	movements, err := s.movementService.ListMovements(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movements)
}

func (s *Server) getMovementByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "missing movement id", http.StatusBadRequest)
		return
	}

	mov, err := s.movementService.GetMovement(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mov)
}

func (s *Server) getMovementProgress(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "missing movement id", http.StatusBadRequest)
		return
	}

	progress, err := s.movementService.GetUserProgress(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if progress == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("null"))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(progress)
}

func (s *Server) getFilteredMovements(w http.ResponseWriter, r *http.Request) {
	ceiling := 10
	if c := r.URL.Query().Get("ceiling"); c != "" {
		if v, err := strconv.Atoi(c); err == nil && v >= 1 && v <= 10 {
			ceiling = v
		}
	}

	movements, err := s.movementService.GetFilteredMovements(r.Context(), ceiling)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movements)
}

func (s *Server) getNeuralBattery(w http.ResponseWriter, r *http.Request) {
	battery := s.dailyLogService.GetNeuralBattery(r.Context())
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(battery)
}

func (s *Server) completeMovementSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "missing movement id", http.StatusBadRequest)
		return
	}

	var input domain.MovementProgressionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	progress, err := s.movementService.RecordSessionCompletion(r.Context(), id, input)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(progress)
}
