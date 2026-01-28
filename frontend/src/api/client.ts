import type {
  UserProfile,
  APIError,
  DailyLog,
  CreateDailyLogRequest,
  UpdateActualTrainingRequest,
  UpdateActiveCaloriesRequest,
  UpdateFastingOverrideRequest,
  AddConsumedMacrosRequest,
  TrainingConfig,
  WeightTrendRange,
  WeightTrendResponse,
  HistoryResponse,
  DailyTargetsRangeResponse,
  PlannedDaysResponse,
  PlannedDay,
  PlannedSession,
  PlannedSessionInput,
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
  SolverRequest,
  SolverResponse,
  WeeklyDebrief,
  CalendarSummaryResponse,
  DayInsightResponse,
  PhaseInsightResponse,
} from './types';

const API_BASE = '/api';

/**
 * Poll /api/health until the backend is reachable or maxAttempts is exhausted.
 * Resolves true on success, false on timeout.
 */
export async function waitForBackend(maxAttempts = 60, intervalMs = 1000): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) return true;
    } catch {
      // Network error – backend not ready yet
    }
    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

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

export async function addConsumedMacros(
  date: string,
  request: AddConsumedMacrosRequest,
  signal?: AbortSignal
): Promise<DailyLog> {
  const response = await fetch(`${API_BASE}/logs/${date}/consumed-macros`, {
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

export async function upsertPlannedDay(
  date: string,
  dayType: DayType,
  sessions?: PlannedSessionInput[],
  signal?: AbortSignal
): Promise<PlannedDay> {
  const response = await fetch(`${API_BASE}/planned-days/${encodeURIComponent(date)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dayType, sessions: sessions ?? [] }),
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

export async function getPlannedSessions(date: string, signal?: AbortSignal): Promise<PlannedSession[]> {
  const response = await fetch(`${API_BASE}/planned-sessions/${encodeURIComponent(date)}`, { signal });
  return handleResponse<PlannedSession[]>(response);
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

export async function getPhaseInsight(id: number, weekNumber?: number, signal?: AbortSignal): Promise<PhaseInsightResponse> {
  const url = weekNumber
    ? `${API_BASE}/plans/${id}/phase-insight?week=${weekNumber}`
    : `${API_BASE}/plans/${id}/phase-insight`;
  const response = await fetch(url, { signal });
  return handleResponse<PhaseInsightResponse>(response);
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

export async function deleteTrainingProgram(
  id: number,
  options?: { force?: boolean },
  signal?: AbortSignal
): Promise<void> {
  const params = options?.force ? '?force=true' : '';
  const response = await fetch(`${API_BASE}/training-programs/${id}${params}`, {
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

// =============================================================================
// MACRO TETRIS SOLVER
// =============================================================================

/**
 * Solve remaining macros with optimal food combinations.
 * Requires at least 150 kcal remaining to solve.
 */
export async function solveMacros(request: SolverRequest, signal?: AbortSignal): Promise<SolverResponse> {
  const response = await fetch(`${API_BASE}/solver/solve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<SolverResponse>(response);
}

// =============================================================================
// WEEKLY DEBRIEF (MISSION REPORT)
// =============================================================================

/**
 * Get the weekly debrief for the most recent completed week.
 */
export async function getWeeklyDebrief(signal?: AbortSignal): Promise<WeeklyDebrief> {
  const response = await fetch(`${API_BASE}/debrief/weekly`, { signal });
  return handleResponse<WeeklyDebrief>(response);
}

/**
 * Get the weekly debrief for a specific week (any day in the week).
 */
export async function getWeeklyDebriefByDate(
  date: string,
  signal?: AbortSignal
): Promise<WeeklyDebrief> {
  const response = await fetch(`${API_BASE}/debrief/weekly/${encodeURIComponent(date)}`, {
    signal,
  });
  return handleResponse<WeeklyDebrief>(response);
}

/**
 * Get an in-progress debrief for the current incomplete week.
 * Returns null if it's Monday and there's no data yet.
 */
export async function getCurrentWeekDebrief(signal?: AbortSignal): Promise<WeeklyDebrief | null> {
  const response = await fetch(`${API_BASE}/debrief/current`, { signal });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<WeeklyDebrief>(response);
}

// =============================================================================
// Garmin Data Import API
// =============================================================================

import type { GarminImportResult, MonthlySummary } from './types';

/**
 * Upload a Garmin export file (CSV or ZIP) for import.
 * Supports: Sleep (Sueño), Weight (Peso), HRV, RHR, and Activity summaries.
 * @param file The CSV or ZIP file to upload
 * @param year Optional year for date parsing (defaults to current year)
 */
export async function importGarminData(
  file: File,
  year?: number,
  signal?: AbortSignal
): Promise<GarminImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (year) {
    formData.append('year', year.toString());
  }

  const response = await fetch(`${API_BASE}/import/garmin`, {
    method: 'POST',
    body: formData,
    signal,
  });

  return handleResponse<GarminImportResult>(response);
}

/**
 * Get monthly activity summaries.
 * @param from Optional start year-month (e.g., "2025-01")
 * @param to Optional end year-month (e.g., "2025-12")
 */
export async function getMonthlySummaries(
  from?: string,
  to?: string,
  signal?: AbortSignal
): Promise<MonthlySummary[]> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const url = params.toString()
    ? `${API_BASE}/stats/monthly-summaries?${params}`
    : `${API_BASE}/stats/monthly-summaries`;

  const response = await fetch(url, { signal });
  return handleResponse<MonthlySummary[]>(response);
}

// =============================================================================
// Semantic Body API (Phase 4 - Body Part Issues)
// =============================================================================

import type {
  BodyPartIssue,
  CreateBodyIssuesRequest,
  CreateBodyIssuesResponse,
  MuscleFatigueModifier,
} from './types';

/**
 * Create body part issues from detected semantic tokens.
 */
export async function createBodyIssues(
  request: CreateBodyIssuesRequest,
  signal?: AbortSignal
): Promise<CreateBodyIssuesResponse> {
  const response = await fetch(`${API_BASE}/body-issues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<CreateBodyIssuesResponse>(response);
}

/**
 * Get all active body part issues (within decay period).
 */
export async function getActiveBodyIssues(signal?: AbortSignal): Promise<BodyPartIssue[]> {
  const response = await fetch(`${API_BASE}/body-issues/active`, { signal });
  return handleResponse<BodyPartIssue[]>(response);
}

/**
 * Get fatigue modifiers from active body issues.
 */
export async function getFatigueModifiers(signal?: AbortSignal): Promise<MuscleFatigueModifier[]> {
  const response = await fetch(`${API_BASE}/body-issues/modifiers`, { signal });
  return handleResponse<MuscleFatigueModifier[]>(response);
}

// =============================================================================
// Strategy Auditor API (Phase 4.2 - Check Engine Light)
// =============================================================================

import type { AuditStatus } from './types';

/**
 * Get the current audit status including any detected mismatches.
 * Used by the Check Engine light feature.
 */
export async function getAuditStatus(signal?: AbortSignal): Promise<AuditStatus> {
  const response = await fetch(`${API_BASE}/audit/status`, { signal });
  return handleResponse<AuditStatus>(response);
}

// === CALENDAR SUMMARY ===

export async function getCalendarSummary(
  start: string,
  end: string,
  signal?: AbortSignal
): Promise<CalendarSummaryResponse> {
  const response = await fetch(
    `${API_BASE}/calendar/summary?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { signal }
  );
  return handleResponse<CalendarSummaryResponse>(response);
}

export async function getDayInsight(
  date: string,
  signal?: AbortSignal
): Promise<DayInsightResponse | null> {
  const response = await fetch(
    `${API_BASE}/logs/${encodeURIComponent(date)}/insight`,
    { signal }
  );

  if (response.status === 404) {
    return null;
  }

  return handleResponse<DayInsightResponse>(response);
}

// =============================================================================
// Echo Logging API (Neural Echo feature)
// =============================================================================

import type {
  QuickSessionRequest,
  SessionResponse,
  EchoRequest,
  EchoResponse,
} from './types';

/**
 * Create a draft session via quick submit.
 * The session will have isDraft=true and can be enriched later via submitSessionEcho.
 */
export async function quickSubmitSession(
  date: string,
  request: QuickSessionRequest,
  signal?: AbortSignal
): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE}/logs/${encodeURIComponent(date)}/sessions/quick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<SessionResponse>(response);
}

/**
 * Submit a natural language echo log for a draft session.
 * Parses the text via Ollama and updates the session with achievements,
 * joint integrity changes, and RPE adjustments.
 */
export async function submitSessionEcho(
  sessionId: number,
  request: EchoRequest,
  signal?: AbortSignal
): Promise<EchoResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/echo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });
  return handleResponse<EchoResponse>(response);
}

/**
 * Finalize a draft session without echo processing.
 * Marks the session as complete with isDraft=false.
 */
export async function finalizeSession(sessionId: number, signal?: AbortSignal): Promise<void> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/finalize`, {
    method: 'POST',
    signal,
  });
  await handleEmptyResponse(response);
}

/**
 * Get a training session by ID.
 */
export async function getSession(sessionId: number, signal?: AbortSignal): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, { signal });
  return handleResponse<SessionResponse>(response);
}
