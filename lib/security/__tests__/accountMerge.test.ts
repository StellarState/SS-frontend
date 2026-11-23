import { describe, it, expect } from "vitest";
import {
  generateMergeChallenge,
  verifyWalletSignature,
  detectMergeConflicts,
  executeAccountMerge,
  SAMPLE_PRIMARY_ACCOUNT,
  SAMPLE_COMPATIBLE_SECONDARY,
  SAMPLE_CONFLICTING_SECONDARY,
  WalletSignatureProof,
} from "../accountMerge";

describe("Account Merge & Duplicate Resolution Logic (#675)", () => {
  it("detects blocking KYC conflict when two verified identities differ", () => {
    const conflicts = detectMergeConflicts(
      SAMPLE_PRIMARY_ACCOUNT,
      SAMPLE_CONFLICTING_SECONDARY
    );

    expect(conflicts.length).toBeGreaterThan(0);
    const blocking = conflicts.find((c) => c.severity === "blocking");
    expect(blocking).toBeDefined();
    expect(blocking?.type).toBe("kyc_mismatch");
    expect(blocking?.message).toContain("Conflicting KYC Identities Detected");
  });

  it("permits merge when secondary account has unverified/compatible KYC", () => {
    const conflicts = detectMergeConflicts(
      SAMPLE_PRIMARY_ACCOUNT,
      SAMPLE_COMPATIBLE_SECONDARY
    );

    const blocking = conflicts.find((c) => c.severity === "blocking");
    expect(blocking).toBeUndefined();
  });

  it("enforces valid cryptographic signatures from both wallets", () => {
    const challenge = generateMergeChallenge(
      SAMPLE_PRIMARY_ACCOUNT.publicKey,
      SAMPLE_COMPATIBLE_SECONDARY.publicKey
    );

    const validPrimarySig: WalletSignatureProof = {
      publicKey: SAMPLE_PRIMARY_ACCOUNT.publicKey,
      challenge,
      signature: "VALID-SIG-PRIMARY-1234567890",
      timestamp: new Date().toISOString(),
      verified: true,
    };

    const invalidSecondarySig: WalletSignatureProof = {
      publicKey: SAMPLE_COMPATIBLE_SECONDARY.publicKey,
      challenge,
      signature: "",
      timestamp: new Date().toISOString(),
      verified: false,
    };

    expect(verifyWalletSignature(validPrimarySig)).toBe(true);
    expect(verifyWalletSignature(invalidSecondarySig)).toBe(false);

    // Merge execution fails if any signature is unverified
    const result = executeAccountMerge(
      SAMPLE_PRIMARY_ACCOUNT,
      SAMPLE_COMPATIBLE_SECONDARY,
      validPrimarySig,
      invalidSecondarySig
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Secondary wallet signature verification failed");
  });

  it("blocks merge execution when KYC conflict exists", () => {
    const challenge = generateMergeChallenge(
      SAMPLE_PRIMARY_ACCOUNT.publicKey,
      SAMPLE_CONFLICTING_SECONDARY.publicKey
    );

    const validPrimarySig: WalletSignatureProof = {
      publicKey: SAMPLE_PRIMARY_ACCOUNT.publicKey,
      challenge,
      signature: "VALID-SIG-PRIMARY-1234567890",
      timestamp: new Date().toISOString(),
      verified: true,
    };

    const validSecondarySig: WalletSignatureProof = {
      publicKey: SAMPLE_CONFLICTING_SECONDARY.publicKey,
      challenge,
      signature: "VALID-SIG-SECONDARY-0987654321",
      timestamp: new Date().toISOString(),
      verified: true,
    };

    const result = executeAccountMerge(
      SAMPLE_PRIMARY_ACCOUNT,
      SAMPLE_CONFLICTING_SECONDARY,
      validPrimarySig,
      validSecondarySig
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Merge blocked: Conflicting KYC Identities Detected");
  });

  it("executes successful merge, consolidates holdings, revokes stale sessions and generates audit receipt", () => {
    const challenge = generateMergeChallenge(
      SAMPLE_PRIMARY_ACCOUNT.publicKey,
      SAMPLE_COMPATIBLE_SECONDARY.publicKey
    );

    const validPrimarySig: WalletSignatureProof = {
      publicKey: SAMPLE_PRIMARY_ACCOUNT.publicKey,
      challenge,
      signature: "VALID-SIG-PRIMARY-1234567890",
      timestamp: new Date().toISOString(),
      verified: true,
    };

    const validSecondarySig: WalletSignatureProof = {
      publicKey: SAMPLE_COMPATIBLE_SECONDARY.publicKey,
      challenge,
      signature: "VALID-SIG-SECONDARY-0987654321",
      timestamp: new Date().toISOString(),
      verified: true,
    };

    const result = executeAccountMerge(
      SAMPLE_PRIMARY_ACCOUNT,
      SAMPLE_COMPATIBLE_SECONDARY,
      validPrimarySig,
      validSecondarySig
    );

    expect(result.success).toBe(true);
    expect(result.auditReceipt).toBeDefined();

    // Verify consolidated balances
    expect(result.auditReceipt?.consolidatedHoldings.usdcBalance).toBe(2850000); // 2.5M + 350K
    expect(result.auditReceipt?.consolidatedHoldings.xlmBalance).toBe(57000); // 45K + 12K
    expect(result.auditReceipt?.consolidatedHoldings.activeInvoicesCount).toBe(15); // 12 + 3

    // Verify stale sessions revoked
    expect(result.revokedSessions).toEqual(["sess-sec-chrome-981", "sess-sec-tablet-402"]);
    expect(result.auditReceipt?.revokedSessionIds).toEqual([
      "sess-sec-chrome-981",
      "sess-sec-tablet-402",
    ]);

    // Verify audit hash exists
    expect(result.auditReceipt?.auditHash).toMatch(/^0x[0-9a-f]+/);
  });
});
