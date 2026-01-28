package domain

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

type ProgressionSuite struct {
	suite.Suite
}

func TestProgressionSuite(t *testing.T) {
	suite.Run(t, new(ProgressionSuite))
}

// =============================================================================
// VALIDATION TESTS
// =============================================================================

func (s *ProgressionSuite) TestValidateProgressionPattern_NilReturnsNil() {
	s.NoError(ValidateProgressionPattern(nil))
}

func (s *ProgressionSuite) TestValidateStrengthPattern_Valid() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	s.NoError(ValidateProgressionPattern(p))
}

func (s *ProgressionSuite) TestValidateSkillPattern_Valid() {
	p := &ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	s.NoError(ValidateProgressionPattern(p))
}

func (s *ProgressionSuite) TestValidateStrengthPattern_MissingConfig() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		// Strength is nil
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrProgressionTypeMismatch)
}

func (s *ProgressionSuite) TestValidateSkillPattern_MissingConfig() {
	p := &ProgressionPattern{
		Type: ProgressionTypeSkill,
		// Skill is nil
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrProgressionTypeMismatch)
}

func (s *ProgressionSuite) TestValidateStrengthPattern_TypeMismatch() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		Skill: &SkillConfig{ // wrong config type
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrProgressionTypeMismatch)
}

func (s *ProgressionSuite) TestValidateSkillPattern_TypeMismatch() {
	p := &ProgressionPattern{
		Type: ProgressionTypeSkill,
		Strength: &StrengthConfig{ // wrong config type
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrProgressionTypeMismatch)
}

func (s *ProgressionSuite) TestValidateStrengthPattern_InvalidBaseWeight() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       0, // invalid: must be > 0
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidStrengthConfig)
}

func (s *ProgressionSuite) TestValidateStrengthPattern_InvalidIncrement() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    0.1, // invalid: min is 0.5
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidStrengthConfig)
}

func (s *ProgressionSuite) TestValidateStrengthPattern_InvalidThreshold() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.3, // invalid: min is 0.5
			DeloadFrequency:  4,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidStrengthConfig)
}

func (s *ProgressionSuite) TestValidateStrengthPattern_InvalidDeloadFrequency() {
	p := &ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  15, // invalid: max is 12
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidStrengthConfig)
}

func (s *ProgressionSuite) TestValidateSkillPattern_InvalidMinSeconds() {
	p := &ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 0, // invalid: must be > 0
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidSkillConfig)
}

func (s *ProgressionSuite) TestValidateSkillPattern_MaxLessThanMin() {
	p := &ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 60,
			MaxSeconds: 30, // invalid: must be > MinSeconds
			RPETarget:  7.0,
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidSkillConfig)
}

func (s *ProgressionSuite) TestValidateSkillPattern_InvalidRPE() {
	p := &ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  11.0, // invalid: max is 10.0
		},
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidSkillConfig)
}

func (s *ProgressionSuite) TestValidatePattern_InvalidType() {
	p := &ProgressionPattern{
		Type: "unknown",
	}
	s.ErrorIs(ValidateProgressionPattern(p), ErrInvalidProgressionType)
}

// =============================================================================
// STRENGTH PROGRESSION CALCULATION TESTS
// =============================================================================

func (s *ProgressionSuite) TestCalculateStrength_FullAdherenceProgresses() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	last := SessionAdherence{
		PlannedSets:    5,
		CompletedSets:  5, // 100% >= 80% threshold
		LastBaseWeight: 60.0,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(62.5, result.BaseWeight) // 60 + 2.5
	s.Contains(result.Progression, "+")
	s.False(result.IsDeloadSession)
}

func (s *ProgressionSuite) TestCalculateStrength_PartialAdherenceProgresses() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	last := SessionAdherence{
		PlannedSets:    5,
		CompletedSets:  4, // 80% == 80% threshold (exactly meets)
		LastBaseWeight: 60.0,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(62.5, result.BaseWeight) // Progresses at exactly threshold
}

func (s *ProgressionSuite) TestCalculateStrength_BelowThresholdHolds() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	last := SessionAdherence{
		PlannedSets:    5,
		CompletedSets:  3, // 60% < 80% threshold
		LastBaseWeight: 60.0,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(60.0, result.BaseWeight) // No change
	s.Equal("Hold", result.Progression)
	s.False(result.IsDeloadSession)
}

func (s *ProgressionSuite) TestCalculateStrength_DeloadSentinel() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeStrength,
		Strength: &StrengthConfig{
			BaseWeight:       60.0,
			IncrementUnit:    2.5,
			SuccessThreshold: 0.8,
			DeloadFrequency:  4,
		},
	}
	last := SessionAdherence{
		PlannedSets:    0, // Deload sentinel
		LastBaseWeight: 70.0,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(63.0, result.BaseWeight) // 70 * 0.9
	s.True(result.IsDeloadSession)
	s.Equal("Deload session", result.Progression)
}

// =============================================================================
// SKILL PROGRESSION CALCULATION TESTS
// =============================================================================

func (s *ProgressionSuite) TestCalculateSkill_ExceedsMaxAdvancesWindow() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	last := SessionAdherence{
		TimeHeldSec:   65, // >= MaxSeconds (60)
		TargetTimeMin: 30,
		TargetTimeMax: 60,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(32, result.TargetTimeMin) // 30 + 2
	s.Equal(62, result.TargetTimeMax) // 60 + 2
	s.Equal("Window advanced", result.Progression)
}

func (s *ProgressionSuite) TestCalculateSkill_ExactlyAtMaxAdvances() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	last := SessionAdherence{
		TimeHeldSec:   60, // == MaxSeconds
		TargetTimeMin: 30,
		TargetTimeMax: 60,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(32, result.TargetTimeMin)
	s.Equal(62, result.TargetTimeMax)
	s.Equal("Window advanced", result.Progression)
}

func (s *ProgressionSuite) TestCalculateSkill_BelowMinRegresses() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	last := SessionAdherence{
		TimeHeldSec:   25, // < MinSeconds (30)
		TargetTimeMin: 30,
		TargetTimeMax: 60,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(28, result.TargetTimeMin) // 30 - 2
	s.Equal(58, result.TargetTimeMax) // 60 - 2
	s.Equal("Window regressed", result.Progression)
}

func (s *ProgressionSuite) TestCalculateSkill_InRangeHolds() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 30,
			MaxSeconds: 60,
			RPETarget:  7.0,
		},
	}
	last := SessionAdherence{
		TimeHeldSec:   45, // Between 30 and 60
		TargetTimeMin: 30,
		TargetTimeMax: 60,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(30, result.TargetTimeMin)
	s.Equal(60, result.TargetTimeMax)
	s.Equal("Hold", result.Progression)
}

func (s *ProgressionSuite) TestCalculateSkill_RegressionFloorsAtZero() {
	pattern := ProgressionPattern{
		Type: ProgressionTypeSkill,
		Skill: &SkillConfig{
			MinSeconds: 1,
			MaxSeconds: 5,
			RPETarget:  7.0,
		},
	}
	last := SessionAdherence{
		TimeHeldSec:   0, // Below min
		TargetTimeMin: 1,
		TargetTimeMax: 5,
	}

	result := CalculateNextTargets(pattern, last)
	s.Equal(0, result.TargetTimeMin)  // 1 - 2 → floored at 0
	s.True(result.TargetTimeMax > 0)  // max stays positive
	s.Equal("Window regressed", result.Progression)
}

// =============================================================================
// newProgramDay WITH PROGRESSION PATTERN
// =============================================================================

func (s *ProgressionSuite) TestNewProgramDay_WithValidPattern() {
	input := ProgramDayInput{
		DayNumber:    1,
		Label:        "Squat Day",
		TrainingType: "strength",
		DurationMin:  60,
		LoadScore:    4.0,
		ProgressionPattern: &ProgressionPattern{
			Type: ProgressionTypeStrength,
			Strength: &StrengthConfig{
				BaseWeight:       80.0,
				IncrementUnit:    5.0,
				SuccessThreshold: 1.0,
				DeloadFrequency:  4,
			},
		},
	}

	day, err := newProgramDay(input)
	s.NoError(err)
	s.NotNil(day.ProgressionPattern)
	s.Equal(ProgressionTypeStrength, day.ProgressionPattern.Type)
	s.Equal(80.0, day.ProgressionPattern.Strength.BaseWeight)
}

func (s *ProgressionSuite) TestNewProgramDay_WithInvalidPattern() {
	input := ProgramDayInput{
		DayNumber:    1,
		Label:        "Squat Day",
		TrainingType: "strength",
		DurationMin:  60,
		LoadScore:    4.0,
		ProgressionPattern: &ProgressionPattern{
			Type: ProgressionTypeStrength,
			// Missing Strength config
		},
	}

	_, err := newProgramDay(input)
	s.ErrorIs(err, ErrProgressionTypeMismatch)
}

func (s *ProgressionSuite) TestNewProgramDay_WithoutPattern() {
	input := ProgramDayInput{
		DayNumber:    1,
		Label:        "Squat Day",
		TrainingType: "strength",
		DurationMin:  60,
		LoadScore:    4.0,
		// No ProgressionPattern
	}

	day, err := newProgramDay(input)
	s.NoError(err)
	s.Nil(day.ProgressionPattern)
}

// =============================================================================
// SESSION EXERCISE VALIDATION TESTS
// =============================================================================

func (s *ProgressionSuite) TestValidateSessionExercises_Empty() {
	s.NoError(ValidateSessionExercises(nil))
	s.NoError(ValidateSessionExercises([]SessionExercise{}))
}

func (s *ProgressionSuite) TestValidateSessionExercises_Valid() {
	exercises := []SessionExercise{
		{ExerciseID: "hip_circles", Phase: SessionPhasePrepare, Order: 1},
		{ExerciseID: "bear_to_monkey", Phase: SessionPhasePractice, Order: 1},
		{ExerciseID: "frogger", Phase: SessionPhasePush, Order: 1},
		{ExerciseID: "plank_hold", Phase: SessionPhasePush, Order: 2},
	}
	s.NoError(ValidateSessionExercises(exercises))
}

func (s *ProgressionSuite) TestValidateSessionExercises_InvalidPhase() {
	exercises := []SessionExercise{
		{ExerciseID: "hip_circles", Phase: "warm_up", Order: 1},
	}
	s.ErrorIs(ValidateSessionExercises(exercises), ErrInvalidSessionPhase)
}

func (s *ProgressionSuite) TestValidateSessionExercises_EmptyExerciseID() {
	exercises := []SessionExercise{
		{ExerciseID: "", Phase: SessionPhasePrepare, Order: 1},
	}
	s.ErrorIs(ValidateSessionExercises(exercises), ErrInvalidSessionExerciseID)
}

func (s *ProgressionSuite) TestValidateSessionExercises_InvalidOrder() {
	exercises := []SessionExercise{
		{ExerciseID: "hip_circles", Phase: SessionPhasePrepare, Order: 0},
	}
	s.ErrorIs(ValidateSessionExercises(exercises), ErrInvalidSessionExerciseOrder)
}

func (s *ProgressionSuite) TestValidateSessionExercises_DuplicateOrder() {
	exercises := []SessionExercise{
		{ExerciseID: "hip_circles", Phase: SessionPhasePrepare, Order: 1},
		{ExerciseID: "wrist_prep", Phase: SessionPhasePrepare, Order: 1}, // duplicate order in same phase
	}
	s.ErrorIs(ValidateSessionExercises(exercises), ErrDuplicateSessionExerciseOrder)
}

func (s *ProgressionSuite) TestValidateSessionExercises_DuplicateOrderDifferentPhase() {
	// Same order number in different phases is allowed
	exercises := []SessionExercise{
		{ExerciseID: "hip_circles", Phase: SessionPhasePrepare, Order: 1},
		{ExerciseID: "frogger", Phase: SessionPhasePush, Order: 1},
	}
	s.NoError(ValidateSessionExercises(exercises))
}

func (s *ProgressionSuite) TestValidateSessionExercises_TooMany() {
	exercises := make([]SessionExercise, MaxSessionExercises+1)
	for i := range exercises {
		exercises[i] = SessionExercise{
			ExerciseID: "exercise",
			Phase:      SessionPhasePush,
			Order:      i + 1,
		}
	}
	s.ErrorIs(ValidateSessionExercises(exercises), ErrTooManySessionExercises)
}

func (s *ProgressionSuite) TestNewProgramDay_WithSessionExercises() {
	input := ProgramDayInput{
		DayNumber:    1,
		Label:        "GMB Flow",
		TrainingType: "gmb",
		DurationMin:  45,
		LoadScore:    3.0,
		SessionExercises: []SessionExercise{
			{ExerciseID: "hip_circles", Phase: SessionPhasePrepare, Order: 1, DurationSec: 30},
			{ExerciseID: "bear_to_monkey", Phase: SessionPhasePractice, Order: 1, Reps: 8},
			{ExerciseID: "frogger", Phase: SessionPhasePush, Order: 1, Reps: 10},
		},
	}

	day, err := newProgramDay(input)
	s.NoError(err)
	s.Len(day.SessionExercises, 3)
	s.Equal("hip_circles", day.SessionExercises[0].ExerciseID)
	s.Equal(SessionPhasePrepare, day.SessionExercises[0].Phase)
}

func (s *ProgressionSuite) TestNewProgramDay_WithInvalidSessionExercises() {
	input := ProgramDayInput{
		DayNumber:    1,
		Label:        "GMB Flow",
		TrainingType: "gmb",
		DurationMin:  45,
		LoadScore:    3.0,
		SessionExercises: []SessionExercise{
			{ExerciseID: "", Phase: SessionPhasePrepare, Order: 1}, // empty ID
		},
	}

	_, err := newProgramDay(input)
	s.ErrorIs(err, ErrInvalidSessionExerciseID)
}
