import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseBulkPaymentCsv,
  executeBulkPaymentBatch,
  retryBulkPaymentRow,
  cancelBulkPaymentRow,
  loadSettlementHistory,
  type BulkPaymentRow,
} from "@/lib/bulkPayment";

describe("Bulk Payment Scheduling (#660)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const validCsv = `invoice_id,debtor_ref,amount,scheduled_date,memo
inv-1,DEBTOR-A,100,2026-07-05,Memo 1
inv-2,DEBTOR-B,250,2026-07-10,Memo 2
inv-3,DEBTOR-C,400,2026-07-15,Memo 3`;

  it("reports row numbers for invalid rows before submission", () => {
    const invalidCsv = `invoice_id,debtor_ref,amount,scheduled_date,memo
inv-1,,100,2026-07-05,Valid memo
inv-2,DEBTOR-B,-50,2026-07-10,Valid memo
inv-3,DEBTOR-C,300,invalid-date,Valid memo
inv-4,DEBTOR-D,400,2026-07-20,This memo is far too long for Stellar memo constraints and should fail`;

    const result = parseBulkPaymentCsv(invalidCsv);

    expect(result.errorCount).toBe(4);
    // Row 2 is the first data row (after header row 1)
    expect(result.errors.find((e) => e.rowNumber === 2)?.message).toContain("Row 2: Debtor reference is required");
    expect(result.errors.find((e) => e.rowNumber === 3)?.message).toContain("Row 3: Amount must be a positive number");
    expect(result.errors.find((e) => e.rowNumber === 4)?.message).toContain("Row 4: Invalid scheduled date");
    expect(result.errors.find((e) => e.rowNumber === 5)?.message).toContain("Row 5: Memo 'This memo is far too long for Stellar memo constraints and should fail' exceeds maximum 28 characters");
  });

  it("reconciles the preview to the batch total and flags insufficient balance", () => {
    const preview = parseBulkPaymentCsv(validCsv, { availableBalance: 500 });

    expect(preview.validCount).toBe(3);
    expect(preview.totalAmount).toBe(750); // 100 + 250 + 400
    expect(preview.isBalanceSufficient).toBe(false);
    expect(preview.balanceShortfall).toBe(250); // 750 - 500

    const sufficientPreview = parseBulkPaymentCsv(validCsv, { availableBalance: 1000 });
    expect(sufficientPreview.isBalanceSufficient).toBe(true);
    expect(sufficientPreview.balanceShortfall).toBe(0);
  });

  it("processes payments with partial failure: one failure does NOT cancel other payments", async () => {
    const preview = parseBulkPaymentCsv(validCsv);

    const mockSubmit = vi.fn().mockImplementation(async (item: BulkPaymentRow) => {
      if (item.invoiceId === "inv-2") {
        throw new Error("RPC transaction simulation failed for inv-2");
      }
      return { txHash: `tx-success-${item.invoiceId}` };
    });

    const { results, successfulSettlements } = await executeBulkPaymentBatch(
      "batch-test-1",
      preview.items,
      mockSubmit,
    );

    expect(mockSubmit).toHaveBeenCalledTimes(3); // All 3 rows were attempted!
    expect(results).toHaveLength(3);

    // Row 1 succeeded
    expect(results[0].status).toBe("success");
    expect(results[0].txHash).toBe("tx-success-inv-1");

    // Row 2 failed without interrupting Row 3
    expect(results[1].status).toBe("failed");
    expect(results[1].error).toContain("RPC transaction simulation failed");
    expect(results[1].retryCount).toBe(1);

    // Row 3 succeeded
    expect(results[2].status).toBe("success");
    expect(results[2].txHash).toBe("tx-success-inv-3");

    // Successful batch updates settlement history
    expect(successfulSettlements).toHaveLength(2);
    const history = loadSettlementHistory();
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.invoiceId)).toEqual(["inv-3", "inv-1"]);
  });

  it("allows retrying a failed invoice row individually", async () => {
    const failedRow: BulkPaymentRow = {
      rowNumber: 2,
      invoiceId: "inv-2",
      debtorReference: "DEBTOR-B",
      amount: 250,
      scheduledDate: "2026-07-10",
      status: "failed",
      error: "Temporary network timeout",
      retryCount: 1,
    };

    const mockSubmit = vi.fn().mockResolvedValue({ txHash: "tx-retry-success-inv-2" });
    const retried = await retryBulkPaymentRow("batch-test-1", failedRow, mockSubmit);

    expect(retried.status).toBe("success");
    expect(retried.txHash).toBe("tx-retry-success-inv-2");
    expect(retried.error).toBeUndefined();

    const history = loadSettlementHistory();
    expect(history).toHaveLength(1);
    expect(history[0].invoiceId).toBe("inv-2");
  });

  it("allows cancelling a pending invoice row", () => {
    const pendingRow: BulkPaymentRow = {
      rowNumber: 1,
      invoiceId: "inv-1",
      debtorReference: "DEBTOR-A",
      amount: 100,
      scheduledDate: "2026-07-05",
      status: "pending",
    };

    const cancelled = cancelBulkPaymentRow(pendingRow);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.error).toContain("cancelled");
  });
});
