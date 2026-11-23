import type { InvestorLoyalty, LoyaltyTierDefinition, LoyaltyTierName } from "@/lib/api";

export const LOYALTY_TIER_LABELS: Record<LoyaltyTierName, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

/** Standard retention day requirements per tier. */
export const TIER_RETENTION_DAYS: Record<LoyaltyTierName, number> = {
  bronze: 0,
  silver: 30,
  gold: 90,
  platinum: 180,
};

/** Default evaluation window in milliseconds (30 days). */
export const SNAPSHOT_VALIDITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** How long the promotion banner stays up after a tier upgrade. */
export const TIER_UPGRADE_BANNER_MS = 48 * 60 * 60 * 1000;

export interface ServerLoyaltySnapshot {
  snapshotId: string;
  wallet: string;
  evaluatedAt: string;
  effectiveDate: string;
  cumulativeVolume: number;
  retentionDays: number;
  calculatedTier: LoyaltyTierName;
  signature?: string;
}

export interface LoyaltyProgress {
  nextTier: LoyaltyTierDefinition | null;
  /** 0-100. 100 once the top tier is reached. */
  percent: number;
  remaining: number;
  /** Estimated date for next threshold evaluation */
  nextThresholdDate?: string;
  retentionDaysNeeded?: number;
}

export interface LoyaltyRewardLedgerEntry {
  id: string;
  date: string;
  type: "earned" | "redeemed";
  amount: number;
  description: string;
  category: "yield_boost" | "fee_discount" | "volume_bonus" | "cashback";
  status: "cleared" | "pending";
}

export interface LoyaltyLedgerSummary {
  totalEarned: number;
  totalRedeemed: number;
  balance: number;
  reconciled: boolean;
  entries: LoyaltyRewardLedgerEntry[];
}

/**
 * Calculates the qualified tier from volume AND retention days without off-by-one errors.
 * Both thresholds must be met (inclusive: volume >= threshold && retentionDays >= requiredDays).
 */
export function calculateLoyaltyTier(
  volume: number,
  retentionDays: number,
  customTiers?: LoyaltyTierDefinition[],
): LoyaltyTierName {
  if (volume < 0 || retentionDays < 0 || !Number.isFinite(volume) || !Number.isFinite(retentionDays)) {
    return "bronze";
  }

  // Thresholds: Platinum (200,000 XLM, 180d), Gold (50,000 XLM, 90d), Silver (10,000 XLM, 30d), Bronze (0 XLM, 0d)
  const platinumVol = customTiers?.find((t) => t.tier === "platinum")?.threshold ?? 200000;
  const goldVol = customTiers?.find((t) => t.tier === "gold")?.threshold ?? 50000;
  const silverVol = customTiers?.find((t) => t.tier === "silver")?.threshold ?? 10000;

  if (volume >= platinumVol && retentionDays >= TIER_RETENTION_DAYS.platinum) {
    return "platinum";
  }
  if (volume >= goldVol && retentionDays >= TIER_RETENTION_DAYS.gold) {
    return "gold";
  }
  if (volume >= silverVol && retentionDays >= TIER_RETENTION_DAYS.silver) {
    return "silver";
  }
  return "bronze";
}

/**
 * Validates a server snapshot to ensure eligibility changes cannot occur without verified server proof.
 */
export function verifyServerSnapshot(
  snapshot: ServerLoyaltySnapshot | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!snapshot) return false;
  if (!snapshot.snapshotId || !snapshot.wallet || !snapshot.evaluatedAt || !snapshot.effectiveDate) {
    return false;
  }
  const evalTime = Date.parse(snapshot.evaluatedAt);
  if (Number.isNaN(evalTime)) return false;

  // Snapshot must not be from the future (clock skew tolerance of 5 mins)
  if (evalTime > nowMs + 5 * 60 * 1000) return false;

  // Snapshot must not be older than the validity window
  if (nowMs - evalTime > SNAPSHOT_VALIDITY_WINDOW_MS) return false;

  // Verify that calculated tier matches the criteria
  const expectedTier = calculateLoyaltyTier(snapshot.cumulativeVolume, snapshot.retentionDays);
  if (snapshot.calculatedTier !== expectedTier) return false;

  return true;
}

/**
 * Evaluates loyalty tier progression based on volume, retention, and server snapshot.
 */
export function evaluateLoyaltyWithSnapshot(
  currentLoyalty: InvestorLoyalty,
  snapshot: ServerLoyaltySnapshot | null | undefined,
  nowMs: number = Date.now(),
): { updatedLoyalty: InvestorLoyalty; evaluationPassed: boolean; reason?: string } {
  if (!snapshot) {
    return {
      updatedLoyalty: currentLoyalty,
      evaluationPassed: false,
      reason: "Missing server snapshot. Tier updates require server evaluation.",
    };
  }

  if (!verifyServerSnapshot(snapshot, nowMs)) {
    return {
      updatedLoyalty: currentLoyalty,
      evaluationPassed: false,
      reason: "Invalid or expired server snapshot.",
    };
  }

  const newTier = snapshot.calculatedTier;
  const isUpgraded = newTier !== currentLoyalty.tier;

  return {
    updatedLoyalty: {
      ...currentLoyalty,
      tier: newTier,
      cumulative_volume: snapshot.cumulativeVolume,
      promoted_at: isUpgraded ? new Date(nowMs).toISOString() : currentLoyalty.promoted_at,
    },
    evaluationPassed: true,
  };
}

/**
 * Reconciles the earned and redeemed reward ledger.
 * Balance = totalEarned - totalRedeemed.
 */
export function reconcileRewardLedger(
  entries: LoyaltyRewardLedgerEntry[],
): LoyaltyLedgerSummary {
  let totalEarned = 0;
  let totalRedeemed = 0;

  for (const entry of entries) {
    if (entry.status !== "cleared") continue;
    if (entry.type === "earned") {
      totalEarned += Math.max(0, entry.amount);
    } else if (entry.type === "redeemed") {
      totalRedeemed += Math.max(0, entry.amount);
    }
  }

  // Rounded to 4 decimal places for currency precision
  totalEarned = Math.round(totalEarned * 10000) / 10000;
  totalRedeemed = Math.round(totalRedeemed * 10000) / 10000;
  const balance = Math.round((totalEarned - totalRedeemed) * 10000) / 10000;
  const reconciled = balance >= 0;

  return {
    totalEarned,
    totalRedeemed,
    balance: Math.max(0, balance),
    reconciled,
    entries: [...entries].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
  };
}

/**
 * Safely processes a reward redemption, ensuring balance cannot become negative.
 */
export function redeemReward(
  currentSummary: LoyaltyLedgerSummary,
  amount: number,
  description: string = "Reward redemption",
  nowIso: string = new Date().toISOString(),
): { success: boolean; error?: string; updatedSummary: LoyaltyLedgerSummary } {
  if (amount <= 0 || !Number.isFinite(amount)) {
    return { success: false, error: "Redemption amount must be greater than zero.", updatedSummary: currentSummary };
  }

  if (amount > currentSummary.balance) {
    return {
      success: false,
      error: `Insufficient balance. Available: ${currentSummary.balance} XLM, Requested: ${amount} XLM.`,
      updatedSummary: currentSummary,
    };
  }

  const newEntry: LoyaltyRewardLedgerEntry = {
    id: `redemption-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: nowIso,
    type: "redeemed",
    amount,
    description,
    category: "cashback",
    status: "cleared",
  };

  const updatedEntries = [newEntry, ...currentSummary.entries];
  const updatedSummary = reconcileRewardLedger(updatedEntries);

  return {
    success: true,
    updatedSummary,
  };
}

export function getLoyaltyProgress(loyalty: InvestorLoyalty, retentionDays: number = 0): LoyaltyProgress {
  const ordered = [...loyalty.tiers].sort((a, b) => a.threshold - b.threshold);
  const currentIndex = ordered.findIndex((t) => t.tier === loyalty.tier);
  const current = ordered[currentIndex];
  const nextTier = currentIndex >= 0 ? ordered[currentIndex + 1] ?? null : null;

  if (!nextTier) {
    return {
      nextTier: null,
      percent: 100,
      remaining: 0,
    };
  }

  const floor = current?.threshold ?? 0;
  const span = nextTier.threshold - floor;
  const done = loyalty.cumulative_volume - floor;
  const percent = span > 0 ? Math.min(100, Math.max(0, (done / span) * 100)) : 100;
  const remaining = Math.max(0, nextTier.threshold - loyalty.cumulative_volume);

  const reqDays = TIER_RETENTION_DAYS[nextTier.tier];
  const retentionDaysNeeded = Math.max(0, reqDays - retentionDays);

  // Next threshold date estimate (30 days from now or when retention is reached)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Math.max(30, retentionDaysNeeded));
  const nextThresholdDate = targetDate.toISOString().split("T")[0];

  return {
    nextTier,
    percent,
    remaining,
    nextThresholdDate,
    retentionDaysNeeded,
  };
}

export function isRecentlyPromoted(
  promotedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!promotedAt) return false;
  const promoted = new Date(promotedAt).getTime();
  if (Number.isNaN(promoted)) return false;
  const age = now - promoted;
  return age >= 0 && age < TIER_UPGRADE_BANNER_MS;
}
