import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useWalletBalances } from "../useWalletBalances";
import { fetchWalletBalances } from "@/lib/stellar/balances";

vi.mock("@/lib/stellar/balances", () => ({ fetchWalletBalances: vi.fn() }));
vi.mock("../useActiveNetwork", () => ({ useActiveNetwork: () => ({ network: "testnet" }) }));

const balances = { xlm: 5, asset: 100, hasTrustline: true, reserveXlm: 1 };

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useWalletBalances", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not fetch without a connected address", () => {
    renderHook(() => useWalletBalances(null), { wrapper });
    expect(fetchWalletBalances).not.toHaveBeenCalled();
  });

  it("reads XLM, asset and trustline state for a connected wallet", async () => {
    vi.mocked(fetchWalletBalances).mockResolvedValue(balances);
    const { result } = renderHook(() => useWalletBalances("GADDRESS"), { wrapper });
    await waitFor(() => expect(result.current.balances).toEqual(balances));
    expect(fetchWalletBalances).toHaveBeenCalledWith("GADDRESS", "testnet");
  });

  it("exposes a manual refresh after a trustline submission", async () => {
    vi.mocked(fetchWalletBalances)
      .mockResolvedValueOnce({ ...balances, hasTrustline: false })
      .mockResolvedValueOnce(balances);
    const { result } = renderHook(() => useWalletBalances("GADDRESS"), { wrapper });
    await waitFor(() => expect(result.current.balances?.hasTrustline).toBe(false));

    await result.current.refresh();
    await waitFor(() => expect(result.current.balances?.hasTrustline).toBe(true));
    expect(fetchWalletBalances).toHaveBeenCalledTimes(2);
  });
});
