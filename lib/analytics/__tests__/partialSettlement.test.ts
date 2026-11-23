import { describe, it, expect } from "vitest";
import {
  validatePartialAllocation,
  calculateDistributionPreview,
  createSettlementReceipt,
  PartialPaymentContext,
  AllocationBreakdown,
  SettlementApprovalState,
} from "../partialSettlement";

describe("Partial Settlement Allocation Analytics (#681)", () => {
  const mockContext: PartialPaymentContext = {
    invoice_id: "inv-202",
    invoice_title: "Apex Logistics Net 30",
    total_outstanding_principal: 10000,
    total_accrued_fees: 500,
    partial_payment_amount: 3000,
    issuer_address: "GBISSUER_ADMIN_KEY",
    positions: [
      {
        address: "GBINVESTOR_A",
        invested_principal: 6000,
        principal_share_ratio: 0.6, // 60%
      },
      {
        address: "GBINVESTOR_B",
        invested_principal: 4000,
        principal_share_ratio: 0.4, // 40%
      },
    ],
  };

  describe("validatePartialAllocation", () => {
    it("accepts an allocation that exactly sums to the payment amount", () => {
      const allocation: AllocationBreakdown = {
        principal: 2000,
        fees: 800,
        reserve: 200,
      };

      const result = validatePartialAllocation(3000, allocation);
      expect(result.isValid).toBe(true);
      expect(result.totalAllocated).toBe(3000);
      expect(result.difference).toBe(0);
      expect(result.errorReason).toBeNull();
    });

    it("rejects an allocation that over-totals the payment amount", () => {
      const allocation: AllocationBreakdown = {
        principal: 2500,
        fees: 800,
        reserve: 200,
      }; // 3500 vs 3000

      const result = validatePartialAllocation(3000, allocation);
      expect(result.isValid).toBe(false);
      expect(result.totalAllocated).toBe(3500);
      expect(result.difference).toBe(-500);
      expect(result.errorReason).toContain("over-allocated");
    });

    it("rejects an allocation that under-totals the payment amount", () => {
      const allocation: AllocationBreakdown = {
        principal: 1500,
        fees: 500,
        reserve: 200,
      }; // 2200 vs 3000

      const result = validatePartialAllocation(3000, allocation);
      expect(result.isValid).toBe(false);
      expect(result.totalAllocated).toBe(2200);
      expect(result.difference).toBe(800);
      expect(result.errorReason).toContain("under-allocated");
    });

    it("rejects allocations with negative numbers", () => {
      const allocation: AllocationBreakdown = {
        principal: 3200,
        fees: -200,
        reserve: 0,
      };

      const result = validatePartialAllocation(3000, allocation);
      expect(result.isValid).toBe(false);
      expect(result.errorReason).toContain("cannot be negative");
    });

    it("rejects invalid payment amounts", () => {
      const allocation: AllocationBreakdown = { principal: 0, fees: 0, reserve: 0 };
      const result = validatePartialAllocation(0, allocation);
      expect(result.isValid).toBe(false);
      expect(result.errorReason).toContain("must be greater than zero");
    });
  });

  describe("calculateDistributionPreview", () => {
    it("distributes principal and fees strictly pro-rata across investor positions", () => {
      const allocation: AllocationBreakdown = {
        principal: 2000,
        fees: 500,
        reserve: 500,
      };

      const preview = calculateDistributionPreview(mockContext, allocation);

      expect(preview.positions).toHaveLength(2);

      // Investor A (60%): 2000 * 0.6 = 1200 principal, 500 * 0.6 = 300 fees -> total 1500
      const posA = preview.positions.find((p) => p.investor_address === "GBINVESTOR_A")!;
      expect(posA.principal_payout).toBe(1200);
      expect(posA.fee_payout).toBe(300);
      expect(posA.total_payout).toBe(1500);

      // Investor B (40%): 2000 * 0.4 = 800 principal, 500 * 0.4 = 200 fees -> total 1000
      const posB = preview.positions.find((p) => p.investor_address === "GBINVESTOR_B")!;
      expect(posB.principal_payout).toBe(800);
      expect(posB.fee_payout).toBe(200);
      expect(posB.total_payout).toBe(1000);

      // Reconciles to investor payouts
      expect(preview.totalPrincipalDistributed).toBe(2000);
      expect(preview.totalFeesDistributed).toBe(500);
      expect(preview.totalInvestorPayouts).toBe(2500);
      expect(preview.reserveRetained).toBe(500);
      expect(preview.isReconciled).toBe(true);
    });
  });

  describe("createSettlementReceipt", () => {
    const allocation: AllocationBreakdown = {
      principal: 2000,
      fees: 500,
      reserve: 500,
    };

    it("generates an immutable receipt matching the approved allocation", () => {
      const approvedState: SettlementApprovalState = {
        status: "approved",
        approver_address: "GBISSUER_ADMIN_KEY",
        approved_at: "2026-11-22T13:00:00Z",
      };

      const receipt = createSettlementReceipt(mockContext, allocation, approvedState, "tx_12345");

      expect(receipt.invoice_id).toBe("inv-202");
      expect(receipt.total_payment_received).toBe(3000);
      expect(receipt.allocation.principal).toBe(2000);
      expect(receipt.allocation.fees).toBe(500);
      expect(receipt.allocation.reserve).toBe(500);
      expect(receipt.distribution_summary.investor_total).toBe(2500);
      expect(receipt.distribution_summary.reserve_retained).toBe(500);
      expect(receipt.approved_by).toBe("GBISSUER_ADMIN_KEY");
      expect(receipt.tx_hash).toBe("tx_12345");
      expect(receipt.status).toBe("finalized");
    });

    it("throws when attempting to generate receipt without approved state", () => {
      const pendingState: SettlementApprovalState = {
        status: "pending_approval",
      };

      expect(() =>
        createSettlementReceipt(mockContext, allocation, pendingState),
      ).toThrow("Cannot generate settlement receipt without authorized approval");
    });
  });
});
