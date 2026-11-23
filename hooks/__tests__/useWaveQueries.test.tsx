import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useActiveCampaigns } from "../useActiveCampaigns";
import { useWithholding } from "../useWithholding";
import { useDebtorHeadroom } from "../useDebtorHeadroom";
import { useSettlementAllocation } from "../useSettlementAllocation";
import { useInvestorPayouts } from "../useInvestorPayouts";

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Wave feature hooks", () => {
  it("uses the shared campaign query key and endpoint", async () => {
    fetchMock.mockResolvedValueOnce(respond({ campaigns: [] }));
    const { client, wrapper } = createWrapper();
    const { result } = renderHook(() => useActiveCampaigns(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toContain("/campaigns/active");
    expect(client.getQueryCache().findAll().some((q) => q.queryKey[0] === "campaigns")).toBe(true);
  });

  it("reads withholding, headroom, allocation and payouts from their contracts", async () => {
    fetchMock
      .mockResolvedValueOnce(respond({ rate_percentage: 10, recipient_label: "Treasury" }))
      .mockResolvedValueOnce(respond({ cap: 100, outstanding: 80 }))
      .mockResolvedValueOnce(respond({ status: "settled", amount_received: 100, classes: [] }))
      .mockResolvedValueOnce(respond({ payouts: [], has_more: false, next_cursor: null }));

    const { client, wrapper } = createWrapper();
    const withholding = renderHook(() => useWithholding(), { wrapper });
    const headroom = renderHook(() => useDebtorHeadroom("debtor-1"), { wrapper });
    const allocation = renderHook(() => useSettlementAllocation("inv-1"), { wrapper });
    const payouts = renderHook(() => useInvestorPayouts(), { wrapper });

    await waitFor(() => expect(withholding.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(headroom.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(allocation.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(payouts.result.current.isSuccess).toBe(true));

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("/investor/withholding"))).toBe(true);
    expect(urls.some((url) => url.includes("/debtors/debtor-1/headroom"))).toBe(true);
    expect(urls.some((url) => url.includes("/invoices/inv-1/allocation"))).toBe(true);
    expect(urls.some((url) => url.includes("/investor/payouts"))).toBe(true);

    const keys = client.getQueryCache().findAll().map((query) => query.queryKey[0]);
    expect(keys).toContain("withholding");
    expect(keys).toContain("debtor-headroom");
    expect(keys).toContain("settlement-allocation");
    expect(keys).toContain("investor-payouts");
  });
});
