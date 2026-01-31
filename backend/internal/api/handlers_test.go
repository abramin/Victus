package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"victus/internal/testutil"

	"github.com/stretchr/testify/suite"
)

type HandlerSuite struct {
	suite.Suite
	pg     *testutil.PostgresContainer
	db     *sql.DB
	server *Server
	ctx    context.Context
}

func TestHandlerSuite(t *testing.T) {
	suite.Run(t, new(HandlerSuite))
}

func (s *HandlerSuite) SetupSuite() {
	s.pg = testutil.SetupPostgres(s.T())
	s.db = s.pg.DB
}

func (s *HandlerSuite) SetupTest() {
	s.ctx = context.Background()
	s.Require().NoError(s.pg.ClearTables(s.ctx))

	s.server = NewServer(s.db)
}

func (s *HandlerSuite) doRequest(method, path string, body interface{}) *httptest.ResponseRecorder {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		s.Require().NoError(err)
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req := httptest.NewRequest(method, path, reqBody)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	rec := httptest.NewRecorder()
	s.server.Handler().ServeHTTP(rec, req)
	return rec
}

func (s *HandlerSuite) createProfile() {
	profileReq := map[string]interface{}{
		"height_cm":            180,
		"birthDate":            "1990-06-15",
		"sex":                  "male",
		"goal":                 "lose_weight",
		"targetWeightKg":       80,
		"targetWeeklyChangeKg": -0.5,
	}
	rec := s.doRequest("PUT", "/api/profile", profileReq)
	s.Require().Equal(http.StatusOK, rec.Code, "Setup: profile creation should succeed")
}

func (s *HandlerSuite) createDailyLogForDate(date string) {
	logReq := map[string]interface{}{
		"date":         date,
		"weightKg":     85,
		"sleepQuality": 80,
		"plannedTrainingSessions": []map[string]interface{}{
			{
				"type":        "strength",
				"durationMin": 60,
			},
		},
		"dayType": "performance",
	}

	rec := s.doRequest("POST", "/api/logs", logReq)
	s.Require().Equal(http.StatusCreated, rec.Code, "Setup: daily log creation should succeed")
}

func (s *HandlerSuite) insertLegacyLog(date string) {
	_, err := s.db.Exec(
		`INSERT INTO daily_logs (log_date, weight_kg, sleep_quality, planned_training_type, planned_duration_min)
		 VALUES ($1, $2, $3, $4, $5)`,
		date, 85, 80, "rest", 0,
	)
	s.Require().NoError(err)
}

// --- Health endpoint tests ---
// Justification: Health check is infrastructure - not a user-facing contract.

func (s *HandlerSuite) TestHealthEndpoint() {
	s.Run("returns 200 with status ok", func() {
		rec := s.doRequest("GET", "/api/health", nil)
		s.Equal(http.StatusOK, rec.Code)

		var resp map[string]string
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("ok", resp["status"])
		s.Equal("backend", resp["service"])
	})
}

// --- Profile endpoint tests ---
// Justification: Tests JSON parsing and validation edge cases not covered by feature scenarios.
// Feature scenarios cover happy path CRUD; these test error mapping at HTTP boundary.

func (s *HandlerSuite) TestProfileValidation() {
	s.Run("invalid height returns 400", func() {
		req := map[string]interface{}{
			"height_cm":            50, // Too short
			"birthDate":            "1990-06-15",
			"sex":                  "male",
			"goal":                 "lose_weight",
			"targetWeightKg":       80,
			"targetWeeklyChangeKg": -0.5,
		}
		rec := s.doRequest("PUT", "/api/profile", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("validation_error", resp.Error)
	})

	s.Run("invalid birth date format returns 400", func() {
		req := map[string]interface{}{
			"height_cm":            180,
			"birthDate":            "15-06-1990", // Wrong format
			"sex":                  "male",
			"goal":                 "lose_weight",
			"targetWeightKg":       80,
			"targetWeeklyChangeKg": -0.5,
		}
		rec := s.doRequest("PUT", "/api/profile", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("invalid_date", resp.Error)
	})

	s.Run("invalid sex returns 400", func() {
		req := map[string]interface{}{
			"height_cm":            180,
			"birthDate":            "1990-06-15",
			"sex":                  "other",
			"goal":                 "lose_weight",
			"targetWeightKg":       80,
			"targetWeeklyChangeKg": -0.5,
		}
		rec := s.doRequest("PUT", "/api/profile", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("validation_error", resp.Error)
	})

	s.Run("invalid goal returns 400", func() {
		req := map[string]interface{}{
			"height_cm":            180,
			"birthDate":            "1990-06-15",
			"sex":                  "male",
			"goal":                 "bulk",
			"targetWeightKg":       80,
			"targetWeeklyChangeKg": -0.5,
		}
		rec := s.doRequest("PUT", "/api/profile", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("validation_error", resp.Error)
	})

	s.Run("invalid JSON returns 400", func() {
		req := httptest.NewRequest("PUT", "/api/profile", bytes.NewBufferString("not json"))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		s.server.Handler().ServeHTTP(rec, req)

		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("invalid_json", resp.Error)
	})
}

// Justification: Tests error response for missing profile - edge case not in feature scenarios.
func (s *HandlerSuite) TestProfileNotFound() {
	s.Run("GET profile when none exists returns 404", func() {
		rec := s.doRequest("GET", "/api/profile", nil)
		s.Equal(http.StatusNotFound, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("not_found", resp.Error)
	})
}

// NOTE: TestProfileCRUD removed - redundant with profile.feature scenarios:
// - "Create or update a user profile with defaults"
// - "Fetch the current profile"

// --- Daily log endpoint tests ---
// NOTE: Tests validation edge cases and error mapping not fully covered by feature scenarios.
// Feature scenarios cover: invalid training type, missing profile, not found, duplicate, happy paths.
// These tests cover: invalid day type (no feature scenario for this), JSON parsing errors (HTTP-layer concern).

// NOTE: TestDailyLogRequiresProfile removed - redundant with dailylog.feature:
// - "Reject daily log creation without profile"

func (s *HandlerSuite) TestDailyLogValidation() {
	s.createProfile()

	// NOTE: "invalid training type" subtest removed - covered by dailylog.feature:
	// - "Reject invalid training type"

	s.Run("invalid day type returns 400", func() {
		today := time.Now().Format("2006-01-02")
		req := map[string]interface{}{
			"date":         today,
			"weightKg":     85,
			"sleepQuality": 80,
			"plannedTrainingSessions": []map[string]interface{}{
				{
					"type":        "strength",
					"durationMin": 60,
				},
			},
			"dayType": "invalid_day",
		}
		rec := s.doRequest("POST", "/api/logs", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("validation_error", resp.Error)
	})

	s.Run("invalid JSON returns 400", func() {
		req := httptest.NewRequest("POST", "/api/logs", bytes.NewBufferString("not json"))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		s.server.Handler().ServeHTTP(rec, req)

		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("invalid_json", resp.Error)
	})
}

// Justification: Regression test for legacy rows with NULL calculated targets.
func (s *HandlerSuite) TestDailyLogLegacyTargetsDefaults() {
	date := "2025-02-01"
	s.insertLegacyLog(date)

	s.Run("GET by date returns 200 with default targets", func() {
		rec := s.doRequest("GET", "/api/logs/"+date, nil)
		s.Equal(http.StatusOK, rec.Code)

		var resp struct {
			CalculatedTargets struct {
				DayType       string `json:"dayType"`
				TotalCalories int    `json:"totalCalories"`
				Meals         struct {
					Breakfast struct {
						Carbs int `json:"carbs"`
					} `json:"breakfast"`
				} `json:"meals"`
			} `json:"calculatedTargets"`
		}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("fatburner", resp.CalculatedTargets.DayType)
		s.Equal(0, resp.CalculatedTargets.TotalCalories)
		s.Equal(0, resp.CalculatedTargets.Meals.Breakfast.Carbs)
	})

	s.Run("GET range returns 200 with default targets", func() {
		rec := s.doRequest("GET", "/api/logs?start="+date+"&end="+date, nil)
		s.Equal(http.StatusOK, rec.Code)

		var resp struct {
			Days []struct {
				Date              string `json:"date"`
				CalculatedTargets struct {
					DayType       string `json:"dayType"`
					TotalCalories int    `json:"totalCalories"`
				} `json:"calculatedTargets"`
			} `json:"days"`
		}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Require().Len(resp.Days, 1)
		s.Equal(date, resp.Days[0].Date)
		s.Equal("fatburner", resp.Days[0].CalculatedTargets.DayType)
		s.Equal(0, resp.Days[0].CalculatedTargets.TotalCalories)
	})
}

// NOTE: The following tests were removed as redundant with dailylog.feature scenarios:
// - TestDailyLogNotFound: "Return 404 when no log exists for today"
// - TestDailyLogCreation: "Create a daily log with calculated targets"
// - TestDailyLogRetrieval: "Fetch today's log after creation"
// - TestDailyLogDeletion: "Delete today's log"
// - TestDuplicateLogReturnsConflict: "Reject duplicate daily log for same date"

// --- Training config endpoint tests ---
// Justification: Ensures training configs are complete and well-formed.
// Exact MET/load values are validated at the domain level.

func (s *HandlerSuite) TestTrainingConfigsEndpoint() {
	s.Run("returns all training configs", func() {
		rec := s.doRequest("GET", "/api/training-configs", nil)
		s.Equal(http.StatusOK, rec.Code)

		var configs []TrainingConfigResponse
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &configs))

		// Should have all 12 training types
		s.Len(configs, 12)

		expectedTypes := []string{
			"rest", "qigong", "walking", "gmb", "run", "row",
			"cycle", "hiit", "strength", "calisthenics", "mobility", "mixed",
		}
		configMap := make(map[string]TrainingConfigResponse, len(configs))
		for _, c := range configs {
			s.NotEmpty(c.Type)
			s.Greater(c.MET, 0.0)
			s.GreaterOrEqual(c.LoadScore, 0.0)
			configMap[c.Type] = c
		}
		for _, typ := range expectedTypes {
			_, ok := configMap[typ]
			s.True(ok, "missing training type: %s", typ)
		}
	})
}

// --- Actual training endpoint tests ---
// NOTE: Tests PATCH /actual-training validation not covered by feature scenarios.
// Feature scenarios test min/max RPE boundaries (1-10); these test out-of-range values (11).
// Also tests 404 for missing log which is an HTTP-layer concern.

func (s *HandlerSuite) TestActualTrainingUpdate() {
	s.createProfile()

	s.Run("invalid perceived intensity returns 400", func() {
		date := "2025-01-17"
		s.createDailyLogForDate(date)

		req := map[string]interface{}{
			"actualSessions": []map[string]interface{}{
				{
					"type":               "strength",
					"durationMin":        30,
					"perceivedIntensity": 11,
				},
			},
		}

		rec := s.doRequest("PATCH", "/api/logs/"+date+"/actual-training", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("validation_error", resp.Error)
	})

	s.Run("missing log returns 404", func() {
		rec := s.doRequest("PATCH", "/api/logs/2025-01-99/actual-training", map[string]interface{}{
			"actualSessions": []map[string]interface{}{
				{
					"type":        "walking",
					"durationMin": 20,
				},
			},
		})
		s.Equal(http.StatusNotFound, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("not_found", resp.Error)
	})
}

// --- Plan endpoint error-mapping tests ---
// Justification: Feature scenarios cover plan happy paths. These protect the HTTP-layer
// error-code mapping (400, 409, 404) which is a seam between service errors and status codes.

func (s *HandlerSuite) TestPlanCreationErrorMapping() {
	s.Run("creating plan without profile returns 400 with profile_required", func() {
		req := map[string]interface{}{
			"startDate":     time.Now().Format("2006-01-02"),
			"startWeightKg": 90,
			"goalWeightKg":  85,
			"durationWeeks": 10,
		}
		rec := s.doRequest("POST", "/api/plans", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("profile_required", resp.Error)
	})

	s.Run("creating second active plan returns 409", func() {
		s.createProfile()

		// Create first plan
		req := map[string]interface{}{
			"startDate":     time.Now().Format("2006-01-02"),
			"startWeightKg": 90,
			"goalWeightKg":  85,
			"durationWeeks": 10,
		}
		rec := s.doRequest("POST", "/api/plans", req)
		s.Equal(http.StatusCreated, rec.Code, "first plan creation should succeed")

		// Try second active plan
		rec = s.doRequest("POST", "/api/plans", req)
		s.Equal(http.StatusConflict, rec.Code, "duplicate active plan should return 409")
	})
}

func (s *HandlerSuite) TestPlanNotFoundErrorMapping() {
	s.Run("GET non-existent plan returns 404", func() {
		rec := s.doRequest("GET", "/api/plans/99999", nil)
		s.Equal(http.StatusNotFound, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("not_found", resp.Error)
	})

	s.Run("complete non-existent plan returns 404", func() {
		rec := s.doRequest("POST", "/api/plans/99999/complete", nil)
		s.Equal(http.StatusNotFound, rec.Code)
	})

	s.Run("abandon non-existent plan returns 404", func() {
		rec := s.doRequest("POST", "/api/plans/99999/abandon", nil)
		s.Equal(http.StatusNotFound, rec.Code)
	})

	s.Run("active plan returns null when none exists", func() {
		rec := s.doRequest("GET", "/api/plans/active", nil)
		s.Equal(http.StatusOK, rec.Code)

		var resp interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Nil(resp)
	})
}

func (s *HandlerSuite) TestDailyLogConflictMapping() {
	s.Run("duplicate log for same date returns 409", func() {
		s.createProfile()
		date := time.Now().Format("2006-01-02")

		logReq := map[string]interface{}{
			"date":         date,
			"weightKg":     85,
			"sleepQuality": 80,
			"dayType":      "fatburner",
		}

		// First creation succeeds
		rec := s.doRequest("POST", "/api/logs", logReq)
		s.Equal(http.StatusCreated, rec.Code, "first log creation should succeed")

		// Second creation for same date fails with 409
		rec = s.doRequest("POST", "/api/logs", logReq)
		s.Equal(http.StatusConflict, rec.Code, "duplicate date should return 409")
	})
}

func (s *HandlerSuite) TestRecalibrateEndpoint() {
	s.Run("increase_deficit updates plan parameters and returns 200", func() {
		s.createProfile()

		// Create a plan starting 3 days ago (within the 7-day validation window)
		startDate := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
		createReq := map[string]interface{}{
			"startDate":     startDate,
			"startWeightKg": 90,
			"goalWeightKg":  85,
			"durationWeeks": 10,
		}
		rec := s.doRequest("POST", "/api/plans", createReq)
		s.Equal(http.StatusCreated, rec.Code, "plan creation should succeed")

		var planResp map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &planResp))
		planID := int64(planResp["id"].(float64))

		// Recalibrate with increase_deficit
		recalReq := map[string]interface{}{
			"type": "increase_deficit",
		}
		rec = s.doRequest("POST", fmt.Sprintf("/api/plans/%d/recalibrate", planID), recalReq)
		s.Equal(http.StatusOK, rec.Code, "recalibrate should return 200")

		var updatedPlan map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &updatedPlan))

		// Verify response contains updated plan
		s.NotNil(updatedPlan["id"], "response should have plan ID")
		s.NotNil(updatedPlan["requiredDailyDeficitKcal"], "response should have deficit")
		s.NotNil(updatedPlan["weeklyTargets"], "response should have weekly targets")
	})

	s.Run("recalibrate non-existent plan returns 404", func() {
		recalReq := map[string]interface{}{
			"type": "increase_deficit",
		}
		rec := s.doRequest("POST", "/api/plans/99999/recalibrate", recalReq)
		s.Equal(http.StatusNotFound, rec.Code)
	})
}

func (s *HandlerSuite) TestRecalibrateFullCycle() {
	s.Run("recalibrate updates targets and subsequent analysis reflects change", func() {
		s.createProfile()

		// Create plan: 90kg → 85kg over 10 weeks, starting 3 days ago
		startDate := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
		createReq := map[string]interface{}{
			"startDate":     startDate,
			"startWeightKg": 90,
			"goalWeightKg":  85,
			"durationWeeks": 10,
		}
		rec := s.doRequest("POST", "/api/plans", createReq)
		s.Equal(http.StatusCreated, rec.Code, "plan creation should succeed")

		var planResp map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &planResp))
		planID := int64(planResp["id"].(float64))
		origDeficit := planResp["requiredDailyDeficitKcal"].(float64)

		// Log weights for the past 3 days — higher than projected (off track)
		for i := 3; i >= 1; i-- {
			logDate := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
			logReq := map[string]interface{}{
				"date":         logDate,
				"weightKg":     89, // Barely lost weight — plan expected more loss
				"sleepQuality": 75,
				"dayType":      "fatburner",
			}
			rec = s.doRequest("POST", "/api/logs", logReq)
			s.Equal(http.StatusCreated, rec.Code, "log creation for %s should succeed", logDate)
		}

		// Recalibrate with increase_deficit
		recalReq := map[string]interface{}{
			"type": "increase_deficit",
		}
		rec = s.doRequest("POST", fmt.Sprintf("/api/plans/%d/recalibrate", planID), recalReq)
		s.Equal(http.StatusOK, rec.Code, "recalibrate should succeed")

		var updatedPlan map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &updatedPlan))

		newDeficit := updatedPlan["requiredDailyDeficitKcal"].(float64)
		// Deficit should be more negative (larger magnitude) after recalibration
		s.Less(newDeficit, origDeficit,
			"deficit should increase in magnitude after recalibration (orig: %f, new: %f)",
			origDeficit, newDeficit)

		// Now fetch analysis — should reflect the updated plan targets
		rec = s.doRequest("GET", fmt.Sprintf("/api/plans/%d/analysis", planID), nil)
		s.Equal(http.StatusOK, rec.Code, "analysis after recalibrate should succeed")

		var analysis map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &analysis))

		// plannedWeightKg should now be closer to actual (89kg)
		plannedWeight := analysis["plannedWeightKg"].(float64)
		s.InDelta(89, plannedWeight, 2.0,
			"planned weight should be near actual weight after recalibration")
	})
}
