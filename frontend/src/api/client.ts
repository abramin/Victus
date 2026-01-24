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
  DailyTargetsRangeResponse,
  PlannedDaysResponse,
  PlannedDay,
  FoodReferenceResponse,
  DayType,
  NutritionPlan,
  NutritionPlanSummary,
  CreatePlanRequest,
  WeeklyTarget,
  DualTrackAnalysis,
} from './types';

const API_BASE = '/api';

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json()) as APIError;
    throw new ApiError(response.status, data.error, data.message);
  }
  return response.json() as Promise<T>;
}

async function handleEmptyResponse(response: Response): Promise<void> {
  if (response.ok) return;
  let data: APIError | null = null;
  try {
    data = (await response.json()) as APIError;
  } catch {
    data = null;
  }
  throw new ApiError(response.status, data?.error ?? 'request_failed', data?.message);
}

type PlannedSessionWithId = CreateDailyLogRequest['plannedTrainingSessions'][number] & { _id?: string };

function sanitizePlannedSessions(
  sessions: CreateDailyLogRequest['plannedTrainingSessions']
): CreateDailyLogRequest['plannedTrainingSessions'] {
  return sessions.map((session) => {
    const { _id, ...rest } = session as PlannedSessionWithId;
    return rest;
  });
}

export async function getProfile(signal?: AbortSignal): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE}/profile`, { signal });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<UserProfile>(response);
}

export async function saveProfile(profile: UserProfile, signal?: AbortSignal): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
    signal,
  });

  return handleResponse<UserProfile>(response);
}

export async function getTodayLog(signal?: AbortSignal): Promise<DailyLog | null> {
  const response = await fetch(`${API_BASE}/logs/today`, { signal });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<DailyLog>(response);
}

export async function createDailyLog(log: CreateDailyLogRequest, signal?: AbortSignal): Promise<DailyLog> {
  const payload: CreateDailyLogRequest = {
    ...log,
    plannedTrainingSessions: sanitizePlannedSessions(log.plannedTrainingSessions),
  };
  const response = await fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  return handleResponse<DailyLog>(response);
}

export async function deleteTodayLog(signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/logs/today`, {
    method: 'DELETE',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function updateActualTraining(
  date: string,
  request: UpdateActualTrainingRequest,
  signal?: AbortSignal
): Promise<DailyLog> {
  const response = await fetch(`${API_BASE}/logs/${date}/actual-training`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return handleResponse<DailyLog>(response);
}

export async function updateActiveCalories(
  date: string,
  request: UpdateActiveCaloriesRequest,
  signal?: AbortSignal
): Promise<DailyLog> {
  const response = await fetch(`${API_BASE}/logs/${date}/active-calories`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return handleResponse<DailyLog>(response);
}

export async function getTrainingConfigs(signal?: AbortSignal): Promise<TrainingConfig[]> {
  const response = await fetch(`${API_BASE}/training-configs`, { signal });
  return handleResponse<TrainingConfig[]>(response);
}

export async function getWeightTrend(range: WeightTrendRange, signal?: AbortSignal): Promise<WeightTrendResponse> {
  const response = await fetch(`${API_BASE}/stats/weight-trend?range=${encodeURIComponent(range)}`, { signal });
  return handleResponse<WeightTrendResponse>(response);
}

export async function getHistorySummary(range: WeightTrendRange, signal?: AbortSignal): Promise<HistoryResponse> {
  const response = await fetch(`${API_BASE}/stats/history?range=${encodeURIComponent(range)}`, { signal });
  return handleResponse<HistoryResponse>(response);
}

export async function getLogByDate(date: string, signal?: AbortSignal): Promise<DailyLog> {
  const response = await fetch(`${API_BASE}/logs/${encodeURIComponent(date)}`, { signal });
  return handleResponse<DailyLog>(response);
}

export async function getDailyTargetsRange(startDate: string, endDate: string, signal?: AbortSignal): Promise<DailyTargetsRangeResponse> {
  const response = await fetch(
    `${API_BASE}/logs?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
    { signal }
  );
  return handleResponse<DailyTargetsRangeResponse>(response);
}

// Planned Day Types API (Cockpit Dashboard)

export async function getPlannedDays(startDate: string, endDate: string, signal?: AbortSignal): Promise<PlannedDaysResponse> {
  const response = await fetch(
    `${API_BASE}/planned-days?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
    { signal }
  );
  return handleResponse<PlannedDaysResponse>(response);
}

export async function upsertPlannedDay(date: string, dayType: DayType, signal?: AbortSignal): Promise<PlannedDay> {
  const response = await fetch(`${API_BASE}/planned-days/${encodeURIComponent(date)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dayType }),
    signal,
  });
  return handleResponse<PlannedDay>(response);
}

export async function deletePlannedDay(date: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/planned-days/${encodeURIComponent(date)}`, {
    method: 'DELETE',
    signal,
  });
  await handleEmptyResponse(response);
}

// Food Reference API (Cockpit Dashboard)

export async function getFoodReference(signal?: AbortSignal): Promise<FoodReferenceResponse> {
  const response = await fetch(`${API_BASE}/food-reference`, { signal });
  return handleResponse<FoodReferenceResponse>(response);
}

export async function updateFoodReferencePlateMultiplier(
  id: number,
  plateMultiplier: number | null,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/food-reference/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plateMultiplier }),
    signal,
  });
  await handleEmptyResponse(response);
}

// Nutrition Plan API (Issue #27, #28)

export async function getActivePlan(signal?: AbortSignal): Promise<NutritionPlan | null> {
  const response = await fetch(`${API_BASE}/plans/active`, { signal });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<NutritionPlan>(response);
}

export async function getPlanById(id: number, signal?: AbortSignal): Promise<NutritionPlan> {
  const response = await fetch(`${API_BASE}/plans/${id}`, { signal });
  return handleResponse<NutritionPlan>(response);
}

export async function listPlans(signal?: AbortSignal): Promise<NutritionPlanSummary[]> {
  const response = await fetch(`${API_BASE}/plans`, { signal });
  return handleResponse<NutritionPlanSummary[]>(response);
}

export async function createPlan(request: CreatePlanRequest, signal?: AbortSignal): Promise<NutritionPlan> {
  const response = await fetch(`${API_BASE}/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  return handleResponse<NutritionPlan>(response);
}

export async function completePlan(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/plans/${id}/complete`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function abandonPlan(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/plans/${id}/abandon`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function deletePlan(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/plans/${id}`, {
    method: 'DELETE',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function getCurrentWeekTarget(signal?: AbortSignal): Promise<WeeklyTarget | null> {
  const response = await fetch(`${API_BASE}/plans/current-week`, { signal });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<WeeklyTarget>(response);
}

// Dual-Track Analysis API (Issue #29)

export async function getActivePlanAnalysis(date?: string, signal?: AbortSignal): Promise<DualTrackAnalysis> {
  const url = date
    ? `${API_BASE}/plans/active/analysis?date=${encodeURIComponent(date)}`
    : `${API_BASE}/plans/active/analysis`;
  const response = await fetch(url, { signal });
  return handleResponse<DualTrackAnalysis>(response);
}

export async function getPlanAnalysis(id: number, date?: string, signal?: AbortSignal): Promise<DualTrackAnalysis> {
  const url = date
    ? `${API_BASE}/plans/${id}/analysis?date=${encodeURIComponent(date)}`
    : `${API_BASE}/plans/${id}/analysis`;
  const response = await fetch(url, { signal });
  return handleResponse<DualTrackAnalysis>(response);
}
