import { useState, useEffect, useCallback } from 'react';

interface UseWaterTrackingReturn {
  /** Current water intake in liters */
  intakeL: number;
  /** Target water intake in liters */
  targetL: number;
  /** Progress as a percentage (0-100+) */
  progress: number;
  /** Add water to the daily intake */
  addWater: (amountL: number) => void;
  /** Reset water intake to zero */
  reset: () => void;
}

/**
 * Hook to track daily water intake using localStorage.
 * Data is stored per date to persist across page refreshes.
 */
export function useWaterTracking(date: string, targetL: number): UseWaterTrackingReturn {
  const [intakeL, setIntakeL] = useState(0);

  const storageKey = `water_${date}`;

  // Load from localStorage on mount or date change
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        setIntakeL(parsed);
      }
    } else {
      setIntakeL(0);
    }
  }, [storageKey]);

  const addWater = useCallback(
    (amountL: number) => {
      setIntakeL((prev) => {
        // Cap at 150% of target to prevent unrealistic values
        const maxIntake = targetL * 1.5;
        const newIntake = Math.min(prev + amountL, maxIntake);
        const rounded = Math.round(newIntake * 100) / 100; // Round to 2 decimal places
        localStorage.setItem(storageKey, rounded.toString());
        return rounded;
      });
    },
    [storageKey, targetL]
  );

  const reset = useCallback(() => {
    setIntakeL(0);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const progress = targetL > 0 ? (intakeL / targetL) * 100 : 0;

  return {
    intakeL,
    targetL,
    progress,
    addWater,
    reset,
  };
}
