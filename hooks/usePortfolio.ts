"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio } from "@/lib/api";

export const PORTFOLIO_QUERY_KEY = ["portfolio"] as const;

export function usePortfolio() {
  return useQuery({
    queryKey: PORTFOLIO_QUERY_KEY,
    queryFn: fetchPortfolio,
  });
}
