import type { InvoiceYieldBoost, YieldBoostTier } from "@/lib/api";

export const YIELD_BOOST_TIER_LABELS: Record<YieldBoostTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Tiers that unlock a yield boost. Bronze does not. */
export const BOOSTED_TIERS: readonly YieldBoostTier[] = ["silver", "gold", "platinum"];

/** Whether a tier unlocks a yield boost at all. */
export function isBoostedTier(tier: YieldBoostTier): boolean {
  return BOOSTED_TIERS.includes(tier);
}

/**
 * Whether the wallet should see boost UI. Unregistered wallets (no boost
 * record) and Bronze-tier wallets get none.
 */
export function isBoostEligible(
  boost: InvoiceYieldBoost | null | undefined,
): boost is InvoiceYieldBoost {
  if (!boost) return false;
  return boost.eligible && isBoostedTier(boost.tier);
}

/** The extra yield, in percentage points, that the boost adds. */
export function getBoostAmount(boost: InvoiceYieldBoost): number {
  return Math.max(0, boost.boosted_yield - boost.base_yield);
}

/** Formats a yield rate for display, e.g. `8.25%`. */
export function formatYieldRate(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}
