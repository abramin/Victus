import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from './config';
import type {
  UserProfile,
  APIError,
  DailyLog,
  CreateDailyLogRequest,
  UpdateActualTrainingRequest,
  UpdateActiveCaloriesRequest,
  TrainingConfig,
  WeightTrendRange,
  WeightTrendResponse,
  HistoryResponse,
  PlannedDaysResponse,
  PlannedDay,
  DayType,
  FoodReferenceResponse,
  NutritionPlan,
  NutritionPlanSummary,
  CreatePlanRequest,
  WeeklyTarget,
  DualTrackAnalysis,
  RecalibrationOptionType,
} from './types';

// Custom error class matching web client
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string
  ) {
    super(message || code);
    this.name = 'ApiError';
  }
}

// Create Axios instance
const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<APIError>) => {
    if (error.response) {
      const data = error.response.data;
      throw new ApiError(
        error.response.status,
        data?.error ?? 'request_failed',
        data?.message
      );
    }
    if (error.code === 'ECONNABORTED') {
      throw new ApiError(0, 'timeout', 'Request timed out');
    }
    throw new ApiError(0, 'network_error', 'Network request failed');
  }
);

// Helper to strip internal _id from sessions
type PlannedSessionWithId = CreateDailyLogRequest['plannedTrainingSessions'][number] & { _id?: string };

function sanitizePlannedSessions(
  sessions: CreateDailyLogRequest['plannedTrainingSessions']
): CreateDailyLogRequest['plannedTrainingSessions'] {
  return sessions.map((session) => {
    const { _id, ...rest } = session as PlannedSessionWithId;
    return rest;
  });
}

// ============================================
// Profile API
// ============================================

export async function getProfile(): Promise<UserProfile | null> {
  try {
    const { data } = await client.get<UserProfile>('/profile');
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const { data } = await client.put<UserProfile>('/profile', profile);
  return data;
}

// ============================================
// Daily Log API
// ============================================

export async function getTodayLog(): Promise<DailyLog | null> {
  try {
    const { data } = await client.get<DailyLog>('/logs/today');
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getLogByDate(date: string): Promise<DailyLog | null> {
  try {
    const { data } = await client.get<DailyLog>(`/logs/${encodeURIComponent(date)}`);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createDailyLog(log: CreateDailyLogRequest): Promise<DailyLog> {
  const payload: CreateDailyLogRequest = {
    ...log,
    plannedTrainingSessions: sanitizePlannedSessions(log.plannedTrainingSessions),
  };
  const { data } = await client.post<DailyLog>('/logs', payload);
  return data;
}

export async function deleteTodayLog(): Promise<void> {
  await client.delete('/logs/today');
}

export async function updateActualTraining(
  date: string,
  request: UpdateActualTrainingRequest
): Promise<DailyLog> {
  const { data } = await client.patch<DailyLog>(
    `/logs/${encodeURIComponent(date)}/actual-training`,
    request
  );
  return data;
}

export async function updateActiveCalories(
  date: string,
  request: UpdateActiveCaloriesRequest
): Promise<DailyLog> {
  const { data } = await client.patch<DailyLog>(
    `/logs/${encodeURIComponent(date)}/active-calories`,
    request
  );
  return data;
}

// ============================================
// Training Config API
// ============================================

export async function getTrainingConfigs(): Promise<TrainingConfig[]> {
  const { data } = await client.get<TrainingConfig[]>('/training-configs');
  return data;
}

// ============================================
// Stats API
// ============================================

export async function getWeightTrend(range: WeightTrendRange): Promise<WeightTrendResponse> {
  const { data } = await client.get<WeightTrendResponse>(
    `/stats/weight-trend?range=${encodeURIComponent(range)}`
  );
  return data;
}

export async function getHistorySummary(range: WeightTrendRange): Promise<HistoryResponse> {
  const { data } = await client.get<HistoryResponse>(
    `/stats/history?range=${encodeURIComponent(range)}`
  );
  return data;
}

// ============================================
// Planned Days API
// ============================================

export async function getPlannedDays(
  startDate: string,
  endDate: string
): Promise<PlannedDaysResponse> {
  const { data } = await client.get<PlannedDaysResponse>(
    `/planned-days?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`
  );
  return data;
}

export async function upsertPlannedDay(date: string, dayType: DayType): Promise<PlannedDay> {
  const { data } = await client.put<PlannedDay>(
    `/planned-days/${encodeURIComponent(date)}`,
    { dayType }
  );
  return data;
}

export async function deletePlannedDay(date: string): Promise<void> {
  await client.delete(`/planned-days/${encodeURIComponent(date)}`);
}

// ============================================
// Food Reference API
// ============================================

export async function getFoodReference(): Promise<FoodReferenceResponse> {
  const { data } = await client.get<FoodReferenceResponse>('/food-reference');
  return data;
}

export async function updateFoodReferencePlateMultiplier(
  id: number,
  plateMultiplier: number | null
): Promise<void> {
  await client.patch(`/food-reference/${id}`, { plateMultiplier });
}

// ============================================
// Nutrition Plan API
// ============================================

export async function getActivePlan(): Promise<NutritionPlan | null> {
  try {
    const { data } = await client.get<NutritionPlan>('/plans/active');
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getPlanById(id: number): Promise<NutritionPlan> {
  const { data } = await client.get<NutritionPlan>(`/plans/${id}`);
  return data;
}

export async function listPlans(): Promise<NutritionPlanSummary[]> {
  const { data } = await client.get<NutritionPlanSummary[]>('/plans');
  return data;
}

export async function createPlan(request: CreatePlanRequest): Promise<NutritionPlan> {
  const { data } = await client.post<NutritionPlan>('/plans', request);
  return data;
}

export async function completePlan(id: number): Promise<void> {
  await client.post(`/plans/${id}/complete`);
}

export async function abandonPlan(id: number): Promise<void> {
  await client.post(`/plans/${id}/abandon`);
}

export async function pausePlan(id: number): Promise<void> {
  await client.post(`/plans/${id}/pause`);
}

export async function resumePlan(id: number): Promise<void> {
  await client.post(`/plans/${id}/resume`);
}

export async function recalibratePlan(
  id: number,
  type: RecalibrationOptionType
): Promise<NutritionPlan> {
  const { data } = await client.post<NutritionPlan>(`/plans/${id}/recalibrate`, { type });
  return data;
}

export async function deletePlan(id: number): Promise<void> {
  await client.delete(`/plans/${id}`);
}

export async function getCurrentWeekTarget(): Promise<WeeklyTarget | null> {
  try {
    const { data } = await client.get<WeeklyTarget>('/plans/current-week');
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ============================================
// Dual-Track Analysis API
// ============================================

export async function getActivePlanAnalysis(date?: string): Promise<DualTrackAnalysis> {
  const url = date
    ? `/plans/active/analysis?date=${encodeURIComponent(date)}`
    : '/plans/active/analysis';
  const { data } = await client.get<DualTrackAnalysis>(url);
  return data;
}

export async function getPlanAnalysis(id: number, date?: string): Promise<DualTrackAnalysis> {
  const url = date
    ? `/plans/${id}/analysis?date=${encodeURIComponent(date)}`
    : `/plans/${id}/analysis`;
  const { data } = await client.get<DualTrackAnalysis>(url);
  return data;
}
