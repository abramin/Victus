import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWeightTrend } from './useWeightTrend'
import type { WeightTrendRange } from '../api/types'

// Mock the API client module
vi.mock('../api/client', () => ({
  getWeightTrend: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message?: string) {
      super(message || code)
      this.name = 'ApiError'
    }
  },
}))

import { getWeightTrend, ApiError } from '../api/client'
import type { WeightTrendResponse } from '../api/types'

const mockTrendData: WeightTrendResponse = {
  points: [
    { date: '2026-01-21', weightKg: 83.0 },
    { date: '2026-01-22', weightKg: 82.7 },
    { date: '2026-01-23', weightKg: 82.5 },
  ],
  trend: {
    weeklyChangeKg: -0.35,
    rSquared: 0.95,
    startWeightKg: 83.0,
    endWeightKg: 82.5,
  },
}

describe('useWeightTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial loading state', () => {
    it('starts in loading state', () => {
      vi.mocked(getWeightTrend).mockImplementation(() => new Promise(() => {}))

      const { result } = renderHook(() => useWeightTrend('7d'))

      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBeNull()
    })

    it('sets data when fetch succeeds', async () => {
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData)

      const { result } = renderHook(() => useWeightTrend('7d'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(mockTrendData)
      expect(result.current.error).toBeNull()
    })
  })

  describe('range parameter', () => {
    it('fetches with correct range', async () => {
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData)

      renderHook(() => useWeightTrend('30d'))

      await waitFor(() => {
        expect(getWeightTrend).toHaveBeenCalledWith('30d')
      })
    })

    it('refetches when range changes', async () => {
      vi.mocked(getWeightTrend).mockResolvedValue(mockTrendData)

      const { rerender } = renderHook(
        ({ range }: { range: WeightTrendRange }) => useWeightTrend(range),
        { initialProps: { range: '7d' as WeightTrendRange } }
      )

      await waitFor(() => {
        expect(getWeightTrend).toHaveBeenCalledWith('7d')
      })

      rerender({ range: '30d' as WeightTrendRange })

      await waitFor(() => {
        expect(getWeightTrend).toHaveBeenCalledWith('30d')
      })

      expect(getWeightTrend).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('maps ApiError message to error state', async () => {
      const apiError = new ApiError(400, 'invalid_range', 'Invalid range parameter')
      vi.mocked(getWeightTrend).mockRejectedValue(apiError)

      const { result } = renderHook(() => useWeightTrend('7d'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Invalid range parameter')
      expect(result.current.data).toBeNull()
    })

    it('uses fallback message for unknown errors', async () => {
      vi.mocked(getWeightTrend).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useWeightTrend('7d'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load weight trend')
    })
  })

  describe('refresh functionality', () => {
    it('can manually refresh data', async () => {
      const updatedData: WeightTrendResponse = {
        ...mockTrendData,
        points: [...mockTrendData.points, { date: '2026-01-24', weightKg: 82.3 }],
      }

      vi.mocked(getWeightTrend)
        .mockResolvedValueOnce(mockTrendData)
        .mockResolvedValueOnce(updatedData)

      const { result } = renderHook(() => useWeightTrend('7d'))

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTrendData)
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.data).toEqual(updatedData)
      expect(getWeightTrend).toHaveBeenCalledTimes(2)
    })

    it('clears error on successful refresh', async () => {
      vi.mocked(getWeightTrend)
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(mockTrendData)

      const { result } = renderHook(() => useWeightTrend('7d'))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load weight trend')
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.data).toEqual(mockTrendData)
    })
  })

  describe('empty data handling', () => {
    it('handles empty points array', async () => {
      const emptyData: WeightTrendResponse = { points: [] }
      vi.mocked(getWeightTrend).mockResolvedValue(emptyData)

      const { result } = renderHook(() => useWeightTrend('7d'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(emptyData)
      expect(result.current.data?.trend).toBeUndefined()
    })
  })
})
