import { useState, useEffect, useCallback } from 'react';
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load profile';
      setError(message);
      console.error('useProfile refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (newProfile: UserProfile): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveProfile(newProfile);
      setProfile(saved);
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save profile';
      setSaveError(message);
      console.error('useProfile save error:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    profile,
    loading,
    saving,
    error,
    saveError,
    save,
    refresh,
  };
}
