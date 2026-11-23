/**
 * Portfolio concentration math for issue #597.
 *
 * Pure and dependency-free apart from the shared position type. All grouping,
 * share and threshold decisions are computed here so the panel and its tests
 * never need React, a network call, or a DOM.
 */

import type { InvestmentPosition } from "@/lib/portfolio";

export type ConcentrationTab = "debtor" | "jurisdiction" | "maturity" | "issuer";

/** Backend positions may carry these optional concentration dimensions. */
export interface ConcentrationPosition extends InvestmentPosition {
  issuer?: string | null;
  debtor?: string | null;
  jurisdiction?: string | null;
  maturity_bucket?: string | null;
}

export interface ConcentrationBucket {
  /** Stable key used as the React row key. */
  key: string;
  label: string;
  principal: number;
  sharePercent: number;
  warning: boolean;
  positionIds: string[];
}

export const DEFAULT_CONCENTRATION_THRESHOLD = 25;
export const UNSPECIFIED_LABEL = "Unspecified";

const DAY_MS = 24 * 60 * 60 * 1000;

function label(value: unknown): string {
  if (typeof value !== "string") return UNSPECIFIED_LABEL;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || UNSPECIFIED_LABEL;
}

/**
 * Maturity bucket derived from the position lockup time, falling back to the
 * explicit `maturity_bucket` field when the backend supplies one.
 */
export function resolveMaturityBucket(
  position: ConcentrationPosition,
  nowMs: number = Date.now(),
): string {
  if (position.maturity_bucket) return label(position.maturity_bucket);
  if (!position.lockup_expires_at) return UNSPECIFIED_LABEL;

  const expires = Date.parse(position.lockup_expires_at);
  if (Number.isNaN(expires)) return UNSPECIFIED_LABEL;

  const days = Math.ceil((expires - nowMs) / DAY_MS);
  if (days <= 0) return "Matured";
  if (days <= 30) return "0 to 30 days";
  if (days <= 90) return "31 to 90 days";
  if (days <= 365) return "91 to 365 days";
  return "Over 1 year";
}

function bucketKey(position: ConcentrationPosition, tab: ConcentrationTab, nowMs: number): string {
  switch (tab) {
    case "issuer":
      return label(position.issuer);
    case "debtor":
      return label(position.debtor);
    case "jurisdiction":
      return label(position.jurisdiction);
    case "maturity":
      return resolveMaturityBucket(position, nowMs);
  }
}

interface Accumulator {
  key: string;
  label: string;
  principal: number;
  positionIds: string[];
}

/**
 * Group open positions by the selected tab and compute percentage shares.
 *
 * Shares are rounded to two decimals, then any rounding drift is assigned to
 * the largest bucket so a tab always sums to exactly 100. Positions with no
 * positive committed amount are ignored because they carry no exposure.
 */
export function buildConcentrationGroups(
  positions: readonly ConcentrationPosition[],
  tab: ConcentrationTab,
  threshold: number = DEFAULT_CONCENTRATION_THRESHOLD,
  nowMs: number = Date.now(),
): ConcentrationBucket[] {
  const byKey = new Map<string, Accumulator>();
  let total = 0;

  for (const position of positions) {
    if (!position || position.status !== "active") continue;
    const principal = Number(position.committed_amount);
    if (!Number.isFinite(principal) || principal <= 0) continue;

    const key = bucketKey(position, tab, nowMs);
    const existing = byKey.get(key);
    if (existing) {
      existing.principal += principal;
      existing.positionIds.push(position.invoice_id);
    } else {
      byKey.set(key, {
        key,
        label: key,
        principal,
        positionIds: [position.invoice_id],
      });
    }
    total += principal;
  }

  if (total <= 0) return [];

  const buckets = Array.from(byKey.values()).sort(
    (a, b) => b.principal - a.principal || a.key.localeCompare(b.key),
  );

  const shares = buckets.map((bucket) => Math.round((bucket.principal / total) * 10000) / 100);
  const sum = shares.reduce((acc, value) => acc + value, 0);
  const drift = Math.round((100 - sum) * 100) / 100;
  if (drift !== 0 && shares.length > 0) {
    let largestIndex = 0;
    for (let i = 1; i < shares.length; i += 1) {
      if (shares[i] > shares[largestIndex]) largestIndex = i;
    }
    shares[largestIndex] = Math.round((shares[largestIndex] + drift) * 100) / 100;
  }

  return buckets.map((bucket, index) => ({
    key: bucket.key,
    label: bucket.label,
    principal: bucket.principal,
    sharePercent: shares[index],
    warning: shares[index] > threshold,
    positionIds: bucket.positionIds,
  }));
}

/** Convenience check used by the panel and its tests. */
export function sharesSumTo100(buckets: readonly ConcentrationBucket[]): boolean {
  if (buckets.length === 0) return true;
  const sum = buckets.reduce((acc, bucket) => acc + bucket.sharePercent, 0);
  return Math.abs(sum - 100) < 0.001;
}
