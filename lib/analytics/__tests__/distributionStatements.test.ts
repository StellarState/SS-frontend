import { describe, it, expect } from "vitest";
import {
  calculateDistributionStatement,
  verifyStatementReconciliation,
  calculateTotalsSummary,
  generateDistributionStatementsCsv,
  generateDistributionStatementsPdfText,
  verifyExportValuesMatch,
  SAMPLE_DISTRIBUTION_STATEMENTS,
} from "../distributionStatements";

describe("distributionStatements domain logic (#693)", () => {
  describe("calculateDistributionStatement & reconciliation", () => {
    it("calculates gross, fees, taxes and net for a final quarterly period", () => {
      const stmt = calculateDistributionStatement({
        id: "STMT-TEST-Q1",
        keyId: "key-1",
        keyTitle: "Solar Energy Key",
        recipientAddress: "GABC123",
        periodLabel: "Q1 2026",
        periodType: "final_period",
        status: "final",
        snapshotTimestamp: "2026-03-31T23:59:59Z",
        snapshotKeyQuantity: 100,
        circulatingKeySupply: 1000,
        totalDistributionPool: 50000,
        protocolFeeRate: 0.02,
        withholdingTaxRate: 0.1,
      });

      // 100 / 1000 = 10% share
      expect(stmt.snapshotSharePercentage).toBe(10);
      // 50,000 * 0.10 = 5,000 gross
      expect(stmt.grossAmount).toBe(5000);
      // 5,000 * 0.02 = 100 fee
      expect(stmt.protocolFeeAmount).toBe(100);
      // (5000 - 100) * 0.10 = 490 tax
      expect(stmt.withholdingTaxAmount).toBe(490);
      // 5000 - 100 - 490 = 4410 net
      expect(stmt.netAmount).toBe(4410);

      // Total parts reconcile to gross
      expect(verifyStatementReconciliation(stmt)).toBe(true);
    });

    it("calculates and labels partial interim periods as estimated", () => {
      const partialStmt = calculateDistributionStatement({
        id: "STMT-TEST-PARTIAL",
        keyId: "key-1",
        keyTitle: "Solar Energy Key",
        recipientAddress: "GABC123",
        periodLabel: "April 2026 (Partial)",
        periodType: "partial_period",
        status: "estimated",
        snapshotTimestamp: "2026-04-15T12:00:00Z",
        snapshotKeyQuantity: 25,
        circulatingKeySupply: 500,
        totalDistributionPool: 12000,
      });

      expect(partialStmt.periodType).toBe("partial_period");
      expect(partialStmt.status).toBe("estimated");
      expect(partialStmt.snapshotSharePercentage).toBe(5);
      expect(partialStmt.grossAmount).toBe(600);
      expect(verifyStatementReconciliation(partialStmt)).toBe(true);
    });

    it("throws error on non-positive circulating key supply", () => {
      expect(() =>
        calculateDistributionStatement({
          id: "STMT-ERR",
          keyId: "k",
          keyTitle: "K",
          recipientAddress: "G",
          periodLabel: "Q",
          periodType: "final_period",
          status: "final",
          snapshotTimestamp: "2026-01-01",
          snapshotKeyQuantity: 10,
          circulatingKeySupply: 0,
          totalDistributionPool: 1000,
        })
      ).toThrow("Circulating key supply must be greater than zero.");
    });
  });

  describe("calculateTotalsSummary", () => {
    it("reconciles summary totals across multiple statements", () => {
      const totals = calculateTotalsSummary(SAMPLE_DISTRIBUTION_STATEMENTS);

      expect(totals.totalGross).toBeGreaterThan(0);
      expect(totals.totalNet).toBeGreaterThan(0);
      expect(totals.reconciled).toBe(true);
      expect(
        Math.abs(
          totals.totalNet + totals.totalFees + totals.totalTaxes - totals.totalGross
        )
      ).toBeLessThan(1e-5);
    });
  });

  describe("generateDistributionStatementsCsv", () => {
    it("throws unauthorized error when download is attempted without authorization", () => {
      expect(() =>
        generateDistributionStatementsCsv(SAMPLE_DISTRIBUTION_STATEMENTS, false)
      ).toThrow("Unauthorized: Authorisation required to export statements.");
    });

    it("generates CSV with formula injection defense and correct headers when authorized", () => {
      const unsafeStatement = calculateDistributionStatement({
        id: "=cmd|' /C calc'!A0",
        keyId: "key-1",
        keyTitle: "@RiskyFormulaTitle",
        recipientAddress: "+987654321",
        periodLabel: "-NegativeSignPeriod",
        periodType: "final_period",
        status: "final",
        snapshotTimestamp: "2026-01-01",
        snapshotKeyQuantity: 10,
        circulatingKeySupply: 100,
        totalDistributionPool: 1000,
      });

      const csv = generateDistributionStatementsCsv([unsafeStatement], true);
      expect(csv).toContain("Statement ID,Key ID,Key Title");
      expect(csv).toContain("'=cmd|' /C calc'!A0");
      expect(csv).toContain("'@RiskyFormulaTitle");
      expect(csv).toContain("'+987654321");
      expect(csv).toContain("'-NegativeSignPeriod");
    });
  });

  describe("generateDistributionStatementsPdfText", () => {
    it("throws unauthorized error when PDF export is attempted without authorization", () => {
      expect(() =>
        generateDistributionStatementsPdfText(SAMPLE_DISTRIBUTION_STATEMENTS, false)
      ).toThrow("Unauthorized: Authorisation required to export statements.");
    });

    it("generates structured text document when authorized", () => {
      const doc = generateDistributionStatementsPdfText(
        SAMPLE_DISTRIBUTION_STATEMENTS,
        true
      );
      expect(doc).toContain("STELLARSTATE KEY-HOLDER DISTRIBUTION STATEMENT");
      expect(doc).toContain("RECONCILED (PASSED)");
      expect(doc).toContain("Gross Distribution:");
      expect(doc).toContain("Net Payout:");
    });
  });

  describe("verifyExportValuesMatch", () => {
    it("confirms that CSV and PDF values match statement data model", () => {
      const stmt = SAMPLE_DISTRIBUTION_STATEMENTS[0];
      const csv = generateDistributionStatementsCsv([stmt], true);
      const pdf = generateDistributionStatementsPdfText([stmt], true);

      const matches = verifyExportValuesMatch(csv, pdf, stmt);
      expect(matches).toBe(true);
    });
  });
});
