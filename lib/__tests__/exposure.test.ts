import { describe, expect, it } from "vitest";
import {
  exceedsHeadroom,
  headroomFor,
  isAtCap,
  isNearCap,
  maxAllowed,
  usedRatio,
} from "../exposure";

describe("debtor exposure", () => {
  it("computes outstanding against the cap", () => {
    const headroom = headroomFor(80, 100);
    expect(headroom).toEqual({ outstanding: 80, cap: 100, headroom: 20 });
    expect(usedRatio(headroom!)).toBe(0.8);
  });

  it("flags near-cap, at-cap and missing cap data", () => {
    expect(isNearCap(headroomFor(80, 100)!)).toBe(true);
    expect(isAtCap(headroomFor(100, 100)!)).toBe(true);
    expect(isNearCap(headroomFor(20, 100)!)).toBe(false);
    expect(headroomFor(50, 0)).toBeNull();
  });

  it("blocks amounts above headroom and shows the maximum", () => {
    const headroom = headroomFor(80, 100)!;
    expect(exceedsHeadroom(headroom, 25)).toBe(true);
    expect(exceedsHeadroom(headroom, 20)).toBe(false);
    expect(maxAllowed(headroom, 50)).toBe(20);
  });
});
