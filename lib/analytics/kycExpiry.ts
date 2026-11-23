/**
 * KYC Document Expiry & Re-Verification Domain Logic (Issue #672)
 *
 * Implements accreditation lifecycle management:
 * - Timezone-aware countdown tracking
 * - 30, 14, and 7-day proactive reminder milestones
 * - Automated restriction of high-risk actions during final 7-day grace window
 * - Field preservation on fast-track re-verification
 * - Immediate notification silencing upon renewal submission
 */

export type KycExpiryState =
  | "active" // > 30 days
  | "expiring_soon_30" // 15 to 30 days
  | "expiring_soon_14" // 8 to 14 days
  | "grace_period_7" // 1 to 7 days (grace window - restrictions applied)
  | "expired" // <= 0 days (all restricted)
  | "renewed_pending"; // re-verification submitted

export interface KycPreservedFields {
  legalEntityName: string;
  taxId: string;
  registeredAddress: string;
  jurisdiction: string;
  authorizedSigners: string[];
}

export interface KycExpiryProfile {
  userId: string;
  userName: string;
  documentType: string;
  documentNumber: string;
  expiresAt: string; // ISO date
  timeZone: string;
  state: KycExpiryState;
  daysRemaining: number;
  hoursRemaining: number;
  reminderMilestone: 30 | 14 | 7 | null;
  activeRestrictions: string[];
  notificationsActive: boolean;
  preservedFields: KycPreservedFields;
}

export interface ReVerificationSubmission {
  newDocumentFile: string;
  newExpiresAt: string;
  notes?: string;
}

export const RESTRICTED_ACTIONS_GRACE = [
  "create_new_invoice",
  "increase_credit_line",
  "large_liquidity_withdrawal",
];

export const RESTRICTED_ACTIONS_EXPIRED = [
  "create_new_invoice",
  "increase_credit_line",
  "large_liquidity_withdrawal",
  "secondary_market_trading",
  "settlement_claim_distribution",
];

/**
 * Calculates countdown and expiry state given expiration ISO timestamp and current time.
 */
export function computeKycExpiryState(
  expiresAtIso: string,
  nowMs: number = Date.now(),
  timeZone: string = "UTC"
): {
  state: KycExpiryState;
  daysRemaining: number;
  hoursRemaining: number;
  reminderMilestone: 30 | 14 | 7 | null;
  countdownFormatted: string;
  activeRestrictions: string[];
  notificationsActive: boolean;
} {
  const expiryMs = new Date(expiresAtIso).getTime();
  const diffMs = expiryMs - nowMs;

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const daysRemaining = Math.max(0, Math.floor(totalHours / 24));
  const hoursRemaining = Math.max(0, totalHours % 24);

  let state: KycExpiryState = "active";
  let reminderMilestone: 30 | 14 | 7 | null = null;
  let activeRestrictions: string[] = [];
  let notificationsActive = false;

  if (diffMs <= 0) {
    state = "expired";
    activeRestrictions = [...RESTRICTED_ACTIONS_EXPIRED];
    notificationsActive = true;
  } else if (daysRemaining <= 7) {
    state = "grace_period_7";
    reminderMilestone = 7;
    activeRestrictions = [...RESTRICTED_ACTIONS_GRACE];
    notificationsActive = true;
  } else if (daysRemaining <= 14) {
    state = "expiring_soon_14";
    reminderMilestone = 14;
    notificationsActive = true;
  } else if (daysRemaining <= 30) {
    state = "expiring_soon_30";
    reminderMilestone = 30;
    notificationsActive = true;
  }

  // Format timezone-aware countdown
  let countdownFormatted = "";
  if (diffMs <= 0) {
    countdownFormatted = `Expired (${timeZone})`;
  } else if (daysRemaining > 0) {
    countdownFormatted = `${daysRemaining}d ${hoursRemaining}h (${timeZone})`;
  } else {
    countdownFormatted = `${hoursRemaining}h remaining (${timeZone})`;
  }

  return {
    state,
    daysRemaining,
    hoursRemaining,
    reminderMilestone,
    countdownFormatted,
    activeRestrictions,
    notificationsActive,
  };
}

/**
 * Checks whether an action is permitted and provides explicit expiry reasoning if blocked.
 */
export function evaluateActionPermission(
  action: string,
  state: KycExpiryState,
  daysRemaining: number
): { allowed: boolean; reason?: string } {
  if (state === "renewed_pending" || state === "active") {
    return { allowed: true };
  }

  if (state === "expired") {
    if (RESTRICTED_ACTIONS_EXPIRED.includes(action)) {
      return {
        allowed: false,
        reason:
          "KYC accreditation expired. Complete re-verification to restore full protocol access.",
      };
    }
  }

  if (state === "grace_period_7") {
    if (RESTRICTED_ACTIONS_GRACE.includes(action)) {
      return {
        allowed: false,
        reason: `Action blocked during final ${daysRemaining}-day grace window. Fast-track re-verification required to unlock new issuance and capital operations.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Submits re-verification renewal, preserving accepted historical fields and silencing alerts.
 */
export function applyKycReVerification(
  currentProfile: KycExpiryProfile,
  submission: ReVerificationSubmission
): KycExpiryProfile {
  return {
    ...currentProfile,
    expiresAt: submission.newExpiresAt,
    state: "renewed_pending",
    notificationsActive: false, // Notifications stop after renewal
    activeRestrictions: [], // Grace restrictions unblocked on submission
    reminderMilestone: null,
    // Preserved fields remain untouched
    preservedFields: {
      ...currentProfile.preservedFields,
    },
  };
}

export const SAMPLE_EXPIRING_KYC_PROFILE: KycExpiryProfile = {
  userId: "usr-stellar-4401",
  userName: "Elena Rostova",
  documentType: "Corporate Certificate of Incumbency",
  documentNumber: "INC-2024-88912-US",
  expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(), // ~5 days (grace period)
  timeZone: "America/New_York",
  state: "grace_period_7",
  daysRemaining: 5,
  hoursRemaining: 14,
  reminderMilestone: 7,
  activeRestrictions: [...RESTRICTED_ACTIONS_GRACE],
  notificationsActive: true,
  preservedFields: {
    legalEntityName: "Meridian Trade Finance Corp",
    taxId: "XX-XXX4912",
    registeredAddress: "450 Lexington Ave, New York, NY 10017",
    jurisdiction: "United States (Delaware)",
    authorizedSigners: ["Elena Rostova", "Marcus Vance"],
  },
};
