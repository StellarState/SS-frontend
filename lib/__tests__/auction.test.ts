import { describe, it, expect } from "vitest";
import {
  AUCTION_POLL_INTERVAL_MS,
  MIN_BID_INCREMENT,
  formatBidPrice,
  getMinimumBid,
  getTopBids,
  isAuctionOpen,
  isReserveMet,
  roundPrice,
  sortBidsDescending,
} from "@/lib/auction";
import type { Auction, AuctionBid } from "@/lib/api";

function auction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: "auc-1",
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    seller: "GSELLER",
    fraction_amount: 100,
    reserve_price: 1,
    highest_bid: 0,
    bid_count: 0,
    ends_at: new Date(Date.now() + 60_000).toISOString(),
    status: "active",
    ...overrides,
  };
}

function bid(overrides: Partial<AuctionBid> = {}): AuctionBid {
  return {
    id: "bid-1",
    bidder: "GBIDDER",
    amount: 1,
    total: 100,
    created_at: "2026-10-20T12:00:00Z",
    ...overrides,
  };
}

describe("sortBidsDescending", () => {
  it("orders bids by price, highest first", () => {
    const sorted = sortBidsDescending([
      bid({ id: "a", amount: 1 }),
      bid({ id: "b", amount: 3 }),
      bid({ id: "c", amount: 2 }),
    ]);
    expect(sorted.map((b) => b.amount)).toEqual([3, 2, 1]);
  });

  it("does not mutate the input", () => {
    const bids = [bid({ id: "a", amount: 1 }), bid({ id: "b", amount: 2 })];
    sortBidsDescending(bids);
    expect(bids[0].amount).toBe(1);
  });
});

describe("getTopBids", () => {
  it("caps the list at the given limit", () => {
    const bids = Array.from({ length: 5 }, (_, i) =>
      bid({ id: `b${i}`, amount: i + 1 }),
    );
    expect(getTopBids(bids, 3)).toHaveLength(3);
    expect(getTopBids(bids, 3)[0].amount).toBe(5);
  });
});

describe("isReserveMet", () => {
  it("is met at or above the reserve price", () => {
    expect(isReserveMet(auction({ reserve_price: 1, highest_bid: 1 }))).toBe(true);
    expect(isReserveMet(auction({ reserve_price: 1, highest_bid: 1.5 }))).toBe(true);
  });

  it("is not met below the reserve price", () => {
    expect(isReserveMet(auction({ reserve_price: 2, highest_bid: 1.5 }))).toBe(false);
    expect(isReserveMet(auction({ reserve_price: 1, highest_bid: 0 }))).toBe(false);
  });
});

describe("getMinimumBid", () => {
  it("is the reserve price when nobody has bid", () => {
    expect(getMinimumBid(auction({ reserve_price: 1.25, highest_bid: 0 }))).toBe(1.25);
  });

  it("is one increment above the highest bid", () => {
    expect(getMinimumBid(auction({ reserve_price: 1, highest_bid: 1.2 }))).toBe(
      roundPrice(1.2 + MIN_BID_INCREMENT),
    );
  });
});

describe("isAuctionOpen", () => {
  it("is open for an active auction that has not ended", () => {
    expect(isAuctionOpen(auction({ ends_at: new Date(Date.now() + 1000).toISOString() }))).toBe(true);
  });

  it("is closed once the end time has passed", () => {
    expect(isAuctionOpen(auction({ ends_at: new Date(Date.now() - 1000).toISOString() }))).toBe(false);
  });

  it("is closed for a settled auction", () => {
    expect(
      isAuctionOpen(
        auction({ status: "settled", ends_at: new Date(Date.now() + 1000).toISOString() }),
      ),
    ).toBe(false);
  });
});

describe("auction formatting", () => {
  it("formats bid prices to two decimals", () => {
    expect(formatBidPrice(1.2)).toBe("1.20 XLM");
    expect(formatBidPrice(1.256)).toBe("1.26 XLM");
  });

  it("rounds prices to two decimals", () => {
    expect(roundPrice(1.005)).toBe(1.01);
    expect(roundPrice(1.2 + 0.01)).toBe(1.21);
  });

  it("polls bids every 10 seconds", () => {
    expect(AUCTION_POLL_INTERVAL_MS).toBe(10_000);
  });
});
