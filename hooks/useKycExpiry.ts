"use client";

import { useState, useMemo, useCallback } from "react";
import {
  KycExpiryProfile,
  KycExpiryState,
  ReVerificationSubmission,
  computeKycExpiryState,
  evaluateActionPermission,
  applyKycReVerification,
  SAMPLE_EXPIRING_KYC_PROFILE,
} from "@/lib/analytics/kycExpiry";

export interface UseKycExpiryOptions {
  initialProfile?: KycExpiryProfile;
}

export function useKycExpiry(options?: UseKycExpiryOptions) {
  const [profile, setProfile] = useState<KycExpiryProfile>(
    options?.initialProfile ?? SAMPLE_EXPIRING_KYC_PROFILE
  );
  const [isReverifying, setIsReverifying] = useState(false);

  const expiryStateCalculated = useMemo(() => {
    if (profile.state === "renewed_pending") {
      return {
        state: "renewed_pending" as KycExpiryState,
        daysRemaining: 365,
        hoursRemaining: 0,
        reminderMilestone: null,
        countdownFormatted: "Renewal Under Review",
        activeRestrictions: [],
        notificationsActive: false,
      };
    }
    return computeKycExpiryState(profile.expiresAt, Date.now(), profile.timeZone);
  }, [profile.expiresAt, profile.timeZone, profile.state]);

  const checkAction = useCallback(
    (action: string) => {
      return evaluateActionPermission(
        action,
        expiryStateCalculated.state,
        expiryStateCalculated.daysRemaining
      );
    },
    [expiryStateCalculated.state, expiryStateCalculated.daysRemaining]
  );

  const submitRenewal = useCallback(
    (submission: ReVerificationSubmission) => {
      setIsReverifying(true);
      const updated = applyKycReVerification(profile, submission);
      setProfile(updated);
      setIsReverifying(false);
      return { success: true };
    },
    [profile]
  );

  const simulateState = useCallback((scenario: "30_days" | "grace_7" | "expired" | "renewed") => {
    const nowMs = Date.now();
    if (scenario === "30_days") {
      const exp = new Date(nowMs + 25 * 24 * 3600 * 1000).toISOString();
      const meta = computeKycExpiryState(exp, nowMs, "America/New_York");
      setProfile((prev) => ({
        ...prev,
        expiresAt: exp,
        state: meta.state,
        daysRemaining: meta.daysRemaining,
        hoursRemaining: meta.hoursRemaining,
        activeRestrictions: meta.activeRestrictions,
        notificationsActive: meta.notificationsActive,
      }));
    } else if (scenario === "grace_7") {
      const exp = new Date(nowMs + 5 * 24 * 3600 * 1000).toISOString();
      const meta = computeKycExpiryState(exp, nowMs, "America/New_York");
      setProfile((prev) => ({
        ...prev,
        expiresAt: exp,
        state: meta.state,
        daysRemaining: meta.daysRemaining,
        hoursRemaining: meta.hoursRemaining,
        activeRestrictions: meta.activeRestrictions,
        notificationsActive: meta.notificationsActive,
      }));
    } else if (scenario === "expired") {
      const exp = new Date(nowMs - 2 * 24 * 3600 * 1000).toISOString();
      const meta = computeKycExpiryState(exp, nowMs, "America/New_York");
      setProfile((prev) => ({
        ...prev,
        expiresAt: exp,
        state: meta.state,
        daysRemaining: meta.daysRemaining,
        hoursRemaining: meta.hoursRemaining,
        activeRestrictions: meta.activeRestrictions,
        notificationsActive: meta.notificationsActive,
      }));
    } else if (scenario === "renewed") {
      setProfile((prev) => ({
        ...prev,
        state: "renewed_pending",
        notificationsActive: false,
        activeRestrictions: [],
      }));
    }
  }, []);

  return {
    profile,
    expiryState: expiryStateCalculated.state,
    daysRemaining: expiryStateCalculated.daysRemaining,
    countdownFormatted: expiryStateCalculated.countdownFormatted,
    activeRestrictions: expiryStateCalculated.activeRestrictions,
    notificationsActive: expiryStateCalculated.notificationsActive,
    checkAction,
    submitRenewal,
    isReverifying,
    simulateState,
  };
}
