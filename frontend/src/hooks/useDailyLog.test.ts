import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDailyLog } from './useDailyLog';
import type { DailyLog, CreateDailyLogRequest } from '../api/types';

// Mock the API client
vi.mock('../api/client', () => ({
  getTodayLog: vi.fn(),
  createDailyLog: vi.fn(),
  deleteTodayLog: vi.fn(),
  updateActualTraining: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code);
      this.name = 'ApiError';
    }
  },
}));

import { getTodayLog, createDailyLog, deleteTodayLog, updateActualTraining, ApiError } from '../api/client';

const mockLog: DailyLog = {
  date: '2026-01-24',
  weightKg: 80,
  dayType: 'fatburner',
  sleepQuality: 75,
  plannedTrainingSessions: [
    { sessionOrder: 1, type: 'strength', durationMin: 60 },
  ],
  actualTrainingSessions: [],
  trainingSummary: {
    sessionCount: 1,
    totalDurationMin: 60,
    totalLoadScore: 300,
    summary: '1 session, 60 min total',
  },
  calculatedTargets: {
    totalCarbsG: 250,
    totalProteinG: 165,
    totalFatsG: 70,
    totalCalories: 2200,
    fruitG: 200,
    veggiesG: 400,
    waterL: 3,
    dayType: 'fatburner',
    meals: {
      breakfast: { carbs: 3, protein: 2, fats: 1 },
      lunch: { carbs: 4, protein: 3, fats: 2 },
      dinner: { carbs: 5, protein: 4, fats: 2 },
    },
  },
  estimatedTDEE: 2500,
  tdeeSourceUsed: 'formula',
};

const mockCreateRequest: CreateDailyLogRequest = {
  date: '2026-01-24',
  weightKg: 80,
  dayType: 'fatburner',
  sleepQuality: 75,
  plannedTrainingSessions: [
    { type: 'strength', durationMin: 60 },
  ],
};

describe('useDailyLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    vi.mocked(getTodayLog).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useDailyLog());

    expect(result.current.loading).toBe(true);
    expect(result.current.log).toBe(null);
    expect(result.current.hasLogToday).toBe(false);
  });

  it('should load today log successfully', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(mockLog);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.log).toEqual(mockLog);
    expect(result.current.hasLogToday).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle null log (no log today)', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(null);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.log).toBe(null);
    expect(result.current.hasLogToday).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle API error on load', async () => {
    const error = new ApiError(500, 'internal_error', 'Server error');
    vi.mocked(getTodayLog).mockRejectedValue(error);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.log).toBe(null);
    expect(result.current.error).toBe('Server error');
  });

  it('should create a new log', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(null);
    vi.mocked(createDailyLog).mockResolvedValue(mockLog);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdLog: DailyLog | null = null;
    await act(async () => {
      createdLog = await result.current.create(mockCreateRequest);
    });

    expect(createdLog).toEqual(mockLog);
    expect(result.current.log).toEqual(mockLog);
    expect(result.current.saveError).toBe(null);
  });

  it('should handle create error', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(null);
    const error = new ApiError(400, 'validation_error', 'Invalid data');
    vi.mocked(createDailyLog).mockRejectedValue(error);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let createdLog: DailyLog | null = null;
    await act(async () => {
      createdLog = await result.current.create(mockCreateRequest);
    });

    expect(createdLog).toBe(null);
    expect(result.current.saveError).toBe('Invalid data');
  });

  it('should replace existing log', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(mockLog);
    vi.mocked(deleteTodayLog).mockResolvedValue(undefined);
    vi.mocked(createDailyLog).mockResolvedValue({ ...mockLog, weightKg: 79 });

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let replacedLog: DailyLog | null = null;
    await act(async () => {
      replacedLog = await result.current.replace({ ...mockCreateRequest, weightKg: 79 });
    });

    expect(replacedLog?.weightKg).toBe(79);
    expect(result.current.log?.weightKg).toBe(79);
    expect(deleteTodayLog).toHaveBeenCalled();
    expect(createDailyLog).toHaveBeenCalled();
  });

  it('should set saving state during create', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(null);
    
    let resolvePromise: (value: DailyLog) => void;
    vi.mocked(createDailyLog).mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Start create
    let createPromise: Promise<DailyLog | null>;
    act(() => {
      createPromise = result.current.create(mockCreateRequest);
    });

    // Check saving state
    expect(result.current.saving).toBe(true);

    // Resolve the create
    await act(async () => {
      resolvePromise!(mockLog);
      await createPromise;
    });

    expect(result.current.saving).toBe(false);
  });

  it('should update actual training sessions', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(mockLog);
    const updatedLog = {
      ...mockLog,
      actualTrainingSessions: [
        { sessionOrder: 1, type: 'strength' as const, durationMin: 55, perceivedIntensity: 8, notes: '' },
      ],
    };
    vi.mocked(updateActualTraining).mockResolvedValue(updatedLog);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let updated: DailyLog | null = null;
    await act(async () => {
      updated = await result.current.updateActual([
        { type: 'strength', durationMin: 55, perceivedIntensity: 8, notes: '' },
      ]);
    });

    expect(updated).toEqual(updatedLog);
    expect(result.current.log?.actualTrainingSessions?.length).toBe(1);
  });

  it('should refresh log', async () => {
    vi.mocked(getTodayLog).mockResolvedValue(mockLog);

    const { result } = renderHook(() => useDailyLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update mock to return different data
    vi.mocked(getTodayLog).mockResolvedValue({ ...mockLog, weightKg: 78 });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.log?.weightKg).toBe(78);
  });
});
