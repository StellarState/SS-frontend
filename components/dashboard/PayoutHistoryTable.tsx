"use client";

import { useState } from "react";
import { useInvestorPayouts } from "@/hooks/useInvestorPayouts";
import { useWithholding } from "@/hooks/useWithholding";
import type { PayoutRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TxHash } from "@/components/ui/tx-hash";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";
import { PayoutDetailsDrawer } from "@/components/dashboard/PayoutDetailsDrawer";
import { downloadPayoutsCsv } from "@/lib/payoutExport";
import { withholdingForPayout, formatStellarAmount } from "@/lib/withholding";

/** Shared payout history table, used on the dashboard and in the portfolio tab. */
export function PayoutHistoryTable() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInvestorPayouts();
  const { data: settings } = useWithholding();
  const [selected, setSelected] = useState<PayoutRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allPayouts = data?.pages.flatMap((page) => page.payouts) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="payout-history-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-red-500">
        Failed to load payout history.
      </p>
    );
  }

  if (allPayouts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground" data-testid="empty-payouts">
        No payouts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          data-testid="export-csv-button"
          onClick={() => downloadPayoutsCsv(allPayouts, settings)}
        >
          Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <ExchangeRateDisclaimer className="px-3 pt-3" />
        <table className="w-full text-left text-sm" data-testid="payout-history-table">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Invoice ID</th>
              <th className="p-3 font-medium">Seller Name</th>
              <th className="p-3 font-medium">Amount Invested</th>
              <th className="p-3 font-medium">Amount Received</th>
              <th className="p-3 font-medium">Yield</th>
              <th className="p-3 font-medium">Withheld</th>
              <th className="p-3 font-medium">Settled At</th>
              <th className="p-3 font-medium">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allPayouts.map((row, idx) => {
              const isShortfall = row.amountReceived < row.amountInvested;
              const breakdown = withholdingForPayout(row, settings);
              return (
                <tr
                  key={`${row.invoiceId}-${idx}`}
                  className={
                    isShortfall
                      ? "bg-amber-500/15 text-amber-950 dark:text-amber-200 font-medium"
                      : "hover:bg-muted/30"
                  }
                  data-testid={`payout-row-${row.invoiceId}`}
                  onClick={() => {
                    setSelected(row);
                    setDrawerOpen(true);
                  }}
                >
                  <td className="p-3">{row.invoiceId}</td>
                  <td className="p-3">{row.sellerName}</td>
                  <td className="p-3"><Money xlm={row.amountInvested} xlmText={`${row.amountInvested.toLocaleString()} XLM`} /></td>
                  <td className="p-3 font-semibold"><Money xlm={row.amountReceived} xlmText={`${row.amountReceived.toLocaleString()} XLM`} /></td>
                  <td className="p-3">{row.yield}%</td>
                  <td className="p-3 tabular-nums" data-testid={`payout-withheld-${row.invoiceId}`}>
                    {breakdown ? formatStellarAmount(breakdown.withheld) : "0.0000000"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(row.settledAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {row.transaction_hash || row.transactionHash ? (
                      <TxHash
                        hash={(row.transaction_hash ?? row.transactionHash) as string}
                        className="text-xs"
                        testId={`payout-tx-${row.invoiceId}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="payouts-load-next"
          >
            {isFetchingNextPage ? "Loading..." : "Load Next Page"}
          </Button>
        </div>
      )}

      <PayoutDetailsDrawer payout={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
