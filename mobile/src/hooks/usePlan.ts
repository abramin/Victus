import { useState, useEffect, useCallback } from 'react';
import {
  getActivePlan,
  listPlans,
  createPlan,
  completePlan,
  abandonPlan,
  pausePlan,
  resumePlan,
  deletePlan,
  ApiError,
} from '../api/client';
import type {
  NutritionPlan,
  NutritionPlanSummary,
  CreatePlanRequest,
} from '../api/types';

interface UsePlanReturn {
  activePlan: NutritionPlan | null;
  allPlans: NutritionPlanSummary[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  createError: string | null;
  refresh: () => Promise<void>;
  create: (request: CreatePlanRequest) => Promise<NutritionPlan | null>;
  complete: (id: number) => Promise<boolean>;
  abandon: (id: number) => Promise<boolean>;
  pause: (id: number) => Promise<boolean>;
  resume: (id: number) => Promise<boolean>;
  remove: (id: number) => Promise<boolean>;
}

export function usePlan(): UsePlanReturn {
  const [activePlan, setActivePlan] = useState<NutritionPlan | null>(null);
  const [allPlans, setAllPlans] = useState<NutritionPlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, plans] = await Promise.all([getActivePlan(), listPlans()]);
      setActivePlan(active);
      setAllPlans(plans);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load plans';
      setError(message);
      console.error('usePlan refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (request: CreatePlanRequest): Promise<NutritionPlan | null> => {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createPlan(request);
      setActivePlan(created);
      await refresh(); // Refresh to update all plans list
      return created;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create plan';
      setCreateError(message);
      console.error('usePlan create error:', err);
      return null;
    } finally {
      setCreating(false);
    }
  }, [refresh]);

  const complete = useCallback(async (id: number): Promise<boolean> => {
    try {
      await completePlan(id);
      await refresh();
      return true;
    } catch (err) {
      console.error('usePlan complete error:', err);
      return false;
    }
  }, [refresh]);

  const abandon = useCallback(async (id: number): Promise<boolean> => {
    try {
      await abandonPlan(id);
      await refresh();
      return true;
    } catch (err) {
      console.error('usePlan abandon error:', err);
      return false;
    }
  }, [refresh]);

  const pause = useCallback(async (id: number): Promise<boolean> => {
    try {
      await pausePlan(id);
      await refresh();
      return true;
    } catch (err) {
      console.error('usePlan pause error:', err);
      return false;
    }
  }, [refresh]);

  const resume = useCallback(async (id: number): Promise<boolean> => {
    try {
      await resumePlan(id);
      await refresh();
      return true;
    } catch (err) {
      console.error('usePlan resume error:', err);
      return false;
    }
  }, [refresh]);

  const remove = useCallback(async (id: number): Promise<boolean> => {
    try {
      await deletePlan(id);
      await refresh();
      return true;
    } catch (err) {
      console.error('usePlan remove error:', err);
      return false;
    }
  }, [refresh]);

  return {
    activePlan,
    allPlans,
    loading,
    creating,
    error,
    createError,
    refresh,
    create,
    complete,
    abandon,
    pause,
    resume,
    remove,
  };
}
