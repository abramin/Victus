# Seed Script Documentation

## Overview

The seed script generates **4 weeks of realistic test data** for manual app testing. This allows you to explore trends, entries, history, and other features without manually entering weeks of data.

## Features

The generated data includes:

- **User Profile**: One user with realistic fitness metrics
  - Height: 175 cm
  - Birth Date: May 15, 1990 (male)
  - Goal: Lose weight
  - Target: 72 kg (from starting 78 kg)
  
- **Daily Logs**: 28 days of entries with:
  - Weight measurements (realistic trend: 78 kg → 72.3 kg with daily fluctuation)
  - Sleep data (6-9 hours, realistic variation)
  - Sleep quality scores (20-95 scale)
  - Resting heart rate (60-75 bpm, slight improvement over time)
  - Body fat percentage (20% → 18.5%, slight improvement)
  - Day type distribution (40% performance, 35% fatburner, 25% metabolize)
  - Estimated TDEE (2100-2500 cal based on day type)
  - Macro targets (45% carbs, 30% protein, 25% fat)

- **Training Sessions**: Diverse workout patterns
  - **Week 1-4**: Mix of strength, cardiovascular (run/cycle/row), mobility, HIIT, and rest days
  - **Secondary sessions**: 30% of days have a secondary low-intensity session
  - **Perceived intensity**: RPE 6-9 for realistic effort levels
  - **Variable durations**: 15-75 minutes based on training type
  - **Types included**: strength, run, cycle, row, hiit, mobility, qigong, walking

## Running the Seed

### Option 1: Using Make (Recommended)

```bash
make seed
```

### Option 2: Direct Go Command

```bash
cd backend && go run ./cmd/seed/main.go
```

## What Gets Cleared

The seed script clears existing data before seeding:
- `training_sessions` table
- `daily_logs` table  
- `user_profile` table

**Note**: This is intentional to provide a clean test environment. If you want to keep existing data, you'll need to modify the script.

## Generated Data Examples

### Week 1-4 Overview
```
Week 1: 78.0 kg → 76.7 kg (trend + variation)
Week 2: 76.7 kg → 75.3 kg (gradual decrease)
Week 3: 75.3 kg → 73.7 kg (continued progress)
Week 4: 73.7 kg → 72.3 kg (reaching target)
```

### Sample Daily Entry (Data Variety)
- **Date**: 2025-12-28
- **Weight**: 75.5 kg
- **Sleep**: 7.2 hours, Quality: 68/100
- **Training**: 55 min strength (RPE 8) + 25 min mobility (RPE 6)
- **Day Type**: Performance
- **TDEE**: 2450 cal
- **Carbs**: ~280g | **Protein**: ~185g | **Fat**: ~64g

## Testing What You Can View

With this seeded data, you can test:

✅ **Trends**
- 4-week weight loss trend visualization
- Improving body fat percentage trend
- Sleep quality and duration patterns

✅ **Daily Log Entries**
- History of all 28 daily logs
- Complete macro and calorie information
- Training session details and durations

✅ **Training Data**
- Multiple sessions per day
- Diverse training type distribution
- Realistic intensity and duration patterns

✅ **Profile Analytics**
- Current weight: 72.3 kg
- Starting weight: 78.0 kg
- Progress towards target: 72 kg

✅ **Sleep & Recovery**
- 4 weeks of sleep data with realistic variation
- Sleep quality correlation with training

## Customization

To modify the seed data, edit these values in `backend/cmd/seed/main.go`:

```go
config := SeedConfig{
    InitialWeight: 78.0,      // Starting weight (kg)
    UserHeight: 175.0,        // Height (cm)
    UserSex: "male",          // male or female
    UserGoal: "lose_weight",  // lose_weight, maintain, gain_weight
    // ... more options
}
```

## Rebuilding the Database

If you need to start completely fresh:

```bash
# Delete the database file
rm -f backend/data/victus.db

# Run seed to create fresh database with migrations
make seed
```

Then start your app with `make app-up`.

## Notes

- The seed script automatically runs database migrations
- All timestamps are realistic (dates 4 weeks in the past)
- Weight trends show gradual, realistic progress toward the target
- Training types are randomly distributed across realistic weekly patterns
- Sleep quality correlates with sleep duration for realism
