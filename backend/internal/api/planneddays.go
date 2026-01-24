package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"victus/internal/domain"
	"victus/internal/store"
)

// PlannedDayResponse represents a planned day type in API responses.
type PlannedDayResponse struct {
	Date    string `json:"date"`
	DayType string `json:"dayType"`
}

// PlannedDaysResponse represents a list of planned day types.
type PlannedDaysResponse struct {
	Days []PlannedDayResponse `json:"days"`
}

// UpsertPlannedDayRequest represents the request body for creating/updating a planned day.
type UpsertPlannedDayRequest struct {
	DayType string `json:"dayType"`
}

// getPlannedDays handles GET /api/planned-days?start=YYYY-MM-DD&end=YYYY-MM-DD
func (s *Server) getPlannedDays(w http.ResponseWriter, r *http.Request) {
	startDate := r.URL.Query().Get("start")
	endDate := r.URL.Query().Get("end")

	if startDate == "" || endDate == "" {
		writeError(w, http.StatusBadRequest, "missing_params", "start and end query parameters are required")
		return
	}

	days, err := s.plannedDayTypeStore.ListByDateRange(r.Context(), startDate, endDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to retrieve planned days")
		return
	}

	response := PlannedDaysResponse{
		Days: make([]PlannedDayResponse, len(days)),
	}
	for i, day := range days {
		response.Days[i] = PlannedDayResponse{
			Date:    day.Date,
			DayType: string(day.DayType),
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// upsertPlannedDay handles PUT /api/planned-days/{date}
func (s *Server) upsertPlannedDay(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "date path parameter is required")
		return
	}

	var req UpsertPlannedDayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON in request body")
		return
	}

	dayType, err := domain.ParseDayType(req.DayType)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_day_type", "Invalid day type. Must be 'performance', 'fatburner', or 'metabolize'")
		return
	}

	pdt := &domain.PlannedDayType{
		Date:    date,
		DayType: dayType,
	}

	if err := s.plannedDayTypeStore.Upsert(r.Context(), pdt); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to save planned day")
		return
	}

	response := PlannedDayResponse{
		Date:    pdt.Date,
		DayType: string(pdt.DayType),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// deletePlannedDay handles DELETE /api/planned-days/{date}
func (s *Server) deletePlannedDay(w http.ResponseWriter, r *http.Request) {
	date := r.PathValue("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "missing_date", "date path parameter is required")
		return
	}

	// Check if it exists first
	_, err := s.plannedDayTypeStore.GetByDate(r.Context(), date)
	if errors.Is(err, store.ErrPlannedDayTypeNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "No planned day type found for this date")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to check planned day")
		return
	}

	if err := s.plannedDayTypeStore.DeleteByDate(r.Context(), date); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to delete planned day")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
