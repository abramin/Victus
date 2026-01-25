/**
 * Natural language recovery status utility.
 * Converts fatigue percentages into actionable recovery timestamps.
 */

export interface RecoveryStatus {
  /** Human-readable label: "Ready to Train", "Today 2PM", "Tomorrow 10AM", "Wed" */
  label: string;
  /** Tailwind text color class */
  color: string;
  /** True if muscle is ready to train */
  isReady: boolean;
  /** Hours remaining until ready (0 if already ready) */
  hoursRemaining: number;
}

/** Fatigue threshold below which muscle is considered ready */
const RECOVERY_READY_THRESHOLD = 5;

/** Recovery rate: 2% per hour (~50 hours for full recovery from 100%) */
const RECOVERY_RATE_PER_HOUR = 2;

/**
 * Calculates a natural language recovery status from fatigue percentage.
 *
 * @param fatiguePercent - Current fatigue level (0-100)
 * @param referenceTime - Reference time for calculations (defaults to now, useful for testing)
 * @returns RecoveryStatus with label, color, isReady flag, and hoursRemaining
 *
 * @example
 * // At 10 AM with 20% fatigue (8 hours to recover)
 * getRecoveryStatus(20) // { label: "Today 6PM", color: "text-yellow-400", isReady: false, hoursRemaining: 8 }
 *
 * // Fresh muscle
 * getRecoveryStatus(3) // { label: "Ready to Train", color: "text-emerald-400", isReady: true, hoursRemaining: 0 }
 */
export function getRecoveryStatus(
  fatiguePercent: number,
  referenceTime: Date = new Date()
): RecoveryStatus {
  // Already ready - below threshold
  if (fatiguePercent <= RECOVERY_READY_THRESHOLD) {
    return {
      label: 'Ready to Train',
      color: 'text-emerald-400',
      isReady: true,
      hoursRemaining: 0,
    };
  }

  // Calculate time to reach threshold
  const percentToRecover = fatiguePercent - RECOVERY_READY_THRESHOLD;
  const hoursRemaining = Math.ceil(percentToRecover / RECOVERY_RATE_PER_HOUR);
  const readyTime = new Date(referenceTime.getTime() + hoursRemaining * 60 * 60 * 1000);

  return {
    label: formatReadyLabel(referenceTime, readyTime),
    color: getRecoveryColor(hoursRemaining),
    isReady: false,
    hoursRemaining,
  };
}

/**
 * Formats the ready time as a natural language label.
 * - Same day: "Today 2PM"
 * - Next day: "Tomorrow 10AM"
 * - Further out: "Wed", "Thu", etc.
 */
function formatReadyLabel(now: Date, readyTime: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const readyDay = new Date(readyTime);
  readyDay.setHours(0, 0, 0, 0);

  const timeStr = formatTimeShort(readyTime);

  if (readyDay.getTime() === today.getTime()) {
    return `Today ${timeStr}`;
  }

  if (readyDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow ${timeStr}`;
  }

  // More than 2 days out - show abbreviated weekday
  return readyTime.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Formats time in compact 12-hour format: "2PM", "10AM"
 */
function formatTimeShort(date: Date): string {
  const h = date.getHours() % 12 || 12;
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}${ampm}`;
}

/**
 * Returns a color class based on recovery urgency.
 * - Almost ready (≤6h): yellow (optimistic)
 * - Today/tonight (≤24h): orange (moderate)
 * - Tomorrow or later (>24h): red (needs rest)
 */
function getRecoveryColor(hoursRemaining: number): string {
  if (hoursRemaining <= 6) return 'text-yellow-400';
  if (hoursRemaining <= 24) return 'text-orange-400';
  return 'text-red-400';
}
