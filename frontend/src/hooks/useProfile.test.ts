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
    // Invariant: UI must show loading indicator during initial fetch to prevent
    // user interaction with incomplete data.
    vi.mocked(getProfile).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should load profile successfully', async () => {
    // Invariant: Profile data must be available for all downstream calculations
    // (targets, meal points, water). Missing profile breaks the entire app flow.
    vi.mocked(getProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBe(null);
  });

  it('should handle null profile (no profile exists)', async () => {
    // Invariant: Hook must distinguish "profile doesn't exist" (null profile, no error)
    // from "API failed" (error state). UI routing depends on this: null → onboarding,
    // error → retry prompt.
    vi.mocked(getProfile).mockResolvedValue(null);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle API error', async () => {
    // Invariant: API errors must surface to UI for user feedback. Swallowing errors
    // would leave users stuck without actionable information.
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
    // Invariant: Network failures and unexpected errors must not crash the app.
    // Generic error message provides graceful degradation.
    vi.mocked(getProfile).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load profile');
  });

  it('should save profile successfully', async () => {
    // Invariant: Save operation must return success status and update local state.
    // UI depends on return value for success feedback and state on profile for display.
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
    // Invariant: Save errors must be captured in saveError (not error) to distinguish
    // from load errors. UI shows different feedback for save vs load failures.
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
    // Invariant: saving flag must be true during async operation to prevent
    // double-submission and enable loading UI on save button.
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
    // Invariant: refresh() must fetch fresh data from server. Used after external
    // changes (e.g., onboarding completion) to sync UI with backend state.
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
