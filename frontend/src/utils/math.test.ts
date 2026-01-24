import { describe, it, expect } from 'vitest';
import { roundToNearest5, buildSvgPath, clamp, safePercent } from './math';

describe('math utilities', () => {
  describe('roundToNearest5', () => {
    it('should round down when remainder is less than 2.5', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(roundToNearest5(12)).toBe(10);
      expect(roundToNearest5(11)).toBe(10);
    });

    it('should round up when remainder is 2.5 or more', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(roundToNearest5(13)).toBe(15);
      expect(roundToNearest5(17)).toBe(15);
      expect(roundToNearest5(18)).toBe(20);
    });

    it('should return same value for multiples of 5', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(roundToNearest5(0)).toBe(0);
      expect(roundToNearest5(5)).toBe(5);
      expect(roundToNearest5(100)).toBe(100);
    });

    it('should handle negative numbers', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(roundToNearest5(-12)).toBe(-10);
      expect(roundToNearest5(-13)).toBe(-15);
    });
  });

  describe('buildSvgPath', () => {
    it('should build path starting with M and continuing with L', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      const points = [{ value: 10 }, { value: 20 }, { value: 15 }];
      const path = buildSvgPath(
        points,
        (i) => i * 10,
        (v) => 100 - v,
        (p) => p.value
      );
      expect(path).toBe('M 0 90 L 10 80 L 20 85');
    });

    it('should handle single point', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      const points = [{ value: 50 }];
      const path = buildSvgPath(
        points,
        (i) => i * 10,
        (v) => v,
        (p) => p.value
      );
      expect(path).toBe('M 0 50');
    });

    it('should handle empty array', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      const path = buildSvgPath([], (i) => i, (v) => v, (p: { value: number }) => p.value);
      expect(path).toBe('');
    });
  });

  describe('clamp', () => {
    it('should return value when within range', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value is below', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max when value is above', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle negative ranges', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
  });

  describe('safePercent', () => {
    it('should calculate percentage correctly', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(safePercent(25, 100)).toBe(25);
      expect(safePercent(1, 4)).toBe(25);
    });

    it('should return 0 when total is 0', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(safePercent(10, 0)).toBe(0);
      expect(safePercent(0, 0)).toBe(0);
    });

    it('should handle values greater than total', () => {
      // Invariant: numeric helpers must stay stable to avoid user-visible calculation drift.
      expect(safePercent(150, 100)).toBe(150);
    });
  });
});
