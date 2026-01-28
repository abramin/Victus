import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRecoveryStatus } from './recovery';

// Invariant: Recovery calculation must correctly estimate when user is ready to train.
// This is a domain logic test - the contract is the fatigue-to-hours formula.
// Label formatting and color coding are implementation details covered by E2E tests.

describe('Recovery calculation contract', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Fatigue threshold contract', () => {
    it('fatigue at or below 5% indicates ready to train', () => {
      // Invariant: 5% is the readiness threshold. Below this, user is recovered.
      // This threshold is a domain rule that drives UI state across the app.

      expect(getRecoveryStatus(0).isReady).toBe(true);
      expect(getRecoveryStatus(3).isReady).toBe(true);
      expect(getRecoveryStatus(5).isReady).toBe(true);
      expect(getRecoveryStatus(5.01).isReady).toBe(false);
    });

    it('ready state always returns zero hours remaining', () => {
      // Invariant: Ready state means no recovery time needed.
      // This drives whether rest UI is shown.

      expect(getRecoveryStatus(0).hoursRemaining).toBe(0);
      expect(getRecoveryStatus(5).hoursRemaining).toBe(0);
    });
  });

  describe('Fatigue-to-hours calculation formula', () => {
    it('calculates recovery hours using formula: (fatigue - 5) / 2', () => {
      // Invariant: Recovery rate is 2% fatigue per hour.
      // Formula: hours = (currentFatigue - threshold) / recoveryRate
      // = (fatigue - 5) / 2
      // This formula is critical for training load management.

      // 10% fatigue = (10-5)/2 = 2.5, ceil = 3 hours
      expect(getRecoveryStatus(10).hoursRemaining).toBe(3);

      // 25% fatigue = (25-5)/2 = 10 hours
      expect(getRecoveryStatus(25).hoursRemaining).toBe(10);

      // 50% fatigue = (50-5)/2 = 22.5, ceil = 23 hours
      expect(getRecoveryStatus(50).hoursRemaining).toBe(23);

      // 100% fatigue = (100-5)/2 = 47.5, ceil = 48 hours
      expect(getRecoveryStatus(100).hoursRemaining).toBe(48);
    });

    it('always rounds up recovery hours (ceiling)', () => {
      // Invariant: Fractional hours must round up for safety.
      // Better to overestimate recovery time than underestimate and risk injury.

      // 6% fatigue = (6-5)/2 = 0.5 hours, ceil = 1
      expect(getRecoveryStatus(6).hoursRemaining).toBe(1);

      // 11% fatigue = (11-5)/2 = 3 hours (already integer)
      expect(getRecoveryStatus(11).hoursRemaining).toBe(3);

      // 15% fatigue = (15-5)/2 = 5 hours (already integer)
      expect(getRecoveryStatus(15).hoursRemaining).toBe(5);
    });
  });

  describe('Recovery time calculation from current time', () => {
    it('calculates future recovery time from current timestamp', () => {
      // Invariant: Recovery time is relative to "now".
      // If current time changes, recovery ETA changes.

      // Set time to 10 AM on Jan 23, 2026
      vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));

      // 15% fatigue = 5 hours recovery = 3 PM today
      const result = getRecoveryStatus(15, new Date());
      expect(result.hoursRemaining).toBe(5);
      expect(result.label).toContain('3PM');

      // Change time to 8 PM
      vi.setSystemTime(new Date(2026, 0, 23, 20, 0, 0));

      // 25% fatigue = 10 hours = 6 AM tomorrow
      const result2 = getRecoveryStatus(25, new Date());
      expect(result2.hoursRemaining).toBe(10);
      expect(result2.label).toContain('Tomorrow');
    });
  });

  describe('Edge cases', () => {
    it('handles fatigue just above threshold', () => {
      // Invariant: Minimal fatigue above threshold requires minimal recovery.
      // 6% fatigue = (6-5)/2 = 0.5, ceil = 1 hour

      const result = getRecoveryStatus(6);
      expect(result.isReady).toBe(false);
      expect(result.hoursRemaining).toBe(1);
    });

    it('handles extreme fatigue levels', () => {
      // Invariant: System must handle theoretical maximum fatigue (100%).
      // Real-world fatigue rarely exceeds 80%, but formula must be robust.

      const result = getRecoveryStatus(100);
      expect(result.hoursRemaining).toBe(48);
      expect(result.isReady).toBe(false);
    });

    it('handles recovery window spanning midnight', () => {
      // Invariant: Recovery calculations must cross day boundaries correctly.
      // This tests date arithmetic in recovery ETA.

      // Set time to 11 PM
      vi.setSystemTime(new Date(2026, 0, 23, 23, 0, 0));

      // 7% fatigue = 1 hour = midnight (12 AM tomorrow)
      const result = getRecoveryStatus(7, new Date());
      expect(result.hoursRemaining).toBe(1);
      expect(result.label).toContain('Tomorrow 12AM');
    });
  });
});
