"use client";

import { useState, useCallback, useMemo } from "react";
import {
  PasskeyCredentialMetadata,
  PasskeyChallenge,
  createEnrollmentChallenge,
  verifyEnrollmentResponse,
  verifyPasskeyRemovalConfirmation,
  verifyFallbackAuth,
  SAMPLE_ENROLLED_PASSKEYS,
} from "@/lib/security/passkeys";

export interface UsePasskeyManagerOptions {
  initialPasskeys?: PasskeyCredentialMetadata[];
  currentUserHandle?: string;
}

export function usePasskeyManager(options?: UsePasskeyManagerOptions) {
  const [passkeys, setPasskeys] = useState<PasskeyCredentialMetadata[]>(
    options?.initialPasskeys ?? SAMPLE_ENROLLED_PASSKEYS
  );
  const [activeChallenge, setActiveChallenge] = useState<PasskeyChallenge | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const userHandle = options?.currentUserHandle || "user-alpha-9988";

  const requestEnrollmentChallenge = useCallback(() => {
    setActionError(null);
    setActionSuccess(null);
    setIsEnrolling(true);
    const chal = createEnrollmentChallenge(userHandle);
    setActiveChallenge(chal);
    return chal;
  }, [userHandle]);

  const completeEnrollment = useCallback(
    (credentialName: string, authenticatorType: "platform" | "cross-platform" = "platform") => {
      setActionError(null);
      if (!activeChallenge) {
        setActionError("No active enrollment challenge found. Please retry.");
        return { success: false, error: "No active challenge" };
      }

      // Simulated WebAuthn clientDataJson
      const clientDataJson = JSON.stringify({
        type: "webauthn.create",
        challenge: activeChallenge.challenge,
        origin: "https://app.stellarsettle.org",
      });

      const res = verifyEnrollmentResponse(
        activeChallenge,
        credentialName,
        clientDataJson,
        authenticatorType
      );

      if (res.success && res.passkey) {
        setPasskeys((prev) => [res.passkey!, ...prev]);
        setActiveChallenge(null);
        setIsEnrolling(false);
        setActionSuccess(`Passkey "${res.passkey.name}" registered successfully.`);
        return { success: true };
      } else {
        setActionError(res.error || "Passkey registration failed.");
        setIsEnrolling(false);
        return { success: false, error: res.error };
      }
    },
    [activeChallenge]
  );

  const cancelEnrollment = useCallback(() => {
    setActiveChallenge(null);
    setIsEnrolling(false);
    setActionError(null);
  }, []);

  const removePasskey = useCallback((passkeyId: string, confirmationPhrase: string) => {
    setActionError(null);
    setActionSuccess(null);
    if (!verifyPasskeyRemovalConfirmation(passkeyId, confirmationPhrase)) {
      setActionError('Fresh confirmation failed. You must type "REMOVE" to delete this passkey.');
      return { success: false, error: "Invalid confirmation phrase" };
    }

    setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
    setActionSuccess("Passkey was successfully removed.");
    return { success: true };
  }, []);

  const verifyHighRiskAction = useCallback(
    (
      action: "passkey" | "wallet_signature" | "recovery_code",
      credentialValue: string = "default-valid-sig-12345678"
    ) => {
      setActionError(null);
      setActionSuccess(null);

      if (action === "passkey") {
        if (passkeys.length === 0) {
          setActionError("No passkeys enrolled. Please use fallback verification.");
          return { success: false, error: "No passkeys" };
        }
        setActionSuccess("Action verified using hardware passkey.");
        return { success: true };
      } else {
        const res = verifyFallbackAuth(action, credentialValue);
        if (res.success) {
          setActionSuccess(`Action verified using fallback method (${action.replace("_", " ")}).`);
          return { success: true };
        } else {
          setActionError(res.error || "Fallback verification failed.");
          return { success: false, error: res.error };
        }
      }
    },
    [passkeys.length]
  );

  return {
    passkeys,
    activeChallenge,
    isEnrolling,
    actionError,
    actionSuccess,
    requestEnrollmentChallenge,
    completeEnrollment,
    cancelEnrollment,
    removePasskey,
    verifyHighRiskAction,
  };
}
