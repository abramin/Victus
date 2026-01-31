package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

// Justification: Validation/default rules are pure domain invariants; unit tests guard
// against regression without relying on feature flows.
type DailyLogSuite struct {
	suite.Suite
	now time.Time
}

func TestDailyLogSuite(t *testing.T) {
	suite.Run(t, new(DailyLogSuite))
}

func (s *DailyLogSuite) SetupTest() {
	s.now = time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
}

func (s *DailyLogSuite) validLog() *DailyLog {
	return &DailyLog{
		Date:         "2025-01-15",
		WeightKg:     85,
		SleepQuality: 80,
		PlannedSessions: []TrainingSession{{
			SessionOrder: 1,
			IsPlanned:    true,
			Type:         TrainingTypeStrength,
			DurationMin:  60,
		}},
		DayType: DayTypePerformance,
	}
}

func (s *DailyLogSuite) TestDateValidation() {
	s.Run("valid YYYY-MM-DD format accepted", func() {
		log := s.validLog()
		log.Date = "2025-01-15"
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects invalid format", func() {
		log := s.validLog()
		log.Date = "01-15-2025"
		s.Require().ErrorIs(log.Validate(), ErrInvalidDate)
	})

	s.Run("rejects empty date", func() {
		log := s.validLog()
		log.Date = ""
		s.Require().ErrorIs(log.Validate(), ErrInvalidDate)
	})

	s.Run("rejects invalid month", func() {
		log := s.validLog()
		log.Date = "2025-13-15"
		s.Require().ErrorIs(log.Validate(), ErrInvalidDate)
	})

	s.Run("rejects invalid day", func() {
		log := s.validLog()
		log.Date = "2025-02-30"
		s.Require().ErrorIs(log.Validate(), ErrInvalidDate)
	})
}

func (s *DailyLogSuite) TestWeightValidation() {
	s.Run("accepts weight at lower boundary", func() {
		log := s.validLog()
		log.WeightKg = 30
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts weight at upper boundary", func() {
		log := s.validLog()
		log.WeightKg = 300
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects weight below minimum", func() {
		log := s.validLog()
		log.WeightKg = 29.9
		s.Require().ErrorIs(log.Validate(), ErrInvalidWeight)
	})

	s.Run("rejects weight above maximum", func() {
		log := s.validLog()
		log.WeightKg = 300.1
		s.Require().ErrorIs(log.Validate(), ErrInvalidWeight)
	})
}

func (s *DailyLogSuite) TestBodyFatValidation() {
	s.Run("nil body fat is valid", func() {
		log := s.validLog()
		log.BodyFatPercent = nil
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts body fat at lower boundary", func() {
		log := s.validLog()
		bf := 3.0
		log.BodyFatPercent = &bf
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts body fat at upper boundary", func() {
		log := s.validLog()
		bf := 70.0
		log.BodyFatPercent = &bf
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects body fat below minimum", func() {
		log := s.validLog()
		bf := 2.9
		log.BodyFatPercent = &bf
		s.Require().ErrorIs(log.Validate(), ErrInvalidBodyFat)
	})

	s.Run("rejects body fat above maximum", func() {
		log := s.validLog()
		bf := 70.1
		log.BodyFatPercent = &bf
		s.Require().ErrorIs(log.Validate(), ErrInvalidBodyFat)
	})
}

func (s *DailyLogSuite) TestHeartRateValidation() {
	s.Run("nil heart rate is valid", func() {
		log := s.validLog()
		log.RestingHeartRate = nil
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts heart rate at lower boundary", func() {
		log := s.validLog()
		hr := 30
		log.RestingHeartRate = &hr
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts heart rate at upper boundary", func() {
		log := s.validLog()
		hr := 200
		log.RestingHeartRate = &hr
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects heart rate below minimum", func() {
		log := s.validLog()
		hr := 29
		log.RestingHeartRate = &hr
		s.Require().ErrorIs(log.Validate(), ErrInvalidHeartRate)
	})

	s.Run("rejects heart rate above maximum", func() {
		log := s.validLog()
		hr := 201
		log.RestingHeartRate = &hr
		s.Require().ErrorIs(log.Validate(), ErrInvalidHeartRate)
	})
}

func (s *DailyLogSuite) TestSleepQualityValidation() {
	s.Run("accepts sleep quality at lower boundary", func() {
		log := s.validLog()
		log.SleepQuality = 1
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts sleep quality at upper boundary", func() {
		log := s.validLog()
		log.SleepQuality = 100
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects sleep quality below minimum", func() {
		log := s.validLog()
		log.SleepQuality = 0
		s.Require().ErrorIs(log.Validate(), ErrInvalidSleepQuality)
	})

	s.Run("rejects sleep quality above maximum", func() {
		log := s.validLog()
		log.SleepQuality = 101
		s.Require().ErrorIs(log.Validate(), ErrInvalidSleepQuality)
	})
}

func (s *DailyLogSuite) TestSleepHoursValidation() {
	s.Run("nil sleep hours is valid", func() {
		log := s.validLog()
		log.SleepHours = nil
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts sleep hours at lower boundary", func() {
		log := s.validLog()
		sh := 0.0
		log.SleepHours = &sh
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts sleep hours at upper boundary", func() {
		log := s.validLog()
		sh := 24.0
		log.SleepHours = &sh
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects negative sleep hours", func() {
		log := s.validLog()
		sh := -0.1
		log.SleepHours = &sh
		s.Require().ErrorIs(log.Validate(), ErrInvalidSleepHours)
	})

	s.Run("rejects sleep hours above maximum", func() {
		log := s.validLog()
		sh := 24.1
		log.SleepHours = &sh
		s.Require().ErrorIs(log.Validate(), ErrInvalidSleepHours)
	})
}

func (s *DailyLogSuite) TestTrainingTypeValidation() {
	s.Run("accepts all valid training types", func() {
		validTypes := []TrainingType{
			TrainingTypeRest, TrainingTypeQigong, TrainingTypeWalking,
			TrainingTypeGMB, TrainingTypeRun, TrainingTypeRow,
			TrainingTypeCycle, TrainingTypeHIIT, TrainingTypeStrength,
			TrainingTypeCalisthenics, TrainingTypeMobility, TrainingTypeMixed,
		}
		for _, tt := range validTypes {
			log := s.validLog()
			log.PlannedSessions[0].Type = tt
			s.Require().NoError(log.Validate(), "Should accept training type: %s", tt)
		}
	})

	s.Run("rejects invalid training type", func() {
		log := s.validLog()
		log.PlannedSessions[0].Type = "invalid_type"
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingType)
	})

	s.Run("rejects empty training type", func() {
		log := s.validLog()
		log.PlannedSessions[0].Type = ""
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingType)
	})
}

func (s *DailyLogSuite) TestTrainingDurationValidation() {
	s.Run("accepts duration at lower boundary", func() {
		log := s.validLog()
		log.PlannedSessions[0].DurationMin = 0
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts duration at upper boundary", func() {
		log := s.validLog()
		log.PlannedSessions[0].DurationMin = 480
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects negative duration", func() {
		log := s.validLog()
		log.PlannedSessions[0].DurationMin = -1
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingDuration)
	})

	s.Run("rejects duration above maximum", func() {
		log := s.validLog()
		log.PlannedSessions[0].DurationMin = 481
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingDuration)
	})
}

func (s *DailyLogSuite) TestDayTypeValidation() {
	s.Run("accepts all valid day types", func() {
		validTypes := []DayType{DayTypePerformance, DayTypeFatburner, DayTypeMetabolize}
		for _, dt := range validTypes {
			log := s.validLog()
			log.DayType = dt
			s.Require().NoError(log.Validate(), "Should accept day type: %s", dt)
		}
	})

	s.Run("rejects invalid day type", func() {
		log := s.validLog()
		log.DayType = "invalid"
		s.Require().ErrorIs(log.Validate(), ErrInvalidDayType)
	})

	s.Run("rejects empty day type", func() {
		log := s.validLog()
		log.DayType = ""
		s.Require().ErrorIs(log.Validate(), ErrInvalidDayType)
	})
}

func (s *DailyLogSuite) TestDefaultsApplication() {
	s.Run("defaults date to today", func() {
		log := &DailyLog{WeightKg: 85}
		log.SetDefaultsAt(s.now)
		s.Equal("2025-01-15", log.Date)
	})

	s.Run("defaults sleep quality to 50", func() {
		log := &DailyLog{WeightKg: 85}
		log.SetDefaultsAt(s.now)
		s.Equal(SleepQuality(50), log.SleepQuality)
	})

	s.Run("defaults training type to rest", func() {
		log := &DailyLog{WeightKg: 85}
		log.SetDefaultsAt(s.now)
		s.Require().Len(log.PlannedSessions, 1)
		s.Equal(TrainingTypeRest, log.PlannedSessions[0].Type)
	})

	s.Run("defaults day type to fatburner", func() {
		log := &DailyLog{WeightKg: 85}
		log.SetDefaultsAt(s.now)
		s.Equal(DayTypeFatburner, log.DayType)
	})

	s.Run("rest training forces duration to zero", func() {
		log := &DailyLog{
			WeightKg: 85,
			PlannedSessions: []TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         TrainingTypeRest,
				DurationMin:  60,
			}},
		}
		log.SetDefaultsAt(s.now)
		s.Equal(0, log.PlannedSessions[0].DurationMin)
	})

	s.Run("does not override explicit values", func() {
		log := &DailyLog{
			Date:         "2025-02-20",
			WeightKg:     85,
			SleepQuality: 90,
			PlannedSessions: []TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         TrainingTypeStrength,
				DurationMin:  45,
			}},
			DayType: DayTypeMetabolize,
		}
		log.SetDefaultsAt(s.now)
		s.Equal("2025-02-20", log.Date)
		s.Equal(SleepQuality(90), log.SleepQuality)
		s.Equal(TrainingTypeStrength, log.PlannedSessions[0].Type)
		s.Equal(45, log.PlannedSessions[0].DurationMin)
		s.Equal(DayTypeMetabolize, log.DayType)
	})
}

func (s *DailyLogSuite) TestNewDailyLog() {
	s.Run("creates valid log with required fields", func() {
		log, err := NewDailyLog(
			"2025-01-15",
			85,
			80,
			[]TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         TrainingTypeStrength,
				DurationMin:  60,
			}},
			DayTypePerformance,
			s.now,
		)
		s.Require().NoError(err)
		s.Equal("2025-01-15", log.Date)
		s.Equal(85.0, log.WeightKg)
		s.Equal(SleepQuality(80), log.SleepQuality)
	})

	s.Run("returns error for invalid input", func() {
		_, err := NewDailyLog(
			"invalid-date",
			85,
			80,
			[]TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         TrainingTypeStrength,
				DurationMin:  60,
			}},
			DayTypePerformance,
			s.now,
		)
		s.Require().ErrorIs(err, ErrInvalidDate)
	})
}

func (s *DailyLogSuite) TestDailyLogBuilder() {
	s.Run("builds log with optional fields", func() {
		log, err := NewDailyLogBuilder(
			"2025-01-15",
			85,
			80,
			[]TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         TrainingTypeStrength,
				DurationMin:  60,
			}},
			DayTypePerformance,
		).
			WithBodyFat(15.5).
			WithSleepHours(7.5).
			WithRestingHeartRate(55).
			Build(s.now)

		s.Require().NoError(err)
		s.Require().NotNil(log.BodyFatPercent)
		s.Equal(15.5, *log.BodyFatPercent)
		s.Require().NotNil(log.SleepHours)
		s.Equal(7.5, *log.SleepHours)
		s.Require().NotNil(log.RestingHeartRate)
		s.Equal(55, *log.RestingHeartRate)
	})

	s.Run("builder validates on build", func() {
		_, err := NewDailyLogBuilder(
			"2025-01-15",
			25, // Invalid weight
			80,
			[]TrainingSession{{
				SessionOrder: 1,
				IsPlanned:    true,
				Type:         TrainingTypeStrength,
				DurationMin:  60,
			}},
			DayTypePerformance,
		).Build(s.now)

		s.Require().ErrorIs(err, ErrInvalidWeight)
	})
}

func (s *DailyLogSuite) intPtr(i int) *int {
	return &i
}

func (s *DailyLogSuite) TestLoadScore() {
	s.Run("uses actual sessions when present", func() {
		log := s.validLog()
		log.ActualSessions = []TrainingSession{
			{Type: TrainingTypeHIIT, DurationMin: 30, PerceivedIntensity: s.intPtr(8)},
		}
		// Should use actual: HIIT 30min RPE 8
		// 5 * (30/60) * (8/3) = 5 * 0.5 * 2.667 = 6.667
		s.InDelta(6.667, log.LoadScore(), 0.01)
	})

	s.Run("falls back to planned when no actual", func() {
		log := s.validLog()
		// validLog has Strength 60min, no RPE (defaults to 5)
		// 5 * (60/60) * (5/3) = 8.333
		s.InDelta(8.333, log.LoadScore(), 0.01)
	})

	s.Run("returns zero for rest day", func() {
		log := s.validLog()
		log.PlannedSessions = []TrainingSession{
			{Type: TrainingTypeRest, DurationMin: 0},
		}
		log.ActualSessions = nil
		s.Equal(0.0, log.LoadScore())
	})
}

func (s *DailyLogSuite) TestEffectiveSessions() {
	s.Run("returns actual when present", func() {
		log := s.validLog()
		log.ActualSessions = []TrainingSession{
			{Type: TrainingTypeHIIT, DurationMin: 30},
		}
		effective := log.EffectiveSessions()
		s.Len(effective, 1)
		s.Equal(TrainingTypeHIIT, effective[0].Type)
	})

	s.Run("returns planned when no actual", func() {
		log := s.validLog()
		log.ActualSessions = nil
		effective := log.EffectiveSessions()
		s.Len(effective, 1)
		s.Equal(TrainingTypeStrength, effective[0].Type) // From validLog
	})
}
