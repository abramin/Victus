import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRecoveryStatus } from './recovery';

describe('recovery utilities', () => {
  describe('getRecoveryStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('ready state', () => {
      it('should return "Ready to Train" when fatigue is 0%', () => {
        const result = getRecoveryStatus(0);
        expect(result.label).toBe('Ready to Train');
        expect(result.isReady).toBe(true);
        expect(result.color).toBe('text-emerald-400');
        expect(result.hoursRemaining).toBe(0);
      });

      it('should return "Ready to Train" when fatigue is at threshold (5%)', () => {
        const result = getRecoveryStatus(5);
        expect(result.label).toBe('Ready to Train');
        expect(result.isReady).toBe(true);
      });

      it('should return "Ready to Train" when fatigue is below threshold', () => {
        const result = getRecoveryStatus(3);
        expect(result.isReady).toBe(true);
        expect(result.hoursRemaining).toBe(0);
      });
    });

    describe('ready today', () => {
      it('should return "Today XPM" when recovery completes same day', () => {
        // Set time to 10 AM on Jan 23, 2026
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));

        // 15% fatigue = (15-5)/2 = 5 hours to recover = 3 PM today
        const result = getRecoveryStatus(15, new Date());
        expect(result.label).toBe('Today 3PM');
        expect(result.isReady).toBe(false);
        expect(result.hoursRemaining).toBe(5);
      });

      it('should return "Today XAM" for morning recovery', () => {
        // Set time to 2 AM
        vi.setSystemTime(new Date(2026, 0, 23, 2, 0, 0));

        // 11% fatigue = (11-5)/2 = 3 hours = 5 AM
        const result = getRecoveryStatus(11, new Date());
        expect(result.label).toBe('Today 5AM');
        expect(result.hoursRemaining).toBe(3);
      });
    });

    describe('ready tomorrow', () => {
      it('should return "Tomorrow XAM" when recovery spans overnight', () => {
        // Set time to 8 PM on Jan 23
        vi.setSystemTime(new Date(2026, 0, 23, 20, 0, 0));

        // 25% fatigue = (25-5)/2 = 10 hours = 6 AM tomorrow
        const result = getRecoveryStatus(25, new Date());
        expect(result.label).toBe('Tomorrow 6AM');
        expect(result.isReady).toBe(false);
        expect(result.hoursRemaining).toBe(10);
      });

      it('should return "Tomorrow XPM" for afternoon recovery', () => {
        // Set time to 10 PM on Jan 23
        vi.setSystemTime(new Date(2026, 0, 23, 22, 0, 0));

        // 35% fatigue = (35-5)/2 = 15 hours = 1 PM tomorrow
        const result = getRecoveryStatus(35, new Date());
        expect(result.label).toBe('Tomorrow 1PM');
        expect(result.hoursRemaining).toBe(15);
      });
    });

    describe('ready later (weekday)', () => {
      it('should return weekday name when recovery is 2+ days out', () => {
        // Set time to Friday Jan 23, 2026 at 10 AM (Jan 23, 2026 is actually a Thursday)
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));

        // 100% fatigue = (100-5)/2 = 47.5 hours, ceil = 48 hours = Sunday
        const result = getRecoveryStatus(100, new Date());
        expect(result.label).toBe('Sun');
        expect(result.isReady).toBe(false);
        expect(result.hoursRemaining).toBe(48);
      });

      it('should show abbreviated weekday for multi-day recovery', () => {
        // Set time to Monday
        vi.setSystemTime(new Date(2026, 0, 19, 10, 0, 0)); // Monday Jan 19

        // 80% fatigue = (80-5)/2 = 37.5 hours, ceil = 38 hours = Wednesday
        const result = getRecoveryStatus(80, new Date());
        expect(result.label).toBe('Wed');
      });
    });

    describe('color coding', () => {
      it('should return yellow for <= 6 hours remaining', () => {
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));
        // 15% = 5 hours
        const result = getRecoveryStatus(15, new Date());
        expect(result.color).toBe('text-yellow-400');
      });

      it('should return yellow for exactly 6 hours', () => {
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));
        // 17% = 6 hours
        const result = getRecoveryStatus(17, new Date());
        expect(result.color).toBe('text-yellow-400');
      });

      it('should return orange for 7-24 hours remaining', () => {
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));
        // 35% = 15 hours
        const result = getRecoveryStatus(35, new Date());
        expect(result.color).toBe('text-orange-400');
      });

      it('should return orange for exactly 24 hours', () => {
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));
        // 53% = 24 hours
        const result = getRecoveryStatus(53, new Date());
        expect(result.color).toBe('text-orange-400');
      });

      it('should return red for > 24 hours remaining', () => {
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));
        // 55% = 25 hours
        const result = getRecoveryStatus(55, new Date());
        expect(result.color).toBe('text-red-400');
      });
    });

    describe('hours remaining calculation', () => {
      it('should calculate hours correctly for various fatigue levels', () => {
        // 10% fatigue = (10-5)/2 = 2.5, ceil = 3 hours
        expect(getRecoveryStatus(10).hoursRemaining).toBe(3);

        // 25% fatigue = (25-5)/2 = 10 hours
        expect(getRecoveryStatus(25).hoursRemaining).toBe(10);

        // 50% fatigue = (50-5)/2 = 22.5, ceil = 23 hours
        expect(getRecoveryStatus(50).hoursRemaining).toBe(23);

        // 100% fatigue = (100-5)/2 = 47.5, ceil = 48 hours
        expect(getRecoveryStatus(100).hoursRemaining).toBe(48);
      });
    });

    describe('edge cases', () => {
      it('should handle fatigue just above threshold', () => {
        // 6% fatigue = (6-5)/2 = 0.5, ceil = 1 hour
        const result = getRecoveryStatus(6);
        expect(result.isReady).toBe(false);
        expect(result.hoursRemaining).toBe(1);
      });

      it('should handle midnight boundary', () => {
        // Set time to 11 PM
        vi.setSystemTime(new Date(2026, 0, 23, 23, 0, 0));

        // 7% fatigue = 1 hour = midnight (12 AM tomorrow)
        const result = getRecoveryStatus(7, new Date());
        expect(result.label).toBe('Tomorrow 12AM');
      });

      it('should handle noon correctly', () => {
        vi.setSystemTime(new Date(2026, 0, 23, 10, 0, 0));

        // 9% fatigue = 2 hours = 12 PM
        const result = getRecoveryStatus(9, new Date());
        expect(result.label).toBe('Today 12PM');
      });
    });
  });
});
