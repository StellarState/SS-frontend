import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { PlatformTransaction } from "@/lib/api";
import { AccountingExportModal } from "../AccountingExportModal";

const testTransactions: PlatformTransaction[] = [
  {
    id: "tx-1",
    type: "invest",
    amount: 1000,
    currency: "USDC",
    status: "success",
    createdAt: "2026-03-10T10:00:00.000Z",
    txHash: "0xhash1",
    invoiceId: "INV-1",
    invoiceTitle: "Renewable Energy Project",
  },
  {
    id: "tx-2",
    type: "claim",
    amount: 150,
    currency: "USDC",
    status: "success",
    createdAt: "2026-03-25T14:00:00.000Z",
    txHash: "0xhash2",
    invoiceId: "INV-1",
    invoiceTitle: "Renewable Energy Project",
  },
];

describe("AccountingExportModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders export trigger button and opens dialog", () => {
    render(<AccountingExportModal transactions={testTransactions} />);
    const trigger = screen.getByTestId("accounting-export-trigger");
    expect(trigger).toBeDefined();

    fireEvent.click(trigger);
    expect(screen.getByTestId("accounting-export-modal")).toBeDefined();
    expect(screen.getByText("Export Transactions for Accounting")).toBeDefined();
  });

  it("renders QuickBooks preview by default with matching headers and rows", () => {
    render(<AccountingExportModal transactions={testTransactions} />);
    fireEvent.click(screen.getByTestId("accounting-export-trigger"));

    const tableBody = screen.getByTestId("export-preview-table-body");
    expect(tableBody.textContent).toContain("03/10/2026");
    expect(tableBody.textContent).toContain("-1000.00");
    expect(tableBody.textContent).toContain("Invoice Investment");
  });

  it("toggles and updates category mapping dynamically", () => {
    render(<AccountingExportModal transactions={testTransactions} />);
    fireEvent.click(screen.getByTestId("accounting-export-trigger"));

    const toggleBtn = screen.getByTestId("toggle-category-mapping");
    fireEvent.click(toggleBtn);

    const investInput = screen.getByTestId("category-input-invest") as HTMLInputElement;
    expect(investInput).toBeDefined();

    fireEvent.change(investInput, { target: { value: "Solar Capital Outlay" } });

    const tableBody = screen.getByTestId("export-preview-table-body");
    expect(tableBody.textContent).toContain("Solar Capital Outlay");

    // Reset categories
    const resetBtn = screen.getByTestId("reset-categories-button");
    fireEvent.click(resetBtn);
    expect(tableBody.textContent).toContain("Invoice Investment");
  });

  it("filters preview rows when date range is entered", () => {
    render(<AccountingExportModal transactions={testTransactions} />);
    fireEvent.click(screen.getByTestId("accounting-export-trigger"));

    const startDateInput = screen.getByTestId("export-start-date");
    fireEvent.change(startDateInput, { target: { value: "2026-03-20" } });

    const countLabel = screen.getByTestId("preview-count-label");
    expect(countLabel.textContent).toContain("showing first 1 of 1 matching rows");

    const tableBody = screen.getByTestId("export-preview-table-body");
    expect(tableBody.textContent).not.toContain("03/10/2026");
    expect(tableBody.textContent).toContain("03/25/2026");
  });

  it("handles CSV download click gracefully", async () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    render(<AccountingExportModal transactions={testTransactions} />);
    fireEvent.click(screen.getByTestId("accounting-export-trigger"));

    const downloadBtn = screen.getByTestId("export-download-button");
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled();
    });
  });

  it("shows empty state when no transactions match", () => {
    render(<AccountingExportModal transactions={[]} />);
    fireEvent.click(screen.getByTestId("accounting-export-trigger"));

    expect(screen.getByText("No transactions match the selected filter.")).toBeDefined();
    const downloadBtn = screen.getByTestId("export-download-button") as HTMLButtonElement;
    expect(downloadBtn.disabled).toBe(true);
  });
});
