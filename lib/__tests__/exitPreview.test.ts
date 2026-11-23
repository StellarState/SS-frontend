import { describe, expect, it } from "vitest";
import { normalizeExitPreview } from "@/lib/api";
import { isHighExitFee } from "@/lib/exitFee";

describe("normalizeExitPreview (#593)", () => {
  it("net refund plus fee equals the commitment", () => {
    for (const [commitment, bps] of [
      [1000, 150],
      [333.3333333, 275],
      [0.0000001, 500],
      [123456.789, 33],
    ] as const) {
      const p = normalizeExitPreview({ commitment, fee_bps: bps }, "inv");
      expect(p.net_refund + p.fee_amount).toBeCloseTo(commitment, 7);
    }
  });

  it("derives the refund even when the server sends an inconsistent one", () => {
    const p = normalizeExitPreview({ commitment: 1000, fee_percent: 1.5, fee_amount: 15, net_refund: 990 }, "inv");
    expect(p.fee_amount).toBe(15);
    expect(p.net_refund).toBe(985);
  });

  it("clamps the fee to the commitment", () => {
    const p = normalizeExitPreview({ commitment: 100, fee_amount: 500 }, "inv");
    expect(p.fee_amount).toBe(100);
    expect(p.net_refund).toBe(0);
  });

  it("zeroes the fee when waived", () => {
    const p = normalizeExitPreview({ commitment: 1000, fee_bps: 300, fee_waived: true, next_fee_bps: 400 }, "inv");
    expect(p.fee_percent).toBe(0);
    expect(p.fee_amount).toBe(0);
    expect(p.net_refund).toBe(1000);
    expect(p.trend).toBe("flat");
  });

  it("derives the fee trend from the next scheduled fee", () => {
    expect(normalizeExitPreview({ commitment: 1, fee_bps: 100, next_fee_bps: 200 }, "i").trend).toBe("rising");
    expect(normalizeExitPreview({ commitment: 1, fee_bps: 200, next_fee_bps: 100 }, "i").trend).toBe("falling");
    expect(normalizeExitPreview({ commitment: 1, fee_bps: 200 }, "i").trend).toBe("flat");
  });

  it("flags fees strictly above 2% as high", () => {
    expect(isHighExitFee(2, false)).toBe(false);
    expect(isHighExitFee(2.01, false)).toBe(true);
    expect(isHighExitFee(5, true)).toBe(false);
  });
});
