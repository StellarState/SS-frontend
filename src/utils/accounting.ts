import type { PlatformTransaction, PlatformTransactionType } from "@/lib/api";

export type AccountingFormat = "quickbooks" | "xero" | "generic";

export interface CategoryMapping {
  invest: string;
  claim: string;
  list: string;
  cancel: string;
  settle: string;
}

export const DEFAULT_CATEGORY_MAPPING: CategoryMapping = {
  invest: "Invoice Investment",
  claim: "Yield Distribution",
  list: "Marketplace Listing",
  cancel: "Order Cancellation",
  settle: "Settlement Payout",
};

export interface AccountingExportOptions {
  categoryMapping?: Partial<CategoryMapping>;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

export interface AccountingChunkedOptions extends AccountingExportOptions {
  chunkSize?: number;
  onProgress?: (progress: number, processed: number, total: number) => void;
}

/**
 * Escapes a single CSV value following RFC 4180 standard:
 * Wraps with quotes if it contains comma, quote or newline, and escapes internal quotes.
 */
export function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats an ISO date into MM/DD/YYYY for QuickBooks.
 */
export function formatQuickbooksDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Formats an ISO date into DD/MM/YYYY for Xero.
 */
export function formatXeroDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats an ISO date into YYYY-MM-DD for Generic export.
 */
export function formatGenericDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Determines transaction signed amount based on accounting flow:
 * - invest: Outflow / debit (-amount)
 * - claim: Inflow / credit (+amount)
 * - settle: Inflow / credit (+amount)
 * - list/cancel: 0 or non-cash allocation (+amount / neutral)
 */
export function getAccountingSignedAmount(type: PlatformTransactionType, amount: number): number {
  if (type === "invest") {
    return -Math.abs(amount);
  }
  if (type === "claim" || type === "settle") {
    return Math.abs(amount);
  }
  return amount;
}

export function formatAccountingAmount(num: number): string {
  return num.toFixed(2);
}

/**
 * Filters transactions within an optional start and end date range (inclusive).
 */
export function filterTransactionsByDateRange(
  rows: PlatformTransaction[],
  startDate?: string | Date | null,
  endDate?: string | Date | null
): PlatformTransaction[] {
  if (!startDate && !endDate) return rows;

  const startMs = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : -Infinity;
  const endMs = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;

  return rows.filter((tx) => {
    const time = new Date(tx.createdAt).getTime();
    if (Number.isNaN(time)) return false;
    return time >= startMs && time <= endMs;
  });
}

export const QUICKBOOKS_HEADERS = [
  "Date",
  "Description",
  "Amount",
  "Category",
  "Reference",
  "Currency",
];

export function rowToQuickbooks(
  tx: PlatformTransaction,
  mapping: CategoryMapping
): string[] {
  const dateStr = formatQuickbooksDate(tx.createdAt);
  const desc = tx.invoiceTitle || (tx.invoiceId ? `Invoice ${tx.invoiceId}` : `${tx.type.toUpperCase()} transaction`);
  const signedAmt = getAccountingSignedAmount(tx.type, tx.amount);
  const category = mapping[tx.type] || DEFAULT_CATEGORY_MAPPING[tx.type] || tx.type;
  const ref = tx.id || tx.txHash || "";
  const currency = tx.currency || "USDC";

  return [dateStr, desc, formatAccountingAmount(signedAmt), category, ref, currency];
}

export const XERO_HEADERS = [
  "*Date",
  "*Amount",
  "Payee",
  "Description",
  "Reference",
  "Category",
];

export function rowToXero(
  tx: PlatformTransaction,
  mapping: CategoryMapping
): string[] {
  const dateStr = formatXeroDate(tx.createdAt);
  const signedAmt = getAccountingSignedAmount(tx.type, tx.amount);
  const payee = "StellarState Platform";
  const desc = tx.invoiceTitle || (tx.invoiceId ? `Invoice ${tx.invoiceId}` : `${tx.type} payout`);
  const ref = tx.id || tx.txHash || "";
  const category = mapping[tx.type] || DEFAULT_CATEGORY_MAPPING[tx.type] || tx.type;

  return [dateStr, formatAccountingAmount(signedAmt), payee, desc, ref, category];
}

export const GENERIC_HEADERS = [
  "Date",
  "Transaction ID",
  "Type",
  "Category",
  "Amount",
  "Currency",
  "Description",
  "Reference",
  "Status",
  "TxHash",
];

export function rowToGeneric(
  tx: PlatformTransaction,
  mapping: CategoryMapping
): string[] {
  const dateStr = formatGenericDate(tx.createdAt);
  const category = mapping[tx.type] || DEFAULT_CATEGORY_MAPPING[tx.type] || tx.type;
  const desc = tx.invoiceTitle || (tx.invoiceId ? `Invoice ${tx.invoiceId}` : "");
  const signedAmt = getAccountingSignedAmount(tx.type, tx.amount);

  return [
    dateStr,
    tx.id || "",
    tx.type,
    category,
    formatAccountingAmount(signedAmt),
    tx.currency || "USDC",
    desc,
    tx.invoiceId || tx.id || "",
    tx.status || "",
    tx.txHash || "",
  ];
}

/**
 * Builds QuickBooks-compatible CSV string from platform transactions.
 */
export function buildQuickbooksCsv(
  rows: PlatformTransaction[],
  categoryMapping?: Partial<CategoryMapping>
): string {
  const mapping: CategoryMapping = { ...DEFAULT_CATEGORY_MAPPING, ...categoryMapping };
  const lines: string[] = [QUICKBOOKS_HEADERS.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    const cols = rowToQuickbooks(row, mapping);
    lines.push(cols.map(escapeCsvValue).join(","));
  }

  return lines.join("\r\n");
}

/**
 * Builds Xero-compatible CSV string from platform transactions.
 */
export function buildXeroCsv(
  rows: PlatformTransaction[],
  categoryMapping?: Partial<CategoryMapping>
): string {
  const mapping: CategoryMapping = { ...DEFAULT_CATEGORY_MAPPING, ...categoryMapping };
  const lines: string[] = [XERO_HEADERS.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    const cols = rowToXero(row, mapping);
    lines.push(cols.map(escapeCsvValue).join(","));
  }

  return lines.join("\r\n");
}

/**
 * Builds Generic CSV string from platform transactions.
 */
export function buildGenericCsv(
  rows: PlatformTransaction[],
  categoryMapping?: Partial<CategoryMapping>
): string {
  const mapping: CategoryMapping = { ...DEFAULT_CATEGORY_MAPPING, ...categoryMapping };
  const lines: string[] = [GENERIC_HEADERS.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    const cols = rowToGeneric(row, mapping);
    lines.push(cols.map(escapeCsvValue).join(","));
  }

  return lines.join("\r\n");
}

/**
 * Unified CSV export builder.
 */
export function buildAccountingCsv(
  format: AccountingFormat,
  rows: PlatformTransaction[],
  options?: AccountingExportOptions
): string {
  const filtered = filterTransactionsByDateRange(rows, options?.startDate, options?.endDate);
  switch (format) {
    case "quickbooks":
      return buildQuickbooksCsv(filtered, options?.categoryMapping);
    case "xero":
      return buildXeroCsv(filtered, options?.categoryMapping);
    case "generic":
      return buildGenericCsv(filtered, options?.categoryMapping);
    default:
      return buildGenericCsv(filtered, options?.categoryMapping);
  }
}

/**
 * Asynchronously builds CSV in non-blocking batches so that large datasets (e.g. 10,000+ rows)
 * do not freeze the browser UI thread.
 */
export async function buildAccountingCsvChunked(
  format: AccountingFormat,
  rows: PlatformTransaction[],
  options?: AccountingChunkedOptions
): Promise<string> {
  const filtered = filterTransactionsByDateRange(rows, options?.startDate, options?.endDate);
  const mapping: CategoryMapping = { ...DEFAULT_CATEGORY_MAPPING, ...options?.categoryMapping };

  let headers: string[];
  let rowConverter: (tx: PlatformTransaction, m: CategoryMapping) => string[];

  switch (format) {
    case "quickbooks":
      headers = QUICKBOOKS_HEADERS;
      rowConverter = rowToQuickbooks;
      break;
    case "xero":
      headers = XERO_HEADERS;
      rowConverter = rowToXero;
      break;
    case "generic":
    default:
      headers = GENERIC_HEADERS;
      rowConverter = rowToGeneric;
      break;
  }

  const lines: string[] = [headers.map(escapeCsvValue).join(",")];
  const total = filtered.length;
  const chunkSize = options?.chunkSize && options.chunkSize > 0 ? options.chunkSize : 500;

  let index = 0;
  while (index < total) {
    const end = Math.min(index + chunkSize, total);
    for (let i = index; i < end; i++) {
      lines.push(rowConverter(filtered[i], mapping).map(escapeCsvValue).join(","));
    }
    index = end;

    if (options?.onProgress) {
      const progress = total === 0 ? 100 : Math.round((index / total) * 100);
      options.onProgress(progress, index, total);
    }

    // Yield control to main thread
    if (index < total) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  return lines.join("\r\n");
}

/**
 * Returns the column headers and first N rows for UI preview.
 */
export function getPreviewRows(
  format: AccountingFormat,
  rows: PlatformTransaction[],
  options?: AccountingExportOptions,
  maxPreviewRows = 10
): { headers: string[]; rows: string[][] } {
  const filtered = filterTransactionsByDateRange(rows, options?.startDate, options?.endDate);
  const mapping: CategoryMapping = { ...DEFAULT_CATEGORY_MAPPING, ...options?.categoryMapping };

  let headers: string[];
  let rowConverter: (tx: PlatformTransaction, m: CategoryMapping) => string[];

  switch (format) {
    case "quickbooks":
      headers = QUICKBOOKS_HEADERS;
      rowConverter = rowToQuickbooks;
      break;
    case "xero":
      headers = XERO_HEADERS;
      rowConverter = rowToXero;
      break;
    case "generic":
    default:
      headers = GENERIC_HEADERS;
      rowConverter = rowToGeneric;
      break;
  }

  const previewData = filtered.slice(0, maxPreviewRows).map((tx) => rowConverter(tx, mapping));
  return { headers, rows: previewData };
}
