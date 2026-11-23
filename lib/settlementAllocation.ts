/** Pure settlement-waterfall helpers (#603). */

import type { PayoutClass, SettlementAllocation } from "@/lib/api/settlementAllocation";

export function paidTotal(classes: readonly PayoutClass[]): number {
  return classes.reduce((sum, entry) => sum + entry.paid, 0);
}

export function hasShortfall(classes: readonly PayoutClass[]): boolean {
  return classes.some((entry) => entry.shortfall > 0);
}

/** True only when every recorded paid amount is accounted for by the received total. */
export function allocationBalances(allocation: SettlementAllocation): boolean {
  const paid = paidTotal(allocation.classes);
  return Math.abs(paid - allocation.amountReceived) < 0.0000001;
}

export function allocationSummary(allocation: SettlementAllocation): string {
  if (allocation.status === "pending") {
    return "Settlement is pending. The payout order will appear once funds are received.";
  }
  if (!hasShortfall(allocation.classes)) {
    return "All payee classes were paid in full.";
  }
  return "Funds ran out before every class was paid. Lower-priority classes received nothing.";
}

export function zeroPaymentExplanation(entry: PayoutClass): string | null {
  if (entry.paid > 0 || entry.shortfall <= 0) return null;
  return `${entry.label} was not paid because earlier classes received the available funds.`;
}
