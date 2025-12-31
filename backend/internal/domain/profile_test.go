package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/suite"
)

type ProfileSuite struct {
	suite.Suite
	now time.Time
}

func TestProfileSuite(t *testing.T) {
	suite.Run(t, new(ProfileSuite))
}

func (s *ProfileSuite) SetupTest() {
	s.now = time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC)
}

func (s *ProfileSuite) validProfile() *UserProfile {
	return &UserProfile{
		HeightCM:             180,
		BirthDate:            time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
		Sex:                  SexMale,
		Goal:                 GoalLoseWeight,
		TargetWeightKg:       80,
		TargetWeeklyChangeKg: -0.5,
		CarbRatio:            0.45,
		ProteinRatio:         0.30,
		FatRatio:             0.25,
		MealRatios:           MealRatios{Breakfast: 0.30, Lunch: 0.30, Dinner: 0.40},
		PointsConfig:         PointsConfig{CarbMultiplier: 1.15, ProteinMultiplier: 4.35, FatMultiplier: 3.5},
		FruitTargetG:         600,
		VeggieTargetG:        500,
	}
}

func (s *ProfileSuite) TestHeightValidation() {
	s.Run("accepts height at lower boundary", func() {
		p := s.validProfile()
		p.HeightCM = 100
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts height at upper boundary", func() {
		p := s.validProfile()
		p.HeightCM = 250
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects height below minimum", func() {
		p := s.validProfile()
		p.HeightCM = 99.9
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidHeight)
	})

	s.Run("rejects height above maximum", func() {
		p := s.validProfile()
		p.HeightCM = 250.1
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidHeight)
	})
}

func (s *ProfileSuite) TestBirthDateValidation() {
	s.Run("accepts user exactly 13 years old", func() {
		p := s.validProfile()
		p.BirthDate = s.now.AddDate(-13, 0, 0)
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts adult user", func() {
		p := s.validProfile()
		p.BirthDate = time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC)
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects user under 13", func() {
		p := s.validProfile()
		p.BirthDate = s.now.AddDate(-12, 0, 0)
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidBirthDate)
	})

	s.Run("rejects future birth date", func() {
		p := s.validProfile()
		p.BirthDate = s.now.AddDate(0, 0, 1)
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidBirthDate)
	})
}

func (s *ProfileSuite) TestSexValidation() {
	s.Run("accepts male", func() {
		p := s.validProfile()
		p.Sex = SexMale
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts female", func() {
		p := s.validProfile()
		p.Sex = SexFemale
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects invalid sex", func() {
		p := s.validProfile()
		p.Sex = "other"
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidSex)
	})

	s.Run("rejects empty sex", func() {
		p := s.validProfile()
		p.Sex = ""
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidSex)
	})
}

func (s *ProfileSuite) TestGoalValidation() {
	s.Run("accepts all valid goals", func() {
		validGoals := []Goal{GoalLoseWeight, GoalMaintain, GoalGainWeight}
		for _, g := range validGoals {
			p := s.validProfile()
			p.Goal = g
			s.Require().NoError(p.ValidateAt(s.now), "Should accept goal: %s", g)
		}
	})

	s.Run("rejects invalid goal", func() {
		p := s.validProfile()
		p.Goal = "bulk"
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidGoal)
	})

	s.Run("rejects empty goal", func() {
		p := s.validProfile()
		p.Goal = ""
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidGoal)
	})
}

func (s *ProfileSuite) TestTargetWeightValidation() {
	s.Run("accepts weight at lower boundary", func() {
		p := s.validProfile()
		p.TargetWeightKg = 30
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts weight at upper boundary", func() {
		p := s.validProfile()
		p.TargetWeightKg = 300
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects weight below minimum", func() {
		p := s.validProfile()
		p.TargetWeightKg = 29.9
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidTargetWeight)
	})

	s.Run("rejects weight above maximum", func() {
		p := s.validProfile()
		p.TargetWeightKg = 300.1
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidTargetWeight)
	})
}

func (s *ProfileSuite) TestWeeklyChangeValidation() {
	s.Run("accepts change at lower boundary", func() {
		p := s.validProfile()
		p.TargetWeeklyChangeKg = -2.0
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts change at upper boundary", func() {
		p := s.validProfile()
		p.TargetWeeklyChangeKg = 2.0
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts zero change for maintenance", func() {
		p := s.validProfile()
		p.TargetWeeklyChangeKg = 0
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts 0.5 increment values", func() {
		p := s.validProfile()
		p.TargetWeeklyChangeKg = -0.5
		s.Require().NoError(p.ValidateAt(s.now))

		p.TargetWeeklyChangeKg = 0.5
		s.Require().NoError(p.ValidateAt(s.now))

		p.TargetWeeklyChangeKg = 1.5
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects change below minimum", func() {
		p := s.validProfile()
		p.TargetWeeklyChangeKg = -2.1
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidWeeklyChange)
	})

	s.Run("rejects change above maximum", func() {
		p := s.validProfile()
		p.TargetWeeklyChangeKg = 2.1
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidWeeklyChange)
	})
}

func (s *ProfileSuite) TestMacroRatioValidation() {
	s.Run("accepts ratios summing to 1.0", func() {
		p := s.validProfile()
		p.CarbRatio = 0.50
		p.ProteinRatio = 0.30
		p.FatRatio = 0.20
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("accepts ratios within tolerance of 1.0", func() {
		p := s.validProfile()
		// Sum = 0.999, within 0.01 tolerance
		p.CarbRatio = 0.449
		p.ProteinRatio = 0.300
		p.FatRatio = 0.250
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects ratios summing below tolerance", func() {
		p := s.validProfile()
		p.CarbRatio = 0.40
		p.ProteinRatio = 0.30
		p.FatRatio = 0.20 // Sum = 0.90
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrMacroRatiosNotSum100)
	})

	s.Run("rejects ratios summing above tolerance", func() {
		p := s.validProfile()
		p.CarbRatio = 0.50
		p.ProteinRatio = 0.35
		p.FatRatio = 0.25 // Sum = 1.10
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrMacroRatiosNotSum100)
	})

	s.Run("rejects negative ratio", func() {
		p := s.validProfile()
		p.CarbRatio = -0.1
		p.ProteinRatio = 0.60
		p.FatRatio = 0.50
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidRatio)
	})

	s.Run("rejects ratio above 1", func() {
		p := s.validProfile()
		p.CarbRatio = 1.1
		p.ProteinRatio = 0.0
		p.FatRatio = 0.0
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidRatio)
	})
}

func (s *ProfileSuite) TestMealRatioValidation() {
	s.Run("accepts ratios summing to 1.0", func() {
		p := s.validProfile()
		p.MealRatios = MealRatios{Breakfast: 0.25, Lunch: 0.35, Dinner: 0.40}
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects ratios not summing to 1.0", func() {
		p := s.validProfile()
		p.MealRatios = MealRatios{Breakfast: 0.30, Lunch: 0.30, Dinner: 0.30}
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrMealRatiosNotSum100)
	})

	s.Run("rejects negative meal ratio", func() {
		p := s.validProfile()
		p.MealRatios = MealRatios{Breakfast: -0.1, Lunch: 0.55, Dinner: 0.55}
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidRatio)
	})
}

func (s *ProfileSuite) TestPointsConfigValidation() {
	s.Run("accepts positive multipliers", func() {
		p := s.validProfile()
		p.PointsConfig = PointsConfig{CarbMultiplier: 1.0, ProteinMultiplier: 4.0, FatMultiplier: 3.0}
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects zero carb multiplier", func() {
		p := s.validProfile()
		p.PointsConfig.CarbMultiplier = 0
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidPointsMultiplier)
	})

	s.Run("rejects negative protein multiplier", func() {
		p := s.validProfile()
		p.PointsConfig.ProteinMultiplier = -1
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidPointsMultiplier)
	})

	s.Run("rejects zero fat multiplier", func() {
		p := s.validProfile()
		p.PointsConfig.FatMultiplier = 0
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidPointsMultiplier)
	})
}

func (s *ProfileSuite) TestFruitVeggieTargetValidation() {
	s.Run("accepts fruit target at boundaries", func() {
		p := s.validProfile()
		p.FruitTargetG = 0
		s.Require().NoError(p.ValidateAt(s.now))

		p.FruitTargetG = 2000
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects fruit target below minimum", func() {
		p := s.validProfile()
		p.FruitTargetG = -1
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidFruitTarget)
	})

	s.Run("rejects fruit target above maximum", func() {
		p := s.validProfile()
		p.FruitTargetG = 2001
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidFruitTarget)
	})

	s.Run("accepts veggie target at boundaries", func() {
		p := s.validProfile()
		p.VeggieTargetG = 0
		s.Require().NoError(p.ValidateAt(s.now))

		p.VeggieTargetG = 2000
		s.Require().NoError(p.ValidateAt(s.now))
	})

	s.Run("rejects veggie target above maximum", func() {
		p := s.validProfile()
		p.VeggieTargetG = 2001
		s.Require().ErrorIs(p.ValidateAt(s.now), ErrInvalidVeggieTarget)
	})
}

func (s *ProfileSuite) TestDefaultsApplication() {
	s.Run("defaults macro ratios to 45/30/25", func() {
		p := &UserProfile{}
		p.SetDefaults()
		s.Equal(0.45, p.CarbRatio)
		s.Equal(0.30, p.ProteinRatio)
		s.Equal(0.25, p.FatRatio)
	})

	s.Run("defaults meal ratios to 30/30/40", func() {
		p := &UserProfile{}
		p.SetDefaults()
		s.Equal(0.30, p.MealRatios.Breakfast)
		s.Equal(0.30, p.MealRatios.Lunch)
		s.Equal(0.40, p.MealRatios.Dinner)
	})

	s.Run("defaults points multipliers", func() {
		p := &UserProfile{}
		p.SetDefaults()
		s.Equal(1.15, p.PointsConfig.CarbMultiplier)
		s.Equal(4.35, p.PointsConfig.ProteinMultiplier)
		s.Equal(3.5, p.PointsConfig.FatMultiplier)
	})

	s.Run("defaults fruit and veggie targets", func() {
		p := &UserProfile{}
		p.SetDefaults()
		s.Equal(600.0, p.FruitTargetG)
		s.Equal(500.0, p.VeggieTargetG)
	})

	s.Run("does not override explicit macro ratios", func() {
		p := &UserProfile{
			CarbRatio:    0.50,
			ProteinRatio: 0.25,
			FatRatio:     0.25,
		}
		p.SetDefaults()
		s.Equal(0.50, p.CarbRatio)
		s.Equal(0.25, p.ProteinRatio)
		s.Equal(0.25, p.FatRatio)
	})
}

func (s *ProfileSuite) TestNewUserProfile() {
	s.Run("creates valid profile", func() {
		p, err := NewUserProfile(
			180,
			time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
			SexMale,
			GoalLoseWeight,
			80,
			-0.5,
			s.now,
		)
		s.Require().NoError(err)
		s.Equal(180.0, p.HeightCM)
		s.Equal(SexMale, p.Sex)
		// Check defaults were applied
		s.Equal(0.45, p.CarbRatio)
	})

	s.Run("returns error for invalid input", func() {
		_, err := NewUserProfile(
			50, // Invalid height
			time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
			SexMale,
			GoalLoseWeight,
			80,
			-0.5,
			s.now,
		)
		s.Require().ErrorIs(err, ErrInvalidHeight)
	})
}
