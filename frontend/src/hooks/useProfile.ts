import { useState, useEffect, useCallback, useRef } from 'react';
import { getProfile, saveProfile, ApiError } from '../api/client';
import type { UserProfile } from '../api/types';

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveError: string | null;
  save: (profile: UserProfile) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      if (controller.signal.aborted) return;
      setProfile(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load profile');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [refresh]);

  const save = useCallback(async (newProfile: UserProfile): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveProfile(newProfile);
      setProfile(saved);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('Failed to save profile');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { profile, loading, saving, error, saveError, save, refresh };
}
