import { useState, useCallback } from 'react';
import { importGarminData } from '../api/client';
import type { GarminImportResult } from '../api/types';

export interface UseGarminImportState {
  isUploading: boolean;
  result: GarminImportResult | null;
  error: string | null;
}

export interface UseGarminImportReturn extends UseGarminImportState {
  upload: (file: File, year?: number) => Promise<GarminImportResult | null>;
  reset: () => void;
}

export function useGarminImport(): UseGarminImportReturn {
  const [state, setState] = useState<UseGarminImportState>({
    isUploading: false,
    result: null,
    error: null,
  });

  const upload = useCallback(async (file: File, year?: number): Promise<GarminImportResult | null> => {
    setState({ isUploading: true, result: null, error: null });

    try {
      const result = await importGarminData(file, year);
      setState({ isUploading: false, result, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setState({ isUploading: false, result: null, error: message });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isUploading: false, result: null, error: null });
  }, []);

  return { ...state, upload, reset };
}
