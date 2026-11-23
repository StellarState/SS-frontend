import { describe, it, expect } from "vitest";
import {
  verifyTermsAcceptanceValidity,
  recordTermsAcceptance,
  DEFAULT_GOVERNING_TERMS_V1,
  UPDATED_GOVERNING_TERMS_V2,
} from "../legalTerms";

describe("Invoice Legal Terms & Acceptance Analytics (#679)", () => {
  const investorAddress = "GBINVESTOR_VALID_KEY";
  const invoiceId = "inv-terms-001";

  describe("verifyTermsAcceptanceValidity", () => {
    it("confirms validity when acceptance matches the displayed version and hash", () => {
      const record = recordTermsAcceptance(
        investorAddress,
        invoiceId,
        DEFAULT_GOVERNING_TERMS_V1,
        "tx_accept_1",
      );

      const check = verifyTermsAcceptanceValidity(DEFAULT_GOVERNING_TERMS_V1, record);
      expect(check.isValid).toBe(true);
      expect(check.reason).toBeUndefined();
    });

    it("invalidates acceptance when governing terms version is updated", () => {
      // User accepted V1
      const recordV1 = recordTermsAcceptance(
        investorAddress,
        invoiceId,
        DEFAULT_GOVERNING_TERMS_V1,
      );

      // System updated to V2
      const check = verifyTermsAcceptanceValidity(UPDATED_GOVERNING_TERMS_V2, recordV1);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain("Governing terms have been updated from v1.0.0 to v2.0.0");
      expect(check.reason).toContain("Re-acceptance required");
    });

    it("invalidates acceptance when hash mismatches", () => {
      const tamperedRecord = {
        investor_address: investorAddress,
        invoice_id: invoiceId,
        accepted_version_id: DEFAULT_GOVERNING_TERMS_V1.version_id,
        accepted_sha256: "tampered_hash_123",
        accepted_at: new Date().toISOString(),
      };

      const check = verifyTermsAcceptanceValidity(DEFAULT_GOVERNING_TERMS_V1, tamperedRecord);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain("hash mismatch");
    });

    it("fails when no acceptance record exists", () => {
      const check = verifyTermsAcceptanceValidity(DEFAULT_GOVERNING_TERMS_V1, null);
      expect(check.isValid).toBe(false);
      expect(check.reason).toContain("must be explicitly accepted");
    });
  });

  describe("recordTermsAcceptance", () => {
    it("creates an immutable record capturing the exact version, hash and transaction", () => {
      const record = recordTermsAcceptance(
        investorAddress,
        invoiceId,
        DEFAULT_GOVERNING_TERMS_V1,
        "tx_onchain_proof_999",
        "2026-11-22T12:00:00Z",
      );

      expect(record.investor_address).toBe(investorAddress);
      expect(record.invoice_id).toBe(invoiceId);
      expect(record.accepted_version_id).toBe("v1.0.0");
      expect(record.accepted_sha256).toBe(DEFAULT_GOVERNING_TERMS_V1.content_sha256);
      expect(record.tx_hash).toBe("tx_onchain_proof_999");
      expect(record.accepted_at).toBe("2026-11-22T12:00:00Z");
    });

    it("throws when missing investor address or invoice ID", () => {
      expect(() =>
        recordTermsAcceptance("", invoiceId, DEFAULT_GOVERNING_TERMS_V1),
      ).toThrow("Investor address is required");
      expect(() =>
        recordTermsAcceptance(investorAddress, "", DEFAULT_GOVERNING_TERMS_V1),
      ).toThrow("Invoice ID is required");
    });
  });
});
