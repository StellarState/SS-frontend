import type { Auction, AuctionBid } from "@/lib/api";

/** Live bids refresh on this interval. */
export const AUCTION_POLL_INTERVAL_MS = 10 * 1000;

/** Minimum step above the current highest bid, in XLM per fraction. */
export const MIN_BID_INCREMENT = 0.01;

/** Bids are capped at this many rows in the live list. */
export const MAX_DISPLAYED_BIDS = 20;

/**
 * Bids ordered by price, highest first. The API returns them newest first,
 * which is not the order a bidder wants to read them in.
 */
export function sortBidsDescending(bids: AuctionBid[]): AuctionBid[] {
  return [...bids].sort((a, b) => b.amount - a.amount);
}

/** The top bids, highest first, capped at `limit`. */
export function getTopBids(
  bids: AuctionBid[],
  limit: number = MAX_DISPLAYED_BIDS
): AuctionBid[] {
  return sortBidsDescending(bids).slice(0, limit);
}

/**
 * Whether the reserve has been met — a bid at or above the reserve price.
 */
export function isReserveMet(auction: Auction): boolean {
  return auction.highest_bid >= auction.reserve_price && auction.reserve_price > 0;
}

/**
 * The lowest price a new bid may carry: one increment above the current
 * highest bid, or the reserve price when nobody has bid yet.
 */
export function getMinimumBid(auction: Auction): number {
  if (auction.highest_bid > 0) {
    return roundPrice(auction.highest_bid + MIN_BID_INCREMENT);
  }
  return roundPrice(auction.reserve_price);
}

/** Rounds a price to 2 decimals, avoiding float drift on display. */
export function roundPrice(value: number): number {
  // The epsilon nudge keeps values like 1.005 (which is stored a hair below
  // 1.005 in binary) from rounding down to 1.00.
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Whether the auction is still open for bids at `now`. */
export function isAuctionOpen(
  auction: Auction,
  now: number = Date.now()
): boolean {
  if (auction.status !== "active") return false;
  const endsAt = new Date(auction.ends_at).getTime();
  if (Number.isNaN(endsAt)) return false;
  return endsAt > now;
}

/** Formats a price per fraction for display, e.g. `1.25 XLM`. */
export function formatBidPrice(value: number): string {
  return `${value.toFixed(2)} XLM`;
}
