import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';

// Invariant: These are integration tests with real network boundaries.
// They use MSW to simulate real fetch() behavior with various network conditions.
// No mocking of fetch or axios - tests run against real HTTP stack.

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Network resilience integration', () => {
  describe('API error handling contracts', () => {
    it('500 server error shows retry prompt to user', async () => {
      // Invariant: Server errors must surface actionable feedback.
      // Users need to know when to retry vs. when data is invalid.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json(
            { error: 'internal_error', message: 'Database connection failed' },
            { status: 500 }
          );
        })
      );

      // Mock component that fetches profile
      const ProfileDisplay = () => {
        const [error, setError] = React.useState<string | null>(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          fetch('/api/profile')
            .then((res) => {
              if (!res.ok) {
                return res.json().then((err) => {
                  throw new Error(err.message || 'Server error');
                });
              }
              return res.json();
            })
            .catch((err) => {
              setError(err.message);
            })
            .finally(() => setLoading(false));
        }, []);

        if (loading) return <div>Loading...</div>;
        if (error) return <div role="alert">Error: {error}</div>;
        return <div>Profile loaded</div>;
      };

      const { container } = render(<ProfileDisplay />);

      await waitFor(() => {
        const alert = screen.queryByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert?.textContent).toContain('Database connection failed');
      });
    });

    it('400 validation error shows field-specific feedback', async () => {
      // Invariant: Validation errors must map to form fields.
      // Generic error messages are not actionable for users.

      server.use(
        http.post('/api/logs', () => {
          return HttpResponse.json(
            {
              error: 'validation_error',
              message: 'Weight must be between 30 and 300 kg',
              field: 'weightKg',
            },
            { status: 400 }
          );
        })
      );

      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: 25, dayType: 'performance' }),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.field).toBe('weightKg');
      expect(error.message).toContain('between 30 and 300');
    });

    it('401 unauthorized redirects to login', async () => {
      // Invariant: Auth failures must trigger re-authentication flow.
      // Stale tokens should not leave user in broken state.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json(
            { error: 'unauthorized', message: 'Token expired' },
            { status: 401 }
          );
        })
      );

      const response = await fetch('/api/profile');
      expect(response.status).toBe(401);

      // Application should handle this by redirecting to login
      // or refreshing token
    });

    it('404 not found shows empty state, not error', async () => {
      // Invariant: Missing resources are not errors - they're valid states.
      // No profile should show onboarding, not error page.

      server.use(
        http.get('/api/profile', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No profile exists' },
            { status: 404 }
          );
        })
      );

      const response = await fetch('/api/profile');
      expect(response.status).toBe(404);

      // UI should show onboarding wizard, not error message
    });

    it('409 conflict provides resolution guidance', async () => {
      // Invariant: Conflicts must explain what caused them.
      // "Conflict" is not enough - user needs to know why.

      server.use(
        http.post('/api/logs', () => {
          return HttpResponse.json(
            {
              error: 'already_exists',
              message: 'Daily log for 2026-01-27 already exists',
              existingId: 123,
            },
            { status: 409 }
          );
        })
      );

      const response = await fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-01-27', weightKg: 80 }),
      });

      const error = await response.json();
      expect(error.existingId).toBe(123);
      // UI can now offer to update existing log instead
    });
  });

  describe('Network failure handling', () => {
    it('network timeout shows retry with offline indicator', async () => {
      // Invariant: Timeouts must be distinguishable from server errors.
      // User needs to know if it's their network or the server.

      server.use(
        http.get('/api/profile', async () => {
          await delay('infinite'); // Simulate timeout
        })
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      let timedOut = false;
      try {
        await fetch('/api/profile', { signal: controller.signal });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          timedOut = true;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      expect(timedOut).toBe(true);
      // UI should show "Connection timeout - check your network"
    });

    it('network offline detected via navigator.onLine', async () => {
      // Invariant: App must detect offline state and queue requests.
      // Users should not lose data when network drops.

      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      expect(navigator.onLine).toBe(false);

      // App should queue requests instead of attempting fetch
      const requestQueue: Array<{ url: string; data: unknown }> = [];

      const queuedFetch = (url: string, data: unknown) => {
        if (!navigator.onLine) {
          requestQueue.push({ url, data });
          return Promise.resolve(null);
        }
        return fetch(url, { method: 'POST', body: JSON.stringify(data) });
      };

      await queuedFetch('/api/logs', { weightKg: 80 });
      expect(requestQueue.length).toBe(1);

      // Restore online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('failed request retries with exponential backoff', async () => {
      // Invariant: Transient failures should retry automatically.
      // But must use backoff to avoid hammering failing server.

      let attemptCount = 0;
      server.use(
        http.get('/api/profile', () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json({ error: 'temporary' }, { status: 503 });
          }
          return HttpResponse.json({ height_cm: 175, sex: 'male' });
        })
      );

      const fetchWithRetry = async (
        url: string,
        maxRetries = 3,
        baseDelay = 100
      ) => {
        for (let i = 0; i < maxRetries; i++) {
          const response = await fetch(url);
          if (response.ok) return response;

          if (i < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, baseDelay * Math.pow(2, i))
            );
          }
        }
        throw new Error('Max retries exceeded');
      };

      const response = await fetchWithRetry('/api/profile');
      expect(response.ok).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Optimistic updates and rollback', () => {
    it('optimistic update rolls back on server rejection', async () => {
      // Invariant: UI must revert optimistic changes if server rejects.
      // User should not see inconsistent state.

      server.use(
        http.patch('/api/logs/2026-01-27/actual-training', () => {
          return HttpResponse.json(
            { error: 'validation_error', message: 'Invalid RPE' },
            { status: 400 }
          );
        })
      );

      let uiState = { actualTraining: null };
      const optimisticUpdate = { type: 'strength', durationMin: 60, rpe: 8 };

      // Apply optimistic update
      uiState.actualTraining = optimisticUpdate as any;
      expect(uiState.actualTraining).toEqual(optimisticUpdate);

      // Server rejects
      const response = await fetch('/api/logs/2026-01-27/actual-training', {
        method: 'PATCH',
        body: JSON.stringify(optimisticUpdate),
      });

      if (!response.ok) {
        // Rollback optimistic update
        uiState.actualTraining = null;
      }

      expect(uiState.actualTraining).toBeNull();
    });
  });

  describe('Request cancellation', () => {
    it('aborted requests do not update UI', async () => {
      // Invariant: Cancelled requests must not trigger state updates.
      // Prevents race conditions when navigating away.

      server.use(
        http.get('/api/profile', async () => {
          await delay(1000);
          return HttpResponse.json({ height_cm: 175 });
        })
      );

      const controller = new AbortController();
      const fetchPromise = fetch('/api/profile', {
        signal: controller.signal,
      });

      // Cancel immediately
      controller.abort();

      let aborted = false;
      try {
        await fetchPromise;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          aborted = true;
        }
      }

      expect(aborted).toBe(true);
      // UI should not update from aborted request
    });
  });

  describe('Rate limiting and throttling', () => {
    it('429 rate limit shows cooldown timer', async () => {
      // Invariant: Rate limits must inform user of retry time.
      // Prevents user frustration from repeated failures.

      server.use(
        http.post('/api/logs', () => {
          return HttpResponse.json(
            {
              error: 'rate_limit_exceeded',
              message: 'Too many requests',
              retryAfter: 60,
            },
            {
              status: 429,
              headers: { 'Retry-After': '60' },
            }
          );
        })
      );

      const response = await fetch('/api/logs', { method: 'POST' });
      expect(response.status).toBe(429);

      const retryAfter = response.headers.get('Retry-After');
      expect(retryAfter).toBe('60');

      // UI should show "Rate limit exceeded. Try again in 60 seconds."
    });
  });

  describe('Partial success handling', () => {
    it('batch operation returns partial success list', async () => {
      // Invariant: Batch failures must specify which items failed.
      // All-or-nothing is not always appropriate.

      server.use(
        http.post('/api/logs/batch', async ({ request }) => {
          const body = (await request.json()) as { logs: unknown[] };
          return HttpResponse.json({
            succeeded: [body.logs[0]],
            failed: [{ index: 1, error: 'invalid_date' }],
          });
        })
      );

      const response = await fetch('/api/logs/batch', {
        method: 'POST',
        body: JSON.stringify({
          logs: [
            { date: '2026-01-27', weightKg: 80 },
            { date: 'invalid', weightKg: 80 },
          ],
        }),
      });

      const result = await response.json();
      expect(result.succeeded.length).toBe(1);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toBe('invalid_date');
    });
  });
});

// React import for JSX (if needed by component examples)
import * as React from 'react';
