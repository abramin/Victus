import type {
  UserProfile,
  APIError,
  DailyLog,
  CreateDailyLogRequest,
  UpdateActualTrainingRequest,
  TrainingConfig,
  WeightTrendRange,
  WeightTrendResponse,
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

type PlannedSessionWithId = CreateDailyLogRequest['plannedTrainingSessions'][number] & { _id?: string };

function sanitizePlannedSessions(
  sessions: CreateDailyLogRequest['plannedTrainingSessions']
): CreateDailyLogRequest['plannedTrainingSessions'] {
  return sessions.map((session) => {
    const { _id, ...rest } = session as PlannedSessionWithId;
    return rest;
  });
}

export async function getProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE}/profile`);

  if (response.status === 404) {
    return null;
  }

  return handleResponse<UserProfile>(response);
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });

  return handleResponse<UserProfile>(response);
}

export async function getTodayLog(): Promise<DailyLog | null> {
  const response = await fetch(`${API_BASE}/logs/today`);

  if (response.status === 404) {
    return null;
  }

  return handleResponse<DailyLog>(response);
}

export async function createDailyLog(log: CreateDailyLogRequest): Promise<DailyLog> {
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
  });

  return handleResponse<DailyLog>(response);
}

export async function updateActualTraining(
  date: string,
  request: UpdateActualTrainingRequest
): Promise<DailyLog> {
  const response = await fetch(`${API_BASE}/logs/${date}/actual-training`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return handleResponse<DailyLog>(response);
}

export async function getTrainingConfigs(): Promise<TrainingConfig[]> {
  const response = await fetch(`${API_BASE}/training-configs`);
  return handleResponse<TrainingConfig[]>(response);
}

export async function getWeightTrend(range: WeightTrendRange): Promise<WeightTrendResponse> {
  const response = await fetch(`${API_BASE}/stats/weight-trend?range=${encodeURIComponent(range)}`);
  return handleResponse<WeightTrendResponse>(response);
}
