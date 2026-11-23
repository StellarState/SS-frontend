/**
 * Bulk Invoice Payment Scheduling (#660)
 *
 * Facilitates scheduling multiple settlement payments in one operation:
 * - Date-range scheduling and preview reconciliation
 * - CSV import with per-row error tracking (including line numbers)
 * - Wallet balance and memo validation
 * - Partial failure tolerance: failures do not cancel other payments
 * - Settlement history tracking and individual row retry/cancellation
 */

export interface BulkPaymentRow {
  rowNumber: number;
  invoiceId: string;
  debtorReference: string;
  amount: number;
  memo?: string;
  scheduledDate: string; // YYYY-MM-DD
  status: "pending" | "processing" | "success" | "failed" | "cancelled";
  error?: string;
  retryCount?: number;
  txHash?: string;
}

export interface BulkPaymentValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface BulkPaymentBatchPreview {
  items: BulkPaymentRow[];
  totalAmount: number;
  validCount: number;
  errorCount: number;
  errors: BulkPaymentValidationError[];
  isBalanceSufficient: boolean;
  availableBalance: number;
  balanceShortfall: number;
}

export interface SettlementHistoryEntry {
  id: string;
  batchId: string;
  invoiceId: string;
  debtorReference: string;
  amount: number;
  memo?: string;
  settledAt: string;
  txHash: string;
  status: "settled";
}

export const STELLAR_MEMO_MAX_LENGTH = 28;

/**
 * Parses and validates CSV content for bulk payment scheduling.
 * Supports CSV headers: invoice_id, debtor_reference, amount, scheduled_date, memo
 */
export function parseBulkPaymentCsv(
  csvContent: string,
  options?: {
    startDate?: string;
    endDate?: string;
    availableBalance?: number;
  },
): BulkPaymentBatchPreview {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const errors: BulkPaymentValidationError[] = [];
  const items: BulkPaymentRow[] = [];

  if (lines.length === 0) {
    return {
      items: [],
      totalAmount: 0,
      validCount: 0,
      errorCount: 0,
      errors: [],
      isBalanceSufficient: true,
      availableBalance: options?.availableBalance ?? 0,
      balanceShortfall: 0,
    };
  }

  // Detect header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("invoice") ||
    firstLine.includes("debtor") ||
    firstLine.includes("amount");
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-indexed row number in the CSV
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const invoiceId = cols[0] || `inv-batch-${rowNumber}`;
    const debtorReference = cols[1] || "";
    const amountStr = cols[2] || "";
    const scheduledDate = cols[3] || new Date().toISOString().split("T")[0];
    const memo = cols[4] || undefined;

    let hasRowError = false;

    // Validate debtor reference
    if (!debtorReference) {
      errors.push({
        rowNumber,
        field: "debtorReference",
        message: `Row ${rowNumber}: Debtor reference is required`,
      });
      hasRowError = true;
    }

    // Validate amount
    const amount = Number(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) {
      errors.push({
        rowNumber,
        field: "amount",
        message: `Row ${rowNumber}: Amount must be a positive number (received '${amountStr}')`,
      });
      hasRowError = true;
    }

    // Validate scheduled date
    if (isNaN(new Date(scheduledDate).getTime())) {
      errors.push({
        rowNumber,
        field: "scheduledDate",
        message: `Row ${rowNumber}: Invalid scheduled date '${scheduledDate}'`,
      });
      hasRowError = true;
    } else if (options?.startDate && scheduledDate < options.startDate) {
      errors.push({
        rowNumber,
        field: "scheduledDate",
        message: `Row ${rowNumber}: Scheduled date ${scheduledDate} is before start date ${options.startDate}`,
      });
      hasRowError = true;
    } else if (options?.endDate && scheduledDate > options.endDate) {
      errors.push({
        rowNumber,
        field: "scheduledDate",
        message: `Row ${rowNumber}: Scheduled date ${scheduledDate} is after end date ${options.endDate}`,
      });
      hasRowError = true;
    }

    // Validate memo length
    if (memo && memo.length > STELLAR_MEMO_MAX_LENGTH) {
      errors.push({
        rowNumber,
        field: "memo",
        message: `Row ${rowNumber}: Memo '${memo}' exceeds maximum ${STELLAR_MEMO_MAX_LENGTH} characters`,
      });
      hasRowError = true;
    }

    items.push({
      rowNumber,
      invoiceId,
      debtorReference,
      amount: isNaN(amount) ? 0 : amount,
      memo,
      scheduledDate,
      status: hasRowError ? "failed" : "pending",
      error: hasRowError ? "Validation error on row" : undefined,
      retryCount: 0,
    });
  }

  // Reconcile total of valid items
  const validItems = items.filter((item) => item.status === "pending");
  const totalAmount = validItems.reduce((acc, curr) => acc + curr.amount, 0);

  const availableBalance = options?.availableBalance ?? Number.POSITIVE_INFINITY;
  const isBalanceSufficient = availableBalance >= totalAmount;
  const balanceShortfall = isBalanceSufficient ? 0 : totalAmount - availableBalance;

  return {
    items,
    totalAmount,
    validCount: validItems.length,
    errorCount: errors.length,
    errors,
    isBalanceSufficient,
    availableBalance: options?.availableBalance ?? 0,
    balanceShortfall,
  };
}

/**
 * Executes a batch of payments with partial failure tolerance.
 * One failure DOES NOT abort other payments.
 */
export async function executeBulkPaymentBatch(
  batchId: string,
  items: BulkPaymentRow[],
  submitPaymentFn: (item: BulkPaymentRow) => Promise<{ txHash: string }>,
  onRowUpdate?: (updatedRow: BulkPaymentRow) => void,
): Promise<{
  results: BulkPaymentRow[];
  successfulSettlements: SettlementHistoryEntry[];
}> {
  const results: BulkPaymentRow[] = [];
  const successfulSettlements: SettlementHistoryEntry[] = [];

  for (const item of items) {
    if (item.status === "cancelled" || item.error?.includes("Validation error")) {
      results.push(item);
      continue;
    }

    // Set to processing
    const processingItem: BulkPaymentRow = { ...item, status: "processing" };
    onRowUpdate?.(processingItem);

    try {
      const response = await submitPaymentFn(processingItem);
      const successItem: BulkPaymentRow = {
        ...processingItem,
        status: "success",
        txHash: response.txHash,
        error: undefined,
      };
      results.push(successItem);
      onRowUpdate?.(successItem);

      // Record in settlement history
      const historyRecord: SettlementHistoryEntry = {
        id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        batchId,
        invoiceId: successItem.invoiceId,
        debtorReference: successItem.debtorReference,
        amount: successItem.amount,
        memo: successItem.memo,
        settledAt: new Date().toISOString(),
        txHash: response.txHash,
        status: "settled",
      };
      successfulSettlements.push(historyRecord);
      appendSettlementHistory(historyRecord);
    } catch (err) {
      // Partial failure tolerance: mark this invoice as failed, but CONTINUE loop!
      const errorMsg = err instanceof Error ? err.message : "Payment submission failed";
      const failedItem: BulkPaymentRow = {
        ...processingItem,
        status: "failed",
        error: errorMsg,
        retryCount: (processingItem.retryCount ?? 0) + 1,
      };
      results.push(failedItem);
      onRowUpdate?.(failedItem);
    }
  }

  return { results, successfulSettlements };
}

/**
 * Retries a single failed invoice row.
 */
export async function retryBulkPaymentRow(
  batchId: string,
  row: BulkPaymentRow,
  submitPaymentFn: (item: BulkPaymentRow) => Promise<{ txHash: string }>,
  onRowUpdate?: (updatedRow: BulkPaymentRow) => void,
): Promise<BulkPaymentRow> {
  const processing: BulkPaymentRow = { ...row, status: "processing" };
  onRowUpdate?.(processing);

  try {
    const res = await submitPaymentFn(processing);
    const success: BulkPaymentRow = {
      ...processing,
      status: "success",
      txHash: res.txHash,
      error: undefined,
    };
    onRowUpdate?.(success);

    const historyRecord: SettlementHistoryEntry = {
      id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      batchId,
      invoiceId: success.invoiceId,
      debtorReference: success.debtorReference,
      amount: success.amount,
      memo: success.memo,
      settledAt: new Date().toISOString(),
      txHash: res.txHash,
      status: "settled",
    };
    appendSettlementHistory(historyRecord);
    return success;
  } catch (err) {
    const failed: BulkPaymentRow = {
      ...processing,
      status: "failed",
      error: err instanceof Error ? err.message : "Retry failed",
      retryCount: (row.retryCount ?? 0) + 1,
    };
    onRowUpdate?.(failed);
    return failed;
  }
}

/**
 * Cancels a pending invoice row.
 */
export function cancelBulkPaymentRow(row: BulkPaymentRow): BulkPaymentRow {
  return {
    ...row,
    status: "cancelled",
    error: "Payment cancelled by issuer",
  };
}

// ─── Settlement History Persistence ─────────────────────────────────────────

const SETTLEMENT_HISTORY_KEY = "ss_bulk_settlement_history";

export function loadSettlementHistory(): SettlementHistoryEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(SETTLEMENT_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SettlementHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendSettlementHistory(record: SettlementHistoryEntry): void {
  try {
    if (typeof window === "undefined") return;
    const history = loadSettlementHistory();
    history.unshift(record);
    localStorage.setItem(SETTLEMENT_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch {
    // Graceful fallback
  }
}
