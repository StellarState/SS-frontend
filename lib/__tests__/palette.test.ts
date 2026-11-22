import { describe, expect, it } from "vitest";

import {
  HIGH_CONTRAST_PAIRS,
  PALETTES,
  contrastRatio,
  getSeriesCue,
} from "../palette";

describe("palette helpers", () => {
  it("exposes the three palette modes", () => {
    expect(PALETTES).toEqual(["default", "high-contrast", "color-blind"]);
  });

  it("computes contrast ratios correctly", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(contrastRatio("#777777", "#ffffff")).toBeGreaterThan(4);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(5);
  });

  it("meets 4.5:1 on every high-contrast text/control pair", () => {
    for (const pair of HIGH_CONTRAST_PAIRS) {
      expect(
        contrastRatio(pair.foreground, pair.background),
        `${pair.name}: ${pair.foreground} on ${pair.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives each series a distinct non-color cue in color-blind mode", () => {
    const cues = PALETTES.map(() => [0, 1, 2, 3].map((i) => getSeriesCue(i, "color-blind")));
    // Each cue is unique within the palette.
    const flat = cues[0];
    expect(new Set(flat.map((c) => `${c.dash}|${c.shape}`)).size).toBe(flat.length);
  });

  it("leaves default palette series solid with no shape", () => {
    for (let i = 0; i < 4; i += 1) {
      expect(getSeriesCue(i, "default")).toEqual({ dash: undefined, shape: undefined });
    }
  });

  it("uses dashes in high-contrast mode", () => {
    expect(getSeriesCue(0, "high-contrast").dash).toBeDefined();
  });
});
