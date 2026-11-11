import { describe, expect, it } from "vitest";
import {
  calculateReturns,
  daysUntil,
  daysBetween,
  parseAmount,
} from "@/lib/returnsCalculator";

describe("calculateReturns", () => {
  const base = {
    fractionPrice: 2,
    faceValue: 10_000,
    yieldPercentage: 12,
    daysRemaining: 73,
  };

  it("buys whole fractions only", () => {
    expect(calculateReturns({ ...base, amount: 101 }).fractionCount).toBe(50);
  });

  it("computes share of total supply", () => {
    const r = calculateReturns({ ...base, amount: 500 });
    expect(r.totalFractions).toBe(5000);
    expect(r.shareOfSupply).toBeCloseTo(5, 6);
  });

  it("computes yield on invested amount over days/365", () => {
    const r = calculateReturns({ ...base, amount: 1000 });
    expect(r.projectedYield).toBeCloseTo(1000 * 0.12 * (73 / 365), 6);
    expect(r.projectedPayout).toBeCloseTo(1000 + r.projectedYield, 6);
  });

  it("returns zeros for empty or invalid input", () => {
    const r = calculateReturns({ ...base, amount: NaN });
    expect(r.fractionCount).toBe(0);
    expect(r.projectedYield).toBe(0);
    expect(r.shareOfSupply).toBe(0);
  });

  // Issue #564 additions
  it("uses issuer dynamic yield when provided and falls back to invoice yield when null", () => {
    // Dynamic yield present (15% instead of baseline 12%)
    const withDynamic = calculateReturns({
      ...base,
      amount: 1000,
      dynamicYieldPercentage: 15,
    });
    expect(withDynamic.effectiveYieldPercentage).toBe(15);
    expect(withDynamic.grossReturn).toBeCloseTo(1000 * 0.15 * (73 / 365), 6);

    // Fallback when dynamic yield is null
    const withFallback = calculateReturns({
      ...base,
      amount: 1000,
      dynamicYieldPercentage: null,
    });
    expect(withFallback.effectiveYieldPercentage).toBe(12);
    expect(withFallback.grossReturn).toBeCloseTo(1000 * 0.12 * (73 / 365), 6);
  });

  it("deducts platform fee and calculates net return and net ROI", () => {
    const r = calculateReturns({
      ...base,
      amount: 1000,
      feeRatePercentage: 2, // 2% fee on yield
    });
    const expectedGross = 1000 * 0.12 * (73 / 365); // 24 XLM
    const expectedFee = (expectedGross * 2) / 100; // 0.48 XLM
    const expectedNet = expectedGross - expectedFee; // 23.52 XLM

    expect(r.grossReturn).toBeCloseTo(expectedGross, 6);
    expect(r.feeAmount).toBeCloseTo(expectedFee, 6);
    expect(r.netReturn).toBeCloseTo(expectedNet, 6);
    expect(r.netRoiPercentage).toBeCloseTo((expectedNet / 1000) * 100, 6);
    expect(r.projectedPayout).toBeCloseTo(1000 + expectedNet, 6);
  });

  it("calculates USD values when xlmUsdRate is provided without inventing values when unavailable", () => {
    // With USD rate:
    const withUsd = calculateReturns({
      ...base,
      amount: 1000,
      xlmUsdRate: 0.15,
    });
    expect(withUsd.investedAmountUsd).toBeCloseTo(150, 4);
    expect(withUsd.grossReturnUsd).toBeDefined();

    // Without USD rate (undefined / null):
    const withoutUsd = calculateReturns({
      ...base,
      amount: 1000,
      xlmUsdRate: null,
    });
    expect(withoutUsd.investedAmountUsd).toBeUndefined();
    expect(withoutUsd.grossReturnUsd).toBeUndefined();
    expect(withoutUsd.netReturnUsd).toBeUndefined();
  });

  it("calculates non-whole fraction remainder accurately", () => {
    const r = calculateReturns({
      ...base,
      fractionPrice: 5,
      amount: 23, // 4 fractions * 5 = 20, remainder = 3
    });
    expect(r.fractionCount).toBe(4);
    expect(r.investedAmount).toBe(20);
    expect(r.remainderAmount).toBe(3);
  });

  it("handles over-cap input gracefully", () => {
    const r = calculateReturns({
      ...base,
      fundingCap: 500, // cap is 500 XLM
      amount: 800, // user typed 800 XLM
    });
    expect(r.isOverCap).toBe(true);
    expect(r.investedAmount).toBe(500);
    expect(r.fractionCount).toBe(250);
  });
});

describe("daysUntil / daysBetween / parseAmount", () => {
  it("rounds up and floors at zero", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(daysUntil("2026-01-11T00:00:00Z", now)).toBe(10);
    expect(daysUntil("2025-12-01T00:00:00Z", now)).toBe(0);
    expect(daysUntil(null, now)).toBe(0);
  });

  it("calculates days between two dates for custom hold period", () => {
    const start = "2026-01-01T00:00:00Z";
    const customEnd = "2026-01-21T00:00:00Z";
    expect(daysBetween(start, customEnd)).toBe(20);
    expect(daysBetween(customEnd, start)).toBe(0); // floored at zero
  });

  it("parses invalid text to 0", () => {
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("-5")).toBe(0);
    expect(parseAmount("12.5")).toBe(12.5);
  });
});
