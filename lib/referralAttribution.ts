export type ReferralAccountStage = "pending" | "qualified" | "funded" | "retained";

export type ReferralRewardState = "pending" | "paid" | "reversed";

export interface AttributedReferral {
  id: string;
  referralCode: string;
  referrerWallet: string;
  refereeWallet: string;
  refereeName: string;
  stage: ReferralAccountStage;
  rewardState: ReferralRewardState;
  investedAmount: number;
  reward: number;
  attributedAt: string;
  qualifiedAt?: string;
  fundedAt?: string;
  retainedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
  // Private fields — MUST be excluded from institutional CSV exports!
  privateEmail?: string;
  privateKycDocId?: string;
  privateIp?: string;
}

export interface AttributionValidationResult {
  valid: boolean;
  error?: string;
}

export interface ReferralDashboardMetrics {
  totalCount: number;
  qualifiedCount: number;
  fundedCount: number;
  retainedCount: number;
  pendingRewardsTotal: number;
  paidRewardsTotal: number;
  reversedRewardsTotal: number;
  netRewardsDisbursed: number;
}

/**
 * Validates a referral attribution attempt.
 * Prevents self-referral and duplicate attribution.
 */
export function validateReferralAttribution(
  referrerWallet: string,
  refereeWallet: string,
  existingAttributions: readonly AttributedReferral[],
): AttributionValidationResult {
  const normReferrer = (referrerWallet || "").trim().toLowerCase();
  const normReferee = (refereeWallet || "").trim().toLowerCase();

  if (!normReferrer || !normReferee) {
    return { valid: false, error: "Both referrer and referee wallet addresses are required." };
  }

  // 1. Prevent self-referral
  if (normReferrer === normReferee) {
    return {
      valid: false,
      error: "Self-referral is rejected: An account cannot refer itself.",
    };
  }

  // 2. Prevent duplicate referral attribution
  const existing = existingAttributions.find(
    (a) => a.refereeWallet.trim().toLowerCase() === normReferee,
  );
  if (existing) {
    return {
      valid: false,
      error: `Duplicate referral rejected: Account ${refereeWallet} has already been attributed under code ${existing.referralCode}.`,
    };
  }

  return { valid: true };
}

/**
 * Creates an attributed referral with safe attribution checks.
 */
export function createAttributedReferral(
  input: {
    referralCode: string;
    referrerWallet: string;
    refereeWallet: string;
    refereeName: string;
    stage?: ReferralAccountStage;
    investedAmount?: number;
    reward?: number;
    privateEmail?: string;
    privateKycDocId?: string;
    privateIp?: string;
  },
  existingAttributions: readonly AttributedReferral[],
  nowIso: string = new Date().toISOString(),
): { success: boolean; error?: string; referral?: AttributedReferral } {
  const validation = validateReferralAttribution(
    input.referrerWallet,
    input.refereeWallet,
    existingAttributions,
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const stage = input.stage ?? "pending";
  const reward = input.reward ?? (stage === "funded" || stage === "retained" ? 25 : 0);
  const rewardState: ReferralRewardState =
    reward > 0 ? (stage === "retained" ? "paid" : "pending") : "pending";

  const referral: AttributedReferral = {
    id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    referralCode: input.referralCode,
    referrerWallet: input.referrerWallet,
    refereeWallet: input.refereeWallet,
    refereeName: input.refereeName,
    stage,
    rewardState,
    investedAmount: input.investedAmount ?? 0,
    reward,
    attributedAt: nowIso,
    qualifiedAt: stage !== "pending" ? nowIso : undefined,
    fundedAt: stage === "funded" || stage === "retained" ? nowIso : undefined,
    retainedAt: stage === "retained" ? nowIso : undefined,
    privateEmail: input.privateEmail,
    privateKycDocId: input.privateKycDocId,
    privateIp: input.privateIp,
  };

  return { success: true, referral };
}

/**
 * Processes a reward reversal (e.g. chargeback, fraud, compliance clawback).
 */
export function processRewardReversal(
  referral: AttributedReferral,
  reason: string,
  reversedAt: string = new Date().toISOString(),
): AttributedReferral {
  if (referral.rewardState === "reversed") {
    return referral;
  }

  return {
    ...referral,
    rewardState: "reversed",
    reversedAt,
    reversalReason: reason || "Attribution criteria reversed by compliance audit.",
  };
}

/**
 * Computes dashboard aggregate metrics across account stages and reward states.
 */
export function calculateReferralDashboardMetrics(
  referrals: readonly AttributedReferral[],
): ReferralDashboardMetrics {
  let qualifiedCount = 0;
  let fundedCount = 0;
  let retainedCount = 0;
  let pendingRewardsTotal = 0;
  let paidRewardsTotal = 0;
  let reversedRewardsTotal = 0;

  for (const r of referrals) {
    if (r.stage === "qualified" || r.stage === "funded" || r.stage === "retained") {
      qualifiedCount += 1;
    }
    if (r.stage === "funded" || r.stage === "retained") {
      fundedCount += 1;
    }
    if (r.stage === "retained") {
      retainedCount += 1;
    }

    if (r.rewardState === "pending") {
      pendingRewardsTotal += r.reward;
    } else if (r.rewardState === "paid") {
      paidRewardsTotal += r.reward;
    } else if (r.rewardState === "reversed") {
      reversedRewardsTotal += r.reward;
    }
  }

  return {
    totalCount: referrals.length,
    qualifiedCount,
    fundedCount,
    retainedCount,
    pendingRewardsTotal,
    paidRewardsTotal,
    reversedRewardsTotal,
    netRewardsDisbursed: paidRewardsTotal,
  };
}

/**
 * Escapes a field for safe CSV export without formula injection or formatting glitches.
 */
function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  // Prevent CSV injection (characters = + - @ at the start)
  const sanitized = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Exports referral attribution data for institutional reporting.
 * CRITICAL: Strictly excludes private fields (email, KYC ID, IP address).
 */
export function generateInstitutionalReferralCsv(
  referrals: readonly AttributedReferral[],
): string {
  const headers = [
    "Referral ID",
    "Referral Code",
    "Attribution Date",
    "Referee Wallet",
    "Account Stage",
    "Reward State",
    "Invested Amount (XLM)",
    "Reward Amount (XLM)",
    "Reversal Reason",
  ];

  const rows = referrals.map((r) => [
    escapeCsv(r.id),
    escapeCsv(r.referralCode),
    escapeCsv(r.attributedAt),
    escapeCsv(r.refereeWallet),
    escapeCsv(r.stage),
    escapeCsv(r.rewardState),
    escapeCsv(r.investedAmount),
    escapeCsv(r.reward),
    escapeCsv(r.reversalReason ?? ""),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}
