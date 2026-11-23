import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BulkPaymentScheduler } from "@/components/payment/BulkPaymentScheduler";

describe("BulkPaymentScheduler Component (#660)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders preview reconciliation and batch totals", () => {
    render(<BulkPaymentScheduler walletBalance={5000} />);

    expect(screen.getByTestId("preview-reconciliation")).toBeInTheDocument();
    expect(screen.getByTestId("preview-valid-count")).toHaveTextContent("3 valid");
    expect(screen.getByTestId("preview-total-amount")).toHaveTextContent("2,450 XLM");
    expect(screen.getByTestId("preview-status")).toHaveTextContent("Ready to Submit");
  });

  it("reports row numbers for invalid CSV inputs and disables submit", () => {
    render(<BulkPaymentScheduler walletBalance={5000} />);

    const invalidCsv = `invoice_id,debtor,amount,date,memo\ninv-99,,invalid-amount,2026-07-01,Valid`;
    fireEvent.change(screen.getByTestId("csv-textarea"), { target: { value: invalidCsv } });

    expect(screen.getByTestId("unresolved-errors-alert")).toBeInTheDocument();
    expect(screen.getAllByTestId("error-row-2")[0]).toHaveTextContent("Row 2: Debtor reference is required");
    expect(screen.getByTestId("submit-batch-btn")).toBeDisabled();
  });

  it("handles partial failure during execution and supports retry", async () => {
    const mockSubmit = vi.fn().mockImplementation(async (row) => {
      if (row.invoiceId === "inv-102") {
        throw new Error("RPC timeout on inv-102");
      }
      return { txHash: `0x-hash-${row.invoiceId}` };
    });

    render(<BulkPaymentScheduler walletBalance={5000} onSubmitPayment={mockSubmit} />);

    fireEvent.click(screen.getByTestId("submit-batch-btn"));

    await waitFor(() => {
      // Row 101 settled
      expect(screen.getByTestId("status-2")).toHaveTextContent("Settled");
      // Row 102 failed
      expect(screen.getByTestId("status-3")).toHaveTextContent("Failed");
      // Row 103 settled
      expect(screen.getByTestId("status-4")).toHaveTextContent("Settled");
    });

    // Check settlement history rendered
    expect(screen.getByTestId("settlement-history-card")).toBeInTheDocument();

    // Retry row 102
    mockSubmit.mockResolvedValueOnce({ txHash: "0x-hash-retry-102" });
    fireEvent.click(screen.getByTestId("retry-row-3"));

    await waitFor(() => {
      expect(screen.getByTestId("status-3")).toHaveTextContent("Settled");
    });
  });

  it("allows cancelling a pending row", () => {
    render(<BulkPaymentScheduler walletBalance={5000} />);

    // Cancel row 1 (Row index 2 in active rows)
    fireEvent.click(screen.getByTestId("cancel-row-2"));
    expect(screen.getByTestId("status-2")).toHaveTextContent("Cancelled");
  });
});
