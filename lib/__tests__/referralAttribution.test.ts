import { describe, it, expect } from "vitest";
import {
  type AttributedReferral,
  validateReferralAttribution,
  createAttributedReferral,
  processRewardReversal,
  calculateReferralDashboardMetrics,
  generateInstitutionalReferralCsv,
} from "../referralAttribution";

const existingReferrals: AttributedReferral[] = [
  {
    id: "ref-1",
    referralCode: "STELLAR-ALPHA",
    referrerWallet: "G_USER_WALLET_123",
    refereeWallet: "G_REFEREE_WALLET_ABC",
    refereeName: "Alice",
    stage: "retained",
    rewardState: "paid",
    investedAmount: 1000,
    reward: 25,
    attributedAt: "2026-09-01T10:00:00Z",
    privateEmail: "alice@secret.com",
    privateKycDocId: "PASSPORT-9988",
    privateIp: "10.0.0.99",
  },
  {
    id: "ref-2",
    referralCode: "STELLAR-ALPHA",
    referrerWallet: "G_USER_WALLET_123",
    refereeWallet: "G_REFEREE_WALLET_DEF",
    refereeName: "Bob",
    stage: "funded",
    rewardState: "pending",
    investedAmount: 500,
    reward: 25,
    attributedAt: "2026-09-15T12:00:00Z",
    privateEmail: "bob@secret.com",
    privateKycDocId: "ID-1122",
    privateIp: "10.0.0.100",
  },
];

describe("referral attribution and fraud validation", () => {
  it("rejects self-referrals when referrer and referee addresses match", () => {
    const res = validateReferralAttribution(
      "G_USER_WALLET_123",
      "G_USER_WALLET_123",
      existingReferrals,
    );
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/self-referral is rejected/i);

    // Case-insensitivity check
    const caseInsensitive = validateReferralAttribution(
      "g_user_wallet_123",
      "G_USER_WALLET_123",
      existingReferrals,
    );
    expect(caseInsensitive.valid).toBe(false);
  });

  it("rejects duplicate referrals for an already attributed referee account", () => {
    const res = validateReferralAttribution(
      "G_USER_WALLET_123",
      "G_REFEREE_WALLET_ABC",
      existingReferrals,
    );
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/duplicate referral rejected/i);
  });

  it("allows attribution for new unique referee wallets", () => {
    const res = validateReferralAttribution(
      "G_USER_WALLET_123",
      "G_NEW_REFEREE_WALLET_XYZ",
      existingReferrals,
    );
    expect(res.valid).toBe(true);
  });

  it("creates an attributed referral and sets reward state accordingly", () => {
    const createRes = createAttributedReferral(
      {
        referralCode: "STELLAR-ALPHA",
        referrerWallet: "G_USER_WALLET_123",
        refereeWallet: "G_NEW_REFEREE_WALLET_XYZ",
        refereeName: "Charlie",
        stage: "funded",
        investedAmount: 800,
        privateEmail: "charlie@secret.com",
      },
      existingReferrals,
    );

    expect(createRes.success).toBe(true);
    expect(createRes.referral).toBeDefined();
    expect(createRes.referral?.stage).toBe("funded");
    expect(createRes.referral?.rewardState).toBe("pending");
    expect(createRes.referral?.reward).toBe(25);
  });
});

describe("reward reversals", () => {
  it("transitions reward state to reversed with audit reason and timestamp", () => {
    const initial = existingReferrals[1]; // pending reward
    const reversed = processRewardReversal(
      initial,
      "Chargeback detected on payment transaction",
      "2026-09-20T10:00:00Z",
    );

    expect(reversed.rewardState).toBe("reversed");
    expect(reversed.reversedAt).toBe("2026-09-20T10:00:00Z");
    expect(reversed.reversalReason).toBe("Chargeback detected on payment transaction");
  });

  it("is idempotent when already reversed", () => {
    const initial = existingReferrals[1];
    const reversedOnce = processRewardReversal(initial, "Reason 1");
    const reversedTwice = processRewardReversal(reversedOnce, "Reason 2");

    expect(reversedTwice.rewardState).toBe("reversed");
    expect(reversedTwice.reversalReason).toBe("Reason 1");
  });
});

describe("dashboard metrics aggregation", () => {
  it("separates qualified, funded, and retained accounts correctly", () => {
    const metrics = calculateReferralDashboardMetrics(existingReferrals);

    expect(metrics.totalCount).toBe(2);
    expect(metrics.qualifiedCount).toBe(2); // both are >= qualified
    expect(metrics.fundedCount).toBe(2); // one funded, one retained
    expect(metrics.retainedCount).toBe(1); // one retained
    expect(metrics.paidRewardsTotal).toBe(25);
    expect(metrics.pendingRewardsTotal).toBe(25);
    expect(metrics.reversedRewardsTotal).toBe(0);
  });

  it("includes reversed rewards in totals accurately", () => {
    const reversedRef: AttributedReferral = {
      ...existingReferrals[0],
      id: "ref-reversed",
      rewardState: "reversed",
      reversalReason: "Fraud detected",
    };

    const metrics = calculateReferralDashboardMetrics([reversedRef, existingReferrals[1]]);
    expect(metrics.reversedRewardsTotal).toBe(25);
    expect(metrics.paidRewardsTotal).toBe(0);
  });
});

describe("institutional CSV export security", () => {
  it("strictly excludes private fields (email, KYC ID, IP address) from CSV output", () => {
    const csv = generateInstitutionalReferralCsv(existingReferrals);

    // Verify CSV header contains only public institutional columns
    expect(csv).toContain("Referral ID");
    expect(csv).toContain("Attribution Date");
    expect(csv).toContain("Referee Wallet");
    expect(csv).toContain("Account Stage");
    expect(csv).toContain("Reward State");

    // CRITICAL SECURITY CHECKS: None of the private fields must be present anywhere in the CSV
    expect(csv).not.toContain("alice@secret.com");
    expect(csv).not.toContain("bob@secret.com");
    expect(csv).not.toContain("PASSPORT-9988");
    expect(csv).not.toContain("ID-1122");
    expect(csv).not.toContain("10.0.0.99");
    expect(csv).not.toContain("10.0.0.100");
    expect(csv).not.toContain("privateEmail");
    expect(csv).not.toContain("privateKycDocId");
    expect(csv).not.toContain("privateIp");
  });

  it("sanitizes potential formula injection symbols in CSV fields", () => {
    const maliciousReferral: AttributedReferral = {
      id: "=1+1",
      referralCode: "+DANGEROUS",
      referrerWallet: "G_USER",
      refereeWallet: "@ATTACK",
      refereeName: "Hacker",
      stage: "qualified",
      rewardState: "pending",
      investedAmount: 100,
      reward: 25,
      attributedAt: "2026-10-01T00:00:00Z",
    };

    const csv = generateInstitutionalReferralCsv([maliciousReferral]);
    // Formula characters must be escaped with a leading apostrophe
    expect(csv).toContain("\"'=1+1\"");
    expect(csv).toContain("\"'+DANGEROUS\"");
    expect(csv).toContain("\"'@ATTACK\"");
  });
});
