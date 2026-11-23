"use client";

import { useSettlementCountdown } from "@/hooks/useSettlementCountdown";
import { formatFullCountdown } from "@/lib/settlementCountdown";

/** Isolated 1-second ticker so banner parent does not rerender each second. */
export function CampaignCountdown({ endsAt }: { endsAt: string }) {
  const countdown = useSettlementCountdown({
    maturityDate: endsAt,
    settledAt: null,
    intervalMs: 1000,
  });

  if (!countdown || countdown.state !== "counting") {
    return <span data-testid="campaign-countdown-ended">Offer ended</span>;
  }

  return (
    <span className="font-mono tabular-nums" data-testid="campaign-countdown">
      {formatFullCountdown(countdown.parts)}
    </span>
  );
}
