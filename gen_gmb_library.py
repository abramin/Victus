#!/usr/bin/env python3
"""Regenerate gmbExerciseLibrary.ts from gmb_sessions.json + floor_loco_sessions.json."""

import json
import re

SOURCES = ["gmb_sessions.json", "floor_loco_sessions.json"]
OUT = "frontend/src/components/training-programs/gmbExerciseLibrary.ts"

PHASE_MAP = {
    "PREPARE": "prepare",
    "PRACTICE": "practice",
    "PUSH": "push",
    "PONDER": "ponder",
    "PLAY": "practice",  # treat PLAY as practice for runner purposes
}

PHASE_ICON = {
    "prepare": "🤸",
    "practice": "🤸",
    "push": "💪",
    "ponder": "🧘",
}


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = re.sub(r"\s+", "_", s.strip())
    return ("gmb_" + s)[:54]


def infer_tags(name: str) -> list[str]:
    n = name.lower()
    tags = []
    for kw in ["bear", "monkey", "frogger", "crab", "squat", "spiderman",
               "a-frame", "floating table", "wrist", "hip", "spine",
               "roll", "underswitch", "sumo", "twisted sister", "combo",
               "lunge", "bridge", "frog", "locomotion", "flow"]:
        if kw in n:
            tags.append(kw.replace(" ", "-"))
    if not tags:
        tags = ["gmb"]
    return list(dict.fromkeys(tags))  # dedupe preserving order


# Load all sessions from all sources, merge by name
exercises: dict[str, dict] = {}

for src in SOURCES:
    with open(src) as f:
        sessions = json.load(f)
    for session in sessions:
        for ex in session["exercises"]:
            if ex.get("type") == "circuit" or not ex.get("name"):
                continue
            # Skip 1-second walkthrough placeholders
            if ex.get("duration45") == 1 and ex.get("duration15") == 1:
                continue

            name = ex["name"]
            phase_raw = ex.get("phase", "PRACTICE")
            phase = PHASE_MAP.get(phase_raw, "practice")

            cues_obj = ex.get("cues")
            how_to: list[str] = []
            key_cues: list[str] = []
            if isinstance(cues_obj, dict):
                how_to = cues_obj.get("how_to") or []
                key_cues = cues_obj.get("key_cues") or []

            dur30 = int(ex.get("duration30") or ex.get("duration45") or 60)

            muscles = ex.get("muscles")

            if name not in exercises:
                exercises[name] = {
                    "id": slugify(name),
                    "name": name,
                    "phase": phase,
                    "duration": dur30,
                    "description": ex.get("description", ""),
                    "how_to": how_to,
                    "key_cues": key_cues,
                    "tags": infer_tags(name),
                    "muscles": muscles,
                }
            else:
                # Merge: fill in missing cues / muscles
                e = exercises[name]
                if not e["how_to"] and how_to:
                    e["how_to"] = how_to
                if not e["key_cues"] and key_cues:
                    e["key_cues"] = key_cues
                if not e["description"] and ex.get("description"):
                    e["description"] = ex["description"]
                if not e["muscles"] and muscles:
                    e["muscles"] = muscles


def ts_str_list(lst: list[str]) -> str:
    if not lst:
        return ""
    items = ", ".join(json.dumps(s) for s in lst)
    return f"[{items}]"


lines = [
    "// AUTO-GENERATED — do not edit manually",
    "// Sources: gmb_sessions.json, floor_loco_sessions.json",
    "import type { ExerciseDef } from './exerciseLibrary';",
    "",
    "export const GMB_EXERCISE_LIBRARY: ExerciseDef[] = [",
]

for ex in exercises.values():
    phase = ex["phase"]
    icon = PHASE_ICON.get(phase, "🤸")
    desc = ex["description"].replace("\\", "\\\\").replace("'", "\\'")
    tags_ts = "[" + ", ".join(f"'{t}'" for t in ex["tags"]) + "]"

    parts = [
        f"  id: '{ex['id']}'",
        f"name: '{ex['name'].replace(chr(39), chr(92)+chr(39))}'",
        f"defaultPhase: '{phase}'",
        f"icon: '{icon}'",
        f"defaultDurationSec: {ex['duration']}",
        "defaultReps: 0",
    ]
    if desc:
        parts.append(f"description: '{desc}'")
    if ex["key_cues"]:
        parts.append(f"cues: {ts_str_list(ex['key_cues'])}")
    if ex["how_to"]:
        parts.append(f"howTo: {ts_str_list(ex['how_to'])}")
    parts.append(f"tags: {tags_ts}")
    parts.append("source: 'gmb'")
    if ex.get("muscles"):
        m = ex["muscles"]
        primary = "[" + ", ".join(f"'{p}'" for p in m.get("primary", [])) + "]"
        secondary = "[" + ", ".join(f"'{s}'" for s in m.get("secondary", [])) + "]"
        parts.append(f"muscles: {{ primary: {primary}, secondary: {secondary} }}")

    lines.append("  { " + ", ".join(parts) + " },")

lines += ["];", ""]

with open(OUT, "w") as f:
    f.write("\n".join(lines))

print(f"Wrote {len(exercises)} exercises to {OUT}")
