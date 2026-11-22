/**
 * Display preferences shared by #650 (density / text size) and #651 (palette).
 *
 * A single compact localStorage record is the source of truth. The same
 * values are applied to the document element as data attributes and a root
 * font-size so CSS variables can drive every consumer without a re-render.
 */

export type Density = "comfortable" | "compact" | "spacious";
export type TextSize = "90" | "100" | "115" | "130";
export type Palette = "default" | "high-contrast" | "color-blind";

export interface Preferences {
  density: Density;
  textSize: TextSize;
  palette: Palette;
}

export const PREFERENCES_STORAGE_KEY = "ss-preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  density: "comfortable",
  textSize: "100",
  palette: "default",
};

export const DENSITIES: readonly Density[] = ["comfortable", "compact", "spacious"];
export const TEXT_SIZES: readonly TextSize[] = ["90", "100", "115", "130"];
export const PALETTES: readonly Palette[] = ["default", "high-contrast", "color-blind"];

export function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    DENSITIES.includes(candidate.density as Density) &&
    TEXT_SIZES.includes(candidate.textSize as TextSize) &&
    PALETTES.includes(candidate.palette as Palette)
  );
}

/** Parses a stored string, falling back to defaults for missing/invalid data. */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_PREFERENCES;
    }
    return {
      density: DENSITIES.includes(parsed.density as Density)
        ? (parsed.density as Density)
        : DEFAULT_PREFERENCES.density,
      textSize: TEXT_SIZES.includes(parsed.textSize as TextSize)
        ? (parsed.textSize as TextSize)
        : DEFAULT_PREFERENCES.textSize,
      palette: PALETTES.includes(parsed.palette as Palette)
        ? (parsed.palette as Palette)
        : DEFAULT_PREFERENCES.palette,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function readPreferences(): Preferences {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_PREFERENCES;
  try {
    return parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(preferences: Preferences): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing can deny writes; preferences still apply for this session.
  }
}

/** Attributes applied to <html>; shared by the runtime hook and pre-paint script. */
export function preferencesToAttributes(preferences: Preferences): Record<string, string> {
  return {
    "data-density": preferences.density,
    "data-text-size": preferences.textSize,
    "data-palette": preferences.palette,
    "font-size": `${preferences.textSize}%`,
  };
}

/** Applies preferences to the live document after mount (the script does first paint). */
export function applyPreferences(preferences: Preferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-density", preferences.density);
  root.setAttribute("data-text-size", preferences.textSize);
  root.setAttribute("data-palette", preferences.palette);
  root.style.fontSize = `${preferences.textSize}%`;
}
