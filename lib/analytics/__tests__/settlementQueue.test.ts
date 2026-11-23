import { describe, it, expect } from "vitest";
import {
  evaluateSettlementClaimEligibility,
  reconcileBulkClaims,
  verifyOperatorDelegation,
  processClaimExecution,
  SettlementClaimItem,
  OperatorDelegation,
} from "../settlementQueue";

describe("Settlement Claim Queue Analytics (#682)", () => {
  const baseItem = {
    invoice_id: "inv-101",
    invoice_title: "TechCorp Electronics Net 30",
    investor_address: "GBINVESTOR123",
    gross_return_amount: 1000,
    invoice_status: "settled" as const,
    settled_at: "2026-11-20T10:00:00Z",
  };

  describe("evaluateSettlementClaimEligibility", () => {
    it("marks settled invoice with positive return as eligible and computes fees", () => {
      const claim = evaluateSettlementClaimEligibility(baseItem, 25, 0.01);
      expect(claim.is_eligible).toBe(true);
      expect(claim.claim_status).toBe("unclaimed");
      // 1000 * 0.25% = 2.5000 XLM protocol fee
      expect(claim.protocol_fee_amount).toBe(2.5);
      expect(claim.estimated_network_fee).toBe(0.01);
      // Net payout = 1000 - 2.5 - 0.01 = 997.49 XLM
      expect(claim.net_payout_amount).toBe(997.49);
    });

    it("marks non-settled invoice as ineligible", () => {
      const claim = evaluateSettlementClaimEligibility({
        ...baseItem,
        invoice_status: "funded",
      });
      expect(claim.is_eligible).toBe(false);
      expect(claim.claim_status).toBe("failed");
      expect(claim.net_payout_amount).toBe(0);
    });

    it("marks zero or negative return invoice as ineligible", () => {
      const zeroClaim = evaluateSettlementClaimEligibility({
        ...baseItem,
        gross_return_amount: 0,
      });
      expect(zeroClaim.is_eligible).toBe(false);

      const negClaim = evaluateSettlementClaimEligibility({
        ...baseItem,
        gross_return_amount: -50,
      });
      expect(negClaim.is_eligible).toBe(false);
    });
  });

  describe("reconcileBulkClaims", () => {
    const claims: SettlementClaimItem[] = [
      evaluateSettlementClaimEligibility({
        invoice_id: "inv-1",
        invoice_title: "Inv 1",
        investor_address: "GBINVESTOR",
        gross_return_amount: 1000,
        invoice_status: "settled",
        settled_at: "2026-11-20T10:00:00Z",
      }),
      evaluateSettlementClaimEligibility({
        invoice_id: "inv-2",
        invoice_title: "Inv 2",
        investor_address: "GBINVESTOR",
        gross_return_amount: 2500,
        invoice_status: "settled",
        settled_at: "2026-11-20T10:00:00Z",
      }),
      evaluateSettlementClaimEligibility({
        invoice_id: "inv-3",
        invoice_title: "Inv 3",
        investor_address: "GBINVESTOR",
        gross_return_amount: 500,
        invoice_status: "defaulted",
        settled_at: "2026-11-20T10:00:00Z",
      }),
    ];

    it("reconciles bulk total net payout strictly against sum of individual net payouts", () => {
      const recon = reconcileBulkClaims(claims, ["inv-1", "inv-2"]);

      expect(recon.selectedCount).toBe(2);
      expect(recon.totalGrossReturn).toBe(3500);
      expect(recon.isReconciled).toBe(true);

      const sumNet = recon.individualReconciliations.reduce((s, r) => s + r.net, 0);
      expect(Number(sumNet.toFixed(4))).toBe(recon.netTotalPayout);
    });

    it("excludes ineligible or unselected items from reconciliation", () => {
      const recon = reconcileBulkClaims(claims, ["inv-1", "inv-3"]);
      expect(recon.selectedCount).toBe(1);
      expect(recon.totalGrossReturn).toBe(1000);
    });
  });

  describe("verifyOperatorDelegation", () => {
    const validDelegation: OperatorDelegation = {
      id: "del-1",
      investor_address: "GBINVESTOR123",
      operator_address: "GBOPERATOR456",
      scopes: ["claims:execute", "claims:view"],
      expires_at: "2026-12-31T23:59:59Z",
      max_claim_amount_xlm: 5000,
      is_active: true,
    };

    it("allows investor to claim directly without delegation check", () => {
      const res = verifyOperatorDelegation(null, "GBINVESTOR123", "GBINVESTOR123", 1000);
      expect(res.isAuthorized).toBe(true);
    });

    it("requires delegation object when operator claims for investor", () => {
      const res = verifyOperatorDelegation(null, "GBOPERATOR456", "GBINVESTOR123", 1000);
      expect(res.isAuthorized).toBe(false);
      expect(res.reason).toContain("No delegation agreement found");
    });

    it("rejects inactive or revoked delegations", () => {
      const res = verifyOperatorDelegation(
        { ...validDelegation, is_active: false },
        "GBOPERATOR456",
        "GBINVESTOR123",
        1000,
      );
      expect(res.isAuthorized).toBe(false);
      expect(res.reason).toContain("revoked or deactivated");
    });

    it("rejects operator missing the 'claims:execute' scope", () => {
      const res = verifyOperatorDelegation(
        { ...validDelegation, scopes: ["claims:view"] },
        "GBOPERATOR456",
        "GBINVESTOR123",
        1000,
      );
      expect(res.isAuthorized).toBe(false);
      expect(res.reason).toContain("claims:execute");
    });

    it("rejects expired operator delegations", () => {
      const res = verifyOperatorDelegation(
        { ...validDelegation, expires_at: "2026-01-01T00:00:00Z" },
        "GBOPERATOR456",
        "GBINVESTOR123",
        1000,
        "2026-11-22T00:00:00Z",
      );
      expect(res.isAuthorized).toBe(false);
      expect(res.reason).toContain("expired");
    });

    it("rejects claims exceeding max operator delegation limit", () => {
      const res = verifyOperatorDelegation(
        validDelegation,
        "GBOPERATOR456",
        "GBINVESTOR123",
        6000,
        "2026-11-22T00:00:00Z",
      );
      expect(res.isAuthorized).toBe(false);
      expect(res.reason).toContain("exceeds operator delegation limit");
    });

    it("authorizes valid operator claim within limit and scope", () => {
      const res = verifyOperatorDelegation(
        validDelegation,
        "GBOPERATOR456",
        "GBINVESTOR123",
        2000,
        "2026-11-22T00:00:00Z",
      );
      expect(res.isAuthorized).toBe(true);
    });
  });

  describe("processClaimExecution", () => {
    const claim = evaluateSettlementClaimEligibility(baseItem);

    it("processes successful claim and returns audit log", () => {
      const { updatedItem, auditRecord } = processClaimExecution(
        claim,
        "GBINVESTOR123",
        null,
        { txHash: "tx_mock_12345", nowInput: "2026-11-22T12:00:00Z" },
      );

      expect(updatedItem.claim_status).toBe("claimed");
      expect(updatedItem.last_error).toBeNull();
      expect(auditRecord.status).toBe("success");
      expect(auditRecord.tx_hash).toBe("tx_mock_12345");
      expect(auditRecord.net_payout).toBe(claim.net_payout_amount);
    });

    it("records failure when operator authorization fails", () => {
      const { updatedItem, auditRecord } = processClaimExecution(
        claim,
        "GBUNAUTHORIZED_OPERATOR",
        null,
      );

      expect(updatedItem.claim_status).toBe("failed");
      expect(updatedItem.last_error).toContain("No delegation agreement");
      expect(updatedItem.retry_count).toBe(1);
      expect(auditRecord.status).toBe("failed");
      expect(auditRecord.error_message).toContain("No delegation agreement");
    });

    it("supports independent retry on simulated network failure", () => {
      // First attempt fails
      const attempt1 = processClaimExecution(
        claim,
        "GBINVESTOR123",
        null,
        { simulateFailure: true, failureReason: "Network timeout" },
      );
      expect(attempt1.updatedItem.claim_status).toBe("failed");
      expect(attempt1.updatedItem.last_error).toBe("Network timeout");
      expect(attempt1.updatedItem.retry_count).toBe(1);

      // Independent retry succeeds
      const attempt2 = processClaimExecution(
        attempt1.updatedItem,
        "GBINVESTOR123",
        null,
        { simulateFailure: false, txHash: "tx_retry_success" },
      );
      expect(attempt2.updatedItem.claim_status).toBe("claimed");
      expect(attempt2.updatedItem.last_error).toBeNull();
      expect(attempt2.auditRecord.status).toBe("success");
    });
  });
});
