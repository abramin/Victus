package service

import (
	"time"

	"victus/internal/domain"
)

// TestActiveBurnCalculation verifies that active calories are correctly calculated
// and persisted when actual training sessions are updated.
func (s *DailyLogServiceSuite) TestActiveBurnCalculation() {
	s.Run("calculates active burn based on load score", func() {
		// 1. Create Profile (80kg)
		profile := s.validProfile()
		profile.CurrentWeightKg = 80

		// Ensure we use the WeightKg from the log, which defaults to Profile.CurrentWeightKg if set
		// But DailyLog input takes WeightKg explicitely.
		_, err := s.profileService.Upsert(s.ctx, profile, s.now)
		s.Require().NoError(err)

		// 2. Create Daily Log
		date := "2025-06-01"
		input := domain.DailyLogInput{
			Date:     date,
			WeightKg: 80,
		}
		log, err := s.logService.Create(s.ctx, input, time.Time{}) // time.Time{} as now because date is explicit
		s.Require().NoError(err)
		s.Equal(80.0, log.WeightKg)
		s.Nil(log.ActiveCaloriesBurned, "ActiveCaloriesBurned should be nil initially")

		// 3. Update Actual Training
		// Session 1: Run (LoadScore 3), 60 min, RPE 5
		// Load = 3 * (60/60) * (5/3) = 5.0
		rpe5 := 5
		session1 := domain.TrainingSession{
			Type:               domain.TrainingTypeRun,
			DurationMin:        60,
			PerceivedIntensity: &rpe5,
		}

		// Session 2: Strength (LoadScore 5), 45 min, RPE 7
		// Load = 5 * (45/60) * (7/3) = 5 * 0.75 * 2.333... = 8.75
		rpe7 := 7
		session2 := domain.TrainingSession{
			Type:               domain.TrainingTypeStrength,
			DurationMin:        45,
			PerceivedIntensity: &rpe7,
		}

		// Total Load = 13.75
		// Expected Burn = 13.75 * 80 * 0.25 = 275

		updatedLog, err := s.logService.UpdateActualTraining(s.ctx, date, []domain.TrainingSession{session1, session2})
		s.Require().NoError(err)

		// 4. Verify Active Burn
		s.Require().NotNil(updatedLog.ActiveCaloriesBurned, "ActiveCaloriesBurned should be calculated")
		s.Equal(275, *updatedLog.ActiveCaloriesBurned, "Expected 275 active calories")

		// 5. Verify Persistence by re-fetching
		fetchedLog, err := s.logService.GetByDate(s.ctx, date)
		s.Require().NoError(err)
		s.Require().NotNil(fetchedLog.ActiveCaloriesBurned)
		s.Equal(275, *fetchedLog.ActiveCaloriesBurned)
	})
}
