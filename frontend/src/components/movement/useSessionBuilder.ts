import { useCallback, useMemo, useState } from 'react';
import type { Movement, MovementCategory } from '../../api/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionPhase = 'prepare' | 'practice' | 'push';

export interface BuilderEntry {
  id: string;
  movement: Movement;
  sets: number;
  reps: number;
  durationMinutes: number;
  neuralCost: number;
}

export type ZoneState = Record<SessionPhase, BuilderEntry[]>;

export const ZONE_MAP: Record<MovementCategory, SessionPhase> = {
  locomotion: 'prepare',
  core: 'prepare',
  skill: 'practice',
  pull: 'practice',
  push: 'push',
  legs: 'push',
  power: 'push',
};

const ZONE_DEFAULTS: Record<SessionPhase, { sets: number; reps: number; duration: number }> = {
  prepare: { sets: 2, reps: 10, duration: 3 },
  practice: { sets: 3, reps: 8, duration: 5 },
  push: { sets: 3, reps: 10, duration: 8 },
};

// ---------------------------------------------------------------------------
// Zone-based chip colors (aligned with ZONE_CONFIG in SessionCanvas)
// ---------------------------------------------------------------------------

const ZONE_CHIP_COLORS: Record<SessionPhase, { base: string; hover: string }> = {
  prepare:  { base: 'bg-amber-700',  hover: 'hover:bg-amber-600' },
  practice: { base: 'bg-teal-700',   hover: 'hover:bg-teal-600' },
  push:     { base: 'bg-violet-700', hover: 'hover:bg-violet-600' },
};

export function zoneColorFor(category: MovementCategory): { base: string; hover: string } {
  return ZONE_CHIP_COLORS[ZONE_MAP[category]];
}

// ---------------------------------------------------------------------------
// Joint stress utilities
// ---------------------------------------------------------------------------

export function computeJointStressMap(entries: BuilderEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    for (const [joint, stress] of Object.entries(e.movement.jointStress)) {
      map.set(joint, Math.max(map.get(joint) ?? 0, stress));
    }
  }
  return map;
}

export function hasJointConflict(movement: Movement, stressMap: Map<string, number>): boolean {
  for (const [joint, stress] of Object.entries(movement.jointStress)) {
    if (stress > 0.1 && (stressMap.get(joint) ?? 0) > 0.5) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _entrySeq = 0;
function nextId(): string {
  return `entry-${++_entrySeq}-${Date.now()}`;
}

function neuralCostFor(m: Movement): number {
  return Math.min(m.difficulty * 1.5, 10);
}

function createEntry(movement: Movement): BuilderEntry {
  const zone = ZONE_MAP[movement.category];
  const defaults = ZONE_DEFAULTS[zone];
  return {
    id: nextId(),
    movement,
    sets: defaults.sets,
    reps: defaults.reps,
    durationMinutes: defaults.duration,
    neuralCost: neuralCostFor(movement),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSessionBuilder(movements: Movement[]) {
  const [zones, setZones] = useState<ZoneState>({
    prepare: [],
    practice: [],
    push: [],
  });

  // Flatten all entries
  const allEntries = useMemo(
    () => [...zones.prepare, ...zones.practice, ...zones.push],
    [zones],
  );

  // Total load = Σ(difficulty × durationMinutes × 0.1)
  const totalLoad = useMemo(
    () => allEntries.reduce((sum, e) => sum + e.movement.difficulty * e.durationMinutes * 0.1, 0),
    [allEntries],
  );

  // Projected neural drain = Σ(neuralCost)
  const projectedDrain = useMemo(
    () => allEntries.reduce((sum, e) => sum + e.neuralCost, 0),
    [allEntries],
  );

  // Active burn estimate (kcal)
  const activeBurn = useMemo(
    () => Math.round(allEntries.reduce((sum, e) => sum + e.movement.difficulty * e.durationMinutes * 1.2, 0)),
    [allEntries],
  );

  // Total estimated duration (minutes)
  const totalDuration = useMemo(
    () => allEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
    [allEntries],
  );

  // Joint stress map from current session entries
  const jointStressMap = useMemo(
    () => computeJointStressMap(allEntries),
    [allEntries],
  );

  // Add a movement — auto-routes to correct zone
  const addMovement = useCallback((movementId: string) => {
    const m = movements.find((mv) => mv.id === movementId);
    if (!m) return;
    const zone = ZONE_MAP[m.category];
    const entry = createEntry(m);
    setZones((prev) => ({ ...prev, [zone]: [...prev[zone], entry] }));
  }, [movements]);

  // Remove an entry by id
  const removeEntry = useCallback((entryId: string) => {
    setZones((prev) => ({
      prepare: prev.prepare.filter((e) => e.id !== entryId),
      practice: prev.practice.filter((e) => e.id !== entryId),
      push: prev.push.filter((e) => e.id !== entryId),
    }));
  }, []);

  // Update an entry's sets/reps/duration
  const updateEntry = useCallback((entryId: string, patch: Partial<Pick<BuilderEntry, 'sets' | 'reps' | 'durationMinutes'>>) => {
    setZones((prev) => {
      function patchList(list: BuilderEntry[]): BuilderEntry[] {
        return list.map((e) => (e.id === entryId ? { ...e, ...patch } : e));
      }
      return {
        prepare: patchList(prev.prepare),
        practice: patchList(prev.practice),
        push: patchList(prev.push),
      };
    });
  }, []);

  // Smart Fill — populate zones based on battery & ceiling
  const smartFill = useCallback((ceiling: number | null, batteryPct: number) => {
    const cap = ceiling ?? 10;
    const eligible = movements.filter((m) => m.difficulty <= cap);

    // Group by zone
    const byZone: Record<SessionPhase, Movement[]> = { prepare: [], practice: [], push: [] };
    for (const m of eligible) {
      byZone[ZONE_MAP[m.category]].push(m);
    }

    // Sort: ascending when tired, descending when fresh
    const sortFn = batteryPct < 60
      ? (a: Movement, b: Movement) => a.difficulty - b.difficulty
      : (a: Movement, b: Movement) => b.difficulty - a.difficulty;

    // Budget per zone (% of battery)
    const budgetMap: Record<SessionPhase, number> = {
      prepare: batteryPct * 0.3,
      practice: batteryPct * 0.3,
      push: batteryPct * 0.4,
    };

    const next: ZoneState = { prepare: [], practice: [], push: [] };

    for (const phase of ['prepare', 'practice', 'push'] as SessionPhase[]) {
      const sorted = [...byZone[phase]].sort(sortFn);
      let remaining = budgetMap[phase];

      for (const m of sorted) {
        const cost = neuralCostFor(m);
        if (cost <= remaining && next[phase].length < 3) {
          next[phase].push(createEntry(m));
          remaining -= cost;
        }
      }
    }

    setZones(next);
  }, [movements]);

  // Clear all zones
  const clear = useCallback(() => {
    setZones({ prepare: [], practice: [], push: [] });
  }, []);

  return {
    zones,
    allEntries,
    totalLoad,
    totalDuration,
    projectedDrain,
    activeBurn,
    jointStressMap,
    addMovement,
    removeEntry,
    updateEntry,
    smartFill,
    clear,
  };
}
