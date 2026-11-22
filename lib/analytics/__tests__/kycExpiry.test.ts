import { describe, it, expect } from "vitest";
import {
  computeKycExpiryState,
  evaluateActionPermission,
  applyKycReVerification,
  SAMPLE_EXPIRING_KYC_PROFILE,
} from "../kycExpiry";

describe("KYC Document Expiry & Re-Verification Logic (#672)", () => {
  it("calculates timezone-correct countdown and state across expiry milestones", () => {
    const nowMs = 1700000000000;

    // 25 days out (expiring_soon_30)
    const exp25d = new Date(nowMs + 25 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString();
    const res25 = computeKycExpiryState(exp25d, nowMs, "America/New_York");
    expect(res25.state).toBe("expiring_soon_30");
    expect(res25.reminderMilestone).toBe(30);
    expect(res25.daysRemaining).toBe(25);
    expect(res25.notificationsActive).toBe(true);
    expect(res25.countdownFormatted).toContain("25d");
    expect(res25.countdownFormatted).toContain("America/New_York");

    // 10 days out (expiring_soon_14)
    const exp10d = new Date(nowMs + 10 * 24 * 3600 * 1000).toISOString();
    const res10 = computeKycExpiryState(exp10d, nowMs, "Europe/London");
    expect(res10.state).toBe("expiring_soon_14");
    expect(res10.reminderMilestone).toBe(14);
    expect(res10.countdownFormatted).toContain("Europe/London");

    // 5 days out (grace_period_7)
    const exp5d = new Date(nowMs + 5 * 24 * 3600 * 1000).toISOString();
    const res5 = computeKycExpiryState(exp5d, nowMs, "UTC");
    expect(res5.state).toBe("grace_period_7");
    expect(res5.reminderMilestone).toBe(7);
    expect(res5.activeRestrictions.length).toBeGreaterThan(0);

    // Expired
    const expPast = new Date(nowMs - 2 * 3600 * 1000).toISOString();
    const resExpired = computeKycExpiryState(expPast, nowMs, "UTC");
    expect(resExpired.state).toBe("expired");
    expect(resExpired.countdownFormatted).toBe("Expired (UTC)");
  });

  it("blocks restricted actions in grace period with explicit expiry reasons", () => {
    const blockedIssuance = evaluateActionPermission("create_new_invoice", "grace_period_7", 5);
    expect(blockedIssuance.allowed).toBe(false);
    expect(blockedIssuance.reason).toContain("Action blocked during final 5-day grace window");

    const blockedCredit = evaluateActionPermission("increase_credit_line", "grace_period_7", 3);
    expect(blockedCredit.allowed).toBe(false);
    expect(blockedCredit.reason).toContain("grace window");

    // Unrestricted normal view action allowed
    const allowedAction = evaluateActionPermission("view_portfolio", "grace_period_7", 5);
    expect(allowedAction.allowed).toBe(true);
  });

  it("preserves accepted historical fields on re-verification submission and stops notifications", () => {
    const renewalResult = applyKycReVerification(SAMPLE_EXPIRING_KYC_PROFILE, {
      newDocumentFile: "Incumbency_2027_Signed.pdf",
      newExpiresAt: "2027-11-22T00:00:00.000Z",
    });

    // State transitions to renewed_pending
    expect(renewalResult.state).toBe("renewed_pending");

    // Notifications and reminders silenced
    expect(renewalResult.notificationsActive).toBe(false);
    expect(renewalResult.reminderMilestone).toBeNull();
    expect(renewalResult.activeRestrictions).toHaveLength(0);

    // Verified fields are completely preserved
    expect(renewalResult.preservedFields.legalEntityName).toBe("Meridian Trade Finance Corp");
    expect(renewalResult.preservedFields.taxId).toBe("XX-XXX4912");
    expect(renewalResult.preservedFields.jurisdiction).toBe("United States (Delaware)");
    expect(renewalResult.preservedFields.authorizedSigners).toEqual([
      "Elena Rostova",
      "Marcus Vance",
    ]);
  });
});
