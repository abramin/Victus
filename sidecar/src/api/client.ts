import { HealthPayload, SyncResponse, ApiError } from './types';

const SYNC_TIMEOUT_MS = 3000;

/**
 * Formats a date as YYYY-MM-DD in local timezone.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetch with timeout support.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Syncs HealthKit metrics to the Victus backend.
 *
 * @param serverUrl - The base URL of the Victus backend (e.g., http://192.168.1.100:8080)
 * @param payload - The HealthKit metrics to sync
 * @returns The updated daily log from the backend
 * @throws Error if sync fails
 */
export async function syncHealthData(
  serverUrl: string,
  payload: HealthPayload
): Promise<SyncResponse> {
  const today = formatDate(new Date());
  const url = `${serverUrl}/api/logs/${today}/health-sync`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      SYNC_TIMEOUT_MS
    );

    const data = await response.json();

    if (!response.ok) {
      const apiError = data as ApiError;
      if (apiError?.code === 'weight_required') {
        throw new Error('Weight is required to create a new daily log.');
      }
      throw new Error(apiError?.message || `Server error: ${response.status}`);
    }

    return data as SyncResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timed out. Check your server URL and network.');
      }
      if (error.message.includes('Network request failed')) {
        throw new Error('Network error. Make sure the server is running and reachable.');
      }
      throw error;
    }
    throw new Error('Failed to sync health data');
  }
}

/**
 * Validates that a server URL is properly formatted.
 * Returns null if valid, error message if invalid.
 */
export function validateServerUrl(url: string): string | null {
  if (!url.trim()) {
    return 'Server URL is required';
  }

  // Check for localhost which won't work on device
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'Use your computer\'s LAN IP address, not localhost';
  }

  // Basic URL validation
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must start with http:// or https://';
    }
  } catch {
    return 'Invalid URL format';
  }

  return null;
}
