import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  applyPreferences,
  parsePreferences,
  preferencesToAttributes,
} from "../preferences";

describe("display preferences", () => {
  it("falls back to defaults for missing, malformed or wrong-typed storage", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("{not json")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(JSON.stringify({ density: "huge" }))).toEqual(
      DEFAULT_PREFERENCES,
    );
    expect(parsePreferences(JSON.stringify([1, 2]))).toEqual(DEFAULT_PREFERENCES);
  });

  it("keeps valid values and fills in missing ones", () => {
    expect(
      parsePreferences(
        JSON.stringify({ density: "compact", textSize: "115", palette: "high-contrast" }),
      ),
    ).toEqual({ density: "compact", textSize: "115", palette: "high-contrast" });
    expect(parsePreferences(JSON.stringify({ density: "spacious" }))).toEqual({
      ...DEFAULT_PREFERENCES,
      density: "spacious",
    });
  });

  it("exposes attributes used by CSS and the pre-paint script", () => {
    expect(
      preferencesToAttributes({ density: "compact", textSize: "130", palette: "color-blind" }),
    ).toEqual({
      "data-density": "compact",
      "data-text-size": "130",
      "data-palette": "color-blind",
      "font-size": "130%",
    });
  });

  it("uses a single compact storage key", () => {
    expect(PREFERENCES_STORAGE_KEY).toBe("ss-preferences");
  });

  it("writes attributes and root font size to the document element", () => {
    const setAttribute = vi.spyOn(document.documentElement, "setAttribute");
    applyPreferences({ density: "spacious", textSize: "90", palette: "high-contrast" });

    expect(setAttribute).toHaveBeenCalledWith("data-density", "spacious");
    expect(setAttribute).toHaveBeenCalledWith("data-text-size", "90");
    expect(setAttribute).toHaveBeenCalledWith("data-palette", "high-contrast");
    expect(document.documentElement.style.fontSize).toBe("90%");
    setAttribute.mockRestore();
  });
});
