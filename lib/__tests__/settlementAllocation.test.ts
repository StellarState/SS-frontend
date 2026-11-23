import { describe, expect, it } from "vitest";
import {
  allocationBalances,
  allocationSummary,
  hasShortfall,
  paidTotal,
  zeroPaymentExplanation,
} from "../settlementAllocation";
import type { PayoutClass } from "../api/settlementAllocation";

function entry(overrides: Partial<PayoutClass>): PayoutClass {
  return {
    id: "senior",
    label: "Senior",
    priority: 1,
    owed: 100,
    paid: 100,
    shortfall: 0,
    isUserClass: false,
    userPayout: 0,
    ...overrides,
  };
}

describe("settlement allocation", () => {
  it("sums paid amounts and checks them against the received total", () => {
    const classes = [entry({}), entry({ id: "junior", priority: 2, owed: 50, paid: 50 })];
    expect(paidTotal(classes)).toBe(150);
    expect(allocationBalances({ status: "settled", amountReceived: 150, classes })).toBe(true);
    expect(allocationBalances({ status: "settled", amountReceived: 140, classes })).toBe(false);
  });

  it("describes full payment and shortfall", () => {
    const full = { status: "settled" as const, amountReceived: 150, classes: [entry({})] };
    expect(allocationSummary(full)).toContain("paid in full");
    const short = {
      status: "settled" as const,
      amountReceived: 100,
      classes: [
        entry({}),
        entry({ id: "junior", priority: 2, owed: 50, paid: 0, shortfall: 50 }),
      ],
    };
    expect(hasShortfall(short.classes)).toBe(true);
    expect(allocationSummary(short)).toContain("Lower-priority classes received nothing");
    expect(zeroPaymentExplanation(short.classes[1])).toContain("earlier classes");
  });

  it("shows a pending state before settlement", () => {
    expect(
      allocationSummary({ status: "pending", amountReceived: 0, classes: [] })
    ).toContain("pending");
  });
});
