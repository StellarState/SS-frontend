"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { usePortfolio } from "@/hooks/usePortfolio";
import { calculateActiveTotal } from "@/lib/portfolio";

function PositionRowSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-16" />
      </CardContent>
    </Card>
  );
}

export function InvestorPortfolio() {
  const { data, isLoading, isFetching } = usePortfolio();

  // Show full skeleton only on initial load
  if (isLoading || !data) {
    return (
      <div className="space-y-6" data-testid="investor-portfolio-loading">
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-32" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PositionRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const positions = data.positions;
  const { formattedTotal } = calculateActiveTotal(positions);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Committed (Active)
              </p>
              <p className="text-2xl font-bold">{formattedTotal}</p>
            </div>
            {isFetching && (
              <div
                className="text-xs text-muted-foreground flex items-center gap-1"
                data-testid="portfolio-refreshing"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                Refreshing…
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Positions</h2>
        {positions.length === 0 ? (
          <div
            className="flex flex-col items-center gap-4 py-12 text-center"
            data-testid="investor-portfolio-empty"
          >
            <p className="text-muted-foreground">
              No active investments yet — browse the marketplace to get started
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse Invoices</Link>
            </Button>
          </div>
        ) : (
          positions.map((position) => (
            <Card key={position.invoice_id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-semibold">{position.invoice_title}</p>
                  <p className="text-sm text-muted-foreground">
                    {position.committed_amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    XLM committed
                    {typeof position.share_percent === "number" &&
                      ` · ${position.share_percent}% share`}
                  </p>
                </div>
                <InvoiceStatusBadge status={position.status} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
