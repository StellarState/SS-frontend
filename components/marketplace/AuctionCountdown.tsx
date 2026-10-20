"use client";

import { Clock } from "lucide-react";
import { useSettlementCountdown } from "@/hooks/useSettlementCountdown";
import { formatFullCountdown } from "@/lib/settlementCountdown";

/**
 * Countdown to the end of an auction. Ticks per second and stops once the
 * auction has closed.
 */
export function AuctionCountdown({ endsAt }: { endsAt: string }) {
  const countdown = useSettlementCountdown({
    maturityDate: endsAt,
    intervalMs: 1000,
  });

  if (!countdown) return null;

  if (countdown.state !== "counting") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
        data-testid="auction-ended"
      >
        <Clock className="size-3.5" aria-hidden="true" />
        Auction ended
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      data-testid="auction-countdown"
      data-state="counting"
    >
      <Clock className="size-3.5" aria-hidden="true" />
      <span className="font-mono tabular-nums" data-testid="auction-countdown-value">
        {formatFullCountdown(countdown.parts)}
      </span>
      <span className="sr-only">remaining in this auction</span>
    </span>
  );
}
