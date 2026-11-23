import { describe, it, expect } from "vitest";
import {
  reconcileCoverageToFaceValue,
  validateClaimSubmission,
  checkClaimRoleAuthorization,
  adjudicateClaim,
  type InsurancePolicy,
  type InsuranceClaim,
  type EvidenceDocument,
} from "../insuranceCoverage";

describe("insuranceCoverage analytics (#686)", () => {
  const mockPolicy: InsurancePolicy = {
    id: "pol-100",
    invoice_id: "inv-200",
    invoice_face_value: 50000,
    provider_name: "StellarShield Syndicate",
    policy_number: "SSS-2026-99",
    initial_coverage_limit: 50000,
    remaining_coverage_limit: 50000,
    coverage_ratio_percent: 100,
    deductible_amount: 1000,
    premium_bps: 150,
    premium_amount: 750,
    status: "active",
    effective_date: "2026-11-01T00:00:00Z",
    expiry_date: "2026-12-31T23:59:59Z",
    protection_level: "full",
    underwriter_address: "GBUNDERWRITER123",
  };

  const validEvidence: EvidenceDocument[] = [
    {
      id: "ev-1",
      file_name: "debtor_insolvency_filing.pdf",
      file_hash: "QmZtmD2qt846...sha256",
      signed_by: "GBCLAIMANT789",
      signature: "sig_claimant_proof_abc",
      uploaded_at: "2026-11-20T10:00:00Z",
      secure_view_url: "https://secure-docs.stellarsettle.app/view/ev-1",
    },
  ];

  describe("Coverage limit reconciliation to face value", () => {
    it("reconciles full 100% coverage with 0 shortfall", () => {
      const rec = reconcileCoverageToFaceValue(50000, 50000);
      expect(rec.isFullyCovered).toBe(true);
      expect(rec.coverageLimit).toBe(50000);
      expect(rec.shortfallAmount).toBe(0);
      expect(rec.coverageRatioPercent).toBe(100);
      expect(rec.effectiveProtection).toBe("full");
    });

    it("reconciles partial coverage with accurate shortfall", () => {
      const rec = reconcileCoverageToFaceValue(35000, 50000);
      expect(rec.isFullyCovered).toBe(false);
      expect(rec.coverageLimit).toBe(35000);
      expect(rec.shortfallAmount).toBe(15000);
      expect(rec.coverageRatioPercent).toBe(70);
      expect(rec.effectiveProtection).toBe("partial");
    });

    it("bounds coverage limit when higher than face value", () => {
      const rec = reconcileCoverageToFaceValue(60000, 50000);
      expect(rec.coverageLimit).toBe(50000);
      expect(rec.coverageRatioPercent).toBe(100);
    });
  });

  describe("Claim submission validation & signed evidence", () => {
    it("validates compliant claim with signed evidence", () => {
      const res = validateClaimSubmission(
        {
          incident_date: "2026-11-15T00:00:00Z",
          incident_type: "bankruptcy",
          incident_description: "Debtor entered official bankruptcy proceedings under Chapter 11.",
          claimed_amount: 25000,
          evidence: validEvidence,
        },
        mockPolicy,
        "2026-11-20T00:00:00Z",
      );

      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });

    it("rejects future incident dates", () => {
      const res = validateClaimSubmission(
        {
          incident_date: "2026-11-25T00:00:00Z", // Future date
          incident_type: "default",
          incident_description: "Debtor failed to remit payment by maturity deadline.",
          claimed_amount: 10000,
          evidence: validEvidence,
        },
        mockPolicy,
        "2026-11-20T00:00:00Z",
      );

      expect(res.isValid).toBe(false);
      expect(res.errors.incident_date).toBe("Incident date cannot be in the future.");
    });

    it("rejects descriptions shorter than 15 characters", () => {
      const res = validateClaimSubmission(
        {
          incident_date: "2026-11-10T00:00:00Z",
          incident_type: "default",
          incident_description: "Short fail",
          claimed_amount: 10000,
          evidence: validEvidence,
        },
        mockPolicy,
        "2026-11-20T00:00:00Z",
      );

      expect(res.isValid).toBe(false);
      expect(res.errors.incident_description).toContain("at least 15 characters");
    });

    it("rejects claims below or equal to policy deductible", () => {
      const res = validateClaimSubmission(
        {
          incident_date: "2026-11-10T00:00:00Z",
          incident_type: "default",
          incident_description: "Debtor missed first installment payment.",
          claimed_amount: 1000, // Policy deductible is 1000
          evidence: validEvidence,
        },
        mockPolicy,
        "2026-11-20T00:00:00Z",
      );

      expect(res.isValid).toBe(false);
      expect(res.errors.claimed_amount).toContain("must exceed policy deductible (1,000 XLM)");
    });

    it("rejects claims lacking signed evidence", () => {
      const res = validateClaimSubmission(
        {
          incident_date: "2026-11-10T00:00:00Z",
          incident_type: "default",
          incident_description: "Debtor missed payment with zero documents attached.",
          claimed_amount: 5000,
          evidence: [],
        },
        mockPolicy,
        "2026-11-20T00:00:00Z",
      );

      expect(res.isValid).toBe(false);
      expect(res.errors.evidence).toContain("At least one signed evidence document is required");
    });
  });

  describe("Role authorization for claims", () => {
    it("recognizes underwriter with adjudication privileges", () => {
      const auth = checkClaimRoleAuthorization("GBUNDERWRITER123", mockPolicy);
      expect(auth.role).toBe("underwriter_adjudicator");
      expect(auth.canAdjudicate).toBe(true);
      expect(auth.canFileClaim).toBe(false);
    });

    it("recognizes investor with filing privileges", () => {
      const auth = checkClaimRoleAuthorization("GBINVESTOR999", mockPolicy);
      expect(auth.role).toBe("investor_claimant");
      expect(auth.canAdjudicate).toBe(false);
      expect(auth.canFileClaim).toBe(true);
    });

    it("recognizes disconnected visitor as public observer", () => {
      const auth = checkClaimRoleAuthorization(null, mockPolicy);
      expect(auth.role).toBe("public_observer");
      expect(auth.canAdjudicate).toBe(false);
      expect(auth.canFileClaim).toBe(false);
    });
  });

  describe("Claim adjudication & post-resolution protection update", () => {
    const pendingClaim: InsuranceClaim = {
      id: "claim-1",
      policy_id: "pol-100",
      invoice_id: "inv-200",
      claimant_address: "GBCLAIMANT789",
      incident_date: "2026-11-15T00:00:00Z",
      incident_type: "bankruptcy",
      incident_description: "Debtor entered official bankruptcy proceedings under Chapter 11.",
      claimed_amount: 25000,
      evidence: validEvidence,
      status: "submitted",
      created_at: "2026-11-16T10:00:00Z",
    };

    it("approved claim updates policy protection and remaining coverage", () => {
      const { updatedClaim, updatedPolicy } = adjudicateClaim(
        pendingClaim,
        mockPolicy,
        "approved",
        {
          payoutAmount: 24000, // 25000 - 1000 deductible
          adjudicatorAddress: "GBUNDERWRITER123",
          txHash: "tx_payout_12345",
        },
        "2026-11-20T12:00:00Z",
      );

      expect(updatedClaim.status).toBe("approved");
      expect(updatedClaim.payout_amount).toBe(24000);
      expect(updatedClaim.adjudicated_by).toBe("GBUNDERWRITER123");
      expect(updatedClaim.payout_tx_hash).toBe("tx_payout_12345");

      // Policy remaining coverage: 50000 - 24000 = 26000
      expect(updatedPolicy.remaining_coverage_limit).toBe(26000);
      expect(updatedPolicy.status).toBe("claimed");
      expect(updatedPolicy.protection_level).toBe("partial");
      expect(updatedPolicy.coverage_ratio_percent).toBe(52); // 26000 / 50000
    });

    it("full claim exhaustion sets status to exhausted and protection to none", () => {
      const { updatedPolicy } = adjudicateClaim(
        pendingClaim,
        mockPolicy,
        "approved",
        {
          payoutAmount: 50000, // Full coverage exhausted
          adjudicatorAddress: "GBUNDERWRITER123",
        },
        "2026-11-20T12:00:00Z",
      );

      expect(updatedPolicy.remaining_coverage_limit).toBe(0);
      expect(updatedPolicy.status).toBe("exhausted");
      expect(updatedPolicy.protection_level).toBe("none");
      expect(updatedPolicy.coverage_ratio_percent).toBe(0);
    });

    it("denied claim preserves policy protection and records denial reason", () => {
      const { updatedClaim, updatedPolicy } = adjudicateClaim(
        pendingClaim,
        mockPolicy,
        "denied",
        {
          denialReason: "Evidence insufficient to establish fraudulent intent under policy Section 4B.",
          adjudicatorAddress: "GBUNDERWRITER123",
        },
        "2026-11-20T12:00:00Z",
      );

      expect(updatedClaim.status).toBe("denied");
      expect(updatedClaim.denial_reason).toContain("Evidence insufficient");
      expect(updatedClaim.payout_amount).toBe(0);

      // Policy remains unchanged
      expect(updatedPolicy.remaining_coverage_limit).toBe(50000);
      expect(updatedPolicy.status).toBe("active");
      expect(updatedPolicy.protection_level).toBe("full");
    });

    it("prevents non-underwriters from adjudicating claims", () => {
      expect(() =>
        adjudicateClaim(pendingClaim, mockPolicy, "approved", {
          adjudicatorAddress: "GBRANDOMUSER...",
        }),
      ).toThrow("Only the designated underwriter can adjudicate claims");
    });
  });
});
