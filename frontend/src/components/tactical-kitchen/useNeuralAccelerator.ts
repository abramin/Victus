import { useRef, useState, useCallback } from 'react';

const TICK_INTERVAL = 100; // ms
const BASE_INCREMENT = 10; // grams
const TAP_THRESHOLD = 150; // ms - anything shorter is a "tap"

// Acceleration curve: rate doubles roughly every second
function getIncrementRate(elapsedMs: number): number {
  if (elapsedMs < 1000) return 10;
  if (elapsedMs < 2000) return 20;
  if (elapsedMs < 3000) return 50;
  return 100;
}

// Color based on current rate
export function getRateColor(elapsedMs: number): string {
  if (elapsedMs < 1000) return '#22c55e'; // green
  if (elapsedMs < 2000) return '#eab308'; // yellow
  if (elapsedMs < 3000) return '#f97316'; // orange
  return '#ef4444'; // red
}

export interface NeuralAcceleratorState {
  isActive: boolean;
  currentGrams: number;
  elapsedMs: number;
}

export interface UseNeuralAcceleratorReturn {
  state: NeuralAcceleratorState;
  start: () => void;
  stop: () => number; // Returns final grams
  cancel: () => void;
}

export function useNeuralAccelerator(): UseNeuralAcceleratorReturn {
  const [state, setState] = useState<NeuralAcceleratorState>({
    isActive: false,
    currentGrams: BASE_INCREMENT,
    elapsedMs: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const gramsRef = useRef<number>(BASE_INCREMENT);
  const elapsedRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    gramsRef.current = BASE_INCREMENT;
    elapsedRef.current = 0;

    setState({
      isActive: true,
      currentGrams: BASE_INCREMENT,
      elapsedMs: 0,
    });

    intervalRef.current = setInterval(() => {
      elapsedRef.current += TICK_INTERVAL;
      const rate = getIncrementRate(elapsedRef.current);
      gramsRef.current += rate;

      setState({
        isActive: true,
        currentGrams: gramsRef.current,
        elapsedMs: elapsedRef.current,
      });
    }, TICK_INTERVAL);
  }, []);

  const stop = useCallback((): number => {
    clearTimer();
    const holdDuration = Date.now() - startTimeRef.current;

    // If it was a quick tap, return base increment
    // Otherwise return accumulated grams
    const finalGrams = holdDuration < TAP_THRESHOLD ? BASE_INCREMENT : gramsRef.current;

    setState({
      isActive: false,
      currentGrams: BASE_INCREMENT,
      elapsedMs: 0,
    });

    return finalGrams;
  }, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    setState({
      isActive: false,
      currentGrams: BASE_INCREMENT,
      elapsedMs: 0,
    });
  }, [clearTimer]);

  return {
    state,
    start,
    stop,
    cancel,
  };
}
