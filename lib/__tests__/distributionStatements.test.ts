import { describe, expect, it } from "vitest";
import {
  authorizeStatementDownload,
  calculateDistributionStatement,
  generateStatementsCsv,
  statementToCsvRow,
  type StatementCalculationInput,
} from "../distributionStatements";

const HOLDER_1 = "GBZXN7PIRZGNMHGA72ODXR6DTZS657SDNVWYTG52M7NA65I4Q2IT5678";
const HOLDER_2 = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

describe("distributionStatements", () => {
  const baseInput: StatementCalculationInput = {
    statementId: "STMT-2026-Q3",
    keyId: "creator-alpha",
    keyTitle: "Alpha Key",
    holderAddress: HOLDER_1,
    status: "final",
    period: {
      periodId: "2026-Q3",
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      quarterLabel: "Q3 2026",
    },
    snapshotDate: "2026-09-30T23:59:59Z",
    heldKeys: 50,
    snapshotTotalSupply: 500, // 10% share
    poolGrossDistribution: 10000, // 10,000 XLM total pool
    protocolFeeRate: 0.02, // 2%
    withholdingTaxRate: 0.15, // 15%
    currency: "XLM",
    finalizedAt: "2026-10-01T00:00:00Z",
  };

  it("reconciles totals to the distribution pool accurately", () => {
    const stmt = calculateDistributionStatement(baseInput);

    // Share ratio = 50 / 500 = 0.1 (10%)
    expect(stmt.snapshotSharePercent).toBe(10);
    // Gross = 10,000 * 0.1 = 1,000
    expect(stmt.grossAmount).toBe(1000);
    // Fee = 1,000 * 0.02 = 20
    expect(stmt.protocolFeeAmount).toBe(20);
    // Tax = 1,000 * 0.15 = 150
    expect(stmt.withholdingTaxAmount).toBe(150);
    // Net = 1,000 - 20 - 150 = 830
    expect(stmt.netPayoutAmount).toBe(830);

    // Exact reconciliation check
    const reconciledGross =
      stmt.netPayoutAmount + stmt.protocolFeeAmount + stmt.withholdingTaxAmount;
    expect(Math.abs(reconciledGross - stmt.grossAmount)).toBeLessThanOrEqual(0.001);
  });

  it("handles final vs estimated statements and preserves labels", () => {
    const finalStmt = calculateDistributionStatement(baseInput);
    expect(finalStmt.isEstimated).toBe(false);
    expect(finalStmt.status).toBe("final");
    expect(finalStmt.finalizedAt).toBe("2026-10-01T00:00:00Z");

    const estStmt = calculateDistributionStatement({
      ...baseInput,
      statementId: "STMT-2026-Q4-EST",
      status: "estimated",
      period: {
        periodId: "2026-Q4",
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        quarterLabel: "Q4 2026 (Projected)",
      },
    });
    expect(estStmt.isEstimated).toBe(true);
    expect(estStmt.status).toBe("estimated");
    expect(estStmt.finalizedAt).toBeUndefined();
  });

  it("computes accurate partial share fractions without precision loss", () => {
    const stmt = calculateDistributionStatement({
      ...baseInput,
      heldKeys: 17,
      snapshotTotalSupply: 333,
      poolGrossDistribution: 5432.1,
    });

    // Share: 17 / 333 = ~5.1051%
    expect(stmt.snapshotSharePercent).toBeCloseTo(5.1051, 3);
    const expectedGross = 5432.1 * (17 / 333);
    expect(stmt.grossAmount).toBeCloseTo(expectedGross, 2);

    const reconciled =
      stmt.netPayoutAmount + stmt.protocolFeeAmount + stmt.withholdingTaxAmount;
    expect(reconciled).toBeCloseTo(stmt.grossAmount, 2);
  });

  describe("authorizeStatementDownload", () => {
    it("authorizes the matching key holder wallet", () => {
      const stmt = calculateDistributionStatement(baseInput);
      const auth = authorizeStatementDownload(HOLDER_1, stmt);
      expect(auth.authorized).toBe(true);
      expect(auth.reason).toBeUndefined();
    });

    it("rejects unauthorized wallets or unauthenticated visitors", () => {
      const stmt = calculateDistributionStatement(baseInput);
      const authUnauthed = authorizeStatementDownload(null, stmt);
      expect(authUnauthed.authorized).toBe(false);
      expect(authUnauthed.reason).toContain("Authentication required");

      const authDifferent = authorizeStatementDownload(HOLDER_2, stmt);
      expect(authDifferent.authorized).toBe(false);
      expect(authDifferent.reason).toContain("Unauthorized");
    });
  });

  describe("CSV Export Generation", () => {
    it("generates CSV with matching figures and headers", () => {
      const stmt = calculateDistributionStatement(baseInput);
      const row = statementToCsvRow(stmt);

      expect(row["Statement ID"]).toBe("STMT-2026-Q3");
      expect(row["Snapshot Share (%)"]).toBe("10.00%");
      expect(row["Gross Distribution"]).toBe("1000.0000 XLM");
      expect(row["Net Payout"]).toBe("830.0000 XLM");
      expect(row.Status).toBe("Final");

      const csv = generateStatementsCsv([stmt]);
      expect(csv).toContain("Statement ID,Key ID,Key Title,Holder Address");
      expect(csv).toContain("STMT-2026-Q3");
      expect(csv).toContain("1000.0000 XLM");
      expect(csv).toContain("830.0000 XLM");
    });
  });
});
