"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWalletBalances, type WalletBalances } from "@/lib/stellar/balances";
import { useActiveNetwork } from "./useActiveNetwork";

const BALANCE_REFETCH_MS = 60_000;

/** Reads XLM, asset balance and trustline state for the funding guide (#648). */
export function useWalletBalances(address?: string | null) {
  const { network } = useActiveNetwork();
  const query = useQuery<WalletBalances>({
    queryKey: ["wallet-balances", address, network],
    queryFn: () => fetchWalletBalances(address as string, network),
    enabled: Boolean(address),
    refetchInterval: BALANCE_REFETCH_MS,
    staleTime: 30_000,
  });

  return {
    balances: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
