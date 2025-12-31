# Victus Calculation Improvements

## Summary of Changes

This document explains the evidence-based improvements to the Victus nutrition calculation algorithms.

---

## 1. MET-Based Exercise Calories (Replaces Fixed CalPerMin)

### Problem with Current Approach
```go
// Current: Same calories regardless of body weight
TrainingTypeRun: {CalPerMin: 8, LoadScore: 3}
```
A 60kg person and a 100kg person burn vastly different calories running.

### New Approach
```go
// MET-based: Calories = (MET - 1) × weight(kg) × duration(hours)
TrainingTypeRun: {MET: 9.8, LoadScore: 3}  // Running 6 mph

// Example:
// 70kg person, 30 min run = (9.8-1) × 70 × 0.5 = 308 kcal
// 90kg person, 30 min run = (9.8-1) × 90 × 0.5 = 396 kcal
```

**Source**: 2024 Compendium of Physical Activities (https://pacompendium.com)

---

## 2. Multiple BMR Equation Options

### Available Equations

| Equation | Best For | Notes |
|----------|----------|-------|
| **Mifflin-St Jeor** (default) | General population | Predicts within 10% for most people |
| **Katch-McArdle** | Athletes with known body fat % | Uses lean body mass, most accurate if BF% known |
| **Oxford-Henry** | Large sample validation | Good accuracy across populations |
| **Harris-Benedict** | Legacy comparison | Included for reference |

### Implementation
```go
// Add to UserProfile
BMREquation    BMREquation // "mifflin_st_jeor", "katch_mcardle", etc.
BodyFatPercent float64     // Required for Katch-McArdle

// Usage
bmr := CalculateBMR(profile, weightKg, now, profile.BMREquation)
```

---

## 3. Protein-First Macro Calculation

### Problem with Current Approach
```go
// Current: Percentage-based, same ratio regardless of goal
baseProteinG := (tdee * profile.ProteinRatio) / 4.3
```

A 2000 kcal diet at 25% protein = 116g protein
But a 100kg person cutting needs ~200-240g (2.0-2.4 g/kg)

### New Approach: g/kg Based Targets

| Goal | Training Day | Rest Day | Source |
|------|-------------|----------|--------|
| **Fat Loss** | 2.0-2.4 g/kg | 2.0-2.4 g/kg | Longland 2016, Helms 2014 |
| **Muscle Gain** | 1.6-2.0 g/kg | 1.4-1.8 g/kg | Morton 2018 |
| **Maintenance** | 1.4-1.8 g/kg | 1.2-1.6 g/kg | ISSN Position Stand |

### Key Insight
During aggressive cuts (>20% deficit), protein should **increase** to 2.4 g/kg to preserve muscle mass. Your current multipliers reduce protein on deficit days—this is backwards based on the research.

---

## 4. Protected Protein on Day Types

### Problem with Current Approach
```go
// Current: All macros scale equally
DayTypeFatburner: {Carbs: 0.80, Protein: 0.80, Fats: 0.80}
```

### New Approach: Protect Protein
```go
// New: Carbs flex, protein stays constant
DayTypeFatburner: {Carbs: 0.60, Protein: 1.00, Fats: 0.85}
```

The research is clear: during a deficit, cutting protein costs you muscle. Cut carbs instead.

---

## 5. Fat Floor Enforcement

### Minimum Fat Requirements
- **0.5-1.0 g/kg** for essential fatty acids and hormone production
- Never drop below ~0.7 g/kg regardless of other calculations

```go
fatMinG := GetFatMinimum(weightKg) // Returns weightKg * 0.7
finalFatsG := math.Max(calculatedFat, fatMinG)
```

---

## 6. Adaptive TDEE (New Feature)

### Concept
After 2-3 weeks of logging weight and intake, calculate actual TDEE from real data:

```
TDEE = Average_Intake - (Weekly_Weight_Change × 7700 / 7)
```

### Implementation
1. Store daily weight and intake
2. Use exponentially smoothed weight trend (α=0.1) to filter noise
3. Blend calculated TDEE with formula estimate based on data confidence

```go
adaptive := CalculateAdaptiveTDEE(historicalData, formulaEstimate)
// adaptive.Confidence goes from 0.1 (< 7 days) to 0.9 (28+ days)
```

### UI Suggestion
Show formula-based estimate initially, then transition to adaptive:
- Days 1-7: "Estimated TDEE: 2400 kcal (based on formula)"
- Days 14+: "Your TDEE: 2320 kcal (based on your data, 85% confidence)"

---

## Integration Steps

### 1. Add Fields to UserProfile
```go
type UserProfile struct {
    // ... existing fields ...
    
    BMREquation    BMREquation `json:"bmr_equation"`     // New
    BodyFatPercent float64     `json:"body_fat_percent"` // New (optional)
}
```

### 2. Add Field to DailyTargets
```go
type DailyTargets struct {
    // ... existing fields ...
    
    EstimatedTDEE int `json:"estimated_tdee"` // New: pre-adjustment TDEE
}
```

### 3. Replace CalculateDailyTargets
Either:
- Rename new function and swap
- Or gradually migrate, keeping both temporarily

### 4. Add Weight/Intake History Table
```sql
CREATE TABLE daily_intake_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    weight_kg REAL,
    total_intake_kcal REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
);
```

### 5. Add Adaptive TDEE Calculation Endpoint
```go
// GET /api/users/{id}/adaptive-tdee
// Returns current adaptive TDEE estimate with confidence level
```

---

## Calorie Constants Note

Your current code uses:
- Carbs: 4.1 kcal/g
- Protein: 4.3 kcal/g  
- Fats: 9.3 kcal/g

Standard values are:
- Carbs: 4.0 kcal/g
- Protein: 4.0 kcal/g
- Fats: 9.0 kcal/g

The Atwater factors you're using (4.1/4.3/9.3) are from specific food testing. Standard values (4/4/9) are more commonly used. Either works, just be consistent. I used standard in the new code.

---

## Testing Suggestions

### Unit Test Cases
1. **BMR equations**: Test against known values for each equation
2. **MET calculations**: Verify weight-proportional calorie burns
3. **Protein floors**: Ensure minimum g/kg is never violated
4. **Fat floors**: Ensure essential fat minimum is maintained
5. **Adaptive TDEE**: Test with simulated weight trend data

### Edge Cases
- Very light/heavy users (BMR edge cases)
- Extreme deficits (protein protection)
- Zero training days (rest day macros)
- Missing body fat % (Katch-McArdle fallback)

---

## References

1. Morton RW et al. (2018). "Protein supplementation and resistance training-induced gains in muscle mass." British Journal of Sports Medicine.

2. Helms ER et al. (2014). "A systematic review of dietary protein during caloric restriction in resistance trained lean athletes." International Journal of Sport Nutrition and Exercise Metabolism.

3. Longland TM et al. (2016). "Higher compared with lower dietary protein during an energy deficit combined with intense exercise." American Journal of Clinical Nutrition.

4. Hall KD et al. (2011). "Quantification of the effect of energy imbalance on bodyweight." The Lancet.

5. Herrmann SD et al. (2024). "2024 Adult Compendium of Physical Activities." Journal of Sport and Health Science.

6. Frankenfield D et al. (2005). "Comparison of predictive equations for resting metabolic rate." Journal of the American Dietetic Association.
