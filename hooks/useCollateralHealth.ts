"use client";
/**
 * Collateral health query for issuer invoice positions (#644).
 *
 * Fetches `/api/invoices/{id}/collateral` returning ratio and band.
 */
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const COLLATERAL_QUERY_KEY = (invoiceId: string) =>
  ["collateral-health", invoiceId] as const;

export interface CollateralHealth {
  required: number;
  posted: number;
  ratio: number;
  band: "safe" | "warning" | "critical";
}

async function fetchCollateralHealth(invoiceId: string): Promise<CollateralHealth> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/collateral`);
  if (!res.ok) throw new Error("Failed to fetch collateral health");
  return res.json();
}

export function useCollateralHealth(invoiceId: string) {
  return useQuery<CollateralHealth>({
    queryKey: COLLATERAL_QUERY_KEY(invoiceId),
    queryFn: () => fetchCollateralHealth(invoiceId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(invoiceId),
  });
}
