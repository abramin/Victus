package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"

	"victus/internal/store"
)

// GarminSyncService fetches health data from Garmin Connect via the Python script
// and upserts it into the daily log store.
type GarminSyncService struct {
	dailyLogStore *store.DailyLogStore
	scriptPath    string
	pythonPath    string
}

// NewGarminSyncService creates a new GarminSyncService.
// Script path is resolved from GARMIN_SCRIPT_PATH env var or defaults to ./scripts/garmin_fetch.py.
func NewGarminSyncService(dailyLogStore *store.DailyLogStore) *GarminSyncService {
	scriptPath := os.Getenv("GARMIN_SCRIPT_PATH")
	if scriptPath == "" {
		scriptPath = "./scripts/garmin_fetch.py"
	}
	pythonPath := os.Getenv("GARMIN_PYTHON_PATH")
	if pythonPath == "" {
		if p, err := exec.LookPath("python3"); err == nil {
			pythonPath = p
		} else {
			pythonPath = "/usr/bin/python3"
		}
	}
	log.Printf("garmin: python=%s script=%s", pythonPath, scriptPath)
	return &GarminSyncService{
		dailyLogStore: dailyLogStore,
		scriptPath:    scriptPath,
		pythonPath:    pythonPath,
	}
}

// GarminSyncResult describes what was synced for a given date.
type GarminSyncResult struct {
	Date           string   `json:"date"`
	WeightSynced   bool     `json:"weightSynced"`
	SleepSynced    bool     `json:"sleepSynced"`
	HRVSynced      bool     `json:"hrvSynced"`
	RHRSynced      bool     `json:"rhrSynced"`
	CaloriesSynced bool     `json:"caloriesSynced"`
	Errors         []string `json:"errors,omitempty"`
}

// garminAPIData mirrors the JSON output of scripts/garmin_fetch.py.
// All numeric fields use float64 because the Python script may emit 574.0 style floats
// even for logically integer values.
type garminAPIData struct {
	Date           string   `json:"date"`
	WeightKg       *float64 `json:"weight_kg"`
	BodyFatPct     *float64 `json:"body_fat_pct"`
	TotalCalories  *float64 `json:"total_calories"`
	ActiveCalories *float64 `json:"active_calories"`
	SleepHours     *float64 `json:"sleep_hours"`
	SleepScore     *float64 `json:"sleep_score"`
	HRVMs          *float64 `json:"hrv_ms"`
	HRVWeeklyAvg   *float64 `json:"hrv_weekly_avg_ms"`
	RestingHR      *float64 `json:"resting_hr"`
	AvgStress      *float64 `json:"avg_stress"`
	MaxStress      *float64 `json:"max_stress"`
	Steps          *float64 `json:"steps"`
}

func floatToIntPtr(f *float64) *int {
	if f == nil {
		return nil
	}
	v := int(*f)
	return &v
}

// SyncDate runs the garmin_fetch.py script for the given date (YYYY-MM-DD),
// parses JSON output, and upserts the data into the daily log store.
func (s *GarminSyncService) SyncDate(ctx context.Context, date string) (*GarminSyncResult, error) {
	ctx, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, s.pythonPath, s.scriptPath, "--date", date, "--json")
	var stderrBuf bytes.Buffer
	cmd.Stderr = &stderrBuf
	out, err := cmd.Output()
	if stderrBuf.Len() > 0 {
		log.Printf("garmin script stderr: %s", stderrBuf.String())
	}
	if err != nil {
		return nil, fmt.Errorf("garmin script failed: %w\nstderr: %s", err, stderrBuf.String())
	}

	log.Printf("garmin script stdout (%d bytes): %s", len(out), string(out))

	var data garminAPIData
	if err := json.Unmarshal(out, &data); err != nil {
		return nil, fmt.Errorf("failed to parse script output: %w\nraw: %s", err, string(out))
	}

	result := &GarminSyncResult{Date: date}

	// Weight + body fat
	if data.WeightKg != nil {
		wd := store.WeightData{
			WeightKg:       data.WeightKg,
			BodyFatPercent: data.BodyFatPct,
		}
		if err := s.dailyLogStore.UpdateWeightData(ctx, date, wd); err != nil {
			result.Errors = append(result.Errors, "weight: "+err.Error())
		} else {
			result.WeightSynced = true
		}
	}

	// Sleep + HRV + RHR (all via UpdateSleepData which handles COALESCE merging)
	if data.SleepHours != nil || data.SleepScore != nil || data.HRVMs != nil || data.RestingHR != nil {
		sd := store.SleepData{
			SleepHours:       data.SleepHours,
			SleepQuality:     floatToIntPtr(data.SleepScore),
			HRVMs:            floatToIntPtr(data.HRVMs),
			RestingHeartRate: floatToIntPtr(data.RestingHR),
		}
		if err := s.dailyLogStore.UpdateSleepData(ctx, date, sd); err != nil {
			result.Errors = append(result.Errors, "sleep: "+err.Error())
		} else {
			result.SleepSynced = data.SleepHours != nil
			result.HRVSynced = data.HRVMs != nil
			result.RHRSynced = data.RestingHR != nil
		}
	}

	// Active calories
	if data.ActiveCalories != nil {
		if err := s.dailyLogStore.UpdateActiveCaloriesBurned(ctx, date, floatToIntPtr(data.ActiveCalories)); err != nil {
			result.Errors = append(result.Errors, "active_calories: "+err.Error())
		} else {
			result.CaloriesSynced = true
		}
	}

	return result, nil
}

// SyncToday syncs today's data.
func (s *GarminSyncService) SyncToday(ctx context.Context) (*GarminSyncResult, error) {
	return s.SyncDate(ctx, time.Now().Format("2006-01-02"))
}

// RunDailySchedule blocks until ctx is cancelled, triggering a sync every day at 04:00 local time.
// Also syncs yesterday to catch overnight data. Only runs if GARMIN_SYNC_ENABLED=true.
func (s *GarminSyncService) RunDailySchedule(ctx context.Context) {
	if os.Getenv("GARMIN_SYNC_ENABLED") != "true" {
		return
	}

	log.Println("garmin: auto-sync enabled, scheduling daily sync at 04:00")

	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), 4, 0, 0, 0, now.Location())
		if !now.Before(next) {
			next = next.Add(24 * time.Hour)
		}

		select {
		case <-time.After(next.Sub(now)):
		case <-ctx.Done():
			return
		}

		today := time.Now().Format("2006-01-02")
		yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

		for _, date := range []string{yesterday, today} {
			res, err := s.SyncDate(ctx, date)
			if err != nil {
				log.Printf("garmin: sync failed for %s: %v", date, err)
				continue
			}
			log.Printf("garmin: synced %s — weight=%v sleep=%v hrv=%v rhr=%v calories=%v errors=%v",
				date, res.WeightSynced, res.SleepSynced, res.HRVSynced, res.RHRSynced, res.CaloriesSynced, len(res.Errors))
		}
	}
}
