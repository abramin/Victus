import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProfile } from './useProfile';
import type { UserProfile } from '../api/types';

// Mock the API client
vi.mock('../api/client', () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code);
      this.name = 'ApiError';
    }
  },
}));

import { getProfile, saveProfile, ApiError } from '../api/client';

const mockProfile: UserProfile = {
  height_cm: 175,
  birthDate: '1990-01-01',
  sex: 'male',
  goal: 'maintain',
  currentWeightKg: 80,
  targetWeightKg: 80,
  timeframeWeeks: 12,
  targetWeeklyChangeKg: 0,
  carbRatio: 0.45,
  proteinRatio: 0.30,
  fatRatio: 0.25,
  mealRatios: { breakfast: 0.25, lunch: 0.35, dinner: 0.40 },
  pointsConfig: { carbMultiplier: 1, proteinMultiplier: 1, fatMultiplier: 1 },
  supplementConfig: { maltodextrinG: 0, wheyG: 0, collagenG: 0 },
  fruitTargetG: 200,
  veggieTargetG: 400,
  bmrEquation: 'mifflin_st_jeor',
  tdeeSource: 'formula',
  recalibrationTolerance: 0.5,
};

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in loading state', () => {
    vi.mocked(getProfile).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should load profile successfully', async () => {
    vi.mocked(getProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBe(null);
  });

  it('should handle null profile (no profile exists)', async () => {
    vi.mocked(getProfile).mockResolvedValue(null);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle API error', async () => {
    const error = new ApiError(500, 'internal_error', 'Server error');
    vi.mocked(getProfile).mockRejectedValue(error);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBe(null);
    expect(result.current.error).toBe('Server error');
  });

  it('should handle non-API error', async () => {
    vi.mocked(getProfile).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load profile');
  });

  it('should save profile successfully', async () => {
    vi.mocked(getProfile).mockResolvedValue(mockProfile);
    vi.mocked(saveProfile).mockResolvedValue({ ...mockProfile, currentWeightKg: 79 });

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let saveResult: boolean = false;
    await act(async () => {
      saveResult = await result.current.save({ ...mockProfile, currentWeightKg: 79 });
    });

    expect(saveResult).toBe(true);
    expect(result.current.profile?.currentWeightKg).toBe(79);
    expect(result.current.saveError).toBe(null);
  });

  it('should handle save error', async () => {
    vi.mocked(getProfile).mockResolvedValue(mockProfile);
    const error = new ApiError(400, 'validation_error', 'Invalid data');
    vi.mocked(saveProfile).mockRejectedValue(error);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let saveResult: boolean = true;
    await act(async () => {
      saveResult = await result.current.save(mockProfile);
    });

    expect(saveResult).toBe(false);
    expect(result.current.saveError).toBe('Invalid data');
  });

  it('should set saving state during save', async () => {
    vi.mocked(getProfile).mockResolvedValue(mockProfile);
    
    let resolvePromise: (value: UserProfile) => void;
    vi.mocked(saveProfile).mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Start save
    let savePromise: Promise<boolean>;
    act(() => {
      savePromise = result.current.save(mockProfile);
    });

    // Check saving state
    expect(result.current.saving).toBe(true);

    // Resolve the save
    await act(async () => {
      resolvePromise!(mockProfile);
      await savePromise;
    });

    expect(result.current.saving).toBe(false);
  });

  it('should refresh profile', async () => {
    vi.mocked(getProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update mock to return different data
    vi.mocked(getProfile).mockResolvedValue({ ...mockProfile, currentWeightKg: 78 });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.profile?.currentWeightKg).toBe(78);
  });
});
