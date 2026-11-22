import { describe, expect, it } from "vitest";

import { buildPreferencesScript } from "../preferences-script";

function run(script: string, stored: string | null): Record<string, string> {
  const attributes: Record<string, string> = {};
  const style: Record<string, string> = {};
  const documentElement = {
    setAttribute: (key: string, value: string) => {
      attributes[key] = value;
    },
    style,
  };
  const getItem = vi.fn(() => stored);
  // eslint-disable-next-line no-new-func
  new Function("document", "localStorage", script)({ documentElement }, { getItem });
  return { ...attributes, "font-size": style.fontSize ?? "" };
}

describe("pre-paint preferences script", () => {
  it("applies defaults when storage is empty", () => {
    expect(run(buildPreferencesScript(), null)).toEqual({
      "data-density": "comfortable",
      "data-text-size": "100",
      "data-palette": "default",
      "font-size": "100%",
    });
  });

  it("applies saved preferences without layout shift", () => {
    const stored = JSON.stringify({
      density: "compact",
      textSize: "115",
      palette: "color-blind",
    });
    expect(run(buildPreferencesScript(), stored)).toEqual({
      "data-density": "compact",
      "data-text-size": "115",
      "data-palette": "color-blind",
      "font-size": "115%",
    });
  });

  it("ignores malformed storage and unknown values", () => {
    expect(run(buildPreferencesScript(), "{oops")["font-size"]).toBe("100%");
    const stored = JSON.stringify({ density: "<script>", textSize: "999", palette: "rainbow" });
    expect(run(buildPreferencesScript(), stored)).toEqual({
      "data-density": "comfortable",
      "data-text-size": "100",
      "data-palette": "default",
      "font-size": "100%",
    });
  });

  it("reads a single compact key", () => {
    expect(buildPreferencesScript()).toContain('"ss-preferences"');
  });
});
