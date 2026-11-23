import { describe, it, expect } from "vitest";
import {
  getLoyaltyProgress,
  isRecentlyPromoted,
  TIER_UPGRADE_BANNER_MS,
  calculateLoyaltyTier,
  verifyServerSnapshot,
  evaluateLoyaltyWithSnapshot,
  reconcileRewardLedger,
  redeemReward,
  type ServerLoyaltySnapshot,
  type LoyaltyRewardLedgerEntry,
} from "../loyalty";
import type { InvestorLoyalty } from "../api";

const tiers: InvestorLoyalty["tiers"] = [
  { tier: "bronze", threshold: 0, fee_discount: 0, yield_boost: 0 },
  { tier: "silver", threshold: 10000, fee_discount: 5, yield_boost: 0.25 },
  { tier: "gold", threshold: 50000, fee_discount: 10, yield_boost: 0.5 },
  { tier: "platinum", threshold: 200000, fee_discount: 20, yield_boost: 1 },
];

describe("getLoyaltyProgress", () => {
  it("measures progress from the current tier threshold to the next", () => {
    const progress = getLoyaltyProgress({ tier: "silver", cumulative_volume: 30000, tiers });
    expect(progress.nextTier?.tier).toBe("gold");
    expect(progress.percent).toBe(50);
    expect(progress.remaining).toBe(20000);
    expect(progress.nextThresholdDate).toBeDefined();
  });

  it("reports full progress and no next tier at platinum", () => {
    const progress = getLoyaltyProgress({ tier: "platinum", cumulative_volume: 250000, tiers });
    expect(progress.nextTier).toBeNull();
    expect(progress.percent).toBe(100);
    expect(progress.remaining).toBe(0);
  });
});

describe("isRecentlyPromoted", () => {
  const now = new Date("2026-01-10T12:00:00Z").getTime();

  it("is true inside the 48h window", () => {
    expect(
      isRecentlyPromoted(new Date(now - TIER_UPGRADE_BANNER_MS + 1000).toISOString(), now),
    ).toBe(true);
  });

  it("is false after 48h", () => {
    expect(
      isRecentlyPromoted(new Date(now - TIER_UPGRADE_BANNER_MS - 1000).toISOString(), now),
    ).toBe(false);
  });

  it("is false with no promotion", () => {
    expect(isRecentlyPromoted(null, now)).toBe(false);
  });
});

describe("calculateLoyaltyTier and boundaries", () => {
  it("evaluates bronze when below silver volume or retention", () => {
    // Exact off-by-one boundary checks
    expect(calculateLoyaltyTier(9999, 30, tiers)).toBe("bronze");
    expect(calculateLoyaltyTier(10000, 29, tiers)).toBe("bronze");
    expect(calculateLoyaltyTier(0, 0, tiers)).toBe("bronze");
  });

  it("qualifies for silver at exact boundary (10,000 volume and 30 retention days)", () => {
    expect(calculateLoyaltyTier(10000, 30, tiers)).toBe("silver");
    expect(calculateLoyaltyTier(15000, 45, tiers)).toBe("silver");
  });

  it("evaluates gold boundaries strictly without off-by-one errors", () => {
    expect(calculateLoyaltyTier(49999, 90, tiers)).toBe("silver");
    expect(calculateLoyaltyTier(50000, 89, tiers)).toBe("silver");
    expect(calculateLoyaltyTier(50000, 90, tiers)).toBe("gold");
  });

  it("evaluates platinum boundaries strictly", () => {
    expect(calculateLoyaltyTier(199999, 180, tiers)).toBe("gold");
    expect(calculateLoyaltyTier(200000, 179, tiers)).toBe("gold");
    expect(calculateLoyaltyTier(200000, 180, tiers)).toBe("platinum");
    expect(calculateLoyaltyTier(500000, 365, tiers)).toBe("platinum");
  });

  it("handles negative and non-finite inputs safely", () => {
    expect(calculateLoyaltyTier(-500, 30, tiers)).toBe("bronze");
    expect(calculateLoyaltyTier(NaN, 50, tiers)).toBe("bronze");
  });
});

describe("server snapshot validation and eligibility", () => {
  const now = new Date("2026-11-20T12:00:00Z").getTime();
  const validSnapshot: ServerLoyaltySnapshot = {
    snapshotId: "SNAP-1001",
    wallet: "GINV123",
    evaluatedAt: "2026-11-20T11:00:00Z",
    effectiveDate: "2026-11-20",
    cumulativeVolume: 50000,
    retentionDays: 90,
    calculatedTier: "gold",
  };

  it("verifies a valid server snapshot", () => {
    expect(verifyServerSnapshot(validSnapshot, now)).toBe(true);
  });

  it("rejects missing, forged, or inconsistent snapshots", () => {
    expect(verifyServerSnapshot(null, now)).toBe(false);
    expect(verifyServerSnapshot({ ...validSnapshot, snapshotId: "" }, now)).toBe(false);
    // Calculated tier does not match volume & retention
    expect(verifyServerSnapshot({ ...validSnapshot, calculatedTier: "platinum" }, now)).toBe(false);
  });

  it("prevents eligibility tier updates without a valid server snapshot", () => {
    const baseLoyalty: InvestorLoyalty = {
      tier: "bronze",
      cumulative_volume: 1000,
      tiers,
      promoted_at: null,
    };

    // Missing snapshot cannot alter tier
    const withoutSnapshot = evaluateLoyaltyWithSnapshot(baseLoyalty, null, now);
    expect(withoutSnapshot.evaluationPassed).toBe(false);
    expect(withoutSnapshot.updatedLoyalty.tier).toBe("bronze");

    // Valid snapshot promotes tier
    const withSnapshot = evaluateLoyaltyWithSnapshot(baseLoyalty, validSnapshot, now);
    expect(withSnapshot.evaluationPassed).toBe(true);
    expect(withSnapshot.updatedLoyalty.tier).toBe("gold");
    expect(withSnapshot.updatedLoyalty.promoted_at).toBeDefined();
  });
});

describe("rewards ledger and reconciliation", () => {
  const sampleEntries: LoyaltyRewardLedgerEntry[] = [
    {
      id: "e1",
      date: "2026-11-01T10:00:00Z",
      type: "earned",
      amount: 200,
      description: "Yield boost reward",
      category: "yield_boost",
      status: "cleared",
    },
    {
      id: "e2",
      date: "2026-11-05T12:00:00Z",
      type: "earned",
      amount: 100,
      description: "Fee discount rebate",
      category: "fee_discount",
      status: "cleared",
    },
    {
      id: "e3",
      date: "2026-11-10T15:00:00Z",
      type: "redeemed",
      amount: 80,
      description: "Redemption to wallet",
      category: "cashback",
      status: "cleared",
    },
  ];

  it("reconciles earned and redeemed balances accurately", () => {
    const summary = reconcileRewardLedger(sampleEntries);
    expect(summary.totalEarned).toBe(300);
    expect(summary.totalRedeemed).toBe(80);
    expect(summary.balance).toBe(220);
    expect(summary.reconciled).toBe(true);
  });

  it("successfully processes valid redemptions", () => {
    const summary = reconcileRewardLedger(sampleEntries);
    const result = redeemReward(summary, 50, "Withdrawal to XLM", "2026-11-12T10:00:00Z");

    expect(result.success).toBe(true);
    expect(result.updatedSummary.totalRedeemed).toBe(130);
    expect(result.updatedSummary.balance).toBe(170);
  });

  it("rejects over-redemption and zero/negative amounts", () => {
    const summary = reconcileRewardLedger(sampleEntries); // balance: 220
    const overRedeem = redeemReward(summary, 300);
    expect(overRedeem.success).toBe(false);
    expect(overRedeem.error).toMatch(/insufficient balance/i);

    const negativeRedeem = redeemReward(summary, -10);
    expect(negativeRedeem.success).toBe(false);
  });
});
