"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Auction } from "@/lib/api";
import { isReserveMet } from "@/lib/auction";
import { formatBidPrice } from "@/lib/auction";

/**
 * Reserve indicator for an auction. A met reserve reads as a green tick, an
 * unmet one as a warning.
 */
export function AuctionReserveIndicator({ auction }: { auction: Auction }) {
  const met = isReserveMet(auction);

  if (met) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
        data-testid="reserve-met"
      >
        <CheckCircle2 className="size-3" aria-hidden="true" />
        Reserve met
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      data-testid="reserve-unmet"
    >
      <TriangleAlert className="size-3" aria-hidden="true" />
      Reserve not met
      {auction.reserve_price > 0 && (
        <span className="ml-1 tabular-nums" data-testid="reserve-price">
          {formatBidPrice(auction.reserve_price)}
        </span>
      )}
    </Badge>
  );
}
