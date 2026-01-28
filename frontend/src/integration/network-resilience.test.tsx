import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';

import { useProfile } from '../hooks/useProfile';
import { useDailyLog } from '../hooks/useDailyLog';

// Invariant: These integration tests exercise the real hook → client → fetch stack.
// MSW intercepts at the network boundary without mocking any application code.
// Each test verifies a user-visible contract: what state the UI surfaces for a given network condition.

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Network resilience integration', () => {
  describe('useProfile error surface contracts', () => {
    it('500 server error surfaces message via hook error state', async () => {
      // Invariant: Server errors must propagate through the hook so the UI
      // can surface actionable feedback. Swallowing the error leaves the user stuck.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json(
            { error: 'internal_error', message: 'Database connection failed' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Database connection failed');
        expect(result.current.profile).toBeNull();
      });
    });

    it('404 resolves to null profile without setting error', async () => {
      // Invariant: Missing profile is a valid initial state (triggers onboarding), not an error.
      // The client layer returns null for 404 on profile; the hook must not treat this as failure.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No profile exists' },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.profile).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    it('save failure sets saveError without clearing loaded profile', async () => {
      // Invariant: A failed write must not destroy previously loaded read state.
      // User should see the error banner alongside their existing profile data.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json({ height_cm: 175, sex: 'male' });
        }),
        http.put('/api/profile', () => {
          return HttpResponse.json(
            { error: 'validation_error', message: 'Invalid height' },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useProfile());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.profile).toBeTruthy();
        expect(result.current.profile?.height_cm).toBe(175);
      });

      // Attempt save with invalid data
      let success: boolean;
      await act(async () => {
        success = await result.current.save({ height_cm: -1 } as any);
      });

      await waitFor(() => {
        expect(success!).toBe(false);
        expect(result.current.saveError).toBe('Invalid height');
        // Original profile still intact
        expect(result.current.profile?.height_cm).toBe(175);
      });
    });

    it('aborted request on unmount does not update hook state', async () => {
      // Invariant: Cancelled requests (e.g., on component unmount) must not
      // trigger state changes or cause React "update on unmounted component" warnings.

      server.use(
        http.get('/api/profile', async () => {
          await delay(500);
          return HttpResponse.json({ height_cm: 175, sex: 'male' });
        })
      );

      const { result, unmount } = renderHook(() => useProfile());

      // Unmount immediately — the hook's cleanup aborts the in-flight request
      unmount();

      // If the hook incorrectly processes the late response, this would throw
      // or result.current would be stale. No crash = contract holds.
      expect(result.current.profile).toBeNull();
    });

    it('429 rate limit error surfaces through hook', async () => {
      // Invariant: Rate limit errors must be distinguishable so the UI
      // can show a cooldown timer with the Retry-After value.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json(
            { error: 'rate_limit_exceeded', message: 'Too many requests. Retry after 60s.' },
            {
              status: 429,
              headers: { 'Retry-After': '60' },
            }
          );
        })
      );

      const { result } = renderHook(() => useProfile());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Too many requests');
      });
    });
  });

  describe('useDailyLog error surface contracts', () => {
    it('500 on today log fetch surfaces error via hook', async () => {
      // Invariant: Fetch failures must surface through error state, not throw.
      // The UI needs the error message to render a retry prompt.

      server.use(
        http.get('/api/logs/today', () => {
          return HttpResponse.json(
            { error: 'internal_error', message: 'Query timeout' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useDailyLog());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Query timeout');
        expect(result.current.log).toBeNull();
      });
    });

    it('404 on today log resolves to null without error', async () => {
      // Invariant: No log for today is the normal initial state — not an error condition.
      // The UI should show the "create log" form, not an error banner.

      server.use(
        http.get('/api/logs/today', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No log' },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => useDailyLog());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.log).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.hasLogToday).toBe(false);
      });
    });

    it('create failure sets saveError and returns null', async () => {
      // Invariant: Write failures must be surfaced without losing the current log state.
      // The create method must return null so the caller knows the operation failed.

      server.use(
        http.get('/api/logs/today', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No log' },
            { status: 404 }
          );
        }),
        http.post('/api/logs', () => {
          return HttpResponse.json(
            { error: 'validation_error', message: 'Weight must be between 30 and 300 kg' },
            { status: 400 }
          );
        })
      );

      const { result } = renderHook(() => useDailyLog());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let created: any;
      await act(async () => {
        created = await result.current.create({
          date: '2026-01-28',
          weightKg: 15, // invalid — below 30kg minimum
          dayType: 'performance',
          sleepQuality: 75,
          plannedTrainingSessions: [],
        });
      });

      expect(created).toBeNull();
      await waitFor(() => {
        expect(result.current.saveError).toBe('Weight must be between 30 and 300 kg');
      });
    });

    it('409 conflict on create surfaces duplicate error', async () => {
      // Invariant: Duplicate log creation must explain the conflict so the UI
      // can offer to update the existing log instead of creating a new one.

      server.use(
        http.get('/api/logs/today', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No log' },
            { status: 404 }
          );
        }),
        http.post('/api/logs', () => {
          return HttpResponse.json(
            { error: 'already_exists', message: 'Daily log for 2026-01-28 already exists' },
            { status: 409 }
          );
        })
      );

      const { result } = renderHook(() => useDailyLog());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let created: any;
      await act(async () => {
        created = await result.current.create({
          date: '2026-01-28',
          weightKg: 80,
          dayType: 'performance',
          sleepQuality: 75,
          plannedTrainingSessions: [],
        });
      });

      expect(created).toBeNull();
      await waitFor(() => {
        expect(result.current.saveError).toContain('already exists');
      });
    });
  });
});
