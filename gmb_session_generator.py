#!/usr/bin/env python3
"""
GMB Elements Session Generator
================================
Generates new training sessions modelled on real GMB Elements program data.

Levels:
  - 'standard'     : Foundation-level sessions (e.g. sessions 1-43 of the main track)
  - 'accelerated'  : More demanding sessions with advanced movement combos
                     (e.g. Accelerated track, sessions 44+)

Phases (every generated session always includes all four):
  PREPARE  – joint warm-up, mobility prep      (~5–8 min of 45-min session)
  PRACTICE – skill-focused movement work        (~20–30 min)
  PUSH     – free-flow combinations / challenge (~10–15 min)
  PONDER   – cool-down stretch & reflection     (~5 min)

Usage:
  python3 gmb_session_generator.py
  python3 gmb_session_generator.py --level accelerated --focus Bear --seed 42
"""

import json
import random
import argparse
import textwrap
from collections import defaultdict

# ─────────────────────────────────────────────────────────────────────────────
# 1.  DATA — loaded once from the scraped JSON
# ─────────────────────────────────────────────────────────────────────────────

DATA_PATH = "gmb_sessions.json"


def load_exercise_catalogue(path=DATA_PATH):
    """
    Parse all real sessions and build a rich catalogue of every exercise,
    keyed by name.  Each entry records:
      - description
      - which phases it appears in
      - 15/30/45-min durations (seconds)
      - whether it appears in standard and/or accelerated sessions
      - a movement_category  (Bear, Monkey, Frogger, Crab, A-Frame, Squat,
                               Spiderman, Floating Table Top, Wrist, Hip, Spine,
                               Combination, Flow, Stretch, Other)
      - a difficulty  (1=beginner, 2=standard, 3=advanced, 4=expert)
    """
    with open(path) as f:
        sessions = json.load(f)

    catalogue = {}  # name -> dict
    phase_pool = defaultdict(list)  # phase -> [names]

    def infer_category(name):
        n = name.lower()
        for kw, cat in [
            ("bear", "Bear"),
            ("monkey", "Monkey"),
            ("frogger", "Frogger"),
            ("crab", "Crab"),
            ("a-frame", "A-Frame"),
            ("squat", "Squat"),
            ("spiderman", "Spiderman"),
            ("floating table", "Floating Table Top"),
            ("wrist", "Wrist"),
            ("hip circle", "Hip"),
            ("supine hip", "Hip"),
            ("standing straight leg hip", "Hip"),
            ("quadruped", "Spine"),
            ("kneeling lunge", "Stretch"),
            ("kneeling back", "Stretch"),
            ("seated clasped", "Stretch"),
            ("3-point bridge", "Stretch"),
            ("frog stretch", "Stretch"),
            ("bridge", "Stretch"),
            ("free flow", "Flow"),
            ("combination", "Combination"),
            ("transition", "Combination"),
        ]:
            if kw in n:
                return cat
        return "Other"

    def infer_difficulty(name, is_accelerated_only):
        n = name.lower()
        # advanced keywords
        if any(
            k in n
            for k in [
                "bent arm",
                "twisting",
                "thread",
                "stall",
                "spiderman",
                "180",
                "360",
                "high monkey",
                "deep",
                "sumo",
                "cross step",
                "around the world",
                "super free",
            ]
        ):
            return 4 if is_accelerated_only else 3
        if any(
            k in n
            for k in [
                "combination",
                "transition",
                "free flow",
                "long leg",
                "single arm",
                "alternating",
                "swing set",
            ]
        ):
            return 3
        if any(
            k in n
            for k in [
                "basic",
                "prep",
                "example",
                "assessment",
                "set-up",
                "walk through",
            ]
        ):
            return 1
        return 2

    for s in sessions:
        is_accel = "Accelerated" in s["sessionName"]
        for ex in s.get("exercises", []):
            if ex.get("type") == "circuit" or not ex.get("name"):
                continue
            # Skip walkthrough videos (they have 1-second durations across all options)
            if ex.get("duration45", 0) == 1 and ex.get("duration15", 0) == 1:
                continue

            name = ex["name"]
            phase = ex["phase"]

            if name not in catalogue:
                cat_entry = {
                    "name": name,
                    "description": ex.get("description", ""),
                    "phases": set(),
                    "duration15": ex.get("duration15"),
                    "duration30": ex.get("duration30"),
                    "duration45": ex.get("duration45"),
                    "in_accel": False,
                    "in_standard": False,
                    "count": 0,
                    "category": infer_category(name),
                    "difficulty": None,  # set after we know in_accel_only
                }
                catalogue[name] = cat_entry

            e = catalogue[name]
            e["phases"].add(phase)
            e["count"] += 1
            if is_accel:
                e["in_accel"] = True
            else:
                e["in_standard"] = True
            # Fill in durations if missing
            for d in ("duration15", "duration30", "duration45"):
                if e[d] is None and ex.get(d):
                    e[d] = ex[d]

    # Finalise difficulty now we know accel/standard membership
    for e in catalogue.values():
        accel_only = e["in_accel"] and not e["in_standard"]
        e["difficulty"] = infer_difficulty(e["name"], accel_only)
        e["phases"] = sorted(e["phases"])  # make serialisable

    # Build per-phase pools (lists of names)
    for name, e in catalogue.items():
        for ph in e["phases"]:
            phase_pool[ph].append(name)

    return catalogue, phase_pool, sessions


# ─────────────────────────────────────────────────────────────────────────────
# 2.  BALANCE RULES
# ─────────────────────────────────────────────────────────────────────────────

# Target time budgets (seconds) per phase for a 45-min session
# These scale linearly for 30-min and 15-min sessions.
TIME_BUDGET_45 = {
    "PREPARE": 420,  # ~7 min
    "PRACTICE": 1500,  # ~25 min
    "PUSH": 720,  # ~12 min
    "PONDER": 360,  # ~6 min
}

# How many exercises to include per phase
PHASE_COUNTS = {
    "PREPARE": (6, 10),  # many short warm-up moves
    "PRACTICE": (2, 5),  # fewer but deeper skill blocks
    "PUSH": (1, 4),  # combination/flow challenges
    "PONDER": (4, 6),  # cool-down stretches
}

# Per-phase allowed duration range per exercise (seconds).
# Durations are assigned by dividing the phase budget evenly,
# then clamping to these bounds.
PHASE_DURATION_RANGE = {
    "PREPARE": (30, 120),  # 30 sec – 2 min each
    "PRACTICE": (120, 600),  # 2 min – 10 min each
    "PUSH": (120, 600),  # 2 min – 10 min each
    "PONDER": (30, 120),  # 30 sec – 2 min each
}

# Movement categories for PRACTICE that should ideally appear together
# (ensures sessions feel coherent rather than random)
MOVEMENT_THEMES = {
    "Bear & Monkey": ["Bear", "Monkey"],
    "Frogger & Squat": ["Frogger", "Squat"],
    "Crab & Floating Table": ["Crab", "Floating Table Top"],
    "A-Frame & Bear": ["A-Frame", "Bear"],
    "Spiderman & Monkey": ["Spiderman", "Monkey"],
    "Monkey & Frogger": ["Monkey", "Frogger"],
    "Bear & Crab": ["Bear", "Crab"],
    "Full Locomotion Mix": ["Bear", "Monkey", "Frogger"],
}

# PREPARE exercises that are always appropriate as warm-up bases
CORE_PREPARE = [
    "Wrists - Palms Down, Fingers Facing Knees",
    "Quadruped Spinal Circles",
    "Walk Into Squat",
    "Wrist Circles",
    "Quadruped Shoulder Circles",
    "Quadruped Twist",
    "Supine Hip Circles",
    "Standing Straight Leg Hip Circles",
    "Quadruped Wag Tail",
    "Frog Stretch",
]

# PONDER exercises that always appear (the canonical cool-down)
CORE_PONDER = [
    "General Kneeling Lunge",
    "Kneeling Back Flexion to Prone Lying Back Extension",
    "Seated Clasped Hands Extension",
    "3-Point Bridge",
]

# PUSH free-flow / combination exercises, split by level
PUSH_STANDARD = [
    "Crab Free Flow",
    "Frogger Free Flow",
    "Bear Free Flow",
    "Basic Bear to Monkey Combination",
    "Floating Table Top Pull To Squat",
    "A-Frame to Squat",
]
PUSH_ACCELERATED = [
    "Around The World",
    "Twisting Bear to Monkey Combination",
    "Crab to Bear to Frogger Combination",
    "Twisting Bear, High Monkey, Crab, Swing Set Free Flow",
    "Super Free Flow Example 1",
    "Super Free Flow Example 2",
    "Squat Leg Sweep ",
    "Bear to Crab Transition",
    "Cross Step Bear",
]


# ─────────────────────────────────────────────────────────────────────────────
# 3.  GENERATOR
# ─────────────────────────────────────────────────────────────────────────────


def fmt_duration(secs):
    if not secs:
        return "—"
    secs = int(secs)
    if secs < 60:
        return f"{secs} sec"
    m, s = divmod(secs, 60)
    return f"{m}:{str(s).zfill(2)} min" if s else f"{m} min"


def generate_session(
    level: str = "standard",
    focus: str = None,
    seed: int = None,
    catalogue: dict = None,
    phase_pool: dict = None,
    duration: int = 45,  # 15, 30, or 45
) -> dict:
    """
    Generate a single GMB-style session.

    Parameters
    ----------
    level    : 'standard' | 'accelerated'
    focus    : Optional movement theme name from MOVEMENT_THEMES
               e.g. 'Bear & Monkey', 'Frogger & Squat' — or a raw category like 'Bear'
    seed     : Random seed for reproducibility
    catalogue: Pre-loaded exercise catalogue (avoids re-parsing file every call)
    phase_pool: Pre-loaded phase pool
    duration : 15, 30, or 45 — which duration column to use for times
    """
    rng = random.Random(seed)

    if catalogue is None or phase_pool is None:
        catalogue, phase_pool, _ = load_exercise_catalogue()

    is_accel = level == "accelerated"
    max_difficulty = 4 if is_accel else 2  # standard sessions cap at difficulty 2

    def eligible(name, phase_filter=None):
        """An exercise is eligible if it exists in the catalogue for the right phase/level."""
        e = catalogue.get(name)
        if not e:
            return False
        if phase_filter and phase_filter not in e["phases"]:
            return False
        # Respect level: advanced exercises only in accelerated sessions
        if not is_accel and e["difficulty"] > max_difficulty:
            return False
        return True

    def assign_durations(names, phase, total_budget_secs):
        """
        Divide total_budget_secs evenly among exercises, then clamp each
        to PHASE_DURATION_RANGE, and round to nearest 30 seconds.
        Returns list of (name, assigned_secs) tuples.
        """
        if not names:
            return []
        lo, hi = PHASE_DURATION_RANGE[phase]
        per = total_budget_secs / len(names)
        per = max(lo, min(hi, per))
        # Round to nearest 30 seconds
        per = round(per / 30) * 30
        per = max(lo, min(hi, per))
        return [(n, int(per)) for n in names]

    # ── Resolve theme / focus ────────────────────────────────────────
    if focus is None:
        theme_name = rng.choice(list(MOVEMENT_THEMES.keys()))
        theme_cats = MOVEMENT_THEMES[theme_name]
    elif focus in MOVEMENT_THEMES:
        theme_name = focus
        theme_cats = MOVEMENT_THEMES[focus]
    else:
        # Treat focus as a raw category
        theme_name = focus
        theme_cats = [focus]

    # Scale phase budgets to the requested session duration
    scale = duration / 45
    budgets = {ph: int(secs * scale) for ph, secs in TIME_BUDGET_45.items()}

    # ── PREPARE ─────────────────────────────────────────────────────
    # Pick 6-10 warm-up exercises from the core list (+ theme extras if any).
    # Duration per exercise is assigned from the phase budget, not from the catalogue.
    prepare_pool = [n for n in CORE_PREPARE if eligible(n, "PREPARE")]
    theme_prepare = [
        n
        for n in phase_pool.get("PREPARE", [])
        if n not in CORE_PREPARE
        and eligible(n, "PREPARE")
        and any(tc.lower() in n.lower() for tc in theme_cats)
    ]
    prepare_pool = prepare_pool + theme_prepare

    n_min, n_max = PHASE_COUNTS["PREPARE"]
    n_prepare = n_max if is_accel else min(7, len(prepare_pool))
    n_prepare = max(n_min, min(n_prepare, len(prepare_pool)))
    prepare_names = rng.sample(prepare_pool, n_prepare)

    # ── PRACTICE ────────────────────────────────────────────────────
    # Cover every movement category in the theme, then optionally add more.
    # Standard: 2-3 exercises; Accelerated: 3-5 exercises.
    n_min_p, n_max_p = PHASE_COUNTS["PRACTICE"]
    n_practice_target = n_max_p if is_accel else n_min_p + 1

    practice_names = []

    # 1. One representative exercise per theme category
    for tc in theme_cats:
        pool = [
            n
            for n in phase_pool.get("PRACTICE", [])
            if eligible(n, "PRACTICE")
            and tc.lower() in n.lower()
            and n not in practice_names
        ]
        if not pool:
            continue
        pool.sort(
            key=lambda n: (catalogue[n]["difficulty"], rng.random()), reverse=is_accel
        )
        practice_names.append(pool[0])

    # 2. Fill up to target count with theme-matched extras, then general
    remaining_slots = n_practice_target - len(practice_names)
    if remaining_slots > 0:
        theme_extras = [
            n
            for n in phase_pool.get("PRACTICE", [])
            if eligible(n, "PRACTICE")
            and any(tc.lower() in n.lower() for tc in theme_cats)
            and n not in practice_names
        ]
        theme_extras.sort(
            key=lambda n: (catalogue[n]["difficulty"], rng.random()), reverse=is_accel
        )
        practice_names.extend(theme_extras[:remaining_slots])

    remaining_slots = n_practice_target - len(practice_names)
    if remaining_slots > 0:
        general = [
            n
            for n in phase_pool.get("PRACTICE", [])
            if eligible(n, "PRACTICE") and n not in practice_names
        ]
        rng.shuffle(general)
        practice_names.extend(general[:remaining_slots])

    # ── PUSH ────────────────────────────────────────────────────────
    # Pick 1-4 combination / free-flow exercises.
    # Prefer theme-matched push exercises; fall back to any eligible push move.
    n_push_target = PHASE_COUNTS["PUSH"][1] if is_accel else PHASE_COUNTS["PUSH"][0] + 1

    theme_push = [
        n
        for n in phase_pool.get("PUSH", [])
        if eligible(n, "PUSH")
        and n not in practice_names  # no repeats from PRACTICE
        and any(tc.lower() in n.lower() for tc in theme_cats)
    ]
    theme_push.sort(
        key=lambda n: (catalogue[n]["difficulty"], rng.random()), reverse=is_accel
    )

    general_push = [
        n
        for n in phase_pool.get("PUSH", [])
        if eligible(n, "PUSH")
        and n not in practice_names  # no repeats from PRACTICE
        and n not in theme_push
    ]
    general_push.sort(
        key=lambda n: (catalogue[n]["difficulty"], rng.random()), reverse=is_accel
    )

    push_candidates = theme_push + general_push
    push_names = push_candidates[: min(n_push_target, len(push_candidates))]

    # ── PONDER ──────────────────────────────────────────────────────
    # Always use the 4 core cool-down stretches; add extras to fill budget.
    ponder_names = [n for n in CORE_PONDER if eligible(n, "PONDER")]
    extra_ponder = [
        n
        for n in phase_pool.get("PONDER", [])
        if n not in CORE_PONDER and eligible(n, "PONDER")
    ]
    rng.shuffle(extra_ponder)
    n_max_ponder = PHASE_COUNTS["PONDER"][1]
    for n in extra_ponder:
        if len(ponder_names) >= n_max_ponder:
            break
        ponder_names.append(n)

    # ── Assign durations ────────────────────────────────────────────
    # Divide each phase's time budget evenly across its exercises,
    # clamped to sensible per-exercise ranges.
    prepare_with_dur = assign_durations(prepare_names, "PREPARE", budgets["PREPARE"])
    practice_with_dur = assign_durations(
        practice_names, "PRACTICE", budgets["PRACTICE"]
    )
    push_with_dur = assign_durations(push_names, "PUSH", budgets["PUSH"])
    ponder_with_dur = assign_durations(ponder_names, "PONDER", budgets["PONDER"])

    # ── Build phase objects ──────────────────────────────────────────
    def make_exercises(name_dur_pairs, phase):
        exs = []
        for i, (name, dur_secs) in enumerate(name_dur_pairs, 1):
            e = catalogue[name]
            exs.append(
                {
                    "order": i,
                    "name": name,
                    "description": e["description"],
                    "category": e["category"],
                    "difficulty": e["difficulty"],
                    "duration_str": fmt_duration(dur_secs),
                    "duration_secs": dur_secs,
                }
            )
        return exs

    phases = {
        "PREPARE": make_exercises(prepare_with_dur, "PREPARE"),
        "PRACTICE": make_exercises(practice_with_dur, "PRACTICE"),
        "PUSH": make_exercises(push_with_dur, "PUSH"),
        "PONDER": make_exercises(ponder_with_dur, "PONDER"),
    }

    # ── Compute totals ───────────────────────────────────────────────
    total_secs = sum(ex["duration_secs"] for ph_exs in phases.values() for ex in ph_exs)

    return {
        "level": level,
        "theme": theme_name,
        "target_duration": f"{duration} min",
        "total_time_est": fmt_duration(total_secs),
        "total_secs": total_secs,
        "exercise_count": sum(len(v) for v in phases.values()),
        "phases": phases,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PRETTY PRINTER
# ─────────────────────────────────────────────────────────────────────────────

PHASE_ICONS = {
    "PREPARE": "🔵",
    "PRACTICE": "🟢",
    "PUSH": "🟡",
    "PONDER": "🟠",
}
DIFF_LABELS = {
    1: "⚪ Beginner",
    2: "🔵 Standard",
    3: "🟡 Intermediate",
    4: "🔴 Advanced",
}


def print_session(session):
    level_label = (
        "⚡ ACCELERATED" if session["level"] == "accelerated" else "🌿 STANDARD"
    )
    print(f"\n{'═'*60}")
    print(f"  {level_label} SESSION  |  Theme: {session['theme']}")
    print(
        f"  Target: {session['target_duration']}  •  "
        f"Est. total: {session['total_time_est']}  •  "
        f"{session['exercise_count']} exercises"
    )
    print(f"{'═'*60}")

    for phase_name, exercises in session["phases"].items():
        icon = PHASE_ICONS.get(phase_name, "•")
        phase_secs = sum(e["duration_secs"] for e in exercises)
        print(f"\n  {icon} {phase_name}  ({fmt_duration(phase_secs)})")
        print(f"  {'─'*54}")
        for ex in exercises:
            diff = DIFF_LABELS.get(ex["difficulty"], "")
            dur_str = ex["duration_str"]
            print(f"    {ex['order']}. {ex['name']}")
            print(f"       ⏱  {dur_str}   │  {diff}   │  {ex['category']}")
            desc = textwrap.fill(
                ex["description"],
                width=50,
                initial_indent="       📝 ",
                subsequent_indent="          ",
            )
            print(desc)
    print()


# ─────────────────────────────────────────────────────────────────────────────
# 5.  BATCH GENERATOR  (generates one standard + one accelerated, all themes)
# ─────────────────────────────────────────────────────────────────────────────


def generate_all_themes(catalogue, phase_pool, level="standard", seed_base=0):
    """Generate one session per theme and return them."""
    sessions = []
    for i, theme in enumerate(MOVEMENT_THEMES.keys()):
        s = generate_session(
            level=level,
            focus=theme,
            seed=seed_base + i,
            catalogue=catalogue,
            phase_pool=phase_pool,
        )
        sessions.append(s)
    return sessions


# ─────────────────────────────────────────────────────────────────────────────
# 6.  CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GMB Session Generator")
    parser.add_argument(
        "--level", choices=["standard", "accelerated"], default="standard"
    )
    parser.add_argument(
        "--focus", default=None, help='Theme name or category, e.g. "Bear & Monkey"'
    )
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--duration", type=int, choices=[15, 30, 45], default=45)
    parser.add_argument(
        "--all-themes", action="store_true", help="Generate one session for every theme"
    )
    parser.add_argument(
        "--both-levels",
        action="store_true",
        help="Generate one standard + one accelerated session",
    )
    args = parser.parse_args()

    print("Loading exercise catalogue…")
    catalogue, phase_pool, _ = load_exercise_catalogue()
    print(f"  {len(catalogue)} unique exercises across {len(phase_pool)} phases\n")

    if args.all_themes:
        for level in ["standard", "accelerated"] if args.both_levels else [args.level]:
            print(f"\n{'#'*60}")
            print(f"  GENERATING ALL THEMES — {level.upper()}")
            print(f"{'#'*60}")
            sessions = generate_all_themes(catalogue, phase_pool, level=level)
            for s in sessions:
                print_session(s)

    elif args.both_levels:
        for level in ["standard", "accelerated"]:
            s = generate_session(
                level=level,
                focus=args.focus,
                seed=args.seed,
                catalogue=catalogue,
                phase_pool=phase_pool,
                duration=args.duration,
            )
            print_session(s)

    else:
        s = generate_session(
            level=args.level,
            focus=args.focus,
            seed=args.seed,
            catalogue=catalogue,
            phase_pool=phase_pool,
            duration=args.duration,
        )
        print_session(s)
