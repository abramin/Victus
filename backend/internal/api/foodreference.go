package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// FoodReferenceResponse represents a food reference item in API responses.
type FoodReferenceResponse struct {
	ID              int64    `json:"id"`
	Category        string   `json:"category"`
	FoodItem        string   `json:"foodItem"`
	PlateMultiplier *float64 `json:"plateMultiplier"`
}

// FoodReferenceListResponse represents a list of food reference items.
type FoodReferenceListResponse struct {
	Foods []FoodReferenceResponse `json:"foods"`
}

// UpdateFoodReferenceRequest represents the request body for updating a food reference.
type UpdateFoodReferenceRequest struct {
	PlateMultiplier *float64 `json:"plateMultiplier"`
}

// getFoodReference handles GET /api/food-reference?category=high_carb
func (s *Server) getFoodReference(w http.ResponseWriter, r *http.Request) {
	foods, err := s.foodReferenceStore.ListAll(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to retrieve food reference")
		return
	}

	response := FoodReferenceListResponse{
		Foods: make([]FoodReferenceResponse, len(foods)),
	}
	for i, food := range foods {
		response.Foods[i] = FoodReferenceResponse{
			ID:              food.ID,
			Category:        string(food.Category),
			FoodItem:        food.FoodItem,
			PlateMultiplier: food.PlateMultiplier,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// updateFoodReference handles PATCH /api/food-reference/{id}
func (s *Server) updateFoodReference(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		writeError(w, http.StatusBadRequest, "missing_id", "id path parameter is required")
		return
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_id", "id must be a valid integer")
		return
	}

	var req UpdateFoodReferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_json", "Invalid JSON in request body")
		return
	}

	if err := s.foodReferenceStore.UpdatePlateMultiplier(r.Context(), id, req.PlateMultiplier); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to update food reference")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
