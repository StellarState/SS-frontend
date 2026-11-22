import type { Palette } from "./preferences";

/**
 * Palette cues for #651. Default visuals are unchanged; high-contrast and
 * color-blind modes add non-color cues (dashes and shapes) so meaning never
 * depends on hue alone.
 */

export const PALETTES: readonly Palette[] = ["default", "high-contrast", "color-blind"];

export interface SeriesCue {
  dash?: string;
  shape?: string;
}

const HIGH_CONTRAST_DASHES = ["6 3", "1 2", "9 4", "2 6"];

const COLOR_BLIND_CUES: readonly SeriesCue[] = [
  { shape: "circle" },
  { dash: "6 3", shape: "square" },
  { dash: "2 2", shape: "triangle" },
  { dash: "9 4", shape: "diamond" },
];

export function getSeriesCue(index: number, palette: Palette): SeriesCue {
  if (palette === "high-contrast") {
    return { dash: HIGH_CONTRAST_DASHES[index % HIGH_CONTRAST_DASHES.length] };
  }
  if (palette === "color-blind") {
    return COLOR_BLIND_CUES[index % COLOR_BLIND_CUES.length];
  }
  return { dash: undefined, shape: undefined };
}

export interface ContrastPair {
  name: string;
  foreground: string;
  background: string;
}

/** Token pairs that must meet WCAG AA 4.5:1 in high-contrast mode. */
export const HIGH_CONTRAST_PAIRS: readonly ContrastPair[] = [
  { name: "body text", foreground: "#000000", background: "#FFFFFF" },
  { name: "body text (dark)", foreground: "#FFFFFF", background: "#000000" },
  { name: "muted text", foreground: "#1A1A1A", background: "#FFFFFF" },
  { name: "primary control", foreground: "#FFFFFF", background: "#005FCC" },
  { name: "success", foreground: "#005A2B", background: "#FFFFFF" },
  { name: "danger", foreground: "#A31616", background: "#FFFFFF" },
  { name: "warning", foreground: "#1A1A1A", background: "#FFD400" },
];

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  if (clean.length === 3) {
    return [0, 1, 2].map((i) => parseInt(clean[i] + clean[i], 16)) as [
      number,
      number,
      number,
    ];
  }
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** WCAG contrast ratio between two hex colors, from 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
