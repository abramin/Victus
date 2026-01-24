# Victus Development Roadmap

**Version:** 2.1
**Last Updated:** January 24, 2026

---

## Overview

This roadmap outlines the delivery order for all remaining Victus features, aligned with PRD v2.1. Issues are organized into phases with dependency chains respected.

## Current State

**Foundation (Slices 1-4):** ✅ Complete
- [x] Slice 1: Project Setup & Infrastructure
- [x] Slice 2: User Profile Management
- [x] Slice 3: Basic Daily Log Entry
- [x] Slice 4: Daily Targets Display

**Phases 1-3, 5:** ✅ Complete (see details below)

**Phase 4 (Long-term Planning):** ❌ Not Started - This is the next major milestone

**Phase 6 (Polish & Release):** ❌ Not Started

---

## Phase 1: Core Enhancements ✅ COMPLETE

Foundation improvements before adding new features.

| Order | Issue | Title | Dependencies | Effort | Status |
|-------|-------|-------|--------------|--------|--------|
| 1 | #24 | Profile Setup Improvements | Slice 2 | S | ✅ Done |
| 2 | #5 | Day Type System & Training Config | Slice 4 | M | ✅ Done |
| 3 | #31 | Multiple Training Sessions Per Day | Slice 3 | M | ✅ Done |
| 4 | #32 | Supplement Config & Points Calculation | Slice 4, #5 | M | ✅ Done |

**Key deliverables:** (all implemented)
- Current weight handling with decimals
- Derived weekly change calculations
- Aggressive goal warnings
- Day type multipliers (protected protein)
- Training type configurations with MET values
- Multiple training sessions per day (e.g., morning Qigong + afternoon strength)
- Corrected points calculation with supplement deductions (maltodextrin, whey, collagen)

---

## Phase 2: Historical Data & Visualization ✅ COMPLETE

Build the data foundation for adaptive algorithms.

| Order | Issue | Title | Dependencies | Effort | Status |
|-------|-------|-------|--------------|--------|--------|
| 3 | #6 | Weight History & Trend Visualization | Slice 3 | M | ✅ Done |
| 4 | #7 | Actual Training Logging | Slice 3 | S | ✅ Done |

**Key deliverables:** (all implemented)
- Weight chart with trend line (linear regression)
- Date range toggles (7d, 30d, 90d, all)
- Actual training logging at end of day (via dedicated Log Workout view)
- Planned vs actual comparison

---

## Phase 3: Adaptive Intelligence ✅ COMPLETE

Core adaptive algorithms that learn from user data.

| Order | Issue | Title | Dependencies | Effort | Status |
|-------|-------|-------|--------------|--------|--------|
| 5 | #8 | Adaptive TDEE Calculation | #6 | L | ✅ Done |
| 6 | #9 | Training Load Tracking (ACR) | #7 | M | ✅ Done |
| 7 | #10 | Recovery & Adaptive Adjustments | #8, #9 | M | ✅ Done |

**Key deliverables:** (all implemented)
- 4 BMR equation options
- TDEE source configuration (formula/manual/adaptive) with manual TDEE input
- Formula TDEE = BMR * 1.2 + exercise calories, stored alongside estimated TDEE
- Adaptive TDEE from weight trend + intake proxy with adherence adjustment (allow sparse samples over >=14-day span with low confidence)
- Acute/Chronic training load ratio (7d/28d), session load uses actual duration and RPE when present
- ACR defaults to 1 when chronic load is 0
- Recovery score uses rest days in last 7, ACR thresholds, and average sleep quality (clamped 0-100)
- Daily adjustment multipliers (training load, recovery score, sleep quality, yesterday max loadScore >= 5) with UI breakdown

---

## Phase 4: Long-Term Planning ❌ NOT STARTED (NEXT MILESTONE)

Major new feature: nutrition plans with dual-track analysis.

| Order | Issue | Title | Dependencies | Effort | Status |
|-------|-------|-------|--------------|--------|--------|
| 8 | #27 | Nutrition Plan Creation & Storage | #2, #8 | L | ❌ Open |
| 9 | #28 | Plan Overview & Weekly Targets UI | #27 | M | ❌ Open |
| 10 | #29 | Dual-Track Analysis | #27, #6, #8 | L | ❌ Open |
| 11 | #30 | Recalibration System | #27, #29 | L | ❌ Open |

**Key deliverables:** (not yet implemented)
- Plan creation with goal weight and timeframe
- Weekly targets generation
- Plan summary card with progress timeline
- Plan vs projection chart
- Variance detection with tolerance thresholds
- Recalibration options (increase deficit, extend, revise goal)
- Recalibration history

---

## Phase 5: History & Configuration ✅ COMPLETE

Complete the history view and settings UI.

| Order | Issue | Title | Dependencies | Effort | Status |
|-------|-------|-------|--------------|--------|--------|
| 12 | #11 | History Views & Log Details | #6, #7 | M | ✅ Done |
| 13 | #12 | Settings & Configuration UI | #5, #8 | L | ✅ Done |

**Key deliverables:** (all implemented)
- Weight chart with range toggles and trendline
- Estimated TDEE + confidence over the same range
- Planned vs actual training summary
- Log detail modal with stored targets, inputs, sessions, and calculation details (TDEE + multipliers)
- TDEE configuration section (source, manual TDEE, BMR equation)
- Macro input as absolute grams
- Recalibration tolerance settings (1-10%)

---

## Phase 6: Polish & Release ❌ NOT STARTED

Final polish for production readiness.

| Order | Issue | Title | Dependencies | Effort | Status |
|-------|-------|-------|--------------|--------|--------|
| 14 | #13 | Data Export | #6 | S | ❌ Open |
| 15 | #14 | PWA & Mobile Optimization | All | M | ❌ Open |

**Key deliverables:** (not yet implemented)
- CSV and JSON export
- Service worker for offline
- Web app manifest
- Mobile-responsive design
- Install to home screen

---

## Dependency Graph

```
Slice 4 (Targets Display) ─────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
┌───────────────┐                                                  │
│ #24 Profile   │                                                  │
│ Improvements  │                                                  │
└───────┬───────┘                                                  │
        │                                                          │
        ▼                                                          │
┌───────────────┐     ┌───────────────┐                           │
│ #5 Day Type   │     │ Slice 3       │                           │
│ & Training    │     │ Daily Log     │                           │
└───────┬───────┘     └───────┬───────┘                           │
        │                     │                                    │
        ▼                     │                                    │
┌───────────────┐             │                                    │
│ #32 Suppl &   │             │                                    │
│ Points Calc   │             │                                    │
└───────┬───────┘             │                                    │
        │         ┌───────────┴───────────┐                       │
        │         ▼                       ▼                       │
        │   ┌───────────┐         ┌───────────┐                   │
        │   │ #6 Weight │         │ #7 Actual │                   │
        │   │ History   │         │ Training  │                   │
        │   └─────┬─────┘         └─────┬─────┘                   │
        │         │                     │                         │
        │         ▼                     ▼                         │
        │   ┌───────────┐         ┌───────────┐                   │
        │   │ #8 TDEE   │         │ #9 Load   │                   │
        │   │ Adaptive  │         │ Tracking  │                   │
        │   └─────┬─────┘         └─────┬─────┘                   │
        │         │                     │                         │
        │         └──────────┬──────────┘                         │
        │                    ▼                                    │
        │              ┌───────────┐                              │
        │              │ #10 Recov │                              │
        │              │ Adjust    │                              │
        │              └─────┬─────┘                              │
        │                    │                                    │
        ▼                    ▼                                    │
┌───────────────────────────────────────────────────────┐         │
│                 PLANNING (v2.0 NEW)                    │         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌────────┐ │         │
│  │#27 Plan │──▶│#28 Plan │──▶│#29 Dual │──▶│#30     │ │         │
│  │Creation │   │UI       │   │Track    │   │Recalib │ │         │
│  └─────────┘   └─────────┘   └─────────┘   └────────┘ │         │
└───────────────────────────────────────────────────────┘         │
                              │                                    │
                              ▼                                    │
              ┌───────────────────────────────┐                   │
              │  #11 History  │  #12 Settings │◀──────────────────┘
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  #13 Export   │  #14 PWA      │
              └───────────────────────────────┘
```

---

## Effort Estimates

| Size | Description | Typical Scope |
|------|-------------|---------------|
| S | Small | 1-2 days, single concern |
| M | Medium | 3-5 days, multiple components |
| L | Large | 1-2 weeks, full feature |

---

## Issue Quick Reference

| # | Title | Phase | Status |
|---|-------|-------|--------|
| 5 | Day Type System & Training Config | 1 | ✅ Done |
| 31 | Multiple Training Sessions Per Day | 1 | ✅ Done |
| 32 | Supplement Config & Points Calculation | 1 | ✅ Done |
| 6 | Weight History & Trend Visualization | 2 | ✅ Done |
| 7 | Actual Training Logging | 2 | ✅ Done |
| 8 | Adaptive TDEE Calculation | 3 | ✅ Done |
| 9 | Training Load Tracking (ACR) | 3 | ✅ Done |
| 10 | Recovery & Adaptive Adjustments | 3 | ✅ Done |
| 11 | History Views & Log Details | 5 | ✅ Done |
| 12 | Settings & Configuration UI | 5 | ✅ Done |
| 13 | Data Export | 6 | ❌ Open |
| 14 | PWA & Mobile Optimization | 6 | ❌ Open |
| 24 | Profile Setup Improvements | 1 | ✅ Done |
| 27 | Nutrition Plan Creation & Storage | 4 | ❌ Open |
| 28 | Plan Overview & Weekly Targets UI | 4 | ❌ Open |
| 29 | Dual-Track Analysis | 4 | ❌ Open |
| 30 | Recalibration System | 4 | ❌ Open |

---

## Bonus Features Implemented (Not in Original Roadmap)

The following features were implemented beyond the original scope:

| Feature | Description | PRD Section |
|---------|-------------|-------------|
| Cockpit Dashboard | Meal points view with activity tracking | 6.5 |
| Deficit Monitor | Activity gap tracking with wearable support | 6.5.2 |
| Weekly Context Strip | 7-day microcycle planning view | 6.5.3 |
| Kitchen Cheat Sheet | Food reference database (40+ items) | 6.5.4 |
| Log Workout View | Dedicated actual training logging | 6.6 |
| Weekly Planning | Pre-plan day types for future dates | 6.7 |
| Onboarding Flow | 3-step wizard for new users | 6.8 |
| Active Calories | Wearable calorie data integration | 6.9 |

---

## Notes

- **PRD Alignment**: All issues aligned with PRD v2.1, bonus features documented in sections 6.5-6.9
- **Points Calculation Fix**: Issue #32 implements the corrected meal points algorithm from the spreadsheet (PRD Section 4.3) with supplement deductions
- **Critical Path**: Profile → Day Types → Points Calculation → Weight History → TDEE → **Planning → Recalibration** (next)
- **v2.1 Focus**: Phase 4 (Long-Term Planning) is the next major milestone
- **Completion Status**: Phases 1, 2, 3, and 5 are 100% complete
