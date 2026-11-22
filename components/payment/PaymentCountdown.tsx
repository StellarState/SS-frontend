"use client";

import { useSettlementCountdown } from "@/hooks/useSettlementCountdown";
import { formatFullCountdown } from "@/lib/settlementCountdown";

/** Isolated timer so the QR and instruction values do not re-render each tick. */
export function PaymentCountdown({ dueAt }: { dueAt: string }) {
  const countdown = useSettlementCountdown({
    maturityDate: dueAt,
    settledAt: null,
    intervalMs: 1000,
  });

  if (!countdown || countdown.state !== "counting") {
    return <span data-testid="payment-overdue">Payment is overdue</span>;
  }

  return (
    <span className="font-mono tabular-nums" data-testid="payment-countdown">
      {formatFullCountdown(countdown.parts)}
    </span>
  );
}
