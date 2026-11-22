"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio } from "@/lib/api";
import { useSandboxMode } from "@/hooks/useSandboxMode";

export const PORTFOLIO_QUERY_KEY = ["portfolio"] as const;

export function usePortfolio() {
  const { isSandbox } = useSandboxMode();
  // Prefix query key with "sandbox" in practice mode so caches stay separate.
  const queryKey = isSandbox
    ? (["sandbox", "portfolio"] as const)
    : PORTFOLIO_QUERY_KEY;
  return useQuery({
    queryKey,
    queryFn: fetchPortfolio,
    staleTime: 60 * 1000, // 60 seconds - serve cached data instantly
    gcTime: 5 * 60 * 1000, // 5 minutes - keep data in memory for garbage collection
  });
}
