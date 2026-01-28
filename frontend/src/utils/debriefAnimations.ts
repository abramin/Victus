const INTRO_KEY = 'lastDebriefIntroWeek';
const NARRATIVE_KEY = 'lastSeenDebriefWeek';

export interface DebriefAnimationState {
  shouldAnimateIntro: boolean;
  shouldAnimateNarrative: boolean;
}

/**
 * Determines if animations should play based on localStorage state.
 * Uses weekStartDate as unique key to ensure animations show once per week.
 */
export function getDebriefAnimationState(weekKey: string): DebriefAnimationState {
  const lastIntroWeek = localStorage.getItem(INTRO_KEY);
  const lastNarrativeWeek = localStorage.getItem(NARRATIVE_KEY);

  return {
    shouldAnimateIntro: lastIntroWeek !== weekKey,
    shouldAnimateNarrative: lastNarrativeWeek !== weekKey,
  };
}

/**
 * Marks the intro animation as seen for the given week.
 */
export function markIntroSeen(weekKey: string): void {
  localStorage.setItem(INTRO_KEY, weekKey);
}

/**
 * Marks the narrative typewriter animation as seen for the given week.
 */
export function markNarrativeSeen(weekKey: string): void {
  localStorage.setItem(NARRATIVE_KEY, weekKey);
}

/**
 * Clears all animation state flags.
 * Call this before regenerating a report to force animations to play again.
 */
export function clearDebriefAnimationState(): void {
  localStorage.removeItem(INTRO_KEY);
  localStorage.removeItem(NARRATIVE_KEY);
}

/**
 * Creates a stable week key from the week start date.
 * This ensures animations are keyed to the specific week, not the current date.
 */
export function getWeekKey(weekStartDate: string): string {
  return weekStartDate;
}
