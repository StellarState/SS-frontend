import { describe, it, expect } from "vitest";
import {
  validateLimitOrderInput,
  calculateOrderMatchPreview,
  isOrderExpired,
  canExecuteOrder,
  filterOrdersByView,
  MIN_LIMIT_PRICE_XLM,
  MAX_LIMIT_PRICE_XLM,
  MIN_TARGET_YIELD_PERCENT,
  MAX_TARGET_YIELD_PERCENT,
  type ExtendedLimitOrder,
  type ActiveListingCandidate,
} from "../limitOrders";

const mockOrders: ExtendedLimitOrder[] = [
  {
    id: "ord-open-1",
    invoice_id: "inv-101",
    buyer_address: "GBUYER_1",
    fraction_amount: 10,
    max_price_per_fraction: 100,
    target_yield_percent: 12.0,
    total_escrowed: 1000,
    status: "open",
    created_at: "2026-11-20T10:00:00Z",
    expires_at: "2026-12-20T10:00:00Z", // future
  },
  {
    id: "ord-matched-1",
    invoice_id: "inv-102",
    buyer_address: "GBUYER_1",
    fraction_amount: 5,
    max_price_per_fraction: 120,
    target_yield_percent: 10.0,
    total_escrowed: 600,
    status: "matched",
    created_at: "2026-11-18T10:00:00Z",
    expires_at: "2026-12-18T10:00:00Z",
    matched_at: "2026-11-19T14:30:00Z",
    matched_listing_id: "list-88",
    matched_price_per_fraction: 115,
    execution_fee: 2.875,
    effective_yield: 10.5,
  },
  {
    id: "ord-cancelled-1",
    invoice_id: "inv-103",
    buyer_address: "GBUYER_1",
    fraction_amount: 20,
    max_price_per_fraction: 80,
    total_escrowed: 1600,
    status: "cancelled",
    created_at: "2026-11-15T10:00:00Z",
    expires_at: "2026-12-15T10:00:00Z",
    cancelled_at: "2026-11-16T12:00:00Z",
    cancellation_reason: "User cancelled: reassessing liquidity",
  },
  {
    id: "ord-expired-1",
    invoice_id: "inv-104",
    buyer_address: "GBUYER_1",
    fraction_amount: 15,
    max_price_per_fraction: 90,
    total_escrowed: 1350,
    status: "open",
    created_at: "2026-10-01T10:00:00Z",
    expires_at: "2026-11-01T10:00:00Z", // past expiry
  },
];

describe("limitOrders analytics (#688)", () => {
  describe("Protocol limit validation (Orders stay within protocol limits)", () => {
    it("validates correct order inputs within limits", () => {
      const result = validateLimitOrderInput({
        fraction_amount: 10,
        max_price_per_fraction: 150,
        target_yield_percent: 12.5,
        expires_in_days: 30,
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it("rejects prices below protocol minimum or above protocol maximum", () => {
      const tooLow = validateLimitOrderInput({
        fraction_amount: 10,
        max_price_per_fraction: 0.005, // Below 0.01
      });
      expect(tooLow.isValid).toBe(false);
      expect(tooLow.errors.max_price_per_fraction).toContain(String(MIN_LIMIT_PRICE_XLM));

      const tooHigh = validateLimitOrderInput({
        fraction_amount: 10,
        max_price_per_fraction: 200000, // Above 100,000
      });
      expect(tooHigh.isValid).toBe(false);
      expect(tooHigh.errors.max_price_per_fraction).toContain(MAX_LIMIT_PRICE_XLM.toLocaleString("en-US"));
    });

    it("rejects yields below protocol floor or above protocol cap", () => {
      const yieldLow = validateLimitOrderInput({
        fraction_amount: 5,
        max_price_per_fraction: 100,
        target_yield_percent: 0.5, // Below 1%
      });
      expect(yieldLow.isValid).toBe(false);
      expect(yieldLow.errors.target_yield_percent).toContain(String(MIN_TARGET_YIELD_PERCENT));

      const yieldHigh = validateLimitOrderInput({
        fraction_amount: 5,
        max_price_per_fraction: 100,
        target_yield_percent: 60.0, // Above 50%
      });
      expect(yieldHigh.isValid).toBe(false);
      expect(yieldHigh.errors.target_yield_percent).toContain(String(MAX_TARGET_YIELD_PERCENT));
    });

    it("rejects non-integer or zero fraction amounts", () => {
      const zeroFraction = validateLimitOrderInput({
        fraction_amount: 0,
        max_price_per_fraction: 100,
      });
      expect(zeroFraction.isValid).toBe(false);

      const floatFraction = validateLimitOrderInput({
        fraction_amount: 2.5,
        max_price_per_fraction: 100,
      });
      expect(floatFraction.isValid).toBe(false);
      expect(floatFraction.errors.fraction_amount).toContain("integer");
    });
  });

  describe("Match preview (Match preview shows price, fees and yield)", () => {
    const candidateListing: ActiveListingCandidate = {
      id: "list-candidate-1",
      seller_address: "GSELLER_1",
      price_per_fraction: 95, // below buyer's max 100
      available_fractions: 20,
      invoice_annual_yield: 13.2,
    };

    it("calculates match preview with price, fees, and effective yield", () => {
      const preview = calculateOrderMatchPreview(
        {
          fraction_amount: 10,
          max_price_per_fraction: 100,
          target_yield_percent: 12.0,
        },
        candidateListing,
      );

      expect(preview.canMatch).toBe(true);
      expect(preview.matchedPrice).toBe(95);
      expect(preview.matchedFractions).toBe(10);
      expect(preview.grossAmount).toBe(950); // 10 * 95
      expect(preview.estimatedFee).toBe(4.75); // 0.50% of 950
      expect(preview.netTotal).toBe(954.75);
      expect(preview.effectiveYield).toBe(13.2);
      expect(preview.savingsVsMaxPrice).toBe(50); // (100 - 95) * 10
    });

    it("identifies when candidate listing does not meet price or yield criteria", () => {
      const expensiveListing: ActiveListingCandidate = {
        ...candidateListing,
        price_per_fraction: 105, // exceeds max 100
      };

      const preview = calculateOrderMatchPreview(
        {
          fraction_amount: 10,
          max_price_per_fraction: 100,
        },
        expensiveListing,
      );

      expect(preview.canMatch).toBe(false);
      expect(preview.matchStatusMessage).toContain("exceeds your limit");
    });
  });

  describe("Execution guards (Expired orders cannot execute)", () => {
    it("permits execution for active open orders", () => {
      const openOrder = mockOrders[0];
      expect(isOrderExpired(openOrder, "2026-11-22T00:00:00Z")).toBe(false);
      expect(canExecuteOrder(openOrder, "2026-11-22T00:00:00Z")).toBe(true);
    });

    it("prevents execution for expired orders", () => {
      const expiredOrder = mockOrders[3];
      // expires_at was 2026-11-01
      expect(isOrderExpired(expiredOrder, "2026-11-22T00:00:00Z")).toBe(true);
      expect(canExecuteOrder(expiredOrder, "2026-11-22T00:00:00Z")).toBe(false);
    });

    it("prevents execution for cancelled or matched orders", () => {
      expect(canExecuteOrder(mockOrders[1])).toBe(false); // matched
      expect(canExecuteOrder(mockOrders[2])).toBe(false); // cancelled
    });
  });

  describe("Terminal orders auditability and views (Terminal orders remain auditable)", () => {
    it("filters orders across open, matched, cancelled, and expired views", () => {
      const now = "2026-11-22T00:00:00Z";

      const openOrders = filterOrdersByView(mockOrders, "open", now);
      expect(openOrders.length).toBe(1);
      expect(openOrders[0].id).toBe("ord-open-1");

      const matchedOrders = filterOrdersByView(mockOrders, "matched", now);
      expect(matchedOrders.length).toBe(1);
      expect(matchedOrders[0].id).toBe("ord-matched-1");
      expect(matchedOrders[0].execution_fee).toBe(2.875);

      const cancelledOrders = filterOrdersByView(mockOrders, "cancelled", now);
      expect(cancelledOrders.length).toBe(1);
      expect(cancelledOrders[0].id).toBe("ord-cancelled-1");
      expect(cancelledOrders[0].cancellation_reason).toBeTruthy();

      const expiredOrders = filterOrdersByView(mockOrders, "expired", now);
      expect(expiredOrders.length).toBe(1);
      expect(expiredOrders[0].id).toBe("ord-expired-1");
    });
  });
});
