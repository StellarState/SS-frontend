"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettlements } from "@/hooks/useSettlements";
import { formatUsd } from "@/lib/currency";
import {
  buildSettlementHistory,
  filterSettlementHistory,
  settlementHistoryCsv,
} from "@/lib/settlementHistory";

export function SettlementHistory() {
  const { data, isLoading } = useSettlements();
  const { exchangeRate } = useCurrency();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [invoiceType, setInvoiceType] = useState("all");
  const rows = useMemo(() => buildSettlementHistory(data ?? {
    claimable: [], claimed_history: [], total_claimable: 0, total_claimed: 0,
  }), [data]);
  const filtered = useMemo(
    () => filterSettlementHistory(rows, { from, to, invoiceType }),
    [rows, from, to, invoiceType],
  );
  const types = [...new Set(rows.map((row) => row.invoiceType))].sort();
  const usdRate = exchangeRate?.rate;

  const exportCsv = () => {
    const blob = new Blob([settlementHistoryCsv(rows, usdRate)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "settlement-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4" aria-labelledby="settlement-history-heading" data-testid="settlement-history">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="settlement-history-heading" className="text-lg font-semibold">Settlement history</h2>
          <p className="text-sm text-muted-foreground">Returns from settled investments, newest first.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} data-testid="settlement-export-csv">
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3" aria-label="Settlement history filters">
        <label className="grid gap-1 text-sm">From date<input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-md border bg-background px-2" /></label>
        <label className="grid gap-1 text-sm">To date<input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-md border bg-background px-2" /></label>
        <label className="grid gap-1 text-sm">Invoice type<select aria-label="Invoice type" value={invoiceType} onChange={(event) => setInvoiceType(event.target.value)} className="h-9 rounded-md border bg-background px-2">
          <option value="all">All types</option>
          {types.map((type) => <option key={type} value={type}>{type}</option>)}
        </select></label>
      </div>

      {isLoading ? <p role="status">Loading settlement history…</p> : filtered.length === 0 ? (
        <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground" data-testid="settlement-history-empty">
          {rows.length === 0 ? "No settled investments yet." : "No settlements match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[880px] text-sm" data-testid="settlement-history-table">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="p-3">Invoice</th><th className="p-3">Settled</th><th className="p-3">Type</th><th className="p-3 text-right">Fractions</th><th className="p-3 text-right">Principal (XLM)</th><th className="p-3 text-right">Yield (XLM)</th><th className="p-3 text-right">Fees (XLM)</th><th className="p-3 text-right">Net return</th>
            </tr></thead>
            <tbody>{filtered.map((row) => {
              const percent = row.principalReturned > 0 ? row.netReturn / row.principalReturned * 100 : 0;
              return <tr key={row.invoiceId} className="border-b last:border-0" data-testid={`settlement-history-row-${row.invoiceId}`}>
                <th scope="row" className="p-3 text-left font-medium">{row.invoiceTitle}</th>
                <td className="p-3">{new Date(row.settledAt).toLocaleDateString()}</td>
                <td className="p-3">{row.invoiceType}</td>
                <td className="p-3 text-right tabular-nums">{row.fractionsHeld ?? "—"}</td>
                <td className="p-3 text-right tabular-nums">{row.principalReturned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right tabular-nums">{row.yieldEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right tabular-nums">{row.feesDeducted.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-right tabular-nums" data-testid={`settlement-net-return-${row.invoiceId}`}>
                  {usdRate ? formatUsd(row.netReturn * usdRate) : "USD rate unavailable"}
                  <span className="block text-xs text-muted-foreground">{percent.toFixed(2)}% of invested</span>
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
