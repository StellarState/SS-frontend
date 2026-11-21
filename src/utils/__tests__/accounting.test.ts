import { describe, expect, it } from "vitest";
import type { PlatformTransaction } from "@/lib/api";
import {
  DEFAULT_CATEGORY_MAPPING,
  GENERIC_HEADERS,
  QUICKBOOKS_HEADERS,
  XERO_HEADERS,
  buildAccountingCsv,
  buildAccountingCsvChunked,
  buildGenericCsv,
  buildQuickbooksCsv,
  buildXeroCsv,
  escapeCsvValue,
  filterTransactionsByDateRange,
  formatAccountingAmount,
  formatGenericDate,
  formatQuickbooksDate,
  formatXeroDate,
  getAccountingSignedAmount,
  getPreviewRows,
} from "@/src/utils/accounting";

const mockTransactions: PlatformTransaction[] = [
  {
    id: "tx-1",
    type: "invest",
    amount: 1500,
    currency: "USDC",
    status: "success",
    createdAt: "2026-03-15T14:30:00.000Z",
    txHash: "0xabc123",
    invoiceId: "INV-101",
    invoiceTitle: "Logistics Fleet Refinance",
  },
  {
    id: "tx-2",
    type: "claim",
    amount: 320.5,
    currency: "USDC",
    status: "success",
    createdAt: "2026-04-20T09:15:00.000Z",
    txHash: "0xdef456",
    invoiceId: "INV-101",
    invoiceTitle: "Logistics Fleet Refinance",
  },
  {
    id: "tx-3",
    type: "settle",
    amount: 50,
    currency: "USDC",
    status: "success",
    createdAt: "2026-05-01T12:00:00.000Z",
    txHash: "0xghi789",
    invoiceId: "INV-102",
    invoiceTitle: 'Hardware, "Special" Supplies',
  },
];

describe("Accounting Utilities", () => {
  describe("Date Formatters", () => {
    it("formats QuickBooks dates as MM/DD/YYYY", () => {
      expect(formatQuickbooksDate("2026-03-15T10:00:00.000Z")).toBe("03/15/2026");
      expect(formatQuickbooksDate("2026-12-05T10:00:00.000Z")).toBe("12/05/2026");
      expect(formatQuickbooksDate("invalid-date")).toBe("");
    });

    it("formats Xero dates as DD/MM/YYYY", () => {
      expect(formatXeroDate("2026-03-15T10:00:00.000Z")).toBe("15/03/2026");
      expect(formatXeroDate("2026-12-05T10:00:00.000Z")).toBe("05/12/2026");
      expect(formatXeroDate("invalid-date")).toBe("");
    });

    it("formats Generic dates as YYYY-MM-DD", () => {
      expect(formatGenericDate("2026-03-15T10:00:00.000Z")).toBe("2026-03-15");
      expect(formatGenericDate("invalid-date")).toBe("");
    });
  });

  describe("Amount Signs & Accounting Logic", () => {
    it("assigns negative sign to invest (outflow / debit)", () => {
      expect(getAccountingSignedAmount("invest", 500)).toBe(-500);
      expect(formatAccountingAmount(getAccountingSignedAmount("invest", 500))).toBe("-500.00");
    });

    it("assigns positive sign to claim and settle (inflow / credit)", () => {
      expect(getAccountingSignedAmount("claim", 250)).toBe(250);
      expect(getAccountingSignedAmount("settle", 75)).toBe(75);
    });
  });

  describe("CSV Escaping (RFC 4180)", () => {
    it("escapes fields containing commas, quotes, and newlines", () => {
      expect(escapeCsvValue('Simple')).toBe("Simple");
      expect(escapeCsvValue('Invoice, 101')).toBe('"Invoice, 101"');
      expect(escapeCsvValue('Quote "test"')).toBe('"Quote ""test"""');
      expect(escapeCsvValue("Line1\nLine2")).toBe('"Line1\nLine2"');
      expect(escapeCsvValue(null)).toBe("");
      expect(escapeCsvValue(undefined)).toBe("");
    });
  });

  describe("Date Range Filtering", () => {
    it("filters transactions within specified start and end dates", () => {
      const filtered = filterTransactionsByDateRange(
        mockTransactions,
        "2026-04-01",
        "2026-04-30"
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("tx-2");
    });

    it("returns all transactions when no dates are provided", () => {
      expect(filterTransactionsByDateRange(mockTransactions)).toHaveLength(3);
    });
  });

  describe("buildQuickbooksCsv", () => {
    it("includes required QuickBooks columns", () => {
      const csv = buildQuickbooksCsv(mockTransactions);
      const lines = csv.split("\r\n");
      expect(lines[0]).toBe(QUICKBOOKS_HEADERS.join(","));
    });

    it("correctly outputs amounts, dates, and category mapping", () => {
      const csv = buildQuickbooksCsv(mockTransactions, {
        invest: "Custom Fleet Expense",
      });
      const lines = csv.split("\r\n");

      // Row 1 (invest): date MM/DD/YYYY, negative amount, custom category
      expect(lines[1]).toContain("03/15/2026");
      expect(lines[1]).toContain("-1500.00");
      expect(lines[1]).toContain("Custom Fleet Expense");

      // Row 2 (claim): positive amount, default category
      expect(lines[2]).toContain("04/20/2026");
      expect(lines[2]).toContain("320.50");
      expect(lines[2]).toContain(DEFAULT_CATEGORY_MAPPING.claim);
    });

    it("escapes special characters in invoice titles", () => {
      const csv = buildQuickbooksCsv(mockTransactions);
      // Row 3 has: Hardware, "Special" Supplies
      expect(csv).toContain('"Hardware, ""Special"" Supplies"');
    });
  });

  describe("buildXeroCsv", () => {
    it("includes required Xero columns with *Date and *Amount", () => {
      const csv = buildXeroCsv(mockTransactions);
      const lines = csv.split("\r\n");
      expect(lines[0]).toBe(XERO_HEADERS.join(","));
    });

    it("correctly outputs DD/MM/YYYY date format and signed amounts", () => {
      const csv = buildXeroCsv(mockTransactions);
      const lines = csv.split("\r\n");

      // Row 1 (invest): 15/03/2026, -1500.00
      expect(lines[1]).toContain("15/03/2026");
      expect(lines[1]).toContain("-1500.00");
      expect(lines[1]).toContain("StellarState Platform");

      // Row 2 (claim): 20/04/2026, 320.50
      expect(lines[2]).toContain("20/04/2026");
      expect(lines[2]).toContain("320.50");
    });
  });

  describe("buildGenericCsv & buildAccountingCsv", () => {
    it("includes standard generic headers and ISO dates", () => {
      const csv = buildGenericCsv(mockTransactions);
      const lines = csv.split("\r\n");
      expect(lines[0]).toBe(GENERIC_HEADERS.join(","));
      expect(lines[1]).toContain("2026-03-15");
      expect(lines[1]).toContain("tx-1");
    });

    it("delegates properly through buildAccountingCsv", () => {
      const qb = buildAccountingCsv("quickbooks", mockTransactions);
      expect(qb).toContain(QUICKBOOKS_HEADERS[0]);

      const xero = buildAccountingCsv("xero", mockTransactions);
      expect(xero).toContain(XERO_HEADERS[0]);

      const generic = buildAccountingCsv("generic", mockTransactions);
      expect(generic).toContain(GENERIC_HEADERS[0]);
    });
  });

  describe("Preview and Download Matching", () => {
    it("returns preview rows that exactly match the downloaded CSV rows", () => {
      const preview = getPreviewRows("quickbooks", mockTransactions, {}, 10);
      expect(preview.headers).toEqual(QUICKBOOKS_HEADERS);
      expect(preview.rows).toHaveLength(3);

      const fullCsv = buildQuickbooksCsv(mockTransactions);
      const lines = fullCsv.split("\r\n");

      // Header matches
      expect(lines[0]).toBe(preview.headers.join(","));

      // Data rows match when joined
      preview.rows.forEach((row, i) => {
        expect(lines[i + 1]).toBe(row.map(escapeCsvValue).join(","));
      });
    });
  });

  describe("Large Export Chunking & Non-blocking", () => {
    it("completes 10,000 row export in chunks without blocking", async () => {
      // Generate 10,000 synthetic transactions
      const largeBatch: PlatformTransaction[] = Array.from({ length: 10000 }, (_, i) => ({
        id: `tx-${i}`,
        type: i % 2 === 0 ? "invest" : "claim",
        amount: 100 + (i % 500),
        currency: "USDC",
        status: "success",
        createdAt: new Date(2026, 0, 1 + (i % 120)).toISOString(),
        txHash: `0xhash${i}`,
        invoiceId: `INV-${i}`,
        invoiceTitle: `Automated Trade Batch #${i}`,
      }));

      let progressCalled = 0;
      const csv = await buildAccountingCsvChunked("quickbooks", largeBatch, {
        chunkSize: 1000,
        onProgress: (_pct, _processed, _total) => {
          progressCalled++;
        },
      });

      const lines = csv.split("\r\n");
      // Header + 10,000 data rows
      expect(lines).toHaveLength(10001);
      expect(progressCalled).toBeGreaterThanOrEqual(10);
      expect(lines[0]).toBe(QUICKBOOKS_HEADERS.join(","));
    });
  });
});
