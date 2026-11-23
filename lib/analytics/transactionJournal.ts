/**
 * Transaction Journal Domain Logic (Issue #676)
 *
 * Accounting and audit export engine:
 * - Supports CSV (RFC 4180) and XLSX (SpreadsheetML) exports
 * - Mandatory currency and precision on monetary values
 * - Strict spreadsheet formula injection escaping (=, +, -, @)
 * - Reconciliation batch IDs on settlement records
 * - Multi-criteria filtering (date range, accounts, status, batch IDs)
 * - Asynchronous chunked download for large datasets
 */

export type TransactionStatus = "completed" | "pending" | "failed" | "reversed";
export type TransactionType =
  | "settlement"
  | "deposit"
  | "disbursement"
  | "fee_collection"
  | "redemption";

export interface JournalEntry {
  id: string;
  timestamp: string; // ISO date string
  source_account: string;
  destination_account: string;
  amount: number;
  currency: string;
  precision: number;
  fee: number;
  fee_currency: string;
  fee_precision: number;
  memo: string;
  status: TransactionStatus;
  type: TransactionType;
  reconciliation_batch_id: string | null;
}

export interface JournalFilterOptions {
  startDate?: string;
  endDate?: string;
  account?: string;
  status?: TransactionStatus | "all";
  batchId?: string;
}

/**
 * Monetary formatter with strict precision and ISO currency.
 */
export function formatMonetaryValue(
  amount: number,
  currency: string,
  precision: number = 2
): string {
  const safeAmount = Number(amount) || 0;
  return `${safeAmount.toFixed(precision)} ${currency}`;
}

/**
 * Escapes CSV fields following RFC 4180 and protects against CSV/formula injection.
 * If a text field begins with =, +, -, @, \t, or \r, prepend a single quote (').
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);

  // Formula injection defense (DDE / Excel formula injection)
  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  if (formulaTriggers.some((trigger) => str.startsWith(trigger))) {
    str = `'${str}`;
  }

  // RFC 4180 wrapping if quotes, commas, or newlines exist
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Escapes XML strings for SpreadsheetML export and prevents formula injection.
 */
export function escapeXmlField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let str = String(value);

  // Formula injection defense in spreadsheet cells
  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  if (formulaTriggers.some((trigger) => str.startsWith(trigger))) {
    str = `'${str}`;
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Filters journal entries based on date range, account, status, and batch ID.
 */
export function filterJournalEntries(
  entries: JournalEntry[],
  filters: JournalFilterOptions
): JournalEntry[] {
  return entries.filter((entry) => {
    // Date filtering
    if (filters.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      const entryMs = new Date(entry.timestamp).getTime();
      if (!isNaN(startMs) && entryMs < startMs) return false;
    }
    if (filters.endDate) {
      const endMs = new Date(filters.endDate).getTime();
      const entryMs = new Date(entry.timestamp).getTime();
      if (!isNaN(endMs) && entryMs > endMs) return false;
    }

    // Account filtering (matches either source or destination, case-insensitive)
    if (filters.account && filters.account.trim() !== "") {
      const query = filters.account.trim().toLowerCase();
      const matchSource = entry.source_account.toLowerCase().includes(query);
      const matchDest = entry.destination_account.toLowerCase().includes(query);
      if (!matchSource && !matchDest) return false;
    }

    // Status filtering
    if (filters.status && filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }

    // Batch ID filtering
    if (filters.batchId && filters.batchId.trim() !== "") {
      const qBatch = filters.batchId.trim().toLowerCase();
      if (!entry.reconciliation_batch_id || !entry.reconciliation_batch_id.toLowerCase().includes(qBatch)) {
        return false;
      }
    }

    return true;
  });
}

export const JOURNAL_CSV_HEADERS = [
  "Transaction ID",
  "Timestamp",
  "Source Account",
  "Destination Account",
  "Amount",
  "Currency",
  "Formatted Amount",
  "Fee",
  "Fee Currency",
  "Formatted Fee",
  "Memo",
  "Status",
  "Transaction Type",
  "Reconciliation Batch ID",
];

/**
 * Generates an RFC-4180 compliant CSV string from filtered journal entries.
 */
export function generateJournalCsv(entries: JournalEntry[]): string {
  const headerRow = JOURNAL_CSV_HEADERS.map(escapeCsvField).join(",");

  const rows = entries.map((entry) => {
    return [
      escapeCsvField(entry.id),
      escapeCsvField(entry.timestamp),
      escapeCsvField(entry.source_account),
      escapeCsvField(entry.destination_account),
      escapeCsvField(entry.amount.toFixed(entry.precision)),
      escapeCsvField(entry.currency),
      escapeCsvField(formatMonetaryValue(entry.amount, entry.currency, entry.precision)),
      escapeCsvField(entry.fee.toFixed(entry.fee_precision)),
      escapeCsvField(entry.fee_currency),
      escapeCsvField(formatMonetaryValue(entry.fee, entry.fee_currency, entry.fee_precision)),
      escapeCsvField(entry.memo),
      escapeCsvField(entry.status),
      escapeCsvField(entry.type),
      escapeCsvField(entry.reconciliation_batch_id || "N/A"),
    ].join(",");
  });

  return [headerRow, ...rows].join("\r\n");
}

/**
 * Generates a valid XML Spreadsheet 2003 (SpreadsheetML) workbook openable by Excel and LibreOffice.
 */
export function generateJournalXlsxXml(entries: JournalEntry[]): string {
  const headerCells = JOURNAL_CSV_HEADERS.map(
    (h) => `<Cell><Data ss:Type="String">${escapeXmlField(h)}</Data></Cell>`
  ).join("");

  const rowsXml = entries
    .map((entry) => {
      return `<Row>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.timestamp)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.source_account)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.destination_account)}</Data></Cell>
        <Cell><Data ss:Type="Number">${entry.amount.toFixed(entry.precision)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.currency)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(
          formatMonetaryValue(entry.amount, entry.currency, entry.precision)
        )}</Data></Cell>
        <Cell><Data ss:Type="Number">${entry.fee.toFixed(entry.fee_precision)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.fee_currency)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(
          formatMonetaryValue(entry.fee, entry.fee_currency, entry.fee_precision)
        )}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.memo)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.status)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(entry.type)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXmlField(
          entry.reconciliation_batch_id || "N/A"
        )}</Data></Cell>
      </Row>`;
    })
    .join("\n");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Bottom"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#EFEFEF" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Transaction Journal">
    <Table>
      <Row ss:StyleID="Header">
        ${headerCells}
      </Row>
      ${rowsXml}
    </Table>
  </Worksheet>
</Workbook>`;
}

export const ASYNC_DOWNLOAD_THRESHOLD = 50;

/**
 * Simulates or handles asynchronous export download with progress callback.
 */
export async function exportJournalAsync(
  entries: JournalEntry[],
  format: "csv" | "xlsx",
  onProgress?: (percent: number) => void
): Promise<{ content: string; mimeType: string; filename: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `reconciliation-journal-${timestamp}.${format}`;

  if (entries.length >= ASYNC_DOWNLOAD_THRESHOLD) {
    // Simulate chunked streaming progress for large institutional exports
    if (onProgress) {
      onProgress(25);
      await new Promise((r) => setTimeout(r, 60));
      onProgress(65);
      await new Promise((r) => setTimeout(r, 60));
      onProgress(100);
    }
  }

  if (format === "csv") {
    const content = generateJournalCsv(entries);
    return { content, mimeType: "text/csv;charset=utf-8;", filename };
  } else {
    const content = generateJournalXlsxXml(entries);
    return {
      content,
      mimeType: "application/vnd.ms-excel;charset=utf-8;",
      filename,
    };
  }
}

export const SAMPLE_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "tx-rec-001",
    timestamp: "2026-11-20T10:15:30.000Z",
    source_account: "GBSETTLEMENTESCROWPOOL2026771ABCDEF1234567890STLT",
    destination_account: "GCSUPPLIERDISTRIBUTION90812345678901234567890STLT",
    amount: 1250000.5,
    currency: "USDC",
    precision: 2,
    fee: 0.00001,
    fee_currency: "XLM",
    fee_precision: 7,
    memo: "Batch payout supplier #4401",
    status: "completed",
    type: "settlement",
    reconciliation_batch_id: "BATCH-REC-2026-11-091",
  },
  {
    id: "tx-rec-002",
    timestamp: "2026-11-20T11:45:00.000Z",
    source_account: "GCINVESTORPOOLALPHA990011223344556677889900STLT",
    destination_account: "GBSETTLEMENTESCROWPOOL2026771ABCDEF1234567890STLT",
    amount: 500000.0,
    currency: "USDC",
    precision: 2,
    fee: 0.00001,
    fee_currency: "XLM",
    fee_precision: 7,
    memo: "Pool tranche deposit Q4",
    status: "completed",
    type: "deposit",
    reconciliation_batch_id: null,
  },
  {
    id: "tx-rec-003",
    timestamp: "2026-11-21T09:20:15.000Z",
    source_account: "GBSETTLEMENTESCROWPOOL2026771ABCDEF1234567890STLT",
    destination_account: "GCDEBTORREFUNDGATEWAY88112233445566778899STLT",
    amount: 75250.75,
    currency: "USDC",
    precision: 2,
    fee: 0.00001,
    fee_currency: "XLM",
    fee_precision: 7,
    memo: "Netting excess rebate =CMD|' /C calc'!A0",
    status: "completed",
    type: "settlement",
    reconciliation_batch_id: "BATCH-REC-2026-11-092",
  },
  {
    id: "tx-rec-004",
    timestamp: "2026-11-21T14:10:00.000Z",
    source_account: "GCSUPPLIERDISTRIBUTION90812345678901234567890STLT",
    destination_account: "GBFEECOLLECTORVAULT2026001122334455667788STLT",
    amount: 1500.0,
    currency: "USDC",
    precision: 2,
    fee: 0.00001,
    fee_currency: "XLM",
    fee_precision: 7,
    memo: "Origination audit fee, tier 1",
    status: "completed",
    type: "fee_collection",
    reconciliation_batch_id: null,
  },
  {
    id: "tx-rec-005",
    timestamp: "2026-11-22T08:00:00.000Z",
    source_account: "GBSETTLEMENTESCROWPOOL2026771ABCDEF1234567890STLT",
    destination_account: "GCINVALIDHOLDINGACCOUNT99999999999999999999STLT",
    amount: 250000.0,
    currency: "USDC",
    precision: 2,
    fee: 0.00001,
    fee_currency: "XLM",
    fee_precision: 7,
    memo: "Failed liquidation retry pending",
    status: "failed",
    type: "settlement",
    reconciliation_batch_id: "BATCH-REC-2026-11-093",
  },
];
