import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  getProfile,
  saveProfile,
  createDailyLog,
  getWeightTrend,
  getTodayLog,
  deleteTodayLog,
} from './client';
import type { UserProfile, CreateDailyLogRequest } from './types';

// Invariant: API client is the single boundary between frontend and backend.
// Error handling and request transformation must be consistent and predictable
// to ensure UI components can reliably interpret responses.

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

describe('ApiError', () => {
  it('should create error with status, code, and message', () => {
    // Invariant: ApiError carries structured information for UI error handling.
    const error = new ApiError(400, 'validation_error', 'Invalid input');

    expect(error.status).toBe(400);
    expect(error.code).toBe('validation_error');
    expect(error.message).toBe('Invalid input');
    expect(error.name).toBe('ApiError');
  });

  it('should use code as message when message is not provided', () => {
    // Invariant: Error code serves as fallback message for display.
    const error = new ApiError(404, 'not_found');

    expect(error.message).toBe('not_found');
  });

  it('should be instanceof Error', () => {
    // Invariant: ApiError must be catchable as standard Error.
    const error = new ApiError(500, 'internal_error');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiError).toBe(true);
  });
});

describe('API client functions', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('response handling', () => {
    it('should parse successful JSON response', async () => {
      // Invariant: 2xx responses must be parsed as JSON and returned.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile),
      } as Response);

      const result = await getProfile();

      expect(result).toEqual(mockProfile);
    });

    it('should throw ApiError for non-2xx response', async () => {
      // Invariant: Non-2xx responses must throw ApiError with parsed error body.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'validation_error', message: 'Invalid data' }),
      } as Response);

      await expect(saveProfile(mockProfile)).rejects.toThrow(ApiError);

      try {
        await saveProfile(mockProfile);
      } catch (e) {
        const error = e as ApiError;
        expect(error.status).toBe(400);
        expect(error.code).toBe('validation_error');
        expect(error.message).toBe('Invalid data');
      }
    });

    it('should return null for 404 on getProfile', async () => {
      // Invariant: 404 on profile means "no profile exists" - return null, not error.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'not_found' }),
      } as Response);

      const result = await getProfile();

      expect(result).toBe(null);
    });

    it('should return null for 404 on getTodayLog', async () => {
      // Invariant: 404 on today's log means "no log today" - return null, not error.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'not_found' }),
      } as Response);

      const result = await getTodayLog();

      expect(result).toBe(null);
    });
  });

  describe('request sanitization', () => {
    it('should remove _id fields from planned sessions', async () => {
      // Invariant: Frontend adds _id for React keys; backend rejects unknown fields.
      // sanitizePlannedSessions strips _id before sending to API.
      const requestWithIds: CreateDailyLogRequest = {
        date: '2026-01-27',
        weightKg: 80,
        dayType: 'performance',
        sleepQuality: 75,
        plannedTrainingSessions: [
          { _id: 'temp-123', type: 'strength', durationMin: 60 } as any,
          { _id: 'temp-456', type: 'run', durationMin: 30 } as any,
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ ...requestWithIds, id: 1 }),
      } as Response);

      await createDailyLog(requestWithIds);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(options?.body as string);

      // Verify _id was stripped from sessions
      expect(body.plannedTrainingSessions[0]._id).toBeUndefined();
      expect(body.plannedTrainingSessions[1]._id).toBeUndefined();
      expect(body.plannedTrainingSessions[0].type).toBe('strength');
      expect(body.plannedTrainingSessions[1].type).toBe('run');
    });

    it('should preserve all other session fields', async () => {
      // Invariant: Only _id should be stripped; all other fields preserved.
      const request: CreateDailyLogRequest = {
        date: '2026-01-27',
        weightKg: 80,
        dayType: 'performance',
        sleepQuality: 75,
        plannedTrainingSessions: [
          { type: 'strength', durationMin: 60 },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ ...request, id: 1 }),
      } as Response);

      await createDailyLog(request);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(options?.body as string);

      expect(body.plannedTrainingSessions[0].type).toBe('strength');
      expect(body.plannedTrainingSessions[0].durationMin).toBe(60);
    });
  });

  describe('query parameter encoding', () => {
    it('should encode range parameter for weight trend', async () => {
      // Invariant: Query parameters must be properly encoded.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ points: [], trend: null, range: '30d' }),
      } as Response);

      await getWeightTrend('30d');

      const [url] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('range=30d');
    });
  });

  describe('empty response handling', () => {
    it('should handle empty response on delete', async () => {
      // Invariant: DELETE operations may return no body - should not throw.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      await expect(deleteTodayLog()).resolves.toBeUndefined();
    });

    it('should throw ApiError for failed delete', async () => {
      // Invariant: Failed delete must throw with parsed error.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'not_found', message: 'Log not found' }),
      } as Response);

      await expect(deleteTodayLog()).rejects.toThrow(ApiError);
    });

    it('should handle delete with unparseable error body', async () => {
      // Invariant: If error body cannot be parsed, use status-based fallback.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      try {
        await deleteTodayLog();
        expect.fail('Should have thrown');
      } catch (e) {
        const error = e as ApiError;
        expect(error.code).toBe('request_failed');
      }
    });
  });

  describe('abort signal handling', () => {
    it('should pass abort signal to fetch', async () => {
      // Invariant: AbortSignal enables request cancellation on unmount/refresh.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile),
      } as Response);

      const controller = new AbortController();
      await getProfile(controller.signal);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(options?.signal).toBe(controller.signal);
    });
  });

  describe('request headers', () => {
    it('should set Content-Type for JSON requests', async () => {
      // Invariant: POST/PUT/PATCH with body must have Content-Type header.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile),
      } as Response);

      await saveProfile(mockProfile);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should stringify body as JSON', async () => {
      // Invariant: Request body must be JSON stringified.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile),
      } as Response);

      await saveProfile(mockProfile);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(options?.body as string);
      expect(body.height_cm).toBe(175);
      expect(body.sex).toBe('male');
    });
  });

  describe('URL construction', () => {
    it('should use correct API base path', async () => {
      // Invariant: All requests go to /api/* endpoints.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile),
      } as Response);

      await getProfile();

      const [url] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe('/api/profile');
    });

    it('should use PUT method for saveProfile', async () => {
      // Invariant: Profile upsert uses PUT method.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile),
      } as Response);

      await saveProfile(mockProfile);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(options?.method).toBe('PUT');
    });

    it('should use POST method for createDailyLog', async () => {
      // Invariant: Log creation uses POST method.
      const request: CreateDailyLogRequest = {
        date: '2026-01-27',
        weightKg: 80,
        dayType: 'performance',
        sleepQuality: 75,
        plannedTrainingSessions: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ ...request, id: 1 }),
      } as Response);

      await createDailyLog(request);

      const [, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(options?.method).toBe('POST');
    });

    it('should use DELETE method for deleteTodayLog', async () => {
      // Invariant: Log deletion uses DELETE method.
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      await deleteTodayLog();

      const [url, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe('/api/logs/today');
      expect(options?.method).toBe('DELETE');
    });
  });
});
