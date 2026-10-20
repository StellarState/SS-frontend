import { describe, it, expect } from "vitest";
import {
  YIELD_BOOST_TIER_LABELS,
  formatYieldRate,
  getBoostAmount,
  isBoostEligible,
  isBoostedTier,
} from "@/lib/yieldBoost";
import type { InvoiceYieldBoost } from "@/lib/api";

function boost(overrides: Partial<InvoiceYieldBoost> = {}): InvoiceYieldBoost {
  return {
    eligible: true,
    tier: "silver",
    base_yield: 8,
    boosted_yield: 8.5,
    ...overrides,
  };
}

describe("isBoostedTier", () => {
  it("treats silver, gold and platinum as boosted tiers", () => {
    expect(isBoostedTier("silver")).toBe(true);
    expect(isBoostedTier("gold")).toBe(true);
    expect(isBoostedTier("platinum")).toBe(true);
  });

  it("does not boost bronze", () => {
    expect(isBoostedTier("bronze")).toBe(false);
  });
});

describe("isBoostEligible", () => {
  it("accepts an eligible wallet on a boosted tier", () => {
    expect(isBoostEligible(boost())).toBe(true);
    expect(isBoostEligible(boost({ tier: "gold" }))).toBe(true);
    expect(isBoostEligible(boost({ tier: "platinum" }))).toBe(true);
  });

  it("rejects bronze wallets", () => {
    expect(isBoostEligible(boost({ tier: "bronze" }))).toBe(false);
  });

  it("rejects wallets the API marks ineligible", () => {
    expect(isBoostEligible(boost({ eligible: false }))).toBe(false);
  });

  it("rejects a missing boost record", () => {
    expect(isBoostEligible(null)).toBe(false);
    expect(isBoostEligible(undefined)).toBe(false);
  });
});

describe("getBoostAmount", () => {
  it("returns the difference between the boosted and base yield", () => {
    expect(getBoostAmount(boost({ base_yield: 8, boosted_yield: 8.5 }))).toBe(0.5);
  });

  it("never returns a negative amount", () => {
    expect(getBoostAmount(boost({ base_yield: 9, boosted_yield: 8 }))).toBe(0);
  });
});

describe("formatYieldRate", () => {
  it("formats a rate to two decimals", () => {
    expect(formatYieldRate(8)).toBe("8%");
    expect(formatYieldRate(8.256)).toBe("8.26%");
  });
});

describe("yield boost tier labels", () => {
  it("labels every tier", () => {
    expect(YIELD_BOOST_TIER_LABELS.bronze).toBe("Bronze");
    expect(YIELD_BOOST_TIER_LABELS.silver).toBe("Silver");
    expect(YIELD_BOOST_TIER_LABELS.gold).toBe("Gold");
    expect(YIELD_BOOST_TIER_LABELS.platinum).toBe("Platinum");
  });
});
