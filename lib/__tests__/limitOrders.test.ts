import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROTOCOL_LIMITS,
  validateLimitOrderInput,
  calculateLimitOrderMatchPreview,
  isLimitOrderExpired,
  canExecuteLimitOrder,
  type ExtendedLimitOrder,
  type OrderBookAsk,
} from "../limitOrders";

describe("validateLimitOrderInput against protocol limits", () => {
  it("approves valid order inputs within protocol limits", () => {
    const res = validateLimitOrderInput({
      fractionAmount: 10,
      maxPricePerFraction: 100,
      targetYieldPercent: 12.5,
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("rejects price below protocol minimum (0.1 XLM)", () => {
    const res = validateLimitOrderInput({
      fractionAmount: 5,
      maxPricePerFraction: 0.05,
    });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/below protocol minimum/i);
  });

  it("rejects price above protocol maximum (1,000 XLM)", () => {
    const res = validateLimitOrderInput({
      fractionAmount: 5,
      maxPricePerFraction: 1500,
    });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toMatch(/exceed protocol maximum/i);
  });

  it("rejects yield outside protocol bounds (1.0% - 35.0%)", () => {
    const lowYield = validateLimitOrderInput({
      fractionAmount: 10,
      maxPricePerFraction: 50,
      targetYieldPercent: 0.5,
    });
    expect(lowYield.valid).toBe(false);
    expect(lowYield.errors[0]).toMatch(/below protocol minimum/i);

    const highYield = validateLimitOrderInput({
      fractionAmount: 10,
      maxPricePerFraction: 50,
      targetYieldPercent: 40.0,
    });
    expect(highYield.valid).toBe(false);
    expect(highYield.errors[0]).toMatch(/exceed protocol cap/i);
  });

  it("requires integer fraction count >= 1", () => {
    const nonInteger = validateLimitOrderInput({
      fractionAmount: 2.5,
      maxPricePerFraction: 50,
    });
    expect(nonInteger.valid).toBe(false);

    const zeroAmount = validateLimitOrderInput({
      fractionAmount: 0,
      maxPricePerFraction: 50,
    });
    expect(zeroAmount.valid).toBe(false);
  });
});

describe("calculateLimitOrderMatchPreview", () => {
  const sampleAsks: OrderBookAsk[] = [
    { price: 90.0, quantity: 5 },
    { price: 95.0, quantity: 10 },
    { price: 105.0, quantity: 20 },
  ];

  it("computes weighted match price, fees, and effective yield for matching asks", () => {
    // Ordering 10 fractions at max 100 XLM.
    // Matches 5 @ 90 and 5 @ 95 = (450 + 475) / 10 = 92.5 XLM avg price.
    const preview = calculateLimitOrderMatchPreview(
      10,
      100,
      10.0,
      sampleAsks,
      DEFAULT_PROTOCOL_LIMITS,
    );

    expect(preview.canMatchNow).toBe(true);
    expect(preview.matchedFractions).toBe(10);
    expect(preview.unmatchedFractions).toBe(0);
    expect(preview.avgMatchPrice).toBe(92.5);
    expect(preview.totalEscrowRequired).toBe(1000); // 10 * 100 max price
    expect(preview.protocolFee).toBeCloseTo(925 * 0.005, 2);
    // Lower purchase price enhances effective yield: 10 * (100 / 92.5) = 10.81%
    expect(preview.effectiveYieldPercent).toBeGreaterThan(10.0);
  });

  it("handles partial match when ask depth is insufficient", () => {
    // Ordering 20 fractions at max 92 XLM. Only 5 available at 90 XLM.
    const preview = calculateLimitOrderMatchPreview(
      20,
      92,
      10.0,
      sampleAsks,
    );

    expect(preview.matchedFractions).toBe(5);
    expect(preview.unmatchedFractions).toBe(15);
    expect(preview.avgMatchPrice).toBe(90);
  });
});

describe("terminal states and auditability", () => {
  const baseOrder: ExtendedLimitOrder = {
    id: "ord-test",
    invoice_id: "inv-1",
    investor_address: "GINV",
    fraction_amount: 10,
    max_price_per_fraction: 100,
    total_escrowed: 1000,
    status: "open",
    created_at: "2026-11-20T10:00:00Z",
    audit_id: "AUD-1234",
  };

  it("allows execution for active non-expired open orders", () => {
    expect(canExecuteLimitOrder(baseOrder)).toBe(true);
  });

  it("strictly prevents execution of expired orders", () => {
    const expiredByStatus: ExtendedLimitOrder = {
      ...baseOrder,
      status: "expired",
    };
    expect(canExecuteLimitOrder(expiredByStatus)).toBe(false);

    const expiredByDate: ExtendedLimitOrder = {
      ...baseOrder,
      expires_at: "2026-11-01T00:00:00Z",
    };
    expect(isLimitOrderExpired(expiredByDate, Date.parse("2026-11-20T00:00:00Z"))).toBe(true);
    expect(canExecuteLimitOrder(expiredByDate, Date.parse("2026-11-20T00:00:00Z"))).toBe(false);
  });

  it("strictly prevents execution of cancelled or filled terminal orders", () => {
    expect(canExecuteLimitOrder({ ...baseOrder, status: "cancelled" })).toBe(false);
    expect(canExecuteLimitOrder({ ...baseOrder, status: "filled" })).toBe(false);
  });
});
