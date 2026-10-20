"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuctionSettlement } from "@/hooks/useAuction";
import { truncateAddress } from "@/lib/stellar";
import { formatBidPrice } from "@/lib/auction";

/**
 * Post-settlement outcome of an auction: who won, the clearing price, and
 * whether losing bidders have been refunded.
 */
export function AuctionSettlementView({ auctionId }: { auctionId: string }) {
  const { data: settlement, isLoading, isError } = useAuctionSettlement(auctionId);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="auction-settlement-loading" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !settlement) {
    return (
      <div className="space-y-4" data-testid="auction-settlement-error">
        <p className="text-destructive" role="alert">
          The settlement outcome could not be loaded.
        </p>
        <Button asChild variant="outline">
          <Link href={`/marketplace/auctions/${encodeURIComponent(auctionId)}`}>
            Back to auction
          </Link>
        </Button>
      </div>
    );
  }

  const noBid = settlement.status === "no_bid";
  const cancelled = settlement.status === "cancelled";

  return (
    <div className="space-y-6" data-testid="auction-settlement">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/marketplace/auctions/${encodeURIComponent(auctionId)}`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to auction
        </Link>
      </Button>

      <Card data-testid="auction-settlement-summary">
        <CardHeader>
          <CardTitle className="text-2xl">Auction settlement</CardTitle>
          <CardDescription>
            {cancelled
              ? "This auction was cancelled and every bidder was refunded."
              : noBid
                ? "The auction closed with no bids."
                : "The auction has settled."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settlement.winner && (
            <div>
              <p className="text-sm text-muted-foreground">Winner</p>
              <p className="font-mono text-lg font-semibold" data-testid="settlement-winner">
                {truncateAddress(settlement.winner)}
              </p>
            </div>
          )}
          {settlement.clearing_price !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Clearing price</p>
              <p className="text-lg font-semibold tabular-nums" data-testid="settlement-clearing-price">
                {formatBidPrice(settlement.clearing_price)}
              </p>
            </div>
          )}
          {noBid && (
            <Badge variant="outline" data-testid="settlement-no-bid">
              No winning bid
            </Badge>
          )}
        </CardContent>
      </Card>

      {settlement.refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Losing bidders</CardTitle>
            <CardDescription>Refunds are returned to the bidders who were outbid.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table aria-label="Auction refunds" data-testid="settlement-refunds">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Bidder</TableHead>
                  <TableHead scope="col" className="text-right">Refund</TableHead>
                  <TableHead scope="col" className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlement.refunds.map((refund) => (
                  <TableRow
                    key={refund.wallet}
                    data-testid={`settlement-refund-${refund.wallet}`}
                  >
                    <TableCell className="font-mono text-xs">
                      {truncateAddress(refund.wallet)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBidPrice(refund.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {refund.status === "refunded" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
                          data-testid="refund-status-refunded"
                        >
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          Refunded
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1" data-testid="refund-status-pending">
                          <Undo2 className="size-3" aria-hidden="true" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
