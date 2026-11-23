import { describe, expect, it } from "vitest";
import {
  computeWithholding,
  formatStellarAmount,
  withholdingForPayout,
} from "../withholding";

describe("withholding", () => {
  it("keeps principal intact and derives net from yield minus withholding", () => {
    const result = computeWithholding(1000, 100, 10);
    expect(result).toEqual({
      principal: 1000,
      grossYield: 100,
      ratePercentage: 10,
      withheld: 10,
      net: 1090,
    });
  });

  it("hides the section for zero and invalid rates", () => {
    const payout = { amountInvested: 100, amountReceived: 108, yield: 8 };
    expect(withholdingForPayout(payout, { ratePercentage: 0 })).toBeNull();
    expect(withholdingForPayout(payout, null)).toBeNull();
  });

  it("handles partial rates from a reported withholding amount", () => {
    const result = withholdingForPayout(
      { amountInvested: 100, amountReceived: 107.5, withholding: { withheld: 2.5 } },
      { ratePercentage: 10 }
    );
    expect(result).toMatchObject({ grossYield: 10, withheld: 1, net: 109 });
  });

  it("handles the maximum rate", () => {
    const result = computeWithholding(100, 20, 100);
    expect(result).toMatchObject({ withheld: 20, net: 100 });
  });

  it("formats every amount to seven decimals", () => {
    expect(formatStellarAmount(1.5)).toBe("1.5000000");
    expect(formatStellarAmount(0.00000009)).toBe("0.0000001");
  });
});
