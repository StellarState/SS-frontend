import { describe, expect, it } from "vitest";
import {
  createExitLiquidityQuote,
  estimateExitLiquidity,
  isExitLiquidityQuoteExpired,
  isPositionLocked,
} from "@/lib/exitLiquidity";
import type { InvoiceOrderBook } from "@/lib/api";

const liquidBook: InvoiceOrderBook = {
  bids: [
    { price: 9.8, quantity: 3 },
    { price: 9.5, quantity: 4 },
  ],
  asks: [{ price: 10, quantity: 5 }],
};

describe("exit liquidity preview", () => {
  it("estimates immediate depth and bounded slippage for a liquid market", () => {
    const estimate = estimateExitLiquidity(5, liquidBook);

    expect(estimate?.totalBidDepth).toBe(7);
    expect(estimate?.immediateQuantity).toBe(5);
    expect(estimate?.immediateProceeds).toBeCloseTo(48.4);
    expect(estimate?.slippageMinPercent).toBe(0);
    expect(estimate?.slippageMaxPercent).toBeCloseTo(((9.8 - 9.5) / 9.8) * 100);
    expect(estimate?.fullExitAvailableNow).toBe(true);
  });

  it("returns no estimates for an unavailable market", () => {
    expect(estimateExitLiquidity(5, { bids: [], asks: [] })).toBeNull();
    expect(createExitLiquidityQuote(1, { bids: [], asks: [] })).toBeNull();
  });

  it("does not claim full exit liquidity when only a partial bid depth exists", () => {
    const estimate = estimateExitLiquidity(10, {
      bids: [{ price: 4, quantity: 2 }],
      asks: [],
    });

    expect(estimate?.immediateQuantity).toBe(2);
    expect(estimate?.fullExitAvailableNow).toBe(false);
  });

  it("shows a locked position's release boundary and expires quotes", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const releaseAt = "2026-01-02T00:00:00.000Z";
    const quote = createExitLiquidityQuote(2, liquidBook, now);

    expect(isPositionLocked(releaseAt, now)).toBe(true);
    expect(isPositionLocked(releaseAt, Date.parse(releaseAt))).toBe(false);
    expect(quote).not.toBeNull();
    expect(isExitLiquidityQuoteExpired(quote!, now + 59_999)).toBe(false);
    expect(isExitLiquidityQuoteExpired(quote!, now + 60_000)).toBe(true);
  });

  it("cannot quote more than the current bid depth", () => {
    expect(createExitLiquidityQuote(8, liquidBook)).toBeNull();
    expect(createExitLiquidityQuote(1.5, liquidBook)).toBeNull();
  });
});
