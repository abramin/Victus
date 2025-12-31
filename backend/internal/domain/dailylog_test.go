package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

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
		Date:            "2025-01-15",
		WeightKg:        85,
		SleepQuality:    80,
		PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
		DayType:         DayTypePerformance,
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
			log.PlannedTraining.Type = tt
			s.Require().NoError(log.Validate(), "Should accept training type: %s", tt)
		}
	})

	s.Run("rejects invalid training type", func() {
		log := s.validLog()
		log.PlannedTraining.Type = "invalid_type"
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingType)
	})

	s.Run("rejects empty training type", func() {
		log := s.validLog()
		log.PlannedTraining.Type = ""
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingType)
	})
}

func (s *DailyLogSuite) TestTrainingDurationValidation() {
	s.Run("accepts duration at lower boundary", func() {
		log := s.validLog()
		log.PlannedTraining.PlannedDurationMin = 0
		s.Require().NoError(log.Validate())
	})

	s.Run("accepts duration at upper boundary", func() {
		log := s.validLog()
		log.PlannedTraining.PlannedDurationMin = 480
		s.Require().NoError(log.Validate())
	})

	s.Run("rejects negative duration", func() {
		log := s.validLog()
		log.PlannedTraining.PlannedDurationMin = -1
		s.Require().ErrorIs(log.Validate(), ErrInvalidTrainingDuration)
	})

	s.Run("rejects duration above maximum", func() {
		log := s.validLog()
		log.PlannedTraining.PlannedDurationMin = 481
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
		s.Equal(TrainingTypeRest, log.PlannedTraining.Type)
	})

	s.Run("defaults day type to fatburner", func() {
		log := &DailyLog{WeightKg: 85}
		log.SetDefaultsAt(s.now)
		s.Equal(DayTypeFatburner, log.DayType)
	})

	s.Run("rest training forces duration to zero", func() {
		log := &DailyLog{
			WeightKg:        85,
			PlannedTraining: PlannedTraining{Type: TrainingTypeRest, PlannedDurationMin: 60},
		}
		log.SetDefaultsAt(s.now)
		s.Equal(0, log.PlannedTraining.PlannedDurationMin)
	})

	s.Run("does not override explicit values", func() {
		log := &DailyLog{
			Date:            "2025-02-20",
			WeightKg:        85,
			SleepQuality:    90,
			PlannedTraining: PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 45},
			DayType:         DayTypeMetabolize,
		}
		log.SetDefaultsAt(s.now)
		s.Equal("2025-02-20", log.Date)
		s.Equal(SleepQuality(90), log.SleepQuality)
		s.Equal(TrainingTypeStrength, log.PlannedTraining.Type)
		s.Equal(45, log.PlannedTraining.PlannedDurationMin)
		s.Equal(DayTypeMetabolize, log.DayType)
	})
}

func (s *DailyLogSuite) TestNewDailyLog() {
	s.Run("creates valid log with required fields", func() {
		log, err := NewDailyLog(
			"2025-01-15",
			85,
			80,
			PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
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
			PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
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
			PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
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
			PlannedTraining{Type: TrainingTypeStrength, PlannedDurationMin: 60},
			DayTypePerformance,
		).Build(s.now)

		s.Require().ErrorIs(err, ErrInvalidWeight)
	})
}
