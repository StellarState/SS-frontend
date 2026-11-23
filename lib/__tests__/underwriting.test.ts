import { describe, expect, it } from "vitest";
import { canReleaseStake, coverPercent, projectedPremium, stakeAmountError } from "@/lib/underwriting";
import { normalizeInvoiceCover } from "@/lib/api";

describe("underwriting helpers (#587)", () => {
  it("projects the premium from amount and rate", () => {
    expect(projectedPremium(1000, 5)).toBe(50);
    expect(projectedPremium(250, 4.5)).toBe(11.25);
    expect(projectedPremium(0, 5)).toBe(0);
    expect(projectedPremium(NaN, 5)).toBe(0);
  });

  it("computes cover percentage clamped to the cap", () => {
    expect(coverPercent(2500, 10000)).toBe(25);
    expect(coverPercent(12000, 10000)).toBe(100);
    expect(coverPercent(100, 0)).toBe(0);
  });

  it("blocks stakes above the remaining capacity", () => {
    expect(stakeAmountError("", 500)).toBeNull();
    expect(stakeAmountError("500", 500)).toBeNull();
    expect(stakeAmountError("501", 500)).toMatch(/exceeds the remaining capacity/);
    expect(stakeAmountError("-1", 500)).toMatch(/greater than 0/);
    expect(stakeAmountError("10", 0)).toMatch(/fully covered/);
  });

  it("allows release only after settlement", () => {
    expect(canReleaseStake("funded", 100, false)).toBe(false);
    expect(canReleaseStake("settled", 100, false)).toBe(true);
    expect(canReleaseStake("settled", 0, false)).toBe(false);
    expect(canReleaseStake("settled", 100, true)).toBe(false);
  });

  it("derives remaining capacity when the service omits it", () => {
    const cover = normalizeInvoiceCover({ staked: 300, max_cover: 1000, premium_rate: 4 }, "inv-1");
    expect(cover.remaining_capacity).toBe(700);
    expect(cover.user_stake).toBe(0);
  });
});
