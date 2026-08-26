"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSellerDashboard } from "@/lib/api";

export const SELLER_DASHBOARD_QUERY_KEY = ["seller-dashboard"] as const;

export function useSellerDashboard() {
  return useQuery({
    queryKey: SELLER_DASHBOARD_QUERY_KEY,
    queryFn: fetchSellerDashboard,
    staleTime: 60 * 1000, // 60 seconds - serve cached data without skeleton on repeat visits
    gcTime: 5 * 60 * 1000, // 5 minutes - keep data in memory for garbage collection
  });
}
