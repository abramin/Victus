import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type DisplayMode = 'Points' | 'Grams';

interface DisplayModeContextValue {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleDisplayMode: () => void;
}

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

const STORAGE_KEY = 'victus-display-mode';

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'Points' || stored === 'Grams') {
        return stored;
      }
    }
    return 'Points';
  });

  // Persist to localStorage when mode changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, displayMode);
  }, [displayMode]);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayModeState(mode);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayModeState((prev) => (prev === 'Points' ? 'Grams' : 'Points'));
  }, []);

  return (
    <DisplayModeContext.Provider value={{ displayMode, setDisplayMode, toggleDisplayMode }}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode(): DisplayModeContextValue {
  const context = useContext(DisplayModeContext);
  if (!context) {
    throw new Error('useDisplayMode must be used within a DisplayModeProvider');
  }
  return context;
}
