import { useRef, useState, useCallback } from 'react';
import type { FoodCategory } from '../../api/types';

const TICK_INTERVAL = 100; // ms
const PHASE1_THRESHOLD = 1000; // ms
const PHASE2_THRESHOLD = 3000; // ms

const PHASE1_RATE = 10; // grams per tick
const PHASE2_RATE = 50; // grams per tick
const PHASE3_RATE = 100; // grams per tick

export const BASELINE_BY_CATEGORY: Record<FoodCategory, number> = {
  high_fat: 10,
  high_protein: 50,
  high_carb: 50,
  veg: 50,
  fruit: 50,
};

export interface AcceleratorState {
  isActive: boolean;
  currentGrams: number;
  phase: 0 | 1 | 2 | 3;
  showFineTune: boolean;
}

export interface UseAcceleratorReturn {
  state: AcceleratorState;
  start: () => void;
  stop: () => void;
  adjustFine: (delta: number) => void;
  confirm: () => number;
  dismiss: () => void;
}

export function useAccelerator(category: FoodCategory): UseAcceleratorReturn {
  const baseline = BASELINE_BY_CATEGORY[category];

  const [state, setState] = useState<AcceleratorState>({
    isActive: false,
    currentGrams: baseline,
    phase: 0,
    showFineTune: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const gramsRef = useRef(baseline);
  const wasHeldRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    elapsedRef.current = 0;
    gramsRef.current = baseline;
    wasHeldRef.current = false;

    setState({
      isActive: true,
      currentGrams: baseline,
      phase: 1,
      showFineTune: false,
    });

    intervalRef.current = setInterval(() => {
      elapsedRef.current += TICK_INTERVAL;
      wasHeldRef.current = true;

      let rate: number;
      let phase: 1 | 2 | 3;

      if (elapsedRef.current >= PHASE2_THRESHOLD) {
        rate = PHASE3_RATE;
        phase = 3;
      } else if (elapsedRef.current >= PHASE1_THRESHOLD) {
        rate = PHASE2_RATE;
        phase = 2;
      } else {
        rate = PHASE1_RATE;
        phase = 1;
      }

      gramsRef.current += rate;

      setState((prev) => ({
        ...prev,
        currentGrams: gramsRef.current,
        phase,
      }));
    }, TICK_INTERVAL);
  }, [baseline]);

  const stop = useCallback(() => {
    clearTimer();

    // If held, show fine-tune overlay; if just tapped, add baseline directly
    if (wasHeldRef.current) {
      setState((prev) => ({
        ...prev,
        isActive: false,
        showFineTune: true,
      }));
    } else {
      // Quick tap - just show fine-tune with baseline amount
      setState((prev) => ({
        ...prev,
        isActive: false,
        currentGrams: baseline,
        showFineTune: true,
      }));
    }
  }, [clearTimer, baseline]);

  const adjustFine = useCallback((delta: number) => {
    setState((prev) => ({
      ...prev,
      currentGrams: Math.max(5, prev.currentGrams + delta),
    }));
  }, []);

  const confirm = useCallback(() => {
    const finalGrams = state.currentGrams;
    setState({
      isActive: false,
      currentGrams: baseline,
      phase: 0,
      showFineTune: false,
    });
    return finalGrams;
  }, [state.currentGrams, baseline]);

  const dismiss = useCallback(() => {
    clearTimer();
    setState({
      isActive: false,
      currentGrams: baseline,
      phase: 0,
      showFineTune: false,
    });
  }, [clearTimer, baseline]);

  return {
    state,
    start,
    stop,
    adjustFine,
    confirm,
    dismiss,
  };
}
