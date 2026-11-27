"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceOrderBook } from "@/hooks/useInvoiceOrderBook";
import type { InvestmentPosition } from "@/lib/portfolio";
import {
  createExitLiquidityQuote,
  estimateExitLiquidity,
  isExitLiquidityQuoteExpired,
  isPositionLocked,
  type ExitLiquidityQuote,
} from "@/lib/exitLiquidity";

interface ExitLiquidityPreviewModalProps {
  position: InvestmentPosition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinueToListing: (quote: ExitLiquidityQuote) => void;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM`;
}

export function ExitLiquidityPreviewModal({
  position,
  open,
  onOpenChange,
  onContinueToListing,
}: ExitLiquidityPreviewModalProps) {
  const orderBook = useInvoiceOrderBook(open ? position.invoice_id : null);
  const quantity = position.quantity ?? 0;
  const locked = isPositionLocked(position.lockup_expires_at);
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [quote, setQuote] = useState<ExitLiquidityQuote | null>(null);
  const [now, setNow] = useState(Date.now());
  const estimate = orderBook.data ? estimateExitLiquidity(quantity, orderBook.data) : null;
  const requestedAmount = Number(requestedQuantity);
  const quoteExpired = quote ? isExitLiquidityQuoteExpired(quote, now) : false;

  useEffect(() => {
    if (!open) {
      setQuote(null);
      setRequestedQuantity("");
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const handleCreateQuote = () => {
    if (!orderBook.data || locked) return;
    const nextQuote = createExitLiquidityQuote(requestedAmount, orderBook.data);
    if (nextQuote) setQuote(nextQuote);
  };

  const quoteSecondsRemaining = quote
    ? Math.max(0, Math.ceil((quote.expiresAt - now) / 1000))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="exit-liquidity-preview">
        <DialogHeader>
          <DialogTitle>Exit liquidity preview</DialogTitle>
          <DialogDescription>
            {position.invoice_title} · {formatAmount(quantity)} fractions available
          </DialogDescription>
        </DialogHeader>

        {locked && position.lockup_expires_at && (
          <p
            className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            data-testid="exit-lock-release"
          >
            This position is locked. The earliest exit eligibility is{" "}
            <strong>{new Date(position.lockup_expires_at).toLocaleString()}</strong>.
          </p>
        )}

        {orderBook.isLoading ? (
          <div className="space-y-2" data-testid="exit-liquidity-loading">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : orderBook.isError ? (
          <div className="space-y-2" role="alert" data-testid="exit-liquidity-error">
            <p className="text-sm text-destructive">
              {orderBook.error instanceof Error
                ? orderBook.error.message
                : "Could not load current market depth."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => orderBook.refetch()}
              disabled={orderBook.isFetching}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : !estimate ? (
          <div className="space-y-3">
            <p
              className="rounded-md border p-3 text-sm text-muted-foreground"
              data-testid="exit-market-unavailable"
            >
              Exit estimates are unavailable because there are no valid buy orders in the current
              market.
            </p>
            <section className="rounded-md border border-dashed p-3 text-sm" data-testid="scheduled-exit">
              <h3 className="font-medium">Scheduled / remaining exit</h3>
              <p className="mt-1 text-muted-foreground">
                No exit time can be estimated until valid buy orders are available.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-2 rounded-md border p-3" aria-labelledby="immediate-exit-title">
              <h3 id="immediate-exit-title" className="font-medium">
                Immediate exit
              </h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Current bid depth</dt>
                  <dd data-testid="exit-bid-depth">{formatAmount(estimate.totalBidDepth)} fractions</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Available immediately</dt>
                  <dd data-testid="exit-immediate-quantity">
                    {formatAmount(estimate.immediateQuantity)} of {formatAmount(quantity)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Estimated proceeds for available depth</dt>
                  <dd data-testid="exit-immediate-proceeds">{formatXlm(estimate.immediateProceeds)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Slippage vs. best bid</dt>
                  <dd data-testid="exit-slippage-range">
                    {estimate.slippageMinPercent.toFixed(2)}%–{estimate.slippageMaxPercent.toFixed(2)}%
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Partial exit timing</dt>
                  <dd data-testid="exit-partial-timing">
                    {locked ? "Unavailable while locked" : "Now, up to current bid depth"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Full exit timing</dt>
                  <dd data-testid="exit-full-timing">
                    {locked
                      ? "After release; sale timing is unknown"
                      : estimate.fullExitAvailableNow
                        ? "Now, at current depth"
                        : "Beyond current depth: timing unavailable"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-md border border-dashed p-3 text-sm" data-testid="scheduled-exit">
              <h3 className="font-medium">Scheduled / remaining exit</h3>
              <p className="mt-1 text-muted-foreground">
                {locked && position.lockup_expires_at
                  ? `Eligible no earlier than ${new Date(position.lockup_expires_at).toLocaleString()}. A sale is not guaranteed at that time.`
                  : estimate.fullExitAvailableNow
                    ? "The current bid depth covers the full position; no scheduled remainder is needed."
                    : "No historical sell-volume estimate is available for liquidity beyond the current bids."}
              </p>
            </section>
            <p className="text-xs text-muted-foreground" data-testid="exit-fee-boundary">
              This marketplace estimate excludes early-exit withdrawal fees. Any listing fee is
              calculated separately before you list.
            </p>

            {!locked && (
              <section className="space-y-2">
                <label htmlFor={`exit-quantity-${position.invoice_id}`} className="text-sm font-medium">
                  Fractions to quote
                </label>
                <Input
                  id={`exit-quantity-${position.invoice_id}`}
                  type="number"
                  min={1}
                  max={Math.floor(estimate.immediateQuantity)}
                  step={1}
                  value={requestedQuantity}
                  onChange={(event) => {
                    setRequestedQuantity(event.target.value);
                    setQuote(null);
                  }}
                  data-testid="exit-quote-quantity"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateQuote}
                  disabled={
                    !Number.isInteger(requestedAmount) ||
                    requestedAmount <= 0 ||
                    requestedAmount > estimate.immediateQuantity
                  }
                  data-testid="create-exit-quote"
                >
                  Create indicative quote
                </Button>
              </section>
            )}

            {quote && (
              <div
                className={`rounded-md border p-3 text-sm ${quoteExpired ? "border-destructive/50" : ""}`}
                data-testid="exit-quote"
                role={quoteExpired ? "alert" : "status"}
              >
                {quoteExpired ? (
                  <p className="font-medium text-destructive">This quote expired. Create a new quote to continue.</p>
                ) : (
                  <>
                    <p className="font-medium">
                      Indicative quote: {quote.quantity} fractions · {formatXlm(quote.estimatedProceeds)}
                    </p>
                    <p className="text-muted-foreground">
                      Limit price {formatXlm(quote.limitPrice)} per fraction · expires in{" "}
                      <span data-testid="exit-quote-countdown">{quoteSecondsRemaining}s</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Expires in 60 seconds and is not a server reservation; final execution depends
                      on the live order book.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {quote && (
            <Button
              type="button"
              onClick={() => onContinueToListing(quote)}
              disabled={quoteExpired || locked}
              data-testid="continue-exit-listing"
            >
              Continue to listing
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
