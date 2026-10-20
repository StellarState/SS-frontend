"use client";

import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { truncateAddress } from "@/lib/stellar";
import type { AuctionBid } from "@/lib/api";
import { formatBidPrice, getTopBids } from "@/lib/auction";

/**
 * The live bid list. Bids are ordered by price, highest first, and the list
 * refreshes on the polling interval.
 */
export function AuctionBidList({
  bids,
  isLoading,
  isFetching,
  isError,
}: {
  bids: AuctionBid[];
  isLoading: boolean;
  isFetching?: boolean;
  isError?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="auction-bids-loading" aria-busy="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive" role="alert" data-testid="auction-bids-error">
        Could not load bids.
      </p>
    );
  }

  const topBids = getTopBids(bids);

  if (topBids.length === 0) {
    return (
      <p
        className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground"
        data-testid="auction-bids-empty"
      >
        No bids yet. Be the first to bid.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {isFetching && (
        <p
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          data-testid="auction-bids-refreshing"
        >
          <RefreshCw className="inline-block h-3 w-3 animate-spin" aria-hidden="true" />
          Refreshing bids…
        </p>
      )}
      <Table aria-label="Auction bids" data-testid="auction-bid-list">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Bidder</TableHead>
            <TableHead scope="col" className="text-right">Price per fraction</TableHead>
            <TableHead scope="col" className="text-right">Total</TableHead>
            <TableHead scope="col" className="text-right">Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topBids.map((bid, index) => (
            <TableRow key={bid.id || `${bid.bidder}-${index}`} data-testid={`auction-bid-${index}`}>
              <TableCell className="font-mono text-xs">{truncateAddress(bid.bidder)}</TableCell>
              <TableCell className="text-right tabular-nums" data-testid={`auction-bid-amount-${index}`}>
                {formatBidPrice(bid.amount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBidPrice(bid.total)}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {bid.created_at
                  ? new Date(bid.created_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
