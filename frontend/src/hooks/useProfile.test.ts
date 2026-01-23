import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useProfile } from './useProfile'

// Mock the API client module
vi.mock('../api/client', () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code)
      this.name = 'ApiError'
    }
  },
}))

import { getProfile, saveProfile, ApiError } from '../api/client'

const mockProfile = {
  height_cm: 180,
  birthDate: '1990-01-01',
  sex: 'male' as const,
  goal: 'maintain' as const,
  targetWeightKg: 82,
  targetWeeklyChangeKg: 0,
  carbRatio: 0.45,
  proteinRatio: 0.3,
  fatRatio: 0.25,
  mealRatios: { breakfast: 0.3, lunch: 0.3, dinner: 0.4 },
  pointsConfig: { carbMultiplier: 1.15, proteinMultiplier: 4.35, fatMultiplier: 3.5 },
  supplementConfig: { maltodextrinG: 0, wheyG: 0, collagenG: 0 },
  fruitTargetG: 600,
  veggieTargetG: 500,
}

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial loading state', () => {
    it('starts in loading state', () => {
      vi.mocked(getProfile).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useProfile())

      expect(result.current.loading).toBe(true)
      expect(result.current.profile).toBeNull()
    })

    it('sets profile when fetch succeeds', async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.error).toBeNull()
    })

    it('handles null profile (404)', async () => {
      vi.mocked(getProfile).mockResolvedValue(null)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.profile).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('error handling', () => {
    it('maps ApiError message to error state', async () => {
      const apiError = new ApiError(400, 'validation_error', 'Invalid profile data')
      vi.mocked(getProfile).mockRejectedValue(apiError)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Invalid profile data')
    })

    it('uses fallback message for unknown errors', async () => {
      vi.mocked(getProfile).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load profile')
    })
  })

  describe('save functionality', () => {
    it('returns true on successful save', async () => {
      vi.mocked(getProfile).mockResolvedValue(null)
      vi.mocked(saveProfile).mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let saveResult: boolean = false
      await act(async () => {
        saveResult = await result.current.save(mockProfile)
      })

      expect(saveResult).toBe(true)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.saveError).toBeNull()
    })

    it('returns false on save failure', async () => {
      vi.mocked(getProfile).mockResolvedValue(null)
      vi.mocked(saveProfile).mockRejectedValue(new ApiError(400, 'validation_error', 'Invalid data'))

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let saveResult: boolean = true
      await act(async () => {
        saveResult = await result.current.save(mockProfile)
      })

      expect(saveResult).toBe(false)
      expect(result.current.saveError).toBe('Invalid data')
    })

    it('clears saveError on successful subsequent save', async () => {
      vi.mocked(getProfile).mockResolvedValue(null)
      vi.mocked(saveProfile)
        .mockRejectedValueOnce(new ApiError(400, 'validation_error', 'First failure'))
        .mockResolvedValueOnce(mockProfile)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // First save fails
      await act(async () => {
        await result.current.save(mockProfile)
      })
      expect(result.current.saveError).toBe('First failure')

      // Second save succeeds and clears error
      await act(async () => {
        await result.current.save(mockProfile)
      })
      expect(result.current.saveError).toBeNull()
      expect(result.current.profile).toEqual(mockProfile)
    })
  })

  describe('refresh functionality', () => {
    it('can manually refresh profile data', async () => {
      const updatedProfile = { ...mockProfile, targetWeightKg: 80 }
      vi.mocked(getProfile)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(updatedProfile)

      const { result } = renderHook(() => useProfile())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.profile).toEqual(mockProfile)

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.profile).toEqual(updatedProfile)
    })
  })
})
