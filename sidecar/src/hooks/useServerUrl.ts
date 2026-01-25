import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@victus_sync_server_url';
const DEFAULT_URL = 'http://192.168.1.';

/**
 * Hook for managing the server URL with AsyncStorage persistence.
 */
export function useServerUrl() {
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_URL);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved URL on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          setServerUrl(saved);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // Save URL when it changes
  const updateUrl = useCallback(async (url: string) => {
    setServerUrl(url);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, url);
    } catch (error) {
      console.error('Failed to save server URL:', error);
    }
  }, []);

  return {
    serverUrl,
    setServerUrl: updateUrl,
    isLoading,
  };
}
