import {
  evaluateInvestorTier,
  reconcileRewardLedger,
  validateRedemption,
  LOYALTY_TIERS,
  type InvestorMetricsSnapshot,
  type RewardLedgerEntry,
} from "@/lib/loyalty/loyaltyTiers";

describe("Investor Loyalty Tier Engine (Issue #691)", () => {
  it("evaluates Bronze tier at zero baseline", () => {
    const snap: InvestorMetricsSnapshot = {
      snapshotId: "s-1",
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 0,
      retentionDays: 0,
    };
    const res = evaluateInvestorTier(snap);
    expect(res.tier.name).toBe("bronze");
    expect(res.nextTier?.name).toBe("silver");
    expect(res.tier.yieldMultiplier).toBe(1.0);
    expect(res.volumeNeededForNext).toBe(LOYALTY_TIERS.silver.minVolumeXLM);
  });

  it("evaluates Silver tier when volume and retention meet threshold", () => {
    const snap: InvestorMetricsSnapshot = {
      snapshotId: "s-2",
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 5_000,
      retentionDays: 14,
    };
    const res = evaluateInvestorTier(snap);
    expect(res.tier.name).toBe("silver");
    expect(res.tier.yieldMultiplier).toBe(1.05);
    expect(res.tier.feeDiscountPercent).toBe(15);
  });

  it("enforces strict boundary conditions without off-by-one errors", () => {
    // 4,999 XLM is 1 XLM below Silver -> stays Bronze
    const subSnap: InvestorMetricsSnapshot = {
      snapshotId: "s-boundary-sub",
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 4_999,
      retentionDays: 20,
    };
    expect(evaluateInvestorTier(subSnap).tier.name).toBe("bronze");

    // Exactly 5,000 XLM with 14 days -> evaluates to Silver
    const exactSnap: InvestorMetricsSnapshot = {
      snapshotId: "s-boundary-exact",
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 5_000,
      retentionDays: 14,
    };
    expect(evaluateInvestorTier(exactSnap).tier.name).toBe("silver");
  });

  it("requires both volume and retention for Gold and Platinum tiers", () => {
    // High volume (100k) but insufficient retention (10 days) -> stays Bronze (needs 14d for silver)
    const snapLowRetention: InvestorMetricsSnapshot = {
      snapshotId: "s-3",
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 100_000,
      retentionDays: 10,
    };
    expect(evaluateInvestorTier(snapLowRetention).tier.name).toBe("bronze");

    // High retention (70 days) but low volume (2,000 XLM) -> stays Bronze
    const snapLowVolume: InvestorMetricsSnapshot = {
      snapshotId: "s-4",
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 2_000,
      retentionDays: 70,
    };
    expect(evaluateInvestorTier(snapLowVolume).tier.name).toBe("bronze");
  });

  it("reconciles reward ledger balances correctly", () => {
    const entries: RewardLedgerEntry[] = [
      {
        id: "1",
        type: "yield_multiplier_payout",
        amountXLM: 100,
        timestamp: "2026-11-20T10:00:00Z",
        description: "Yield",
      },
      {
        id: "2",
        type: "fee_rebate",
        amountXLM: 50,
        timestamp: "2026-11-21T10:00:00Z",
        description: "Rebate",
      },
      {
        id: "3",
        type: "redemption",
        amountXLM: 40,
        timestamp: "2026-11-22T10:00:00Z",
        description: "Redemption",
      },
    ];

    const reconciled = reconcileRewardLedger(entries);
    expect(reconciled.totalEarnedXLM).toBe(150);
    expect(reconciled.totalRedeemedXLM).toBe(40);
    expect(reconciled.availableBalanceXLM).toBe(110);
  });

  it("validates redemption requests against available balance", () => {
    const reconciled = reconcileRewardLedger([
      {
        id: "1",
        type: "yield_multiplier_payout",
        amountXLM: 50,
        timestamp: "2026-11-20T10:00:00Z",
        description: "Yield",
      },
    ]);

    expect(validateRedemption(25, reconciled).valid).toBe(true);
    expect(validateRedemption(50, reconciled).valid).toBe(true);
    expect(validateRedemption(51, reconciled).valid).toBe(false);
    expect(validateRedemption(0, reconciled).valid).toBe(false);
  });
});
