import type { ClaimableSettlement, ClaimedHistory, SettlementResponse } from "@/hooks/useSettlements";

export interface SettlementHistoryRow {
  invoiceId: string;
  invoiceTitle: string;
  settledAt: string;
  invoiceType: string;
  fractionsHeld: number | null;
  principalReturned: number;
  yieldEarned: number;
  feesDeducted: number;
  netReturn: number;
}

function fromClaimable(item: ClaimableSettlement): SettlementHistoryRow {
  const feesDeducted = item.fees_deducted ?? 0;
  return {
    invoiceId: item.invoice_id,
    invoiceTitle: item.invoice_title,
    settledAt: item.settled_at,
    invoiceType: item.invoice_type ?? "Other",
    fractionsHeld: item.fractions_held ?? null,
    principalReturned: item.principal_returned ?? item.invested_amount,
    yieldEarned: item.yield_earned ?? item.net_profit + feesDeducted,
    feesDeducted,
    netReturn: item.net_return ?? item.net_profit,
  };
}

function fromClaimed(item: ClaimedHistory): SettlementHistoryRow {
  const feesDeducted = item.fees_deducted ?? 0;
  const principal = item.principal_returned ?? item.invested_amount;
  const yieldEarned = item.yield_earned ?? item.claimed_amount - item.invested_amount + feesDeducted;
  return {
    invoiceId: item.invoice_id,
    invoiceTitle: item.invoice_title,
    settledAt: item.settled_at ?? item.claimed_at,
    invoiceType: item.invoice_type ?? "Other",
    fractionsHeld: item.fractions_held ?? null,
    principalReturned: principal,
    yieldEarned,
    feesDeducted,
    netReturn: item.net_return ?? item.claimed_amount - item.invested_amount,
  };
}

/** Includes settled payouts whether they are awaiting claim or already claimed. */
export function buildSettlementHistory(data: SettlementResponse): SettlementHistoryRow[] {
  const rows = new Map<string, SettlementHistoryRow>();
  for (const row of data.claimable ?? []) rows.set(row.invoice_id, fromClaimable(row));
  // A claimed record is more current than its former claimable record.
  for (const row of data.claimed_history ?? []) rows.set(row.invoice_id, fromClaimed(row));
  return [...rows.values()].sort(
    (a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt),
  );
}

export interface SettlementHistoryFilters {
  from?: string;
  to?: string;
  invoiceType?: string;
}

export function filterSettlementHistory(
  rows: readonly SettlementHistoryRow[],
  filters: SettlementHistoryFilters,
): SettlementHistoryRow[] {
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00`) : -Infinity;
  const to = filters.to ? Date.parse(`${filters.to}T23:59:59.999`) : Infinity;
  return rows.filter((row) => {
    const date = Date.parse(row.settledAt);
    return date >= from && date <= to &&
      (!filters.invoiceType || filters.invoiceType === "all" || row.invoiceType === filters.invoiceType);
  });
}

function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function settlementHistoryCsv(
  rows: readonly SettlementHistoryRow[],
  xlmUsdRate?: number,
): string {
  const columns: (keyof SettlementHistoryRow)[] = [
    "invoiceTitle", "settledAt", "invoiceType", "fractionsHeld", "principalReturned",
    "yieldEarned", "feesDeducted", "netReturn",
  ];
  const headings = ["Invoice", "Settlement date", "Invoice type", "Fractions held", "Principal returned (XLM)", "Yield earned (XLM)", "Fees deducted (XLM)", "Net return (XLM)", "Net return (USD)", "Net return (%)"];
  return [headings, ...rows.map((row) => [
    ...columns.map((column) => row[column]),
    xlmUsdRate && Number.isFinite(xlmUsdRate) ? (row.netReturn * xlmUsdRate).toFixed(2) : "",
    row.principalReturned > 0 ? ((row.netReturn / row.principalReturned) * 100).toFixed(2) : "",
  ])]
    .map((line) => line.map(csvCell).join(","))
    .join("\r\n");
}
