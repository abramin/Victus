import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toDateKey,
  formatShortDate,
  isSameDay,
  isToday,
  parseDateKey,
  getDaysInMonth,
  formatLongDate,
} from './date';

describe('date utilities', () => {
  describe('toDateKey', () => {
    it('should convert date to YYYY-MM-DD format', () => {
      const date = new Date(2026, 0, 23); // Jan 23, 2026
      expect(toDateKey(date)).toBe('2026-01-23');
    });

    it('should handle single-digit months and days', () => {
      const date = new Date(2026, 0, 5); // Jan 5, 2026
      expect(toDateKey(date)).toBe('2026-01-05');
    });

    it('should handle December correctly', () => {
      const date = new Date(2026, 11, 31); // Dec 31, 2026
      expect(toDateKey(date)).toBe('2026-12-31');
    });
  });

  describe('formatShortDate', () => {
    it('should format date as "MMM DD"', () => {
      expect(formatShortDate('2026-01-23')).toBe('Jan 23');
    });

    it('should handle different months', () => {
      expect(formatShortDate('2026-12-01')).toBe('Dec 1');
      expect(formatShortDate('2026-06-15')).toBe('Jun 15');
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day with different times', () => {
      const a = new Date(2026, 0, 23, 10, 30);
      const b = new Date(2026, 0, 23, 18, 45);
      expect(isSameDay(a, b)).toBe(true);
    });

    it('should return false for different days', () => {
      const a = new Date(2026, 0, 23);
      const b = new Date(2026, 0, 24);
      expect(isSameDay(a, b)).toBe(false);
    });

    it('should return false for same day in different months', () => {
      const a = new Date(2026, 0, 23);
      const b = new Date(2026, 1, 23);
      expect(isSameDay(a, b)).toBe(false);
    });

    it('should return false for same day in different years', () => {
      const a = new Date(2026, 0, 23);
      const b = new Date(2027, 0, 23);
      expect(isSameDay(a, b)).toBe(false);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for today', () => {
      vi.setSystemTime(new Date(2026, 0, 23, 12, 0, 0));
      expect(isToday(new Date(2026, 0, 23))).toBe(true);
    });

    it('should return false for yesterday', () => {
      vi.setSystemTime(new Date(2026, 0, 23, 12, 0, 0));
      expect(isToday(new Date(2026, 0, 22))).toBe(false);
    });

    it('should return false for tomorrow', () => {
      vi.setSystemTime(new Date(2026, 0, 23, 12, 0, 0));
      expect(isToday(new Date(2026, 0, 24))).toBe(false);
    });
  });

  describe('parseDateKey', () => {
    it('should parse YYYY-MM-DD to Date', () => {
      const date = parseDateKey('2026-01-23');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(23);
    });

    it('should handle December correctly', () => {
      const date = parseDateKey('2026-12-31');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(11); // December is 11
      expect(date.getDate()).toBe(31);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return 31 for January', () => {
      expect(getDaysInMonth(2026, 0)).toBe(31);
    });

    it('should return 28 for February in non-leap year', () => {
      expect(getDaysInMonth(2026, 1)).toBe(28);
    });

    it('should return 29 for February in leap year', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29);
    });

    it('should return 30 for April', () => {
      expect(getDaysInMonth(2026, 3)).toBe(30);
    });
  });

  describe('formatLongDate', () => {
    it('should format date with weekday, month, day, and year', () => {
      const date = new Date(2026, 0, 23);
      const formatted = formatLongDate(date);
      expect(formatted).toContain('January');
      expect(formatted).toContain('23');
      expect(formatted).toContain('2026');
    });
  });
});
