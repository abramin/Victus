import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the API base URL based on the current environment.
 *
 * - iOS Simulator: Uses localhost:8080
 * - Android Emulator: Uses 10.0.2.2:8080 (special alias for host machine)
 * - Physical Device (dev): Uses the host machine's IP from Expo
 * - Production: Uses production API URL
 */
function getApiBaseUrl(): string {
  if (__DEV__) {
    // iOS Simulator can use localhost
    if (Platform.OS === 'ios') {
      return 'http://localhost:8080/api';
    }

    // Android Emulator uses 10.0.2.2 as alias for host machine's localhost
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8080/api';
    }

    // For physical devices in dev mode, try to get the host IP from Expo
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost) {
      return `http://${debuggerHost}:8080/api`;
    }

    // Fallback to localhost (may not work on physical devices)
    return 'http://localhost:8080/api';
  }

  // Production URL - update this when deploying
  return 'https://api.victus.app/api';
}

export const API_BASE_URL = getApiBaseUrl();

// Export for debugging
export function getDebugInfo() {
  return {
    apiBaseUrl: API_BASE_URL,
    platform: Platform.OS,
    isDev: __DEV__,
    hostUri: Constants.expoConfig?.hostUri,
  };
}
