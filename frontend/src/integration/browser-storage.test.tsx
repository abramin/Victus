import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createElement, type ReactNode } from 'react';

import { PlanProvider, usePlanContext } from '../contexts/PlanContext';

// Invariant: These are integration tests exercising PlanContext against the real HTTP boundary.
// MSW intercepts fetch at the network layer — no application code is mocked.
// Each test verifies what the context exposes to consumers under various API conditions.

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(PlanProvider, null, children);

describe('PlanContext API boundary integration', () => {
  describe('Initial load contracts', () => {
    it('exposes active plan when API returns one', async () => {
      // Invariant: Context must expose the active plan once the API responds.
      // If this breaks, plan-dependent UI renders in a broken loading state.

      server.use(
        http.get('/api/plans/active', () => {
          return HttpResponse.json({
            id: 42,
            startWeightKg: 80,
            goalWeightKg: 75,
            durationWeeks: 8,
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2026-02-26',
            requiredWeeklyChangeKg: -0.625,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          });
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.plan?.id).toBe(42);
        expect(result.current.plan?.status).toBe('active');
      });
    });

    it('resolves to null plan without error when none exists', async () => {
      // Invariant: No active plan is a valid state (user hasn't started one), not an error.
      // The UI should show "create a plan" prompt, not an error banner.

      server.use(
        http.get('/api/plans/active', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No active plan' },
            { status: 404 }
          );
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.plan).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    it('surfaces server error via context error state', async () => {
      // Invariant: API failures must be surfaced so the UI can show a recoverable error state.
      // Silently swallowing a 500 leaves the user on an indefinite loading screen.

      server.use(
        http.get('/api/plans/active', () => {
          return HttpResponse.json(
            { error: 'internal_error', message: 'Plan service unavailable' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Plan service unavailable');
        expect(result.current.plan).toBeNull();
      });
    });
  });

  describe('Create plan contracts', () => {
    it('exposes newly created plan after successful creation', async () => {
      // Invariant: After create succeeds, context must reflect the new plan immediately.
      // The UI relies on context state to switch from "empty" to "plan active" view.

      server.use(
        http.get('/api/plans/active', () => {
          return HttpResponse.json(
            { error: 'not_found', message: 'No active plan' },
            { status: 404 }
          );
        }),
        http.post('/api/plans', () => {
          return HttpResponse.json({
            id: 99,
            startWeightKg: 85,
            goalWeightKg: 78,
            durationWeeks: 10,
            status: 'active',
            startDate: '2026-01-28',
            endDate: '2026-04-08',
            requiredWeeklyChangeKg: -0.7,
            createdAt: '2026-01-28T00:00:00Z',
            updatedAt: '2026-01-28T00:00:00Z',
          });
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      // Wait for initial load (no active plan)
      await waitFor(() => {
        expect(result.current.plan).toBeNull();
      });

      // Create a plan
      let newPlan: any;
      await act(async () => {
        newPlan = await result.current.create({
          startWeightKg: 85,
          goalWeightKg: 78,
          durationWeeks: 10,
        });
      });

      expect(newPlan?.id).toBe(99);
      expect(result.current.plan?.id).toBe(99);
    });

    it('sets createError on conflict without clearing existing plan', async () => {
      // Invariant: Failed creation must not destroy an existing plan state.
      // The error message must explain the conflict so the UI can guide the user.

      server.use(
        http.get('/api/plans/active', () => {
          return HttpResponse.json({
            id: 10,
            startWeightKg: 80,
            goalWeightKg: 75,
            durationWeeks: 8,
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2026-02-26',
            requiredWeeklyChangeKg: -0.625,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          });
        }),
        http.post('/api/plans', () => {
          return HttpResponse.json(
            { error: 'active_plan_exists', message: 'Complete or abandon the current plan first' },
            { status: 409 }
          );
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan?.id).toBe(10);
      });

      let created: any;
      await act(async () => {
        created = await result.current.create({
          startWeightKg: 90,
          goalWeightKg: 85,
          durationWeeks: 6,
        });
      });

      expect(created).toBeNull();
      expect(result.current.createError).toContain('Complete or abandon');
      // Existing plan still present
      expect(result.current.plan?.id).toBe(10);
    });
  });

  describe('Lifecycle action contracts', () => {
    it('complete action refreshes context and clears plan', async () => {
      // Invariant: After completing a plan, context must reflect the new state (no active plan).
      // The UI relies on this to transition back to the "create plan" view.

      let completeCalled = false;
      server.use(
        http.get('/api/plans/active', () => {
          if (completeCalled) {
            return HttpResponse.json(
              { error: 'not_found', message: 'No active plan' },
              { status: 404 }
            );
          }
          return HttpResponse.json({
            id: 5,
            startWeightKg: 80,
            goalWeightKg: 75,
            durationWeeks: 8,
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2026-02-26',
            requiredWeeklyChangeKg: -0.625,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          });
        }),
        http.post('/api/plans/:id/complete', () => {
          completeCalled = true;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan?.id).toBe(5);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.complete();
      });

      expect(success!).toBe(true);
      await waitFor(() => {
        expect(result.current.plan).toBeNull();
      });
    });

    it('abandon action failure surfaces error without clearing plan', async () => {
      // Invariant: Failed lifecycle transitions must not corrupt context state.
      // The user should see the error and still have their plan data available.

      server.use(
        http.get('/api/plans/active', () => {
          return HttpResponse.json({
            id: 7,
            startWeightKg: 80,
            goalWeightKg: 75,
            durationWeeks: 8,
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2026-02-26',
            requiredWeeklyChangeKg: -0.625,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          });
        }),
        http.post('/api/plans/:id/abandon', () => {
          return HttpResponse.json(
            { error: 'internal_error', message: 'Abandon failed' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => usePlanContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.plan?.id).toBe(7);
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.abandon();
      });

      expect(success!).toBe(false);
      expect(result.current.error).toBe('Abandon failed');
      // Plan still present
      expect(result.current.plan?.id).toBe(7);
    });
  });
});
