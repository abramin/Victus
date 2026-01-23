package requests

import (
	"time"

	"victus/internal/domain"
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

// SupplementConfigRequest represents daily supplement intake in API requests.
type SupplementConfigRequest struct {
	MaltodextrinG float64 `json:"maltodextrinG"` // Intra-workout carb supplement (grams)
	WheyG         float64 `json:"wheyG"`         // Whey protein powder (grams)
	CollagenG     float64 `json:"collagenG"`     // Collagen peptides (grams)
}

// CreateProfileRequest is the request body for PUT /api/profile.
type CreateProfileRequest struct {
	HeightCM               float64                 `json:"height_cm"`
	BirthDate              string                  `json:"birthDate"`
	Sex                    string                  `json:"sex"`
	Goal                   string                  `json:"goal"`
	CurrentWeightKg        *float64                `json:"currentWeightKg,omitempty"` // Current weight for calculations
	TargetWeightKg         float64                 `json:"targetWeightKg"`
	TimeframeWeeks         *int                    `json:"timeframeWeeks,omitempty"` // Weeks to reach target weight
	TargetWeeklyChangeKg   float64                 `json:"targetWeeklyChangeKg"`
	CarbRatio              float64                 `json:"carbRatio"`
	ProteinRatio           float64                 `json:"proteinRatio"`
	FatRatio               float64                 `json:"fatRatio"`
	MealRatios             MealRatiosRequest       `json:"mealRatios"`
	PointsConfig           PointsConfigRequest     `json:"pointsConfig"`
	SupplementConfig       SupplementConfigRequest `json:"supplementConfig,omitempty"` // Daily supplement intake
	FruitTargetG           float64                 `json:"fruitTargetG"`
	VeggieTargetG          float64                 `json:"veggieTargetG"`
	BMREquation            string                  `json:"bmrEquation,omitempty"`            // mifflin_st_jeor (default), katch_mcardle, oxford_henry, harris_benedict
	BodyFatPercent         *float64                `json:"bodyFatPercent,omitempty"`         // For Katch-McArdle equation
	TDEESource             string                  `json:"tdeeSource,omitempty"`             // formula (default), manual, or adaptive
	ManualTDEE             *float64                `json:"manualTDEE,omitempty"`             // User-provided TDEE value (used when tdeeSource is "manual")
	RecalibrationTolerance *float64                `json:"recalibrationTolerance,omitempty"` // Plan variance tolerance percentage (1-10%)
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

// SupplementConfigResponse represents daily supplement intake in API responses.
type SupplementConfigResponse struct {
	MaltodextrinG float64 `json:"maltodextrinG"`
	WheyG         float64 `json:"wheyG"`
	CollagenG     float64 `json:"collagenG"`
}

// ProfileResponse is the response body for profile endpoints.
type ProfileResponse struct {
	HeightCM               float64                  `json:"height_cm"`
	BirthDate              string                   `json:"birthDate"`
	Sex                    string                   `json:"sex"`
	Goal                   string                   `json:"goal"`
	CurrentWeightKg        *float64                 `json:"currentWeightKg,omitempty"`
	TargetWeightKg         float64                  `json:"targetWeightKg"`
	TimeframeWeeks         *int                     `json:"timeframeWeeks,omitempty"`
	TargetWeeklyChangeKg   float64                  `json:"targetWeeklyChangeKg"`
	CarbRatio              float64                  `json:"carbRatio"`
	ProteinRatio           float64                  `json:"proteinRatio"`
	FatRatio               float64                  `json:"fatRatio"`
	MealRatios             MealRatiosResponse       `json:"mealRatios"`
	PointsConfig           PointsConfigResponse     `json:"pointsConfig"`
	SupplementConfig       SupplementConfigResponse `json:"supplementConfig"`
	FruitTargetG           float64                  `json:"fruitTargetG"`
	VeggieTargetG          float64                  `json:"veggieTargetG"`
	BMREquation            string                   `json:"bmrEquation"`
	BodyFatPercent         *float64                 `json:"bodyFatPercent,omitempty"`
	TDEESource             string                   `json:"tdeeSource"`             // formula, manual, or adaptive
	ManualTDEE             *float64                 `json:"manualTDEE,omitempty"`   // User-provided TDEE (when tdeeSource is "manual")
	RecalibrationTolerance float64                  `json:"recalibrationTolerance"` // Plan variance tolerance percentage (1-10%, default 3%)
	CreatedAt              string                   `json:"createdAt,omitempty"`
	UpdatedAt              string                   `json:"updatedAt,omitempty"`
}

// ProfileFromRequest converts a CreateProfileRequest to a UserProfile model.
func ProfileFromRequest(req CreateProfileRequest) (*domain.UserProfile, error) {
	birthDate, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil {
		return nil, err
	}

	profile := &domain.UserProfile{
		HeightCM:             req.HeightCM,
		BirthDate:            birthDate,
		Sex:                  domain.Sex(req.Sex),
		Goal:                 domain.Goal(req.Goal),
		TargetWeightKg:       req.TargetWeightKg,
		TargetWeeklyChangeKg: req.TargetWeeklyChangeKg,
		CarbRatio:            req.CarbRatio,
		ProteinRatio:         req.ProteinRatio,
		FatRatio:             req.FatRatio,
		MealRatios: domain.MealRatios{
			Breakfast: req.MealRatios.Breakfast,
			Lunch:     req.MealRatios.Lunch,
			Dinner:    req.MealRatios.Dinner,
		},
		PointsConfig: domain.PointsConfig{
			CarbMultiplier:    req.PointsConfig.CarbMultiplier,
			ProteinMultiplier: req.PointsConfig.ProteinMultiplier,
			FatMultiplier:     req.PointsConfig.FatMultiplier,
		},
		SupplementConfig: domain.SupplementConfig{
			MaltodextrinG: req.SupplementConfig.MaltodextrinG,
			WheyG:         req.SupplementConfig.WheyG,
			CollagenG:     req.SupplementConfig.CollagenG,
		},
		FruitTargetG:  req.FruitTargetG,
		VeggieTargetG: req.VeggieTargetG,
		BMREquation:   domain.BMREquation(req.BMREquation),
	}

	// Handle optional fields
	if req.CurrentWeightKg != nil {
		profile.CurrentWeightKg = *req.CurrentWeightKg
	}
	if req.TimeframeWeeks != nil {
		profile.TimeframeWeeks = *req.TimeframeWeeks
	}
	if req.BodyFatPercent != nil {
		profile.BodyFatPercent = *req.BodyFatPercent
	}
	if req.TDEESource != "" {
		profile.TDEESource = domain.TDEESource(req.TDEESource)
	}
	if req.ManualTDEE != nil {
		profile.ManualTDEE = *req.ManualTDEE
	}
	if req.RecalibrationTolerance != nil {
		profile.RecalibrationTolerance = *req.RecalibrationTolerance
	}

	return profile, nil
}

// ProfileToResponse converts a UserProfile model to a ProfileResponse.
func ProfileToResponse(p *domain.UserProfile) ProfileResponse {
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
		SupplementConfig: SupplementConfigResponse{
			MaltodextrinG: p.SupplementConfig.MaltodextrinG,
			WheyG:         p.SupplementConfig.WheyG,
			CollagenG:     p.SupplementConfig.CollagenG,
		},
		FruitTargetG:           p.FruitTargetG,
		VeggieTargetG:          p.VeggieTargetG,
		BMREquation:            string(p.BMREquation),
		TDEESource:             string(p.TDEESource),
		RecalibrationTolerance: p.RecalibrationTolerance,
	}

	// Include optional fields only if set
	if p.CurrentWeightKg > 0 {
		resp.CurrentWeightKg = &p.CurrentWeightKg
	}
	if p.TimeframeWeeks > 0 {
		resp.TimeframeWeeks = &p.TimeframeWeeks
	}
	if p.BodyFatPercent > 0 {
		resp.BodyFatPercent = &p.BodyFatPercent
	}
	if p.ManualTDEE > 0 {
		resp.ManualTDEE = &p.ManualTDEE
	}

	if !p.CreatedAt.IsZero() {
		resp.CreatedAt = p.CreatedAt.Format(time.RFC3339)
	}
	if !p.UpdatedAt.IsZero() {
		resp.UpdatedAt = p.UpdatedAt.Format(time.RFC3339)
	}

	return resp
}
