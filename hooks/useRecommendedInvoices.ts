"use client";
import { useQuery } from "@tanstack/react-query";
import type { Invoice } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const RECOMMENDED_INVOICES_QUERY_KEY = ["recommended-invoices"] as const;

interface RecommendedInvoicesResponse {
  invoices: Invoice[];
}

async function fetchRecommendedInvoices(limit: number): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/invoices/recommended?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch recommended invoices");
  const data: RecommendedInvoicesResponse = await res.json();
  return data.invoices ?? [];
}

async function fetchTrendingFallback(limit: number): Promise<Invoice[]> {
  const res = await fetch(`${API_BASE}/invoices?status=open&limit=50`);
  if (!res.ok) return [];
  const data = await res.json();
  const invoices: Invoice[] = data.invoices ?? [];
  return invoices
    .filter((inv) => inv.status === "open" && inv.amount > 0)
    .map((inv) => ({
      ...inv,
      _reason: "Trending" as const,
    }))
    .sort((a, b) => {
      const pctA = a.amount > 0 ? a.raised / a.amount : 0;
      const pctB = b.amount > 0 ? b.raised / b.amount : 0;
      return pctB - pctA;
    })
    .slice(0, limit);
}

export function useRecommendedInvoices(limit = 6) {
  return useQuery<Invoice[]>({
    queryKey: [...RECOMMENDED_INVOICES_QUERY_KEY, limit],
    queryFn: async () => {
      try {
        const invoices = await fetchRecommendedInvoices(limit);
        if (invoices.length > 0) return invoices;
        return fetchTrendingFallback(limit);
      } catch {
        return fetchTrendingFallback(limit);
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
