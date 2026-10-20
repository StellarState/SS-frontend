"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";
import { useAuction, useAuctionBids } from "@/hooks/useAuction";
import { truncateAddress } from "@/lib/stellar";
import { formatBidPrice, isAuctionOpen } from "@/lib/auction";
import { AuctionBidList } from "@/components/marketplace/AuctionBidList";
import { AuctionCountdown } from "@/components/marketplace/AuctionCountdown";
import { AuctionReserveIndicator } from "@/components/marketplace/AuctionReserveIndicator";
import { PlaceBidForm } from "@/components/marketplace/PlaceBidForm";

export function AuctionDetailView({ auctionId }: { auctionId: string }) {
  const { address } = useWallet();
  const { data: auction, isLoading, isError } = useAuction(auctionId);
  const {
    data: bids,
    isLoading: bidsLoading,
    isFetching: bidsFetching,
    isError: bidsError,
  } = useAuctionBids(auctionId);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="auction-loading" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !auction) {
    return (
      <div className="space-y-4" data-testid="auction-error">
        <p className="text-destructive" role="alert">
          This auction could not be found.
        </p>
        <Button asChild variant="outline">
          <Link href="/marketplace/resale">Back to secondary market</Link>
        </Button>
      </div>
    );
  }

  const open = isAuctionOpen(auction);
  const isSeller = Boolean(address) && address === auction.seller;

  return (
    <div className="space-y-6" data-testid="auction-detail">
      <Button asChild variant="ghost" size="sm">
        <Link href="/marketplace/resale">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to secondary market
        </Link>
      </Button>

      <Card data-testid="auction-header">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-2xl" data-testid="auction-invoice-title">
                {auction.invoice_title}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Seller:{" "}
                  <span className="font-mono text-foreground" data-testid="auction-seller">
                    {truncateAddress(auction.seller)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span data-testid="auction-fraction-amount">
                    {auction.fraction_amount} fractions
                  </span>
                </span>
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <AuctionReserveIndicator auction={auction} />
              <Badge variant={open ? "secondary" : "outline"} data-testid="auction-status">
                {open ? "Open" : auction.status === "settled" ? "Settled" : "Closed"}
              </Badge>
              <AuctionCountdown endsAt={auction.ends_at} />
              {auction.status === "settled" && (
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link
                    href={`/marketplace/auctions/${encodeURIComponent(auction.id)}/settlement`}
                    data-testid="auction-settlement-link"
                  >
                    View settlement
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Highest bid</p>
              <p className="text-lg font-semibold tabular-nums" data-testid="auction-highest-bid">
                {auction.highest_bid > 0 ? formatBidPrice(auction.highest_bid) : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Bids</p>
              <p className="text-lg font-semibold tabular-nums" data-testid="auction-bid-count">
                {auction.bid_count}
              </p>
            </div>
            {auction.reserve_price > 0 && (
              <div>
                <p className="text-muted-foreground">Reserve price</p>
                <p className="text-lg font-semibold tabular-nums" data-testid="auction-reserve-price">
                  {formatBidPrice(auction.reserve_price)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live bids</CardTitle>
            <CardDescription>Updates every 10 seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuctionBidList
              bids={bids ?? []}
              isLoading={bidsLoading}
              isFetching={bidsFetching}
              isError={bidsError}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Place a bid</CardTitle>
            <CardDescription>
              {isSeller
                ? "You are the seller on this auction."
                : "Your bid is escrowed until the auction closes."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {open && !isSeller ? (
              <PlaceBidForm auction={auction} />
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="auction-bid-closed">
                {isSeller
                  ? "You cannot bid on your own auction."
                  : "This auction is no longer accepting bids."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
