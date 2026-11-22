import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { PreferencesProvider, usePreferences } from "../PreferencesContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

describe("PreferencesProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-text-size");
    document.documentElement.removeAttribute("data-palette");
    document.documentElement.style.fontSize = "";
  });

  it("starts with defaults and applies them to the document", async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() =>
      expect(document.documentElement.getAttribute("data-density")).toBe("comfortable"),
    );
    expect(result.current.preferences).toEqual({
      density: "comfortable",
      textSize: "100",
      palette: "default",
    });
  });

  it("persists changes and updates CSS attributes immediately", async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.setDensity("compact"));
    act(() => result.current.setTextSize("130"));
    act(() => result.current.setPalette("high-contrast"));

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.getAttribute("data-palette")).toBe("high-contrast");
    expect(document.documentElement.style.fontSize).toBe("130%");
    expect(JSON.parse(localStorage.getItem("ss-preferences")!)).toEqual({
      density: "compact",
      textSize: "130",
      palette: "high-contrast",
    });
  });

  it("hydrates saved values after mount", async () => {
    localStorage.setItem(
      "ss-preferences",
      JSON.stringify({ density: "spacious", textSize: "115", palette: "color-blind" }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences.density).toBe("spacious"));
    expect(result.current.preferences.palette).toBe("color-blind");
    expect(document.documentElement.getAttribute("data-palette")).toBe("color-blind");
  });

  it("falls back to defaults for corrupt storage", async () => {
    localStorage.setItem("ss-preferences", "{broken");
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences.textSize).toBe("100"));
  });

  it("syncs preferences from another tab", async () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.preferences.palette).toBe("default"));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ss-preferences",
          newValue: JSON.stringify({ density: "compact", textSize: "90", palette: "color-blind" }),
        }),
      );
    });

    await waitFor(() => expect(result.current.preferences.density).toBe("compact"));
    expect(result.current.preferences.textSize).toBe("90");
    expect(document.documentElement.getAttribute("data-palette")).toBe("color-blind");
  });
});
