import { describe, it, expect } from "vitest";
import {
  validateOfferInput,
  calculateOfferImpact,
  isOfferExpired,
  canAcceptOrRejectOffer,
  canCancelOffer,
  executeAcceptOffer,
  executeRejectOffer,
  executeCancelOffer,
  filterOffersByTab,
  type SecondaryOffer,
  type ListingReference,
  MIN_OFFER_PRICE_XLM,
  MAX_OFFER_PRICE_XLM,
} from "../offerNegotiation";

describe("offerNegotiation analytics (#687)", () => {
  const mockListing: ListingReference = {
    id: "list-1",
    seller_address: "GBSELLER123",
    price_per_fraction: 100,
    available_quantity: 50,
    fair_value_per_fraction: 98,
    invoice_annual_yield: 12.0,
  };

  const sampleOffer: SecondaryOffer = {
    id: "off-1",
    invoice_id: "inv-100",
    listing_id: "list-1",
    buyer_address: "GBBUYER456",
    seller_address: "GBSELLER123",
    quantity: 10,
    price_per_fraction: 95,
    total_offer_amount: 950,
    fair_value_per_fraction: 98,
    discount_premium_percent: -3.06,
    effective_yield_percent: 12.38,
    created_at: "2026-11-20T10:00:00Z",
    expires_at: "2026-11-22T10:00:00Z",
    status: "pending",
  };

  describe("Offer validation (Offer amounts and quantities are valid)", () => {
    it("validates compliant offer inputs within listing bounds", () => {
      const res = validateOfferInput(
        {
          quantity: 20,
          price_per_fraction: 96.5,
          expires_in_hours: 24,
          listing_id: "list-1",
        },
        mockListing,
      );
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });

    it("rejects non-integer, zero, negative, or excess quantities", () => {
      const zeroQty = validateOfferInput(
        { quantity: 0, price_per_fraction: 95, expires_in_hours: 24, listing_id: "list-1" },
        mockListing,
      );
      expect(zeroQty.isValid).toBe(false);
      expect(zeroQty.errors.quantity).toBe("Quantity must be greater than 0.");

      const fractionalQty = validateOfferInput(
        { quantity: 2.5, price_per_fraction: 95, expires_in_hours: 24, listing_id: "list-1" },
        mockListing,
      );
      expect(fractionalQty.isValid).toBe(false);
      expect(fractionalQty.errors.quantity).toBe("Quantity must be a whole number of fractions.");

      const excessQty = validateOfferInput(
        { quantity: 60, price_per_fraction: 95, expires_in_hours: 24, listing_id: "list-1" },
        mockListing,
      );
      expect(excessQty.isValid).toBe(false);
      expect(excessQty.errors.quantity).toContain("Quantity cannot exceed available listing amount (50).");
    });

    it("rejects prices outside protocol limits", () => {
      const tooLow = validateOfferInput(
        { quantity: 5, price_per_fraction: 0.001, expires_in_hours: 24, listing_id: "list-1" },
        mockListing,
      );
      expect(tooLow.isValid).toBe(false);
      expect(tooLow.errors.price_per_fraction).toContain(String(MIN_OFFER_PRICE_XLM));

      const tooHigh = validateOfferInput(
        { quantity: 5, price_per_fraction: 200000, expires_in_hours: 24, listing_id: "list-1" },
        mockListing,
      );
      expect(tooHigh.isValid).toBe(false);
      expect(tooHigh.errors.price_per_fraction).toContain(MAX_OFFER_PRICE_XLM.toLocaleString("en-US"));
    });

    it("rejects invalid expiry bounds", () => {
      const zeroHours = validateOfferInput(
        { quantity: 5, price_per_fraction: 95, expires_in_hours: 0, listing_id: "list-1" },
        mockListing,
      );
      expect(zeroHours.isValid).toBe(false);

      const tooManyHours = validateOfferInput(
        { quantity: 5, price_per_fraction: 95, expires_in_hours: 200, listing_id: "list-1" },
        mockListing,
      );
      expect(tooManyHours.isValid).toBe(false);
    });
  });

  describe("Fair-value reference and offer impact calculation", () => {
    it("calculates discount and increased effective yield when offering below fair value", () => {
      const impact = calculateOfferImpact(
        90, // Offered price
        10, // Quantity
        100, // Fair value
        10.0, // Base yield
        105, // Ask price
      );

      expect(impact.totalAmount).toBe(900);
      expect(impact.fairValueTotal).toBe(1000);
      expect(impact.discountPremiumPercent).toBe(-10.0);
      expect(impact.isDiscount).toBe(true);
      expect(impact.projectedAnnualYield).toBe(11.11); // 10% * (100 / 90) = 11.11%
      expect(impact.savingsOrPremiumVsAsk).toBe(150); // (105 - 90) * 10
    });

    it("calculates premium and reduced effective yield when offering above fair value", () => {
      const impact = calculateOfferImpact(
        110, // Offered price
        5, // Quantity
        100, // Fair value
        10.0, // Base yield
      );

      expect(impact.discountPremiumPercent).toBe(10.0);
      expect(impact.isDiscount).toBe(false);
      expect(impact.projectedAnnualYield).toBe(9.09); // 10% * (100 / 110) = 9.09%
    });
  });

  describe("Authorization & Expiry Guards", () => {
    it("allows only the listing seller to accept or reject an offer", () => {
      // Seller acting
      const sellerCheck = canAcceptOrRejectOffer(sampleOffer, "GBSELLER123", "2026-11-21T00:00:00Z");
      expect(sellerCheck.canAct).toBe(true);

      // Buyer attempting to accept own offer
      const buyerCheck = canAcceptOrRejectOffer(sampleOffer, "GBBUYER456", "2026-11-21T00:00:00Z");
      expect(buyerCheck.canAct).toBe(false);
      expect(buyerCheck.reason).toContain("Only the listing seller can accept or reject");

      // Third party attempting to accept
      const thirdPartyCheck = canAcceptOrRejectOffer(sampleOffer, "GBOTHER999", "2026-11-21T00:00:00Z");
      expect(thirdPartyCheck.canAct).toBe(false);
    });

    it("prevents expired offers from executing or being accepted", () => {
      const expiredTimestamp = "2026-11-23T12:00:00Z"; // After expires_at (Nov 22)
      expect(isOfferExpired(sampleOffer, expiredTimestamp)).toBe(true);

      const check = canAcceptOrRejectOffer(sampleOffer, "GBSELLER123", expiredTimestamp);
      expect(check.canAct).toBe(false);
      expect(check.reason).toContain("Offer has expired");

      expect(() => executeAcceptOffer(sampleOffer, "GBSELLER123", expiredTimestamp)).toThrow(
        "Offer has expired"
      );
    });

    it("allows only the buyer to cancel an active pending offer", () => {
      const buyerCancel = canCancelOffer(sampleOffer, "GBBUYER456", "2026-11-21T00:00:00Z");
      expect(buyerCancel.canCancel).toBe(true);

      const sellerCancel = canCancelOffer(sampleOffer, "GBSELLER123", "2026-11-21T00:00:00Z");
      expect(sellerCancel.canCancel).toBe(false);
      expect(sellerCancel.reason).toContain("Only the buyer who created this offer can cancel it");
    });
  });

  describe("Transitions & Audit Trails", () => {
    it("accepted offers enter settlement (settlement_status: queued)", () => {
      const accepted = executeAcceptOffer(sampleOffer, "GBSELLER123", "2026-11-21T12:00:00Z");
      expect(accepted.status).toBe("accepted");
      expect(accepted.settlement_status).toBe("queued");
      expect(accepted.resolved_at).toBe("2026-11-21T12:00:00.000Z");
    });

    it("rejected offers record the rejection reason audit trail", () => {
      const rejected = executeRejectOffer(
        sampleOffer,
        "GBSELLER123",
        "Price too far below market ask",
        "2026-11-21T12:00:00Z",
      );
      expect(rejected.status).toBe("rejected");
      expect(rejected.rejection_reason).toBe("Price too far below market ask");
      expect(rejected.resolved_at).toBe("2026-11-21T12:00:00.000Z");
    });

    it("cancelled offers record cancellation timestamp", () => {
      const cancelled = executeCancelOffer(sampleOffer, "GBBUYER456", "2026-11-21T12:00:00Z");
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.cancelled_at).toBe("2026-11-21T12:00:00.000Z");
    });
  });

  describe("Filtering across incoming, outgoing, and history views", () => {
    const historicalOffers: SecondaryOffer[] = [
      sampleOffer, // pending, buyer: GBBUYER456, seller: GBSELLER123
      {
        ...sampleOffer,
        id: "off-accepted",
        status: "accepted",
        settlement_status: "queued",
      },
      {
        ...sampleOffer,
        id: "off-rejected",
        status: "rejected",
        rejection_reason: "Low bid",
      },
    ];

    it("filters incoming offers for seller", () => {
      const incoming = filterOffersByTab(historicalOffers, "GBSELLER123", "incoming", "2026-11-21T00:00:00Z");
      expect(incoming.length).toBe(1);
      expect(incoming[0].id).toBe("off-1");
    });

    it("filters outgoing offers for buyer", () => {
      const outgoing = filterOffersByTab(historicalOffers, "GBBUYER456", "outgoing", "2026-11-21T00:00:00Z");
      expect(outgoing.length).toBe(1);
      expect(outgoing[0].id).toBe("off-1");
    });

    it("filters history tab with terminal offers", () => {
      const history = filterOffersByTab(historicalOffers, "GBBUYER456", "history", "2026-11-21T00:00:00Z");
      expect(history.length).toBe(2);
      expect(history.map((h) => h.id)).toEqual(["off-accepted", "off-rejected"]);
    });
  });
});
