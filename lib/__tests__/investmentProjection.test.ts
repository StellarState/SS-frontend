import { describe, expect, it } from "vitest";
import { calculateInvestmentProjection } from "@/lib/investmentProjection";

describe("calculateInvestmentProjection", () => {
  const base = {
    fractionCount: 100,
    fractionPrice: 2,
    annualYieldPercent: 12,
    holdDays: 73,
    investmentFeePercent: 1,
  };

  it("deducts the current investment fee from pro-rated gross profit", () => {
    const result = calculateInvestmentProjection(base);
    expect(result.principal).toBe(200);
    expect(result.grossProfit).toBeCloseTo(4.8);
    expect(result.investmentFee).toBe(2);
    expect(result.totalOutlay).toBe(202);
    expect(result.netProfit).toBeCloseTo(2.8);
    expect(result.netReturnPercent).toBeCloseTo(2.8 / 202 * 100);
  });

  it("reduces yield for an earlier hold date without reducing the upfront fee", () => {
    const result = calculateInvestmentProjection({ ...base, holdDays: 36 });
    expect(result.grossProfit).toBeCloseTo(200 * 0.12 * 36 / 365);
    expect(result.investmentFee).toBe(2);
  });

  it("does not fabricate returns for empty or invalid fractions", () => {
    expect(calculateInvestmentProjection({ ...base, fractionCount: 0 }).netProfit).toBe(0);
    expect(calculateInvestmentProjection({ ...base, fractionCount: 1.5 }).principal).toBe(0);
  });
});
