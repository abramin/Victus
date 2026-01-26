import type {
  UserProfile,
  APIError,
  DailyLog,
  CreateDailyLogRequest,
  UpdateActualTrainingRequest,
  UpdateActiveCaloriesRequest,
  UpdateFastingOverrideRequest,
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
  BodyStatus,
  ArchetypeConfig,
  SessionFatigueReport,
  ApplyLoadRequest,
  TrainingProgram,
  ProgramSummary,
  WaveformPoint,
  ProgramInstallation,
  ScheduledSession,
  CreateProgramRequest as CreateTrainingProgramRequest,
  InstallProgramRequest,
  ProgramDifficulty,
  ProgramFocus,
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

export async function updateFastingOverride(
  date: string,
  request: UpdateFastingOverrideRequest,
  signal?: AbortSignal
): Promise<DailyLog> {
  const response = await fetch(`${API_BASE}/logs/${date}/fasting-override`, {
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

export async function getLogByDate(date: string, signal?: AbortSignal): Promise<DailyLog | null> {
  const response = await fetch(`${API_BASE}/logs/${encodeURIComponent(date)}`, { signal });

  if (response.status === 404) {
    return null;
  }

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

export async function pausePlan(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/plans/${id}/pause`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function resumePlan(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/plans/${id}/resume`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function recalibratePlan(
  id: number,
  type: 'increase_deficit' | 'extend_timeline' | 'revise_goal' | 'keep_current',
  signal?: AbortSignal
): Promise<NutritionPlan> {
  const response = await fetch(`${API_BASE}/plans/${id}/recalibrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type }),
    signal,
  });
  return handleResponse<NutritionPlan>(response);
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

// Body Status / Fatigue API (Adaptive Load feature)

export async function getBodyStatus(signal?: AbortSignal): Promise<BodyStatus> {
  const response = await fetch(`${API_BASE}/body-status`, { signal });
  return handleResponse<BodyStatus>(response);
}

export async function getArchetypes(signal?: AbortSignal): Promise<ArchetypeConfig[]> {
  const response = await fetch(`${API_BASE}/archetypes`, { signal });
  return handleResponse<ArchetypeConfig[]>(response);
}

export async function applySessionLoad(
  sessionId: number,
  request: ApplyLoadRequest,
  signal?: AbortSignal
): Promise<SessionFatigueReport> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/apply-load`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<SessionFatigueReport>(response);
}

// Simpler fatigue application without requiring a session ID
export async function applyFatigue(
  request: ApplyLoadRequest,
  signal?: AbortSignal
): Promise<SessionFatigueReport> {
  const response = await fetch(`${API_BASE}/fatigue/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<SessionFatigueReport>(response);
}

// =============================================================================
// Training Program API (Program Management feature)
// =============================================================================

export interface ProgramFilters {
  difficulty?: ProgramDifficulty;
  focus?: ProgramFocus;
  templatesOnly?: boolean;
}

export async function listTrainingPrograms(
  filters?: ProgramFilters,
  signal?: AbortSignal
): Promise<ProgramSummary[]> {
  const params = new URLSearchParams();
  if (filters?.difficulty) params.set('difficulty', filters.difficulty);
  if (filters?.focus) params.set('focus', filters.focus);
  if (filters?.templatesOnly) params.set('templatesOnly', 'true');

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE}/training-programs?${queryString}`
    : `${API_BASE}/training-programs`;

  const response = await fetch(url, { signal });
  return handleResponse<ProgramSummary[]>(response);
}

export async function getTrainingProgram(id: number, signal?: AbortSignal): Promise<TrainingProgram> {
  const response = await fetch(`${API_BASE}/training-programs/${id}`, { signal });
  return handleResponse<TrainingProgram>(response);
}

export async function createTrainingProgram(
  request: CreateTrainingProgramRequest,
  signal?: AbortSignal
): Promise<TrainingProgram> {
  const response = await fetch(`${API_BASE}/training-programs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<TrainingProgram>(response);
}

export async function deleteTrainingProgram(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/training-programs/${id}`, {
    method: 'DELETE',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function getProgramWaveform(id: number, signal?: AbortSignal): Promise<WaveformPoint[]> {
  const response = await fetch(`${API_BASE}/training-programs/${id}/waveform`, { signal });
  return handleResponse<WaveformPoint[]>(response);
}

export async function installProgram(
  programId: number,
  request: InstallProgramRequest,
  signal?: AbortSignal
): Promise<ProgramInstallation> {
  const response = await fetch(`${API_BASE}/training-programs/${programId}/install`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<ProgramInstallation>(response);
}

export async function getActiveInstallation(signal?: AbortSignal): Promise<ProgramInstallation | null> {
  const response = await fetch(`${API_BASE}/program-installations/active`, { signal });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<ProgramInstallation>(response);
}

export async function getInstallationById(id: number, signal?: AbortSignal): Promise<ProgramInstallation> {
  const response = await fetch(`${API_BASE}/program-installations/${id}`, { signal });
  return handleResponse<ProgramInstallation>(response);
}

export async function abandonInstallation(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/program-installations/${id}/abandon`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function deleteInstallation(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/program-installations/${id}`, {
    method: 'DELETE',
    signal,
  });
  await handleEmptyResponse(response);
}

export async function getScheduledSessions(
  installationId: number,
  signal?: AbortSignal
): Promise<ScheduledSession[]> {
  const response = await fetch(`${API_BASE}/program-installations/${installationId}/sessions`, { signal });
  return handleResponse<ScheduledSession[]>(response);
}

// =============================================================================
// Metabolic Flux Engine API
// =============================================================================

import type { FluxChartData, FluxNotification } from './types';

/**
 * Get metabolic history data for the Metabolism Graph.
 * @param weeks Number of weeks to retrieve (default: 12)
 */
export async function getMetabolicChart(weeks: number = 12, signal?: AbortSignal): Promise<FluxChartData> {
  const response = await fetch(`${API_BASE}/metabolic/chart?weeks=${weeks}`, { signal });
  return handleResponse<FluxChartData>(response);
}

/**
 * Get any pending weekly strategy notification.
 * Returns null if no notification is pending.
 */
export async function getMetabolicNotification(signal?: AbortSignal): Promise<FluxNotification | null> {
  const response = await fetch(`${API_BASE}/metabolic/notification`, { signal });

  // API returns null for no pending notification
  const text = await response.text();
  if (text === 'null' || text === '') {
    return null;
  }

  if (!response.ok) {
    const data = JSON.parse(text) as { error: string; message?: string };
    throw new ApiError(response.status, data.error, data.message);
  }

  return JSON.parse(text) as FluxNotification;
}

/**
 * Dismiss a weekly strategy notification.
 */
export async function dismissMetabolicNotification(id: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/metabolic/notification/${id}/dismiss`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}
