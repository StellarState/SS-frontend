import { describe, it, expect } from "vitest";
import {
  DEFAULT_DIVERSIFICATION_LIMIT_PCT,
  buildConcentration,
  getConcentrationStatus,
  resolveDiversificationLimit,
  validateDiversificationLimit,
} from "@/lib/diversification";
import type { InvestmentPosition } from "@/lib/portfolio";

function position(overrides: Partial<InvestmentPosition>): InvestmentPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Invoice 1",
    committed_amount: 1000,
    status: "active",
    ...overrides,
  };
}

describe("validateDiversificationLimit", () => {
  it("accepts limits inside the 10-100% range", () => {
    expect(validateDiversificationLimit(10)).toBeNull();
    expect(validateDiversificationLimit(30)).toBeNull();
    expect(validateDiversificationLimit(100)).toBeNull();
  });

  it("rejects limits below the minimum", () => {
    expect(validateDiversificationLimit(9)).toContain("between 10% and 100%");
    expect(validateDiversificationLimit(0)).toContain("between 10% and 100%");
    expect(validateDiversificationLimit(-5)).toContain("between 10% and 100%");
  });

  it("rejects limits above the maximum", () => {
    expect(validateDiversificationLimit(101)).toContain("between 10% and 100%");
  });

  it("rejects non-numeric values", () => {
    expect(validateDiversificationLimit(Number.NaN)).toContain("between 10% and 100%");
  });
});

describe("buildConcentration", () => {
  it("splits the portfolio into percentages, largest first", () => {
    const slices = buildConcentration([
      position({ invoice_id: "a", invoice_title: "A", committed_amount: 1000 }),
      position({ invoice_id: "b", invoice_title: "B", committed_amount: 3000 }),
    ]);
    expect(slices[0].invoice_id).toBe("b");
    expect(slices[0].share_percent).toBe(75);
    expect(slices[1].share_percent).toBe(25);
  });

  it("ignores positions that are no longer active", () => {
    const slices = buildConcentration([
      position({ invoice_id: "a", committed_amount: 1000 }),
      position({ invoice_id: "b", committed_amount: 9000, status: "settled" }),
      position({ invoice_id: "c", committed_amount: 9000, status: "defaulted" }),
    ]);
    expect(slices).toHaveLength(1);
    expect(slices[0].share_percent).toBe(100);
  });

  it("returns nothing for an empty portfolio", () => {
    expect(buildConcentration([])).toEqual([]);
  });

  it("returns nothing when the active total is zero", () => {
    expect(
      buildConcentration([position({ committed_amount: 0 })]),
    ).toEqual([]);
  });
});

describe("getConcentrationStatus", () => {
  it("flags positions at or over the limit", () => {
    expect(getConcentrationStatus(30, 30)).toBe("breached");
    expect(getConcentrationStatus(45, 30)).toBe("breached");
  });

  it("flags positions within 20% of the limit as near", () => {
    expect(getConcentrationStatus(24, 30)).toBe("near");
    expect(getConcentrationStatus(29, 30)).toBe("near");
  });

  it("leaves comfortable positions alone", () => {
    expect(getConcentrationStatus(10, 30)).toBe("ok");
    expect(getConcentrationStatus(0, 30)).toBe("ok");
  });
});

describe("resolveDiversificationLimit", () => {
  it("falls back to the default limit when none is configured", () => {
    expect(resolveDiversificationLimit(null)).toBe(DEFAULT_DIVERSIFICATION_LIMIT_PCT);
    expect(resolveDiversificationLimit(undefined)).toBe(DEFAULT_DIVERSIFICATION_LIMIT_PCT);
  });

  it("keeps a configured limit", () => {
    expect(resolveDiversificationLimit(45)).toBe(45);
  });
});
