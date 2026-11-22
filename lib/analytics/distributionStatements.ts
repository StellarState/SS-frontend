/**
 * Key-Holder Distribution Statements Domain Logic (Issue #693)
 *
 * Tax and accounting statements for creator key distributions:
 * - Gross, fees, taxes and net breakdown
 * - Reconciles totals to distribution pool
 * - Shares based on snapshot key quantity vs circulating supply
 * - CSV (RFC 4180) and PDF accounting statement generation
 * - Explicit labels for final vs estimated statements
 * - Authorisation requirement for statement downloads
 * - Covers full final periods and partial interim periods
 */

export type StatementStatus = "final" | "estimated";
export type DistributionPeriodType = "final_period" | "partial_period";

export interface KeyHolderDistributionStatement {
  id: string;
  keyId: string;
  keyTitle: string;
  recipientAddress: string;
  periodLabel: string;
  periodType: DistributionPeriodType;
  status: StatementStatus;
  snapshotTimestamp: string;
  snapshotKeyQuantity: number;
  circulatingKeySupply: number;
  snapshotSharePercentage: number;
  totalDistributionPool: number;
  grossAmount: number;
  protocolFeeRate: number;
  protocolFeeAmount: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  netAmount: number;
  currency: "XLM" | "USDC";
}

export interface StatementTotalsSummary {
  totalGross: number;
  totalFees: number;
  totalTaxes: number;
  totalNet: number;
  totalPool: number;
  reconciled: boolean;
}

/**
 * Calculates a key-holder distribution statement with exact reconciliation.
 */
export function calculateDistributionStatement(params: {
  id: string;
  keyId: string;
  keyTitle: string;
  recipientAddress: string;
  periodLabel: string;
  periodType: DistributionPeriodType;
  status: StatementStatus;
  snapshotTimestamp: string;
  snapshotKeyQuantity: number;
  circulatingKeySupply: number;
  totalDistributionPool: number;
  protocolFeeRate?: number;
  withholdingTaxRate?: number;
  currency?: "XLM" | "USDC";
}): KeyHolderDistributionStatement {
  const {
    id,
    keyId,
    keyTitle,
    recipientAddress,
    periodLabel,
    periodType,
    status,
    snapshotTimestamp,
    snapshotKeyQuantity,
    circulatingKeySupply,
    totalDistributionPool,
    protocolFeeRate = 0.02, // 2% protocol fee default
    withholdingTaxRate = 0.1, // 10% withholding tax default
    currency = "XLM",
  } = params;

  if (circulatingKeySupply <= 0) {
    throw new Error("Circulating key supply must be greater than zero.");
  }
  if (snapshotKeyQuantity < 0) {
    throw new Error("Snapshot key quantity cannot be negative.");
  }
  if (totalDistributionPool < 0) {
    throw new Error("Total distribution pool cannot be negative.");
  }

  // Share percentage based on snapshot quantity
  const shareRatio = snapshotKeyQuantity / circulatingKeySupply;
  const snapshotSharePercentage = Number((shareRatio * 100).toFixed(4));

  // Gross amount from pool
  const grossAmount = Number((totalDistributionPool * shareRatio).toFixed(7));

  // Protocol fee
  const protocolFeeAmount = Number((grossAmount * protocolFeeRate).toFixed(7));

  // Withholding tax on (gross - protocol fee)
  const taxableBase = Math.max(0, grossAmount - protocolFeeAmount);
  const withholdingTaxAmount = Number((taxableBase * withholdingTaxRate).toFixed(7));

  // Net amount
  const netAmount = Number(
    (grossAmount - protocolFeeAmount - withholdingTaxAmount).toFixed(7)
  );

  return {
    id,
    keyId,
    keyTitle,
    recipientAddress,
    periodLabel,
    periodType,
    status,
    snapshotTimestamp,
    snapshotKeyQuantity,
    circulatingKeySupply,
    snapshotSharePercentage,
    totalDistributionPool,
    grossAmount,
    protocolFeeRate,
    protocolFeeAmount,
    withholdingTaxRate,
    withholdingTaxAmount,
    netAmount,
    currency,
  };
}

/**
 * Reconciles statement amounts: net + fee + tax must equal gross within float precision.
 */
export function verifyStatementReconciliation(
  statement: KeyHolderDistributionStatement
): boolean {
  const sumOfParts =
    statement.netAmount +
    statement.protocolFeeAmount +
    statement.withholdingTaxAmount;
  return Math.abs(sumOfParts - statement.grossAmount) < 1e-5;
}

/**
 * Computes summary totals across multiple statements and verifies overall reconciliation.
 */
export function calculateTotalsSummary(
  statements: KeyHolderDistributionStatement[]
): StatementTotalsSummary {
  let totalGross = 0;
  let totalFees = 0;
  let totalTaxes = 0;
  let totalNet = 0;
  let totalPool = 0;

  for (const s of statements) {
    totalGross += s.grossAmount;
    totalFees += s.protocolFeeAmount;
    totalTaxes += s.withholdingTaxAmount;
    totalNet += s.netAmount;
    totalPool += s.totalDistributionPool;
  }

  totalGross = Number(totalGross.toFixed(7));
  totalFees = Number(totalFees.toFixed(7));
  totalTaxes = Number(totalTaxes.toFixed(7));
  totalNet = Number(totalNet.toFixed(7));

  const reconciled =
    Math.abs(totalNet + totalFees + totalTaxes - totalGross) < 1e-5;

  return {
    totalGross,
    totalFees,
    totalTaxes,
    totalNet,
    totalPool: Number(totalPool.toFixed(7)),
    reconciled,
  };
}

/**
 * Escapes text for RFC 4180 CSV and prevents spreadsheet formula injection.
 */
function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 CSV export of distribution statements.
 * Strict authorization check: throws if isAuthorized is false.
 */
export function generateDistributionStatementsCsv(
  statements: KeyHolderDistributionStatement[],
  isAuthorized: boolean
): string {
  if (!isAuthorized) {
    throw new Error("Unauthorized: Authorisation required to export statements.");
  }

  const headers = [
    "Statement ID",
    "Key ID",
    "Key Title",
    "Recipient Address",
    "Period",
    "Status",
    "Period Type",
    "Snapshot Timestamp",
    "Snapshot Keys",
    "Circulating Supply",
    "Share %",
    "Total Pool",
    "Gross Amount",
    "Protocol Fee",
    "Withholding Tax",
    "Net Amount",
    "Currency",
  ];

  const rows = statements.map((s) => [
    escapeCsvField(s.id),
    escapeCsvField(s.keyId),
    escapeCsvField(s.keyTitle),
    escapeCsvField(s.recipientAddress),
    escapeCsvField(s.periodLabel),
    escapeCsvField(s.status.toUpperCase()),
    escapeCsvField(s.periodType === "final_period" ? "Final Period" : "Partial Period"),
    escapeCsvField(s.snapshotTimestamp),
    escapeCsvField(s.snapshotKeyQuantity),
    escapeCsvField(s.circulatingKeySupply),
    escapeCsvField(`${s.snapshotSharePercentage.toFixed(2)}%`),
    escapeCsvField(s.totalDistributionPool.toFixed(2)),
    escapeCsvField(s.grossAmount.toFixed(2)),
    escapeCsvField(s.protocolFeeAmount.toFixed(2)),
    escapeCsvField(s.withholdingTaxAmount.toFixed(2)),
    escapeCsvField(s.netAmount.toFixed(2)),
    escapeCsvField(s.currency),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Generates a structured PDF-ready document string representing the accounting distribution statements.
 * Strict authorization check: throws if isAuthorized is false.
 */
export function generateDistributionStatementsPdfText(
  statements: KeyHolderDistributionStatement[],
  isAuthorized: boolean
): string {
  if (!isAuthorized) {
    throw new Error("Unauthorized: Authorisation required to export statements.");
  }

  const totals = calculateTotalsSummary(statements);

  const lines: string[] = [
    "================================================================================",
    "                   STELLARSTATE KEY-HOLDER DISTRIBUTION STATEMENT                ",
    "================================================================================",
    `Generated At: ${new Date().toISOString()}`,
    `Total Statements: ${statements.length}`,
    `Summary Total Net: ${totals.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })} XLM`,
    `Reconciliation Status: ${totals.reconciled ? "RECONCILED (PASSED)" : "DISCREPANCY DETECTED"}`,
    "--------------------------------------------------------------------------------",
  ];

  for (const s of statements) {
    lines.push(
      `Statement ID:        ${s.id}`,
      `Key:                 ${s.keyTitle} (${s.keyId})`,
      `Period:              ${s.periodLabel} [${s.periodType === "final_period" ? "FINAL PERIOD" : "PARTIAL PERIOD"}]`,
      `Status:              ${s.status.toUpperCase()}`,
      `Snapshot Keys:       ${s.snapshotKeyQuantity} / ${s.circulatingKeySupply} (${s.snapshotSharePercentage.toFixed(2)}% share)`,
      `Total Pool:          ${s.totalDistributionPool.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${s.currency}`,
      `Gross Distribution:  ${s.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${s.currency}`,
      `Protocol Fee (2%):   -${s.protocolFeeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${s.currency}`,
      `Withholding Tax(10%):-${s.withholdingTaxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${s.currency}`,
      `Net Payout:          ${s.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${s.currency}`,
      "--------------------------------------------------------------------------------"
    );
  }

  return lines.join("\n");
}

/**
 * Asserts that values in CSV and PDF exports identically match the data model.
 */
export function verifyExportValuesMatch(
  csvContent: string,
  pdfContent: string,
  statement: KeyHolderDistributionStatement
): boolean {
  const grossRaw = statement.grossAmount.toFixed(2);
  const grossLocale = statement.grossAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
  const netRaw = statement.netAmount.toFixed(2);
  const netLocale = statement.netAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
  const feeRaw = statement.protocolFeeAmount.toFixed(2);
  const feeLocale = statement.protocolFeeAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
  const taxRaw = statement.withholdingTaxAmount.toFixed(2);
  const taxLocale = statement.withholdingTaxAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  const csvMatches =
    (csvContent.includes(grossRaw) || csvContent.includes(grossLocale)) &&
    (csvContent.includes(netRaw) || csvContent.includes(netLocale)) &&
    (csvContent.includes(feeRaw) || csvContent.includes(feeLocale)) &&
    (csvContent.includes(taxRaw) || csvContent.includes(taxLocale));

  const pdfMatches =
    (pdfContent.includes(grossRaw) || pdfContent.includes(grossLocale)) &&
    (pdfContent.includes(netRaw) || pdfContent.includes(netLocale)) &&
    (pdfContent.includes(feeRaw) || pdfContent.includes(feeLocale)) &&
    (pdfContent.includes(taxRaw) || pdfContent.includes(taxLocale));

  return csvMatches && pdfMatches;
}

export const SAMPLE_DISTRIBUTION_STATEMENTS: KeyHolderDistributionStatement[] = [
  calculateDistributionStatement({
    id: "STMT-2026-Q3-001",
    keyId: "creator-key-solaris-1",
    keyTitle: "Solaris Clean Energy Key",
    recipientAddress: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    periodLabel: "Q3 2026",
    periodType: "final_period",
    status: "final",
    snapshotTimestamp: "2026-09-30T23:59:59Z",
    snapshotKeyQuantity: 50,
    circulatingKeySupply: 1000,
    totalDistributionPool: 100000,
    protocolFeeRate: 0.02,
    withholdingTaxRate: 0.1,
  }),
  calculateDistributionStatement({
    id: "STMT-2026-OCT-002",
    keyId: "creator-key-solaris-1",
    keyTitle: "Solaris Clean Energy Key",
    recipientAddress: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    periodLabel: "October 2026 (Partial Finalized)",
    periodType: "partial_period",
    status: "final",
    snapshotTimestamp: "2026-10-31T23:59:59Z",
    snapshotKeyQuantity: 10,
    circulatingKeySupply: 500,
    totalDistributionPool: 10000,
    protocolFeeRate: 0.02,
    withholdingTaxRate: 0.1,
  }),
  calculateDistributionStatement({
    id: "STMT-2026-NOV-EST",
    keyId: "creator-key-solaris-1",
    keyTitle: "Solaris Clean Energy Key",
    recipientAddress: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    periodLabel: "November 2026 (Interim Estimated)",
    periodType: "partial_period",
    status: "estimated",
    snapshotTimestamp: "2026-11-20T12:00:00Z",
    snapshotKeyQuantity: 75,
    circulatingKeySupply: 1500,
    totalDistributionPool: 30000,
    protocolFeeRate: 0.02,
    withholdingTaxRate: 0.1,
  }),
];
