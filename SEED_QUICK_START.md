# Quick Start: Testing with Seeded Data

## TL;DR

```bash
# 1. Seed the database with 4 weeks of test data
make seed

# 2. Start the app
make app-up

# 3. Visit http://localhost:5173
# You now have 4 weeks of realistic data to explore!
```

## What's Included

✨ **4 weeks of realistic fitness data:**
- 28 daily log entries
- 34+ training sessions (multiple per day sometimes)
- Weight trending from 78 kg → 72 kg
- Sleep data, heart rate, body fat %
- Mixed training types: strength, cardio, mobility, HIIT
- Varied day types: performance, fatburner, metabolize

## Explore These Features

### Dashboard / Trends
- See 4-week weight loss trend (~5.7 kg)
- Body fat improvement tracking
- Sleep and recovery data

### Daily Log History
- Scroll through 28 daily entries
- View all macro targets and training details
- See how data varies day-to-day

### Training Analysis  
- View all training sessions and durations
- See variety of training types
- Check RPE and intensity distributions

### Profile Settings
- User: 175 cm, 30-35 years old (simulated)
- Current weight: 72.3 kg
- Target: 72 kg (almost reached!)

## Re-seed If Needed

```bash
# Clear everything and reseed
rm -f backend/data/victus.db
make seed

# Or just re-run seed (it clears existing data)
make seed
```

## Customize the Data

Edit `backend/cmd/seed/main.go` to change:
- Starting weight
- User demographics  
- Weight loss pace
- Training distribution
- Sleep patterns

Then run `make seed` again.

## Files

- **Seed Script**: `backend/cmd/seed/main.go`
- **Documentation**: `SEED_DATA.md`
- **Database**: `backend/data/victus.db` (auto-created)
