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

// parsePlanID extracts and validates the plan ID from the request path.
// Returns the parsed ID and true on success, or writes an error response and returns false.
func parsePlanID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "Plan ID must be a number")
		return 0, false
	}
	return id, true
}

// createPlan handles POST /api/plans
func (s *Server) createPlan(w http.ResponseWriter, r *http.Request) {
	var req requests.CreatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	input := requests.PlanInputFromRequest(req)
	now := time.Now()

	plan, err := s.planService.Create(r.Context(), input, now)
	if err != nil {
		if errors.Is(err, store.ErrProfileNotFound) {
			writeError(w, http.StatusBadRequest, "profile_required", "A user profile must be created before creating a nutrition plan")
			return
		}
		if errors.Is(err, store.ErrActivePlanExists) {
			writeError(w, http.StatusConflict, "active_plan_exists", "An active nutrition plan already exists. Complete or abandon it first.")
			return
		}
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeInternalError(w, err, "createPlan")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(requests.PlanToResponse(plan, now))
}

// getActivePlan handles GET /api/plans/active
func (s *Server) getActivePlan(w http.ResponseWriter, r *http.Request) {
	plan, err := s.planService.GetActive(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(nil)
			return
		}
		writeInternalError(w, err, "getActivePlan")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.PlanToResponse(plan, time.Now()))
}

// getPlanByID handles GET /api/plans/{id}
func (s *Server) getPlanByID(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	plan, err := s.planService.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		writeInternalError(w, err, "getPlanByID")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.PlanToResponse(plan, time.Now()))
}

// listPlans handles GET /api/plans
func (s *Server) listPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := s.planService.ListAll(r.Context())
	if err != nil {
		writeInternalError(w, err, "listPlans")
		return
	}

	now := time.Now()
	response := make([]requests.PlanSummaryResponse, len(plans))
	for i, plan := range plans {
		response[i] = requests.PlanToSummaryResponse(plan, now)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// completePlan handles POST /api/plans/{id}/complete
func (s *Server) completePlan(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	if err := s.planService.Complete(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		writeInternalError(w, err, "completePlan")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// abandonPlan handles POST /api/plans/{id}/abandon
func (s *Server) abandonPlan(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	if err := s.planService.Abandon(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		writeInternalError(w, err, "abandonPlan")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// pausePlan handles POST /api/plans/{id}/pause
func (s *Server) pausePlan(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	if err := s.planService.Pause(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		writeInternalError(w, err, "pausePlan")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// resumePlan handles POST /api/plans/{id}/resume
func (s *Server) resumePlan(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	if err := s.planService.Resume(r.Context(), id); err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		writeInternalError(w, err, "resumePlan")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// recalibratePlan handles POST /api/plans/{id}/recalibrate
func (s *Server) recalibratePlan(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	var req requests.RecalibratePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Could not parse request body as JSON")
		return
	}

	recalibrationType := requests.RecalibrationInputFromRequest(req)
	now := time.Now()

	plan, err := s.planService.Recalibrate(r.Context(), id, recalibrationType, now)
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		if isValidationError(err) {
			writeError(w, http.StatusBadRequest, "validation_error", err.Error())
			return
		}
		writeInternalError(w, err, "recalibratePlan")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests.PlanToResponse(plan, now))
}

// getRecalibrationHistory handles GET /api/plans/{id}/recalibrations
func (s *Server) getRecalibrationHistory(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	records, err := s.planService.ListRecalibrations(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "Nutrition plan not found")
			return
		}
		writeInternalError(w, err, "getRecalibrationHistory")
		return
	}

	response := make([]requests.RecalibrationRecordResponse, len(records))
	for i, rec := range records {
		response[i] = requests.RecalibrationRecordToResponse(rec)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// deletePlan handles DELETE /api/plans/{id}
func (s *Server) deletePlan(w http.ResponseWriter, r *http.Request) {
	id, ok := parsePlanID(w, r)
	if !ok {
		return
	}

	if err := s.planService.Delete(r.Context(), id); err != nil {
		writeInternalError(w, err, "deletePlan")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// getCurrentWeekTarget handles GET /api/plans/current-week
func (s *Server) getCurrentWeekTarget(w http.ResponseWriter, r *http.Request) {
	target, err := s.planService.GetCurrentWeekTarget(r.Context(), time.Now())
	if err != nil {
		if errors.Is(err, store.ErrPlanNotFound) {
			writeError(w, http.StatusNotFound, "not_found", "No active nutrition plan exists")
			return
		}
		writeInternalError(w, err, "getCurrentWeekTarget")
		return
	}

	if target == nil {
		writeError(w, http.StatusNotFound, "not_found", "Plan has not started yet or has already ended")
		return
	}

	response := requests.WeeklyTargetResponse{
		WeekNumber:        target.WeekNumber,
		StartDate:         target.StartDate.Format("2006-01-02"),
		EndDate:           target.EndDate.Format("2006-01-02"),
		ProjectedWeightKg: target.ProjectedWeightKg,
		ProjectedTDEE:     target.ProjectedTDEE,
		TargetIntakeKcal:  target.TargetIntakeKcal,
		TargetCarbsG:      target.TargetCarbsG,
		TargetProteinG:    target.TargetProteinG,
		TargetFatsG:       target.TargetFatsG,
		ActualWeightKg:    target.ActualWeightKg,
		ActualIntakeKcal:  target.ActualIntakeKcal,
		DaysLogged:        target.DaysLogged,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
