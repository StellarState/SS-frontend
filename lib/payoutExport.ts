/** Shared payout CSV builder (#601). */

import type { PayoutRecord } from "@/lib/api";
import { formatStellarAmount, withholdingForPayout } from "@/lib/withholding";
import type { WithholdingSettings } from "@/lib/api/withholding";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildPayoutsCsv(
  payouts: readonly PayoutRecord[],
  settings?: WithholdingSettings | null
): string {
  const header = [
    "Invoice ID",
    "Seller Name",
    "Amount Invested (XLM)",
    "Amount Received (XLM)",
    "Yield (%)",
    "Withheld (XLM)",
    "Net (XLM)",
    "Settled At",
  ].join(",");

  const rows = payouts.map((payout) => {
    const breakdown = withholdingForPayout(payout, settings);
    return [
      payout.invoiceId,
      payout.sellerName,
      formatStellarAmount(payout.amountInvested),
      formatStellarAmount(payout.amountReceived),
      payout.yield,
      breakdown ? formatStellarAmount(breakdown.withheld) : "0.0000000",
      breakdown ? formatStellarAmount(breakdown.net) : formatStellarAmount(payout.amountReceived),
      payout.settledAt,
    ]
      .map(csvCell)
      .join(",");
  });

  return [header, ...rows].join("\n");
}

export function downloadPayoutsCsv(payouts: readonly PayoutRecord[], settings?: WithholdingSettings | null): void {
  const blob = new Blob([buildPayoutsCsv(payouts, settings)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `payout-history-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
