#!/usr/bin/env python3
"""
garmin_fetch.py — Fetch health metrics from Garmin Connect.

Credentials: GARMIN_EMAIL and GARMIN_PASSWORD in .env (Victus root) or env vars.

Usage:
    python scripts/garmin_fetch.py                          # today
    python scripts/garmin_fetch.py --date 2026-02-20       # specific date
    python scripts/garmin_fetch.py --start 2026-02-01 --end 2026-02-25  # range
    python scripts/garmin_fetch.py --json                   # raw JSON output
"""

import argparse
import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

# Load .env from Victus root (two levels up from scripts/)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass  # Fall back to existing env vars

try:
    from garminconnect import Garmin, GarminConnectAuthenticationError
except ImportError:
    print("ERROR: garminconnect not installed. Run: pip install -r scripts/requirements-garmin.txt")
    sys.exit(1)

TOKEN_STORE = os.path.expanduser("~/.garminconnect")


def get_client() -> Garmin:
    """Authenticate: load cached tokens or do a fresh login."""
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")

    if not email or not password:
        print("ERROR: GARMIN_EMAIL and GARMIN_PASSWORD must be set in .env or environment.")
        sys.exit(1)

    client = Garmin(email, password, is_cn=False, return_on_mfa=False)

    # Try loading cached tokens first
    try:
        client.login(TOKEN_STORE)
        return client
    except Exception:
        pass

    # Fresh login
    try:
        client.login()
        client.garth.dump(TOKEN_STORE)
        os.chmod(TOKEN_STORE, 0o700)
        print(f"Logged in. Tokens cached at {TOKEN_STORE}", file=sys.stderr)
        return client
    except GarminConnectAuthenticationError as e:
        print(f"Authentication failed: {e}", file=sys.stderr)
        sys.exit(1)


def safe_call(fn, *args, label=""):
    """Call a Garmin API method, return None on any error."""
    try:
        return fn(*args)
    except Exception as e:
        print(f"  WARN [{label}]: {e}", file=sys.stderr)
        return None


def extract_sleep(raw) -> dict:
    if not raw:
        return {}
    daily = raw.get("dailySleepDTO", {})
    scores = raw.get("sleepScores", {})
    duration_sec = daily.get("sleepTimeSeconds") or daily.get("totalSleepTime")
    sleep_hours = round(duration_sec / 3600, 2) if duration_sec else None
    return {
        "sleep_hours": sleep_hours,
        "sleep_score": scores.get("overall", {}).get("value") if isinstance(scores.get("overall"), dict) else scores.get("overall"),
        "sleep_hrv_ms": daily.get("averageSpO2HRAverage"),  # some firmwares put HRV here
        "resting_hr_sleep": daily.get("restingHeartRate"),
        "avg_spo2": daily.get("averageSpO2Value"),
    }


def extract_hrv(raw) -> dict:
    if not raw:
        return {}
    summary = raw.get("hrvSummary", {})
    last_night = summary.get("lastNight")
    weekly_avg = summary.get("weeklyAvg")
    return {
        "hrv_ms": last_night,
        "hrv_weekly_avg_ms": weekly_avg,
    }


def extract_rhr(raw) -> dict:
    if not raw:
        return {}
    try:
        metrics = raw.get("allMetrics", {}).get("metricsMap", {})
        rhr_list = metrics.get("WELLNESS_RESTING_HEART_RATE", [])
        if rhr_list:
            return {"resting_hr": rhr_list[0].get("value")}
    except (AttributeError, IndexError, TypeError):
        pass
    return {}


def extract_stats(raw) -> dict:
    if not raw:
        return {}
    return {
        "total_calories": raw.get("totalKilocalories"),
        "active_calories": raw.get("activeKilocalories"),
        "moderate_intensity_minutes": raw.get("moderateIntensityMinutes"),
        "vigorous_intensity_minutes": raw.get("vigorousIntensityMinutes"),
        "steps": raw.get("totalSteps"),
    }


def extract_weight(raw) -> dict:
    if not raw:
        return {}
    # get_daily_weigh_ins returns a list of entries
    entries = raw if isinstance(raw, list) else raw.get("dateWeightList", [])
    if not entries:
        return {}
    # Use the most recent entry
    entry = entries[-1]
    weight_g = entry.get("weight")
    weight_kg = round(weight_g / 1000, 2) if weight_g else None
    return {
        "weight_kg": weight_kg,
        "bmi": entry.get("bmi"),
    }


def extract_body_composition(raw) -> dict:
    if not raw:
        return {}
    # get_body_composition returns totalAverage or a list
    total = raw.get("totalAverage", {})
    if not total:
        entries = raw.get("dateWeightList", [])
        total = entries[-1] if entries else {}
    body_fat = total.get("bodyFatPercent")
    muscle_g = total.get("muscleMass")
    bone_g = total.get("boneMass")
    return {
        "body_fat_pct": round(body_fat, 1) if body_fat else None,
        "muscle_mass_kg": round(muscle_g / 1000, 2) if muscle_g else None,
        "bone_mass_kg": round(bone_g / 1000, 2) if bone_g else None,
    }


def extract_stress(raw) -> dict:
    if not raw:
        return {}
    # get_all_day_stress returns stressValuesArray of [timestamp, stress_level]
    values = raw.get("stressValuesArray", [])
    levels = [v[1] for v in values if isinstance(v, list) and len(v) >= 2 and v[1] is not None and v[1] >= 0]
    avg = round(sum(levels) / len(levels)) if levels else None
    return {
        "avg_stress": avg,
        "max_stress": max(levels) if levels else None,
    }


def fetch_day(client: Garmin, date_str: str) -> dict:
    """Fetch all metrics for a single date. Returns normalized dict."""
    print(f"Fetching {date_str}...", file=sys.stderr)

    raw_stats      = safe_call(client.get_stats, date_str, label="stats")
    raw_sleep      = safe_call(client.get_sleep_data, date_str, label="sleep")
    raw_hrv        = safe_call(client.get_hrv_data, date_str, label="hrv")
    raw_rhr        = safe_call(client.get_rhr_day, date_str, label="rhr")
    raw_weight     = safe_call(client.get_daily_weigh_ins, date_str, label="weight")
    raw_body       = safe_call(client.get_body_composition, date_str, label="body_composition")
    raw_stress     = safe_call(client.get_all_day_stress, date_str, label="stress")

    result = {"date": date_str}
    result.update(extract_stats(raw_stats))
    result.update(extract_sleep(raw_sleep))
    result.update(extract_hrv(raw_hrv))
    result.update(extract_rhr(raw_rhr))
    result.update(extract_weight(raw_weight))
    result.update(extract_body_composition(raw_body))
    result.update(extract_stress(raw_stress))

    # Sleep RHR takes priority over standalone RHR if both present
    if result.get("resting_hr_sleep") and not result.get("resting_hr"):
        result["resting_hr"] = result["resting_hr_sleep"]

    return result


def print_summary(data: dict):
    """Human-readable table output."""
    LABELS = [
        ("date",                       "Date"),
        ("weight_kg",                  "Weight (kg)"),
        ("body_fat_pct",               "Body Fat (%)"),
        ("muscle_mass_kg",             "Muscle Mass (kg)"),
        ("bone_mass_kg",               "Bone Mass (kg)"),
        ("total_calories",             "Total Calories"),
        ("active_calories",            "Active Calories"),
        ("moderate_intensity_minutes", "Moderate Active Min"),
        ("vigorous_intensity_minutes", "Vigorous Active Min"),
        ("steps",                      "Steps"),
        ("sleep_hours",                "Sleep (hrs)"),
        ("sleep_score",                "Sleep Score"),
        ("avg_spo2",                   "Avg SpO2 (%)"),
        ("hrv_ms",                     "HRV (ms)"),
        ("hrv_weekly_avg_ms",          "HRV 7-day Avg (ms)"),
        ("resting_hr",                 "Resting HR (bpm)"),
        ("avg_stress",                 "Avg Stress"),
        ("max_stress",                 "Max Stress"),
    ]
    print(f"\n{'─'*40}")
    for key, label in LABELS:
        val = data.get(key)
        if val is not None:
            print(f"  {label:<28} {val}")
    print(f"{'─'*40}\n")


def date_range(start: str, end: str):
    d = date.fromisoformat(start)
    end_d = date.fromisoformat(end)
    while d <= end_d:
        yield d.isoformat()
        d += timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(description="Fetch Garmin Connect health metrics")
    parser.add_argument("--date", help="Single date (YYYY-MM-DD), default: today")
    parser.add_argument("--start", help="Start date for range (YYYY-MM-DD)")
    parser.add_argument("--end", help="End date for range (YYYY-MM-DD)")
    parser.add_argument("--json", action="store_true", dest="output_json",
                        help="Output raw JSON instead of formatted summary")
    args = parser.parse_args()

    # Determine dates to fetch
    if args.start and args.end:
        dates = list(date_range(args.start, args.end))
    elif args.date:
        dates = [args.date]
    else:
        dates = [date.today().isoformat()]

    client = get_client()
    results = []

    for d in dates:
        data = fetch_day(client, d)
        results.append(data)
        if not args.output_json:
            print_summary(data)

    if args.output_json:
        # Strip None values for cleaner output
        def clean(d):
            return {k: v for k, v in d.items() if v is not None}
        cleaned = [clean(r) for r in results]
        print(json.dumps(cleaned if len(cleaned) > 1 else cleaned[0], indent=2, default=str))


if __name__ == "__main__":
    main()
