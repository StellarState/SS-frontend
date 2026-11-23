/**
 * Deterministic experiment bucketing (#756).
 *
 * A user's variant is a pure function of (experiment name, subject id), so the
 * same user always lands in the same variant on every device and reload.
 */

export interface ExperimentVariant {
  name: string;
  /** Relative weight; weights need not sum to 100. */
  weight: number;
}

export interface ExperimentConfig {
  name: string;
  /** First variant is the control. */
  variants: ExperimentVariant[];
}

export const CONTROL = "control";

/** 32-bit FNV-1a: fast, stable across runtimes, well distributed for ids. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function controlOf(config: ExperimentConfig | undefined): string {
  return config?.variants[0]?.name ?? CONTROL;
}

/** Weighted, stable assignment. Unknown or empty experiments return control. */
export function assignVariant(config: ExperimentConfig | undefined, subjectId: string): string {
  const variants = config?.variants.filter((v) => v.weight > 0) ?? [];
  const total = variants.reduce((sum, v) => sum + v.weight, 0);
  if (!config || total <= 0) return controlOf(config);

  // Map the hash to [0, total) and walk the cumulative weights.
  const point = (hashString(`${config.name}:${subjectId}`) / 0x100000000) * total;
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (point < cumulative) return variant.name;
  }
  return variants[variants.length - 1].name;
}
