package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"victus/internal/db"

	"github.com/stretchr/testify/suite"
	_ "modernc.org/sqlite"
)

type HandlerSuite struct {
	suite.Suite
	db     *sql.DB
	server *Server
}

func TestHandlerSuite(t *testing.T) {
	suite.Run(t, new(HandlerSuite))
}

func (s *HandlerSuite) SetupTest() {
	var err error
	s.db, err = sql.Open("sqlite", ":memory:")
	s.Require().NoError(err)

	err = db.RunMigrations(s.db)
	s.Require().NoError(err)

	s.server = NewServer(s.db)
}

func (s *HandlerSuite) TearDownTest() {
	if s.db != nil {
		s.db.Close()
	}
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
		"height_cm":             180,
		"birthDate":            "1990-06-15",
		"sex":                  "male",
		"goal":                 "lose_weight",
		"targetWeightKg":       80,
		"targetWeeklyChangeKg": -0.5,
	}
	rec := s.doRequest("PUT", "/api/profile", profileReq)
	s.Require().Equal(http.StatusOK, rec.Code, "Setup: profile creation should succeed")
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
			"height_cm":             50, // Too short
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
			"height_cm":             180,
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
			"height_cm":             180,
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
			"height_cm":             180,
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
// Justification: Tests validation edge cases and error mapping not fully covered by feature scenarios.
// Feature covers: invalid training type, missing profile, not found, duplicate, happy paths.
// These tests cover: invalid day type, weight boundaries, JSON parsing errors.

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

	s.Run("weight below minimum returns 400", func() {
		today := time.Now().Format("2006-01-02")
		req := map[string]interface{}{
			"date":         today,
			"weightKg":     25, // Below 30kg minimum
			"sleepQuality": 80,
			"plannedTrainingSessions": []map[string]interface{}{
				{
					"type":        "strength",
					"durationMin": 60,
				},
			},
			"dayType": "performance",
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

// NOTE: The following tests were removed as redundant with dailylog.feature scenarios:
// - TestDailyLogNotFound: "Return 404 when no log exists for today"
// - TestDailyLogCreation: "Create a daily log with calculated targets"
// - TestDailyLogRetrieval: "Fetch today's log after creation"
// - TestDailyLogDeletion: "Delete today's log"
// - TestDuplicateLogReturnsConflict: "Reject duplicate daily log for same date"

// --- Training config endpoint tests ---
// Justification: Tests specific MET values and load scores from 2024 Compendium.
// Feature scenario training-configs.feature covers the contract; these verify exact values.

func (s *HandlerSuite) TestTrainingConfigsEndpoint() {
	s.Run("returns all training configs", func() {
		rec := s.doRequest("GET", "/api/training-configs", nil)
		s.Equal(http.StatusOK, rec.Code)

		var configs []TrainingConfigResponse
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &configs))

		// Should have all 12 training types
		s.Len(configs, 12)

		// Verify a few expected MET values from 2024 Compendium of Physical Activities
		configMap := make(map[string]TrainingConfigResponse)
		for _, c := range configs {
			configMap[c.Type] = c
		}

		// Rest should have MET 1.0 and load score 0
		s.Equal(1.0, configMap["rest"].MET)
		s.Equal(float64(0), configMap["rest"].LoadScore)

		// HIIT should have highest MET (12.8) and high load score (5)
		s.Equal(12.8, configMap["hiit"].MET)
		s.Equal(float64(5), configMap["hiit"].LoadScore)

		// Strength should have MET 5.0 and load score 5
		s.Equal(5.0, configMap["strength"].MET)
		s.Equal(float64(5), configMap["strength"].LoadScore)
	})
}
