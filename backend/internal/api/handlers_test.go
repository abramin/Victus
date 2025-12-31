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

func (s *HandlerSuite) TestProfileNotFound() {
	s.Run("GET profile when none exists returns 404", func() {
		rec := s.doRequest("GET", "/api/profile", nil)
		s.Equal(http.StatusNotFound, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("not_found", resp.Error)
	})
}

func (s *HandlerSuite) TestProfileCRUD() {
	s.Run("creates profile and returns with defaults", func() {
		req := map[string]interface{}{
			"height_cm":             180,
			"birthDate":            "1990-06-15",
			"sex":                  "male",
			"goal":                 "lose_weight",
			"targetWeightKg":       80,
			"targetWeeklyChangeKg": -0.5,
		}
		rec := s.doRequest("PUT", "/api/profile", req)
		s.Equal(http.StatusOK, rec.Code)

		var resp map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal(float64(180), resp["height_cm"])
		// Should have defaults
		s.Equal(0.45, resp["carbRatio"])
		s.Equal(0.30, resp["proteinRatio"])
	})

	s.Run("fetches created profile", func() {
		s.createProfile()
		rec := s.doRequest("GET", "/api/profile", nil)
		s.Equal(http.StatusOK, rec.Code)

		var resp map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal(float64(180), resp["height_cm"])
	})
}

// --- Daily log endpoint tests ---

func (s *HandlerSuite) TestDailyLogRequiresProfile() {
	s.Run("POST log without profile returns 400 profile_required", func() {
		today := time.Now().Format("2006-01-02")
		req := map[string]interface{}{
			"date":         today,
			"weightKg":     85,
			"sleepQuality": 80,
			"plannedTraining": map[string]interface{}{
				"type":               "strength",
				"plannedDurationMin": 60,
			},
			"dayType": "performance",
		}
		rec := s.doRequest("POST", "/api/logs", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("profile_required", resp.Error)
	})
}

func (s *HandlerSuite) TestDailyLogValidation() {
	s.createProfile()

	s.Run("invalid training type returns 400", func() {
		today := time.Now().Format("2006-01-02")
		req := map[string]interface{}{
			"date":         today,
			"weightKg":     85,
			"sleepQuality": 80,
			"plannedTraining": map[string]interface{}{
				"type":               "invalid_training",
				"plannedDurationMin": 60,
			},
			"dayType": "performance",
		}
		rec := s.doRequest("POST", "/api/logs", req)
		s.Equal(http.StatusBadRequest, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("validation_error", resp.Error)
	})

	s.Run("invalid day type returns 400", func() {
		today := time.Now().Format("2006-01-02")
		req := map[string]interface{}{
			"date":         today,
			"weightKg":     85,
			"sleepQuality": 80,
			"plannedTraining": map[string]interface{}{
				"type":               "strength",
				"plannedDurationMin": 60,
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
			"plannedTraining": map[string]interface{}{
				"type":               "strength",
				"plannedDurationMin": 60,
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

func (s *HandlerSuite) TestDailyLogNotFound() {
	s.Run("GET today's log when none exists returns 404", func() {
		rec := s.doRequest("GET", "/api/logs/today", nil)
		s.Equal(http.StatusNotFound, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("not_found", resp.Error)
	})
}

func (s *HandlerSuite) TestDailyLogCreation() {
	s.createProfile()

	s.Run("returns calculated targets with log data", func() {
		today := time.Now().Format("2006-01-02")
		req := map[string]interface{}{
			"date":         today,
			"weightKg":     85,
			"sleepQuality": 80,
			"plannedTraining": map[string]interface{}{
				"type":               "strength",
				"plannedDurationMin": 60,
			},
			"dayType": "performance",
		}
		rec := s.doRequest("POST", "/api/logs", req)
		s.Equal(http.StatusCreated, rec.Code)

		var resp map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal(today, resp["date"])
		s.Equal(float64(85), resp["weightKg"])

		// Should have calculated targets
		targets, ok := resp["calculatedTargets"].(map[string]interface{})
		s.Require().True(ok, "Response should include calculatedTargets")
		s.Greater(targets["totalCalories"], float64(0))
		s.Greater(targets["totalCarbsG"], float64(0))
	})
}

func (s *HandlerSuite) TestDailyLogRetrieval() {
	s.createProfile()

	// Create a log first
	today := time.Now().Format("2006-01-02")
	req := map[string]interface{}{
		"date":         today,
		"weightKg":     85,
		"sleepQuality": 80,
		"plannedTraining": map[string]interface{}{
			"type":               "strength",
			"plannedDurationMin": 60,
		},
		"dayType": "performance",
	}
	rec := s.doRequest("POST", "/api/logs", req)
	s.Require().Equal(http.StatusCreated, rec.Code)

	s.Run("fetches today's log after creation", func() {
		rec := s.doRequest("GET", "/api/logs/today", nil)
		s.Equal(http.StatusOK, rec.Code)

		var resp map[string]interface{}
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal(float64(85), resp["weightKg"])
	})
}

func (s *HandlerSuite) TestDailyLogDeletion() {
	s.createProfile()

	// Create a log first
	today := time.Now().Format("2006-01-02")
	req := map[string]interface{}{
		"date":         today,
		"weightKg":     85,
		"sleepQuality": 80,
		"plannedTraining": map[string]interface{}{
			"type":               "strength",
			"plannedDurationMin": 60,
		},
		"dayType": "performance",
	}
	rec := s.doRequest("POST", "/api/logs", req)
	s.Require().Equal(http.StatusCreated, rec.Code)

	s.Run("removes log and returns 204", func() {
		rec := s.doRequest("DELETE", "/api/logs/today", nil)
		s.Equal(http.StatusNoContent, rec.Code)

		// Verify deleted
		rec = s.doRequest("GET", "/api/logs/today", nil)
		s.Equal(http.StatusNotFound, rec.Code)
	})
}

func (s *HandlerSuite) TestDuplicateLogReturnsConflict() {
	s.createProfile()

	today := time.Now().Format("2006-01-02")
	req := map[string]interface{}{
		"date":         today,
		"weightKg":     85,
		"sleepQuality": 80,
		"plannedTraining": map[string]interface{}{
			"type":               "strength",
			"plannedDurationMin": 60,
		},
		"dayType": "performance",
	}

	// First creation succeeds
	rec := s.doRequest("POST", "/api/logs", req)
	s.Require().Equal(http.StatusCreated, rec.Code)

	s.Run("duplicate date returns 409 already_exists", func() {
		rec := s.doRequest("POST", "/api/logs", req)
		s.Equal(http.StatusConflict, rec.Code)

		var resp APIError
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &resp))
		s.Equal("already_exists", resp.Error)
	})
}

// --- Training config endpoint tests ---

func (s *HandlerSuite) TestTrainingConfigsEndpoint() {
	s.Run("returns all training configs", func() {
		rec := s.doRequest("GET", "/api/training-configs", nil)
		s.Equal(http.StatusOK, rec.Code)

		var configs []TrainingConfigResponse
		s.Require().NoError(json.Unmarshal(rec.Body.Bytes(), &configs))

		// Should have all 12 training types
		s.Len(configs, 12)

		// Verify a few expected values from PRD Section 3.3
		configMap := make(map[string]TrainingConfigResponse)
		for _, c := range configs {
			configMap[c.Type] = c
		}

		// Rest should have 0 cal/min and 0 load score
		s.Equal(float64(0), configMap["rest"].EstimatedCalPerMin)
		s.Equal(float64(0), configMap["rest"].LoadScore)

		// HIIT should have highest cal/min (12) and high load score (5)
		s.Equal(float64(12), configMap["hiit"].EstimatedCalPerMin)
		s.Equal(float64(5), configMap["hiit"].LoadScore)

		// Strength should have load score 5
		s.Equal(float64(7), configMap["strength"].EstimatedCalPerMin)
		s.Equal(float64(5), configMap["strength"].LoadScore)
	})
}
