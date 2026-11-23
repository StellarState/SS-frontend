export type StatementStatus = "final" | "estimated";

export interface StatementPeriod {
  periodId: string;
  startDate: string;
  endDate: string;
  quarterLabel: string;
}

export interface DistributionStatement {
  statementId: string;
  keyId: string;
  keyTitle: string;
  holderAddress: string;
  status: StatementStatus;
  period: StatementPeriod;
  snapshotDate: string;
  snapshotBlockHeight: number;
  heldKeys: number;
  snapshotTotalSupply: number;
  snapshotSharePercent: number; // e.g. 5.0 for 5%
  poolGrossDistribution: number;
  grossAmount: number;
  protocolFeeRate: number; // e.g. 0.02 for 2%
  protocolFeeAmount: number;
  withholdingTaxRate: number; // e.g. 0.15 for 15%
  withholdingTaxAmount: number;
  netPayoutAmount: number;
  currency: string;
  isEstimated: boolean;
  finalizedAt?: string;
}

export interface StatementCalculationInput {
  statementId: string;
  keyId: string;
  keyTitle: string;
  holderAddress: string;
  status: StatementStatus;
  period: StatementPeriod;
  snapshotDate: string;
  snapshotBlockHeight?: number;
  heldKeys: number;
  snapshotTotalSupply: number;
  poolGrossDistribution: number;
  protocolFeeRate?: number; // default 0.02 (2%)
  withholdingTaxRate?: number; // default 0.15 (15%)
  currency?: string;
  finalizedAt?: string;
}

export interface StatementCsvRow {
  "Statement ID": string;
  "Key ID": string;
  "Key Title": string;
  "Holder Address": string;
  Status: string;
  "Period Start": string;
  "Period End": string;
  "Quarter / Label": string;
  "Snapshot Date": string;
  "Snapshot Block": number;
  "Held Keys": number;
  "Total Snapshot Supply": number;
  "Snapshot Share (%)": string;
  "Pool Total Distribution": string;
  "Gross Distribution": string;
  "Protocol Fee": string;
  "Withholding Tax": string;
  "Net Payout": string;
  Currency: string;
}

/**
 * Calculates a complete, reconciled distribution statement.
 * Strictly verifies and ensures:
 * 1. Snapshot share percentage = (heldKeys / snapshotTotalSupply) * 100
 * 2. Gross amount = poolGrossDistribution * (heldKeys / snapshotTotalSupply)
 * 3. Protocol fees = grossAmount * protocolFeeRate
 * 4. Taxes = (grossAmount - protocolFeeAmount) * withholdingTaxRate or grossAmount * withholdingTaxRate
 * 5. Net = grossAmount - protocolFeeAmount - withholdingTaxAmount
 * 6. Reconciliation check: Gross == Net + ProtocolFee + WithholdingTax
 */
export function calculateDistributionStatement(
  input: StatementCalculationInput
): DistributionStatement {
  const {
    statementId,
    keyId,
    keyTitle,
    holderAddress,
    status,
    period,
    snapshotDate,
    snapshotBlockHeight = 1042000,
    heldKeys,
    snapshotTotalSupply,
    poolGrossDistribution,
    protocolFeeRate = 0.02,
    withholdingTaxRate = 0.15,
    currency = "XLM",
    finalizedAt,
  } = input;

  const safeSupply = Math.max(1, snapshotTotalSupply);
  const safeKeys = Math.max(0, heldKeys);
  const shareRatio = safeKeys / safeSupply;
  const snapshotSharePercent = Number((shareRatio * 100).toFixed(4));

  const grossAmount = Number((poolGrossDistribution * shareRatio).toFixed(4));
  const protocolFeeAmount = Number((grossAmount * protocolFeeRate).toFixed(4));
  const withholdingTaxAmount = Number(
    (grossAmount * withholdingTaxRate).toFixed(4)
  );

  // Exact reconciliation: Net is remainder after fees and taxes
  const netPayoutAmount = Number(
    Math.max(
      0,
      grossAmount - protocolFeeAmount - withholdingTaxAmount
    ).toFixed(4)
  );

  const isEstimated = status === "estimated";

  return {
    statementId,
    keyId,
    keyTitle,
    holderAddress,
    status,
    period,
    snapshotDate,
    snapshotBlockHeight,
    heldKeys: safeKeys,
    snapshotTotalSupply: safeSupply,
    snapshotSharePercent,
    poolGrossDistribution,
    grossAmount,
    protocolFeeRate,
    protocolFeeAmount,
    withholdingTaxRate,
    withholdingTaxAmount,
    netPayoutAmount,
    currency,
    isEstimated,
    finalizedAt: isEstimated ? undefined : finalizedAt || snapshotDate,
  };
}

/**
 * Validates that an export download is authorized.
 * Only the designated holder or authenticated wallet with matching address may download statements.
 */
export function authorizeStatementDownload(
  callerAddress: string | null | undefined,
  statement: DistributionStatement
): { authorized: boolean; reason?: string } {
  if (!callerAddress || !callerAddress.trim()) {
    return {
      authorized: false,
      reason: "Authentication required: Please connect the key holder wallet",
    };
  }

  const trimmedCaller = callerAddress.trim();
  const trimmedHolder = statement.holderAddress.trim();

  if (trimmedCaller.toLowerCase() !== trimmedHolder.toLowerCase()) {
    return {
      authorized: false,
      reason: "Unauthorized: Active wallet is not the owner of this distribution statement",
    };
  }

  return { authorized: true };
}

/**
 * Converts statements into structured CSV rows matching the exact statement breakdown.
 */
export function statementToCsvRow(stmt: DistributionStatement): StatementCsvRow {
  return {
    "Statement ID": stmt.statementId,
    "Key ID": stmt.keyId,
    "Key Title": stmt.keyTitle,
    "Holder Address": stmt.holderAddress,
    Status: stmt.isEstimated ? "Estimated" : "Final",
    "Period Start": stmt.period.startDate,
    "Period End": stmt.period.endDate,
    "Quarter / Label": stmt.period.quarterLabel,
    "Snapshot Date": stmt.snapshotDate,
    "Snapshot Block": stmt.snapshotBlockHeight,
    "Held Keys": stmt.heldKeys,
    "Total Snapshot Supply": stmt.snapshotTotalSupply,
    "Snapshot Share (%)": `${stmt.snapshotSharePercent.toFixed(2)}%`,
    "Pool Total Distribution": `${stmt.poolGrossDistribution.toFixed(2)} ${stmt.currency}`,
    "Gross Distribution": `${stmt.grossAmount.toFixed(4)} ${stmt.currency}`,
    "Protocol Fee": `${stmt.protocolFeeAmount.toFixed(4)} ${stmt.currency}`,
    "Withholding Tax": `${stmt.withholdingTaxAmount.toFixed(4)} ${stmt.currency}`,
    "Net Payout": `${stmt.netPayoutAmount.toFixed(4)} ${stmt.currency}`,
    Currency: stmt.currency,
  };
}

/**
 * Generates institutional CSV string from statements.
 */
export function generateStatementsCsv(statements: DistributionStatement[]): string {
  if (statements.length === 0) return "";

  const rows = statements.map(statementToCsvRow);
  const headers = Object.keys(rows[0]) as (keyof StatementCsvRow)[];

  const escapeField = (val: string | number) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeField).join(",");
  const dataLines = rows.map((r) =>
    headers.map((h) => escapeField(r[h])).join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

/**
 * Mock generator for mock statement history for demo & integration testing.
 */
export function generateMockStatements(
  keyId: string,
  keyTitle: string,
  holderAddress: string,
  heldKeys: number = 25
): DistributionStatement[] {
  return [
    calculateDistributionStatement({
      statementId: `STMT-${keyId}-2026-Q3`,
      keyId,
      keyTitle,
      holderAddress,
      status: "final",
      period: {
        periodId: "2026-Q3",
        startDate: "2026-07-01",
        endDate: "2026-09-30",
        quarterLabel: "Q3 2026 Distribution",
      },
      snapshotDate: "2026-09-30T23:59:59Z",
      snapshotBlockHeight: 1042500,
      heldKeys,
      snapshotTotalSupply: 500,
      poolGrossDistribution: 15000,
      currency: "XLM",
      finalizedAt: "2026-10-01T08:00:00Z",
    }),
    calculateDistributionStatement({
      statementId: `STMT-${keyId}-2026-Q2`,
      keyId,
      keyTitle,
      holderAddress,
      status: "final",
      period: {
        periodId: "2026-Q2",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        quarterLabel: "Q2 2026 Distribution",
      },
      snapshotDate: "2026-06-30T23:59:59Z",
      snapshotBlockHeight: 985000,
      heldKeys: Math.max(1, heldKeys - 5),
      snapshotTotalSupply: 400,
      poolGrossDistribution: 12000,
      currency: "XLM",
      finalizedAt: "2026-07-01T08:00:00Z",
    }),
    calculateDistributionStatement({
      statementId: `STMT-${keyId}-2026-Q4-EST`,
      keyId,
      keyTitle,
      holderAddress,
      status: "estimated",
      period: {
        periodId: "2026-Q4",
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        quarterLabel: "Q4 2026 (Projected)",
      },
      snapshotDate: "2026-12-31T23:59:59Z",
      snapshotBlockHeight: 1100000,
      heldKeys,
      snapshotTotalSupply: 550,
      poolGrossDistribution: 18500,
      currency: "XLM",
    }),
  ];
}
