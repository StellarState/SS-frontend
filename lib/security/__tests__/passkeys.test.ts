import { describe, it, expect } from "vitest";
import {
  createEnrollmentChallenge,
  verifyEnrollmentResponse,
  verifyPasskeyRemovalConfirmation,
  requireWalletTransactionProof,
  verifyFallbackAuth,
  sanitizePasskeyForDisplay,
  SAMPLE_ENROLLED_PASSKEYS,
  PasskeyChallenge,
} from "../passkeys";

describe("Passkey Security Logic (#674)", () => {
  it("generates a valid, non-expired enrollment challenge", () => {
    const chal = createEnrollmentChallenge("user-test-123");
    expect(chal.challengeId).toMatch(/^CHAL-/);
    expect(chal.challenge).toMatch(/^0x/);
    expect(new Date(chal.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("enforces challenge validity and rejects expired or missing challenges during enrollment", () => {
    const expiredChallenge: PasskeyChallenge = {
      challengeId: "CHAL-EXPIRED",
      challenge: "0xabcdef",
      userHandle: "user-1",
      rpId: "app.stellarsettle.org",
      timeoutMs: 1000,
      expiresAt: new Date(Date.now() - 5000).toISOString(),
    };

    const res = verifyEnrollmentResponse(
      expiredChallenge,
      "My Passkey",
      '{"type":"webauthn.create"}'
    );
    expect(res.success).toBe(false);
    expect(res.error).toBe("Enrollment challenge has expired.");

    // Missing device label
    const validChal = createEnrollmentChallenge("user-1");
    const emptyNameRes = verifyEnrollmentResponse(validChal, "   ", '{"type":"webauthn.create"}');
    expect(emptyNameRes.success).toBe(false);
    expect(emptyNameRes.error).toBe("Passkey device label is required.");
  });

  it("requires fresh confirmation keyword to remove a passkey", () => {
    expect(verifyPasskeyRemovalConfirmation("cred-1", "REMOVE")).toBe(true);
    expect(verifyPasskeyRemovalConfirmation("cred-1", "CONFIRM REMOVE")).toBe(true);
    expect(verifyPasskeyRemovalConfirmation("cred-1", "remove")).toBe(true); // case-insensitive
    expect(verifyPasskeyRemovalConfirmation("cred-1", "no")).toBe(false);
    expect(verifyPasskeyRemovalConfirmation("cred-1", "")).toBe(false);
  });

  it("enforces that on-chain transactions strictly require wallet signing and cannot be authorized by passkeys", () => {
    const proofRequirement = requireWalletTransactionProof(
      "AAAA...mockXDR...",
      "GAAAPRIMARYACCOUNT2026771ABCDEF1234567890STLT9988"
    );

    expect(proofRequirement.requiresWallet).toBe(true);
    expect(proofRequirement.passkeySufficient).toBe(false);
    expect(proofRequirement.guidance).toContain("requires Ed25519 wallet signing");
  });

  it("supports usable fallback authentication (recovery codes and wallet signatures)", () => {
    // Valid recovery code
    expect(verifyFallbackAuth("recovery_code", "RC-9821-4401").success).toBe(true);
    // Invalid recovery code
    expect(verifyFallbackAuth("recovery_code", "short").success).toBe(false);

    // Valid wallet signature fallback
    expect(
      verifyFallbackAuth("wallet_signature", "0xabcdef1234567890abcdef1234567890").success
    ).toBe(true);
    // Empty signature
    expect(verifyFallbackAuth("wallet_signature", "").success).toBe(false);
  });

  it("sanitizes passkey metadata to ensure zero private keys, seeds, or secrets leak into display", () => {
    const sample = SAMPLE_ENROLLED_PASSKEYS[0];
    const sanitized = sanitizePasskeyForDisplay(sample);

    expect(sanitized.name).toBe("MacBook Touch ID");
    expect(sanitized.deviceType).toBe("Biometric Device");
    expect(sanitized.id).toContain("...");
    expect((sanitized as Record<string, unknown>)["privateKey"]).toBeUndefined();
    expect((sanitized as Record<string, unknown>)["secret"]).toBeUndefined();
    expect((sanitized as Record<string, unknown>)["seed"]).toBeUndefined();
  });
});
