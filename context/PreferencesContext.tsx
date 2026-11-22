"use client";

/**
 * Single source of truth for display density, text size and palette (#650/#651).
 * Values are persisted under one localStorage key, synced across tabs and
 * applied to <html> as data attributes so CSS variables do the styling work.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  applyPreferences,
  parsePreferences,
  readPreferences,
  writePreferences,
  type Density,
  type Palette,
  type Preferences,
  type TextSize,
} from "@/lib/preferences";

export interface PreferencesContextValue {
  preferences: Preferences;
  setDensity: (density: Density) => void;
  setTextSize: (textSize: TextSize) => void;
  setPalette: (palette: Palette) => void;
  reset: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const current = useRef<Preferences>(DEFAULT_PREFERENCES);

  const commit = useCallback((next: Preferences) => {
    current.current = next;
    setPreferences(next);
    writePreferences(next);
    applyPreferences(next);
  }, []);

  useEffect(() => {
    // The pre-paint script already applied stored values visually; hydrate
    // React state after mount to avoid a hydration mismatch.
    const stored = readPreferences();
    current.current = stored;
    setPreferences(stored);
    applyPreferences(stored);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PREFERENCES_STORAGE_KEY) return;
      const next = parsePreferences(event.newValue);
      current.current = next;
      setPreferences(next);
      applyPreferences(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      setDensity: (density) => commit({ ...current.current, density }),
      setTextSize: (textSize) => commit({ ...current.current, textSize }),
      setPalette: (palette) => commit({ ...current.current, palette }),
      reset: () => commit(DEFAULT_PREFERENCES),
    }),
    [preferences, commit],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
