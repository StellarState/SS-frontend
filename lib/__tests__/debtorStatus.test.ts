import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDebtorStatus } from "@/lib/api/debtorStatus";
import { isBlocked, isWatch, recentHistory } from "@/lib/debtorStatus";

function respond(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("debtor status (#606)", () => {
  it("normalizes every known status", async () => {
    for (const [raw, expected] of [
      ["trusted", "Trusted"],
      ["neutral", "Neutral"],
      ["watch", "Watch"],
      ["blocked", "Blocked"],
    ] as const) {
      const fetchMock = vi.fn().mockResolvedValue(respond(200, { status: raw }));
      vi.stubGlobal("fetch", fetchMock);
      const result = await fetchDebtorStatus("GDEBTOR");
      expect(result.status).toBe(expected);
    }
  });

  it("returns Neutral for unknown, empty and failing lookups", async () => {
    expect(await fetchDebtorStatus("")).toEqual({ status: "Neutral", history: [] });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond(404, {})));
    expect((await fetchDebtorStatus("GDEBTOR")).status).toBe("Neutral");

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await fetchDebtorStatus("GDEBTOR")).status).toBe("Neutral");
  });

  it("keeps at most ten most recent changes, newest first", () => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      from: "Neutral" as const,
      to: "Watch" as const,
      changedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
    }));

    const recent = recentHistory({ status: "Watch", history });
    expect(recent).toHaveLength(10);
    expect(recent[0].changedAt).toContain("2026-01-12");
    expect(recent[9].changedAt).toContain("2026-01-03");
  });

  it("classifies watch and blocked debtors", () => {
    expect(isWatch("Watch")).toBe(true);
    expect(isBlocked("Blocked")).toBe(true);
    expect(isBlocked("Neutral")).toBe(false);
  });
});
