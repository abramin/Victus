# Victus Development Roadmap

**Version:** 2.0
**Last Updated:** January 1, 2026

---

## Overview

This roadmap outlines the delivery order for all remaining Victus features, aligned with PRD v2.0. Issues are organized into phases with dependency chains respected.

## Current State

Slices 1-4 are complete:
- [x] Slice 1: Project Setup & Infrastructure
- [x] Slice 2: User Profile Management
- [x] Slice 3: Basic Daily Log Entry
- [x] Slice 4: Daily Targets Display

---

## Phase 1: Core Enhancements

Foundation improvements before adding new features.

| Order | Issue | Title | Dependencies | Effort |
|-------|-------|-------|--------------|--------|
| 1 | #24 | Profile Setup Improvements | Slice 2 | S |
| 2 | #5 | Day Type System & Training Config | Slice 4 | M |
| 3 | #31 | Multiple Training Sessions Per Day | Slice 3 | M |

**Key deliverables:**
- Current weight handling with decimals
- Derived weekly change calculations
- Aggressive goal warnings
- Day type multipliers (protected protein)
- Training type configurations with MET values
- **Multiple training sessions per day** (e.g., morning Qigong + afternoon strength)

---

## Phase 2: Historical Data & Visualization

Build the data foundation for adaptive algorithms.

| Order | Issue | Title | Dependencies | Effort |
|-------|-------|-------|--------------|--------|
| 3 | #6 | Weight History & Trend Visualization | Slice 3 | M |
| 4 | #7 | Actual Training Logging | Slice 3 | S |

**Key deliverables:**
- Weight chart with trend line (linear regression)
- Date range toggles (7d, 30d, 90d, all)
- Actual training logging at end of day
- Planned vs actual comparison

---

## Phase 3: Adaptive Intelligence

Core adaptive algorithms that learn from user data.

| Order | Issue | Title | Dependencies | Effort |
|-------|-------|-------|--------------|--------|
| 5 | #8 | Adaptive TDEE Calculation | #6 | L |
| 6 | #9 | Training Load Tracking (ACR) | #7 | M |
| 7 | #10 | Recovery & Adaptive Adjustments | #8, #9 | M |

**Key deliverables:**
- 4 BMR equation options
- TDEE source configuration (formula/manual/adaptive)
- Adaptive TDEE from weight trends
- Acute/Chronic training load ratio
- Recovery score calculation
- Daily adjustment multipliers with breakdown

---

## Phase 4: Long-Term Planning (NEW in v2.0)

Major new feature: nutrition plans with dual-track analysis.

| Order | Issue | Title | Dependencies | Effort |
|-------|-------|-------|--------------|--------|
| 8 | #27 | Nutrition Plan Creation & Storage | #2, #8 | L |
| 9 | #28 | Plan Overview & Weekly Targets UI | #27 | M |
| 10 | #29 | Dual-Track Analysis | #27, #6, #8 | L |
| 11 | #30 | Recalibration System | #27, #29 | L |

**Key deliverables:**
- Plan creation with goal weight and timeframe
- Weekly targets generation
- Plan summary card with progress timeline
- Plan vs projection chart
- Variance detection with tolerance thresholds
- Recalibration options (increase deficit, extend, revise goal)
- Recalibration history

---

## Phase 5: History & Configuration

Complete the history view and settings UI.

| Order | Issue | Title | Dependencies | Effort |
|-------|-------|-------|--------------|--------|
| 12 | #11 | History Calendar & Log Details | #6, #7 | M |
| 13 | #12 | Settings & Configuration UI | #5, #8 | L |

**Key deliverables:**
- Calendar heatmap with training type colors
- Log detail modal
- TDEE configuration section
- Macro input as absolute grams
- Recalibration tolerance settings
- Training type editor

---

## Phase 6: Polish & Release

Final polish for production readiness.

| Order | Issue | Title | Dependencies | Effort |
|-------|-------|-------|--------------|--------|
| 14 | #13 | Data Export | #6 | S |
| 15 | #14 | PWA & Mobile Optimization | All | M |

**Key deliverables:**
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
| 5 | Day Type System & Training Config | 1 | Open |
| 31 | Multiple Training Sessions Per Day | 1 | Open |
| 6 | Weight History & Trend Visualization | 2 | Open |
| 7 | Actual Training Logging | 2 | Open |
| 8 | Adaptive TDEE Calculation | 3 | Open |
| 9 | Training Load Tracking (ACR) | 3 | Open |
| 10 | Recovery & Adaptive Adjustments | 3 | Open |
| 11 | History Calendar & Log Details | 5 | Open |
| 12 | Settings & Configuration UI | 5 | Open |
| 13 | Data Export | 6 | Open |
| 14 | PWA & Mobile Optimization | 6 | Open |
| 24 | Profile Setup Improvements | 1 | Open |
| 27 | Nutrition Plan Creation & Storage | 4 | Open |
| 28 | Plan Overview & Weekly Targets UI | 4 | Open |
| 29 | Dual-Track Analysis | 4 | Open |
| 30 | Recalibration System | 4 | Open |

---

## Notes

- **PRD Alignment**: Issues #5, #8, #11, #12 have revision comments added to align with PRD v2.0
- **Critical Path**: Profile → Day Types → Weight History → TDEE → Planning → Recalibration
- **v2.0 Focus**: Phase 4 (Long-Term Planning) is the major new feature set
