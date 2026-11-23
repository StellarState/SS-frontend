import {
  calculateProtocolFees,
  compareFeeScenarios,
  TRANSACTION_TYPE_RULES,
  PROTOCOL_FEE_TIERS,
  type ComparisonScenario,
} from "@/lib/fees/feeComparison";

describe("Protocol Fee Calculation Engine (Issue #667)", () => {
  it("calculates base fees correctly for primary purchase", () => {
    // 50 bps = 0.5%
    const res = calculateProtocolFees({
      amount: 10_000,
      role: "investor",
      transactionType: "primary_purchase",
      discountTier: "standard",
    });

    expect(res.rawBaseFee).toBe(50);
    expect(res.clampedBaseFee).toBe(50);
    expect(res.discountAmount).toBe(0);
    expect(res.networkFee).toBe(0.00001);
    expect(res.finalFee).toBeCloseTo(50.00001, 5);
    expect(res.totalCost).toBeCloseTo(10050.00001, 5);
  });

  it("enforces minimum protocol fee cap", () => {
    // 10 XLM * 0.5% = 0.05 XLM. For 1 XLM, 0.005 XLM < 0.05 min fee
    const res = calculateProtocolFees({
      amount: 1,
      role: "investor",
      transactionType: "primary_purchase",
      discountTier: "standard",
    });

    expect(res.isMinFeeApplied).toBe(true);
    expect(res.clampedBaseFee).toBe(TRANSACTION_TYPE_RULES.primary_purchase.minFeeXLM);
    expect(res.finalFee).toBeCloseTo(0.05001, 5);
  });

  it("enforces maximum protocol fee cap", () => {
    // 2,000,000 * 0.5% = 10,000 XLM > 500 XLM max fee
    const res = calculateProtocolFees({
      amount: 2_000_000,
      role: "investor",
      transactionType: "primary_purchase",
      discountTier: "standard",
    });

    expect(res.isMaxFeeApplied).toBe(true);
    expect(res.clampedBaseFee).toBe(TRANSACTION_TYPE_RULES.primary_purchase.maxFeeXLM);
  });

  it("applies loyalty tier discounts correctly to eligible roles", () => {
    // Gold tier gives 40% discount
    const res = calculateProtocolFees({
      amount: 10_000,
      role: "investor",
      transactionType: "primary_purchase",
      discountTier: "gold",
    });

    expect(res.isDiscountEligible).toBe(true);
    expect(res.discountPercentage).toBe(0.4);
    expect(res.discountAmount).toBe(20); // 40% of 50
    expect(res.protocolFee).toBe(30); // 50 - 20
  });

  it("detects and explains ineligible discount tiers for restricted roles", () => {
    // Issuer role is not eligible for Platinum tier
    const res = calculateProtocolFees({
      amount: 10_000,
      role: "issuer",
      transactionType: "primary_purchase",
      discountTier: "platinum",
    });

    expect(res.isDiscountEligible).toBe(false);
    expect(res.discountAmount).toBe(0);
    expect(res.ineligibilityReason).toContain("Platinum Tier discount is not applicable");
    expect(res.protocolFee).toBe(50); // no discount applied
  });

  it("compares multiple scenarios and identifies the cheapest option", () => {
    const scenarios: ComparisonScenario[] = [
      {
        id: "s1",
        label: "Standard Primary",
        amount: 20_000,
        role: "investor",
        transactionType: "primary_purchase",
        discountTier: "standard",
      },
      {
        id: "s2",
        label: "Secondary Trade with Gold Discount",
        amount: 20_000,
        role: "investor",
        transactionType: "secondary_trade", // 35 bps = 70 XLM base
        discountTier: "gold", // 40% off = 42 XLM protocol fee
      },
      {
        id: "s3",
        label: "Invoice Settlement",
        amount: 20_000,
        role: "investor",
        transactionType: "invoice_settlement", // 25 bps = 50 XLM base
        discountTier: "silver", // 25% off = 37.5 XLM protocol fee
      },
    ];

    const report = compareFeeScenarios(scenarios);
    expect(report.scenarios).toHaveLength(3);
    expect(report.cheapestScenarioId).toBe("s3");
    expect(report.maxSavingsAmount).toBeGreaterThan(0);
  });

  it("handles zero amount safely without division by zero", () => {
    const res = calculateProtocolFees({
      amount: 0,
      role: "investor",
      transactionType: "primary_purchase",
      discountTier: "standard",
    });

    expect(res.clampedBaseFee).toBe(0);
    expect(res.finalFee).toBe(0);
    expect(res.effectiveRatePercentage).toBe(0);
    expect(res.totalCost).toBe(0);
  });
});
