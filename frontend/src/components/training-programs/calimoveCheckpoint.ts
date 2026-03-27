import type { CalisthenicsSession } from '../../api/types';

export interface CalimoveCompletedSet {
  exerciseOrder: number; // matches CalisthenicsExercise.order
  exerciseName: string;
  setsCompleted: number;
}

export interface CalimoveCheckpoint {
  savedAt: string;
  session: CalisthenicsSession;
  currentExerciseIndex: number;
  currentSet: number; // 1-based
  completedSets: CalimoveCompletedSet[];
  sessionStartTime: number;
}

const STORAGE_KEY = 'calimove_session_checkpoint';
const STALE_MS = 24 * 60 * 60 * 1000;

export function saveCalimoveCheckpoint(cp: CalimoveCheckpoint): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cp));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function loadCalimoveCheckpoint(): CalimoveCheckpoint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cp: CalimoveCheckpoint = JSON.parse(raw);
    const age = Date.now() - new Date(cp.savedAt).getTime();
    if (isNaN(age) || age > STALE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return cp;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearCalimoveCheckpoint(): void {
  localStorage.removeItem(STORAGE_KEY);
}
