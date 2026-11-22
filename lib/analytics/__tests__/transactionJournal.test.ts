import { describe, it, expect, vi } from "vitest";
import {
  escapeCsvField,
  escapeXmlField,
  formatMonetaryValue,
  filterJournalEntries,
  generateJournalCsv,
  generateJournalXlsxXml,
  exportJournalAsync,
  SAMPLE_JOURNAL_ENTRIES,
  JournalEntry,
} from "../transactionJournal";

describe("Transaction Journal Logic (#676)", () => {
  it("escapes spreadsheet formulas to prevent CSV and Excel formula injection", () => {
    // Formula triggers: =, +, -, @, \t, \r
    expect(escapeCsvField("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(escapeCsvField("+12345")).toBe("'+12345");
    expect(escapeCsvField("-5000")).toBe("'-5000");
    expect(escapeCsvField("@eval")).toBe("'@eval");
    expect(escapeCsvField("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(escapeCsvField('=CMD|" /C calc"!A0')).toBe("\"'=CMD|\"\" /C calc\"\"!A0\"");

    // XML escaping
    expect(escapeXmlField("=SUM(A1:A10)")).toBe("&apos;=SUM(A1:A10)");
    expect(escapeXmlField("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&apos;xss&apos;)&lt;/script&gt;"
    );
  });

  it("handles commas, quotes, newlines, and unicode safely in CSV (RFC 4180)", () => {
    expect(escapeCsvField('Company "Alpha", LLC')).toBe('"Company ""Alpha"", LLC"');
    expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    expect(escapeCsvField("SimpleText")).toBe("SimpleText");
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("formats monetary values with explicit ISO currency and fixed precision", () => {
    expect(formatMonetaryValue(1250.5, "USDC", 2)).toBe("1250.50 USDC");
    expect(formatMonetaryValue(0.00001, "XLM", 7)).toBe("0.0000100 XLM");
    expect(formatMonetaryValue(0, "USD", 2)).toBe("0.00 USD");
  });

  it("filters entries by date range, account, status, and batch ID", () => {
    // Account filter (matches source or destination)
    const byAccount = filterJournalEntries(SAMPLE_JOURNAL_ENTRIES, {
      account: "GCINVESTORPOOLALPHA",
    });
    expect(byAccount).toHaveLength(1);
    expect(byAccount[0].id).toBe("tx-rec-002");

    // Status filter
    const byStatus = filterJournalEntries(SAMPLE_JOURNAL_ENTRIES, {
      status: "failed",
    });
    expect(byStatus).toHaveLength(1);
    expect(byStatus[0].id).toBe("tx-rec-005");

    // Batch ID filter
    const byBatch = filterJournalEntries(SAMPLE_JOURNAL_ENTRIES, {
      batchId: "BATCH-REC-2026-11-091",
    });
    expect(byBatch).toHaveLength(1);
    expect(byBatch[0].id).toBe("tx-rec-001");

    // Date range filter
    const byDate = filterJournalEntries(SAMPLE_JOURNAL_ENTRIES, {
      startDate: "2026-11-20T00:00:00.000Z",
      endDate: "2026-11-20T23:59:59.000Z",
    });
    expect(byDate).toHaveLength(2);
  });

  it("ensures CSV and XLSX export outputs contain the exact same filtered set of rows", () => {
    const filtered = filterJournalEntries(SAMPLE_JOURNAL_ENTRIES, {
      status: "completed",
    });

    const csvOutput = generateJournalCsv(filtered);
    const xlsxOutput = generateJournalXlsxXml(filtered);

    // Both contain headers and row records for every filtered entry
    for (const entry of filtered) {
      expect(csvOutput).toContain(entry.id);
      expect(xlsxOutput).toContain(entry.id);

      // Verify monetary value and precision in both
      const expectedMonetary = formatMonetaryValue(entry.amount, entry.currency, entry.precision);
      expect(csvOutput).toContain(expectedMonetary);
      expect(xlsxOutput).toContain(expectedMonetary);
    }

    // Excluded items should not appear in either
    const excluded = SAMPLE_JOURNAL_ENTRIES.filter((e) => e.status !== "completed");
    for (const entry of excluded) {
      expect(csvOutput).not.toContain(entry.id);
      expect(xlsxOutput).not.toContain(entry.id);
    }
  });

  it("ensures settlement rows include reconciliation batch IDs", () => {
    const settlements = SAMPLE_JOURNAL_ENTRIES.filter((e) => e.type === "settlement");
    expect(settlements.length).toBeGreaterThan(0);

    for (const settlement of settlements) {
      expect(settlement.reconciliation_batch_id).toBeTruthy();
      expect(settlement.reconciliation_batch_id).toMatch(/^BATCH-REC-/);
    }
  });

  it("executes async export with progress callbacks for large datasets", async () => {
    const largeSet: JournalEntry[] = Array.from({ length: 60 }).map((_, idx) => ({
      ...SAMPLE_JOURNAL_ENTRIES[0],
      id: `tx-large-${idx}`,
    }));

    const progressSpy = vi.fn();
    const result = await exportJournalAsync(largeSet, "csv", progressSpy);

    expect(progressSpy).toHaveBeenCalledWith(25);
    expect(progressSpy).toHaveBeenCalledWith(65);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(result.mimeType).toBe("text/csv;charset=utf-8;");
    expect(result.filename).toMatch(/reconciliation-journal-.*\.csv/);
  });
});
