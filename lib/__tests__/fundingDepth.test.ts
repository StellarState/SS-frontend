import { describe, expect, it } from "vitest";
import { normalizeFundingDepth } from "@/lib/fundingDepth";

describe("normalizeFundingDepth", () => {
  it("sorts levels and clamps bad estimates while preserving committed totals", () => {
    expect(normalizeFundingDepth({
      updatedAt: "2026-11-22T12:00:00Z", live: true,
      levels: [
        { committed: 80, estimatedHours: -4 },
        { committed: 20.125, estimatedHours: null },
        { committed: -1, estimatedHours: 1 },
        { committed: 40, estimatedHours: 2 },
      ],
    })).toEqual([
      { committed: 20.13, estimatedHours: null },
      { committed: 40, estimatedHours: 2 },
      { committed: 80, estimatedHours: 0 },
    ]);
  });
});
