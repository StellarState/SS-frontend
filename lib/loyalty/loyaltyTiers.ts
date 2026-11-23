/**
 * Investor Loyalty Tier and Reward Multipliers Domain Engine (Issue #691).
 *
 * Implements tier calculation from volume and retention, snapshot-based
 * evaluation, reward multipliers, progression tracking, and ledger reconciliation.
 */

export type LoyaltyTierName = "bronze" | "silver" | "gold" | "platinum";

export interface LoyaltyTierDefinition {
  name: LoyaltyTierName;
  displayName: string;
  minVolumeXLM: number;
  minRetentionDays: number;
  yieldMultiplier: number; // e.g. 1.15 = 15% yield boost
  feeDiscountPercent: number; // e.g. 30 = 30% fee discount
  benefits: string[];
}

export const LOYALTY_TIERS: Record<LoyaltyTierName, LoyaltyTierDefinition> = {
  bronze: {
    name: "bronze",
    displayName: "Bronze Member",
    minVolumeXLM: 0,
    minRetentionDays: 0,
    yieldMultiplier: 1.0,
    feeDiscountPercent: 0,
    benefits: ["Standard protocol yield", "Full secondary marketplace access"],
  },
  silver: {
    name: "silver",
    displayName: "Silver Investor",
    minVolumeXLM: 5_000,
    minRetentionDays: 14,
    yieldMultiplier: 1.05,
    feeDiscountPercent: 15,
    benefits: ["+5% bonus yield multiplier", "15% discount on settlement fees", "Priority settlement queue"],
  },
  gold: {
    name: "gold",
    displayName: "Gold Partner",
    minVolumeXLM: 25_000,
    minRetentionDays: 30,
    yieldMultiplier: 1.15,
    feeDiscountPercent: 30,
    benefits: ["+15% bonus yield multiplier", "30% protocol fee discount", "Early access to verified prime invoices"],
  },
  platinum: {
    name: "platinum",
    displayName: "Platinum Sovereign",
    minVolumeXLM: 100_000,
    minRetentionDays: 60,
    yieldMultiplier: 1.25,
    feeDiscountPercent: 50,
    benefits: [
      "+25% bonus yield multiplier",
      "50% maximum protocol fee discount",
      "Dedicated institutional liquidation channel",
      "Governance fast-track allocation",
    ],
  },
};

export const TIER_ORDER: LoyaltyTierName[] = ["bronze", "silver", "gold", "platinum"];

export interface InvestorMetricsSnapshot {
  snapshotId: string;
  evaluatedAt: string;
  volume30dXLM: number;
  retentionDays: number;
}

export interface TierEvaluationResult {
  tier: LoyaltyTierDefinition;
  nextTier: LoyaltyTierDefinition | null;
  volumeProgressPercent: number;
  retentionProgressPercent: number;
  overallProgressPercent: number;
  volumeNeededForNext: number;
  retentionDaysNeededForNext: number;
  snapshot: InvestorMetricsSnapshot;
}

export type RewardEntryType = "yield_multiplier_payout" | "fee_rebate" | "redemption";

export interface RewardLedgerEntry {
  id: string;
  type: RewardEntryType;
  amountXLM: number;
  timestamp: string;
  description: string;
}

export interface ReconciledLedger {
  entries: RewardLedgerEntry[];
  totalEarnedXLM: number;
  totalRedeemedXLM: number;
  availableBalanceXLM: number;
}

/**
 * Calculates current tier from snapshot metrics. Strictly avoids off-by-one errors
 * at boundary conditions.
 */
export function evaluateInvestorTier(snapshot: InvestorMetricsSnapshot): TierEvaluationResult {
  const { volume30dXLM, retentionDays } = snapshot;

  let currentTierName: LoyaltyTierName = "bronze";

  // Check from highest to lowest
  if (
    volume30dXLM >= LOYALTY_TIERS.platinum.minVolumeXLM &&
    retentionDays >= LOYALTY_TIERS.platinum.minRetentionDays
  ) {
    currentTierName = "platinum";
  } else if (
    volume30dXLM >= LOYALTY_TIERS.gold.minVolumeXLM &&
    retentionDays >= LOYALTY_TIERS.gold.minRetentionDays
  ) {
    currentTierName = "gold";
  } else if (
    volume30dXLM >= LOYALTY_TIERS.silver.minVolumeXLM &&
    retentionDays >= LOYALTY_TIERS.silver.minRetentionDays
  ) {
    currentTierName = "silver";
  }

  const currentTier = LOYALTY_TIERS[currentTierName];
  const currentIndex = TIER_ORDER.indexOf(currentTierName);
  const nextTier =
    currentIndex < TIER_ORDER.length - 1 ? LOYALTY_TIERS[TIER_ORDER[currentIndex + 1]] : null;

  let volumeProgressPercent = 100;
  let retentionProgressPercent = 100;
  let volumeNeededForNext = 0;
  let retentionDaysNeededForNext = 0;

  if (nextTier) {
    const volumeRange = nextTier.minVolumeXLM - currentTier.minVolumeXLM;
    const currentVolumeDelta = Math.max(0, volume30dXLM - currentTier.minVolumeXLM);
    volumeProgressPercent = Math.min(100, (currentVolumeDelta / volumeRange) * 100);
    volumeNeededForNext = Math.max(0, nextTier.minVolumeXLM - volume30dXLM);

    const retentionRange = nextTier.minRetentionDays - currentTier.minRetentionDays;
    const currentRetentionDelta = Math.max(0, retentionDays - currentTier.minRetentionDays);
    retentionProgressPercent = Math.min(100, (currentRetentionDelta / retentionRange) * 100);
    retentionDaysNeededForNext = Math.max(0, nextTier.minRetentionDays - retentionDays);
  }

  const overallProgressPercent = nextTier
    ? Math.round((volumeProgressPercent + retentionProgressPercent) / 2)
    : 100;

  return {
    tier: currentTier,
    nextTier,
    volumeProgressPercent: Math.round(volumeProgressPercent),
    retentionProgressPercent: Math.round(retentionProgressPercent),
    overallProgressPercent,
    volumeNeededForNext,
    retentionDaysNeededForNext,
    snapshot,
  };
}

/**
 * Reconciles reward ledger entries, ensuring consistency between credits and debits.
 */
export function reconcileRewardLedger(entries: RewardLedgerEntry[]): ReconciledLedger {
  let totalEarnedXLM = 0;
  let totalRedeemedXLM = 0;

  for (const entry of entries) {
    if (entry.type === "redemption") {
      totalRedeemedXLM += entry.amountXLM;
    } else {
      totalEarnedXLM += entry.amountXLM;
    }
  }

  const availableBalanceXLM = Math.max(0, totalEarnedXLM - totalRedeemedXLM);

  return {
    entries: [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
    totalEarnedXLM,
    totalRedeemedXLM,
    availableBalanceXLM,
  };
}

/**
 * Validates whether a redemption request can be executed without overdrawing.
 */
export function validateRedemption(
  requestedAmountXLM: number,
  reconciled: ReconciledLedger,
): { valid: boolean; error?: string } {
  if (requestedAmountXLM <= 0) {
    return { valid: false, error: "Redemption amount must be greater than zero." };
  }
  if (requestedAmountXLM > reconciled.availableBalanceXLM) {
    return {
      valid: false,
      error: `Insufficient reward balance. Available: ${reconciled.availableBalanceXLM.toFixed(2)} XLM.`,
    };
  }
  return { valid: true };
}
