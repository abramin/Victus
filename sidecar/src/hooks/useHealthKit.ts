import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import { initHealthKit, getDailyMetrics } from '../services/healthkit';
import { HealthPayload } from '../api/types';

export type HealthKitStatus = 'loading' | 'authorized' | 'denied' | 'unavailable';

/**
 * Hook for managing HealthKit initialization and data fetching.
 */
export function useHealthKit() {
  const [status, setStatus] = useState<HealthKitStatus>('loading');
  const [metrics, setMetrics] = useState<HealthPayload | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize HealthKit on mount
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setStatus('unavailable');
      return;
    }

    initHealthKit().then((granted) => {
      setStatus(granted ? 'authorized' : 'denied');
      if (granted) {
        // Fetch initial metrics
        refreshMetrics();
      }
    });
  }, []);

  // Refresh metrics from HealthKit
  const refreshMetrics = useCallback(async () => {
    if (status !== 'authorized') return;

    setIsRefreshing(true);
    try {
      const data = await getDailyMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch HealthKit metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [status]);

  // Prompt user to open Settings if permissions denied
  const promptForPermissions = useCallback(() => {
    Alert.alert(
      'HealthKit Access Required',
      'Please enable HealthKit access in Settings to sync your health data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => Linking.openURL('app-settings:'),
        },
      ]
    );
  }, []);

  return {
    status,
    metrics,
    isRefreshing,
    refreshMetrics,
    promptForPermissions,
  };
}
