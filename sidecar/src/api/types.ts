/**
 * HealthKit metrics payload sent to the backend.
 * All fields are optional - only available metrics are sent.
 */
export interface HealthPayload {
  steps?: number;
  active_kcal?: number;
  rhr?: number;
  sleep_hours?: number;
  weight?: number; // kg
  body_fat?: number; // percentage 0-100
}

/**
 * Response from the health sync endpoint.
 */
export interface SyncResponse {
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  restingHeartRate?: number;
  sleepQuality: number;
  sleepHours?: number;
  steps?: number;
  activeCaloriesBurned?: number;
  dayType: string;
  estimatedTDEE: number;
}

/**
 * Error response from the API.
 */
export interface ApiError {
  error: string;
  code: string;
  message?: string;
}
