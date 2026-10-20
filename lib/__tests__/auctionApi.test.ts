import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  fetchAuction,
  fetchAuctionBids,
  fetchAuctionSettlement,
  placeBid,
} from "@/lib/api";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAuction", () => {
  it("reads the auction and normalises the payload", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: "auc-1",
        invoice_id: "inv-1",
        invoice_title: "Acme receivable",
        seller: "GSELLER",
        fraction_amount: 100,
        reserve_price: 1,
        highest_bid: 1.2,
        bid_count: 3,
        ends_at: "2026-10-21T12:00:00Z",
        status: "active",
      }),
    );

    const auction = await fetchAuction("auc-1");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/marketplace/auctions/auc-1");
    expect(auction.fraction_amount).toBe(100);
    expect(auction.highest_bid).toBe(1.2);
    expect(auction.status).toBe("active");
  });

  it("throws when the auction cannot be read", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    await expect(fetchAuction("auc-1")).rejects.toThrow("Failed to fetch auction");
  });
});

describe("fetchAuctionBids", () => {
  it("reads and normalises the bid list", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        bids: [
          {
            id: "b-1",
            bidder: "GBIDDER",
            amount: 1.5,
            total: 150,
            created_at: "2026-10-20T12:00:00Z",
          },
        ],
      }),
    );

    const bids = await fetchAuctionBids("auc-1");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/marketplace/auctions/auc-1/bids");
    expect(bids).toHaveLength(1);
    expect(bids[0].amount).toBe(1.5);
    expect(bids[0].bidder).toBe("GBIDDER");
  });

  it("accepts a bare array payload", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "b-1", bidder: "G", amount: 2 }]));
    const bids = await fetchAuctionBids("auc-1");
    expect(bids).toHaveLength(1);
    expect(bids[0].amount).toBe(2);
  });
});

describe("placeBid", () => {
  it("submits the place_bid contract call", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, transaction_hash: "abc" }));

    const result = await placeBid({ auction_id: "auc-1", amount: 1.75, wallet: "GINV" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/marketplace/auctions/auc-1/bids");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      method: "place_bid",
      wallet: "GINV",
      amount: 1.75,
    });
    expect(result.transaction_hash).toBe("abc");
  });

  it("surfaces the API error message", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Bid is below the reserve" }, false, 400),
    );
    await expect(placeBid({ auction_id: "auc-1", amount: 0.5, wallet: "GINV" })).rejects.toThrow(
      "Bid is below the reserve",
    );
  });
});

describe("fetchAuctionSettlement", () => {
  it("reads the winner, clearing price and refunds", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        auction_id: "auc-1",
        status: "settled",
        winner: "GWINNER",
        clearing_price: 1.8,
        refunds: [{ wallet: "GLOSER", amount: 150, status: "refunded" }],
      }),
    );

    const settlement = await fetchAuctionSettlement("auc-1");

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/marketplace/auctions/auc-1/settlement",
    );
    expect(settlement.winner).toBe("GWINNER");
    expect(settlement.clearing_price).toBe(1.8);
    expect(settlement.refunds[0].status).toBe("refunded");
  });

  it("handles an auction that closed with no bid", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ auction_id: "auc-1", status: "no_bid", winner: null, clearing_price: null }),
    );

    const settlement = await fetchAuctionSettlement("auc-1");

    expect(settlement.status).toBe("no_bid");
    expect(settlement.winner).toBeNull();
    expect(settlement.clearing_price).toBeNull();
  });
});
