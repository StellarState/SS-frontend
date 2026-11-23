import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TransactionJournalExport } from "../TransactionJournalExport";
import { SAMPLE_JOURNAL_ENTRIES, JournalEntry } from "@/lib/analytics/transactionJournal";

describe("TransactionJournalExport Component (#676)", () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and revokeObjectURL
    if (typeof window !== "undefined") {
      window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  it("renders transaction journal with formatted monetary precision and batch IDs", () => {
    render(<TransactionJournalExport />);

    expect(screen.getByTestId("transaction-journal-export")).toBeInTheDocument();
    expect(screen.getByTestId("filtered-record-count")).toHaveTextContent("5 records");

    // Check monetary precision on row
    const row001 = screen.getByTestId("journal-row-tx-rec-001");
    expect(row001).toHaveTextContent("1250000.50 USDC");
    expect(row001).toHaveTextContent("0.0000100 XLM");
    expect(row001).toHaveTextContent("BATCH-REC-2026-11-091");
  });

  it("filters journal records by account address query", () => {
    render(<TransactionJournalExport />);

    const accountInput = screen.getByTestId("filter-account");
    fireEvent.change(accountInput, { target: { value: "GCINVESTORPOOLALPHA" } });

    expect(screen.getByTestId("filtered-record-count")).toHaveTextContent("1 records");
    expect(screen.getByTestId("journal-row-tx-rec-002")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-row-tx-rec-001")).not.toBeInTheDocument();
  });

  it("filters journal records by transaction status", () => {
    render(<TransactionJournalExport />);

    const statusSelect = screen.getByTestId("filter-status");
    fireEvent.change(statusSelect, { target: { value: "failed" } });

    expect(screen.getByTestId("filtered-record-count")).toHaveTextContent("1 records");
    expect(screen.getByTestId("journal-row-tx-rec-005")).toBeInTheDocument();
    expect(screen.queryByTestId("journal-row-tx-rec-001")).not.toBeInTheDocument();
  });

  it("resets all filters on reset button click", () => {
    render(<TransactionJournalExport />);

    const accountInput = screen.getByTestId("filter-account");
    fireEvent.change(accountInput, { target: { value: "NONEXISTENT" } });

    expect(screen.getByTestId("filtered-record-count")).toHaveTextContent("0 records");
    expect(screen.getByTestId("no-records-message")).toBeInTheDocument();

    const resetBtn = screen.getByTestId("btn-reset-filters");
    fireEvent.click(resetBtn);

    expect(screen.getByTestId("filtered-record-count")).toHaveTextContent("5 records");
  });

  it("triggers CSV and XLSX file downloads on export click", async () => {
    render(<TransactionJournalExport />);

    const csvBtn = screen.getByTestId("btn-export-csv");
    fireEvent.click(csvBtn);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    const xlsxBtn = screen.getByTestId("btn-export-xlsx");
    fireEvent.click(xlsxBtn);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  it("displays progress indicator for large async exports", async () => {
    const largeEntries: JournalEntry[] = Array.from({ length: 60 }).map((_, i) => ({
      ...SAMPLE_JOURNAL_ENTRIES[0],
      id: `tx-async-${i}`,
    }));

    render(<TransactionJournalExport initialOptions={{ initialEntries: largeEntries }} />);

    expect(screen.getByTestId("filtered-record-count")).toHaveTextContent("60 records");

    const csvBtn = screen.getByTestId("btn-export-csv");
    fireEvent.click(csvBtn);

    // Progress element appears while exporting
    expect(screen.getByTestId("export-progress")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("export-progress")).not.toBeInTheDocument();
    });
  });
});
