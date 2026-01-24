import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivePlan, createPlan, completePlan, abandonPlan, ApiError } from '../api/client';
import type { NutritionPlan, CreatePlanRequest } from '../api/types';

interface UsePlanReturn {
  plan: NutritionPlan | null;
  loading: boolean;
  creating: boolean;
  error: string | null;
  createError: string | null;
  create: (request: CreatePlanRequest) => Promise<NutritionPlan | null>;
  complete: () => Promise<boolean>;
  abandon: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePlan(): UsePlanReturn {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await getActivePlan(controller.signal);
      if (controller.signal.aborted) return;
      setPlan(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load plan');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [refresh]);

  const create = useCallback(async (request: CreatePlanRequest): Promise<NutritionPlan | null> => {
    setCreating(true);
    setCreateError(null);
    try {
      const newPlan = await createPlan(request);
      setPlan(newPlan);
      return newPlan;
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError('Failed to create plan');
      }
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  const complete = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;
    try {
      await completePlan(plan.id);
      await refresh();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to complete plan');
      }
      return false;
    }
  }, [plan, refresh]);

  const abandon = useCallback(async (): Promise<boolean> => {
    if (!plan) return false;
    try {
      await abandonPlan(plan.id);
      await refresh();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to abandon plan');
      }
      return false;
    }
  }, [plan, refresh]);

  return { plan, loading, creating, error, createError, create, complete, abandon, refresh };
}
