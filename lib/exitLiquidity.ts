import type { InvoiceOrderBook, OrderBookLevel } from "@/lib/api";

const EXIT_QUOTE_TTL_MS = 60 * 1000;

export interface ExitLiquidityEstimate {
  totalBidDepth: number;
  immediateQuantity: number;
  immediateProceeds: number;
  slippageMinPercent: number;
  slippageMaxPercent: number;
  fullExitAvailableNow: boolean;
}

export interface ExitLiquidityQuote {
  quantity: number;
  estimatedProceeds: number;
  limitPrice: number;
  expiresAt: number;
}

function validBids(book: InvoiceOrderBook): OrderBookLevel[] {
  return (book.bids ?? [])
    .filter(
      (level) =>
        Number.isFinite(level.price) &&
        level.price > 0 &&
        Number.isFinite(level.quantity) &&
        level.quantity > 0,
    )
    .sort((a, b) => b.price - a.price);
}

export function isPositionLocked(lockupExpiresAt?: string | null, now = Date.now()): boolean {
  if (!lockupExpiresAt) return false;
  const releaseTime = new Date(lockupExpiresAt).getTime();
  return Number.isFinite(releaseTime) && releaseTime > now;
}

export function estimateExitLiquidity(
  quantity: number,
  book: InvoiceOrderBook,
): ExitLiquidityEstimate | null {
  const bids = validBids(book);
  if (!(quantity > 0) || bids.length === 0) return null;

  const totalBidDepth = bids.reduce((total, bid) => total + bid.quantity, 0);
  const immediateQuantity = Math.min(quantity, totalBidDepth);
  const bestPrice = bids[0].price;
  let remaining = immediateQuantity;
  let immediateProceeds = 0;
  let worstFilledPrice = bestPrice;

  for (const bid of bids) {
    if (remaining <= 0) break;
    const fillQuantity = Math.min(remaining, bid.quantity);
    immediateProceeds += fillQuantity * bid.price;
    remaining -= fillQuantity;
    worstFilledPrice = bid.price;
  }

  const slippageMaxPercent = Math.min(
    100,
    Math.max(0, ((bestPrice - worstFilledPrice) / bestPrice) * 100),
  );

  return {
    totalBidDepth,
    immediateQuantity,
    immediateProceeds,
    slippageMinPercent: 0,
    slippageMaxPercent,
    fullExitAvailableNow: totalBidDepth >= quantity,
  };
}

export function createExitLiquidityQuote(
  requestedQuantity: number,
  book: InvoiceOrderBook,
  now = Date.now(),
): ExitLiquidityQuote | null {
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) return null;

  let remaining = requestedQuantity;
  let limitPrice = 0;

  for (const bid of validBids(book)) {
    if (remaining <= 0) break;
    remaining -= Math.min(remaining, bid.quantity);
    limitPrice = bid.price;
  }

  if (remaining > 0 || limitPrice <= 0) return null;

  return {
    quantity: requestedQuantity,
    estimatedProceeds: requestedQuantity * limitPrice,
    limitPrice,
    expiresAt: now + EXIT_QUOTE_TTL_MS,
  };
}

export function isExitLiquidityQuoteExpired(quote: ExitLiquidityQuote, now = Date.now()): boolean {
  return now >= quote.expiresAt;
}
