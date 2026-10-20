import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { fetchInvoiceYieldBoost } from "@/lib/api";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchInvoiceYieldBoost", () => {
  it("requests the invoice boost endpoint and normalises the payload", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        eligible: true,
        tier: "gold",
        base_yield: 8.5,
        boosted_yield: 9.25,
      }),
    );

    const result = await fetchInvoiceYieldBoost("inv-1", "GINV");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/invoices/inv-1/boost/GINV");
    expect(result).toEqual({
      eligible: true,
      tier: "gold",
      base_yield: 8.5,
      boosted_yield: 9.25,
    });
  });

  it("treats a missing boost record as ineligible", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 404));

    const result = await fetchInvoiceYieldBoost("inv-1", "GINV");

    expect(result.eligible).toBe(false);
    expect(result.tier).toBe("bronze");
  });

  it("falls back to bronze for an unknown tier", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ eligible: true, tier: "diamond", base_yield: 8, boosted_yield: 9 }),
    );

    const result = await fetchInvoiceYieldBoost("inv-1", "GINV");

    expect(result.tier).toBe("bronze");
  });

  it("throws when the request fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

    await expect(fetchInvoiceYieldBoost("inv-1", "GINV")).rejects.toThrow(
      "Failed to fetch yield boost",
    );
  });
});
