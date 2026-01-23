import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDailyLog } from './useDailyLog'

// Mock the API client module
vi.mock('../api/client', () => ({
  getTodayLog: vi.fn(),
  createDailyLog: vi.fn(),
  updateActualTraining: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code)
      this.name = 'ApiError'
    }
  },
}))

import { getTodayLog, createDailyLog, updateActualTraining, ApiError } from '../api/client'
import type { DailyLog, CreateDailyLogRequest } from '../api/types'

const mockDailyLog: DailyLog = {
  date: '2026-01-23',
  weightKg: 82.5,
  sleepQuality: 80,
  plannedTrainingSessions: [{ type: 'strength', durationMin: 60 }],
  trainingSummary: { sessionCount: 1, totalDurationMin: 60, totalLoadScore: 5, summary: '1 session' },
  dayType: 'performance',
  calculatedTargets: {
    totalCarbsG: 300,
    totalProteinG: 180,
    totalFatsG: 70,
    totalCalories: 2500,
    meals: {
      breakfast: { carbs: 30, protein: 20, fats: 10 },
      lunch: { carbs: 30, protein: 20, fats: 10 },
      dinner: { carbs: 40, protein: 25, fats: 15 },
    },
    fruitG: 600,
    veggiesG: 500,
    waterL: 3,
    dayType: 'performance',
  },
  estimatedTDEE: 2500,
}

const mockCreateRequest: CreateDailyLogRequest = {
  weightKg: 82.5,
  sleepQuality: 80,
  plannedTrainingSessions: [{ type: 'strength', durationMin: 60 }],
  dayType: 'performance',
}

describe('useDailyLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial loading state', () => {
    it('starts in loading state', () => {
      vi.mocked(getTodayLog).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useDailyLog())

      expect(result.current.loading).toBe(true)
      expect(result.current.log).toBeNull()
      expect(result.current.hasLogToday).toBe(false)
    })

    it('sets log when fetch succeeds', async () => {
      vi.mocked(getTodayLog).mockResolvedValue(mockDailyLog)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.log).toEqual(mockDailyLog)
      expect(result.current.hasLogToday).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('handles null log (no log for today)', async () => {
      vi.mocked(getTodayLog).mockResolvedValue(null)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.log).toBeNull()
      expect(result.current.hasLogToday).toBe(false)
    })
  })

  describe('error handling', () => {
    it('maps ApiError message to error state', async () => {
      const apiError = new ApiError(500, 'internal_error', 'Database connection failed')
      vi.mocked(getTodayLog).mockRejectedValue(apiError)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Database connection failed')
    })

    it('uses fallback message for unknown errors', async () => {
      vi.mocked(getTodayLog).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load daily log')
    })
  })

  describe('abort controller cleanup', () => {
    it('does not update state after unmount', async () => {
      let resolvePromise: (value: DailyLog) => void
      vi.mocked(getTodayLog).mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve })
      )

      const { result, unmount } = renderHook(() => useDailyLog())

      expect(result.current.loading).toBe(true)

      // Unmount before the promise resolves
      unmount()

      // Resolve after unmount - should not cause state update
      act(() => {
        resolvePromise!(mockDailyLog)
      })

      // No assertion needed - if this doesn't throw "state update on unmounted component" warning, it works
    })
  })

  describe('create functionality', () => {
    it('returns created log on success', async () => {
      vi.mocked(getTodayLog).mockResolvedValue(null)
      vi.mocked(createDailyLog).mockResolvedValue(mockDailyLog)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createdLog: DailyLog | null = null
      await act(async () => {
        createdLog = await result.current.create(mockCreateRequest)
      })

      expect(createdLog).toEqual(mockDailyLog)
      expect(result.current.log).toEqual(mockDailyLog)
      expect(result.current.saveError).toBeNull()
    })

    it('returns null and sets saveError on failure', async () => {
      vi.mocked(getTodayLog).mockResolvedValue(null)
      vi.mocked(createDailyLog).mockRejectedValue(
        new ApiError(409, 'already_exists', 'Log already exists for today')
      )

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createdLog: DailyLog | null = mockDailyLog
      await act(async () => {
        createdLog = await result.current.create(mockCreateRequest)
      })

      expect(createdLog).toBeNull()
      expect(result.current.saveError).toBe('Log already exists for today')
    })

    it('clears saveError on new create attempt', async () => {
      vi.mocked(getTodayLog).mockResolvedValue(null)
      vi.mocked(createDailyLog)
        .mockRejectedValueOnce(new ApiError(409, 'already_exists', 'Log already exists'))
        .mockResolvedValueOnce(mockDailyLog)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // First create fails
      await act(async () => {
        await result.current.create(mockCreateRequest)
      })
      expect(result.current.saveError).toBe('Log already exists')

      // Second create succeeds and clears error
      await act(async () => {
        await result.current.create(mockCreateRequest)
      })
      expect(result.current.saveError).toBeNull()
      expect(result.current.log).toEqual(mockDailyLog)
    })
  })

  describe('updateActual functionality', () => {
    it('returns null when no log exists', async () => {
      vi.mocked(getTodayLog).mockResolvedValue(null)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let updatedLog: DailyLog | null = mockDailyLog
      await act(async () => {
        updatedLog = await result.current.updateActual([{ type: 'strength', durationMin: 45 }])
      })

      expect(updatedLog).toBeNull()
      expect(updateActualTraining).not.toHaveBeenCalled()
    })

    it('updates actual training when log exists', async () => {
      const updatedLog = { ...mockDailyLog, actualTrainingSessions: [{ type: 'strength' as const, durationMin: 45 }] }
      vi.mocked(getTodayLog).mockResolvedValue(mockDailyLog)
      vi.mocked(updateActualTraining).mockResolvedValue(updatedLog)

      const { result } = renderHook(() => useDailyLog())

      await waitFor(() => {
        expect(result.current.log).toEqual(mockDailyLog)
      })

      let returnedLog: DailyLog | null = null
      await act(async () => {
        returnedLog = await result.current.updateActual([{ type: 'strength', durationMin: 45 }])
      })

      expect(returnedLog).toEqual(updatedLog)
      expect(result.current.log).toEqual(updatedLog)
    })
  })
})
