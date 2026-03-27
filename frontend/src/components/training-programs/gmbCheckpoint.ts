import type { SessionExercise } from '../../api/types';
import type { CompletedExercise } from './SessionCompleteScreen';

export interface GmbCheckpoint {
  savedAt: string;
  exercises: SessionExercise[];
  currentIndex: number;
  completedExercises: CompletedExercise[];
  durationChoice: '15' | '30' | '45';
  sessionStartTime: number;
}

const STORAGE_KEY = 'gmb_session_checkpoint';
const STALE_MS = 24 * 60 * 60 * 1000;

export function saveCheckpoint(cp: GmbCheckpoint): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cp));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function loadCheckpoint(): GmbCheckpoint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cp: GmbCheckpoint = JSON.parse(raw);
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

export function clearCheckpoint(): void {
  localStorage.removeItem(STORAGE_KEY);
}
