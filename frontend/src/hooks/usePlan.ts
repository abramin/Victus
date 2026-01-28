import { usePlanContext } from '../contexts/PlanContext';
import type { NutritionPlan, CreatePlanRequest, RecalibrationOptionType } from '../api/types';

interface UsePlanReturn {
  plan: NutritionPlan | null;
  loading: boolean;
  creating: boolean;
  error: string | null;
  createError: string | null;
  create: (request: CreatePlanRequest) => Promise<NutritionPlan | null>;
  complete: () => Promise<boolean>;
  abandon: () => Promise<boolean>;
  pause: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  recalibrate: (optionType: RecalibrationOptionType) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePlan(): UsePlanReturn {
  return usePlanContext();
}
