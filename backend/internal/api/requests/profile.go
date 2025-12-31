package requests

import (
	"time"

	"victus/internal/models"
)

// MealRatiosRequest represents meal distribution ratios in API requests.
type MealRatiosRequest struct {
	Breakfast float64 `json:"breakfast"`
	Lunch     float64 `json:"lunch"`
	Dinner    float64 `json:"dinner"`
}

// PointsConfigRequest represents points multipliers in API requests.
type PointsConfigRequest struct {
	CarbMultiplier    float64 `json:"carbMultiplier"`
	ProteinMultiplier float64 `json:"proteinMultiplier"`
	FatMultiplier     float64 `json:"fatMultiplier"`
}

// CreateProfileRequest is the request body for PUT /api/profile.
type CreateProfileRequest struct {
	HeightCM             float64             `json:"height_cm"`
	BirthDate            string              `json:"birthDate"`
	Sex                  string              `json:"sex"`
	Goal                 string              `json:"goal"`
	TargetWeightKg       float64             `json:"targetWeightKg"`
	TargetWeeklyChangeKg float64             `json:"targetWeeklyChangeKg"`
	CarbRatio            float64             `json:"carbRatio"`
	ProteinRatio         float64             `json:"proteinRatio"`
	FatRatio             float64             `json:"fatRatio"`
	MealRatios           MealRatiosRequest   `json:"mealRatios"`
	PointsConfig         PointsConfigRequest `json:"pointsConfig"`
	FruitTargetG         float64             `json:"fruitTargetG"`
	VeggieTargetG        float64             `json:"veggieTargetG"`
}

// MealRatiosResponse represents meal distribution ratios in API responses.
type MealRatiosResponse struct {
	Breakfast float64 `json:"breakfast"`
	Lunch     float64 `json:"lunch"`
	Dinner    float64 `json:"dinner"`
}

// PointsConfigResponse represents points multipliers in API responses.
type PointsConfigResponse struct {
	CarbMultiplier    float64 `json:"carbMultiplier"`
	ProteinMultiplier float64 `json:"proteinMultiplier"`
	FatMultiplier     float64 `json:"fatMultiplier"`
}

// ProfileResponse is the response body for profile endpoints.
type ProfileResponse struct {
	HeightCM             float64              `json:"height_cm"`
	BirthDate            string               `json:"birthDate"`
	Sex                  string               `json:"sex"`
	Goal                 string               `json:"goal"`
	TargetWeightKg       float64              `json:"targetWeightKg"`
	TargetWeeklyChangeKg float64              `json:"targetWeeklyChangeKg"`
	CarbRatio            float64              `json:"carbRatio"`
	ProteinRatio         float64              `json:"proteinRatio"`
	FatRatio             float64              `json:"fatRatio"`
	MealRatios           MealRatiosResponse   `json:"mealRatios"`
	PointsConfig         PointsConfigResponse `json:"pointsConfig"`
	FruitTargetG         float64              `json:"fruitTargetG"`
	VeggieTargetG        float64              `json:"veggieTargetG"`
	CreatedAt            string               `json:"createdAt,omitempty"`
	UpdatedAt            string               `json:"updatedAt,omitempty"`
}

// ProfileFromRequest converts a CreateProfileRequest to a UserProfile model.
func ProfileFromRequest(req CreateProfileRequest) (*models.UserProfile, error) {
	birthDate, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil {
		return nil, err
	}

	return &models.UserProfile{
		HeightCM:             req.HeightCM,
		BirthDate:            birthDate,
		Sex:                  models.Sex(req.Sex),
		Goal:                 models.Goal(req.Goal),
		TargetWeightKg:       req.TargetWeightKg,
		TargetWeeklyChangeKg: req.TargetWeeklyChangeKg,
		CarbRatio:            req.CarbRatio,
		ProteinRatio:         req.ProteinRatio,
		FatRatio:             req.FatRatio,
		MealRatios: models.MealRatios{
			Breakfast: req.MealRatios.Breakfast,
			Lunch:     req.MealRatios.Lunch,
			Dinner:    req.MealRatios.Dinner,
		},
		PointsConfig: models.PointsConfig{
			CarbMultiplier:    req.PointsConfig.CarbMultiplier,
			ProteinMultiplier: req.PointsConfig.ProteinMultiplier,
			FatMultiplier:     req.PointsConfig.FatMultiplier,
		},
		FruitTargetG:  req.FruitTargetG,
		VeggieTargetG: req.VeggieTargetG,
	}, nil
}

// ProfileToResponse converts a UserProfile model to a ProfileResponse.
func ProfileToResponse(p *models.UserProfile) ProfileResponse {
	resp := ProfileResponse{
		HeightCM:             p.HeightCM,
		BirthDate:            p.BirthDate.Format("2006-01-02"),
		Sex:                  string(p.Sex),
		Goal:                 string(p.Goal),
		TargetWeightKg:       p.TargetWeightKg,
		TargetWeeklyChangeKg: p.TargetWeeklyChangeKg,
		CarbRatio:            p.CarbRatio,
		ProteinRatio:         p.ProteinRatio,
		FatRatio:             p.FatRatio,
		MealRatios: MealRatiosResponse{
			Breakfast: p.MealRatios.Breakfast,
			Lunch:     p.MealRatios.Lunch,
			Dinner:    p.MealRatios.Dinner,
		},
		PointsConfig: PointsConfigResponse{
			CarbMultiplier:    p.PointsConfig.CarbMultiplier,
			ProteinMultiplier: p.PointsConfig.ProteinMultiplier,
			FatMultiplier:     p.PointsConfig.FatMultiplier,
		},
		FruitTargetG:  p.FruitTargetG,
		VeggieTargetG: p.VeggieTargetG,
	}

	if !p.CreatedAt.IsZero() {
		resp.CreatedAt = p.CreatedAt.Format(time.RFC3339)
	}
	if !p.UpdatedAt.IsZero() {
		resp.UpdatedAt = p.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}
