"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSellerDashboard } from "@/lib/api";

export const SELLER_DASHBOARD_QUERY_KEY = ["seller-dashboard"] as const;

export function useSellerDashboard() {
  return useQuery({
    queryKey: SELLER_DASHBOARD_QUERY_KEY,
    queryFn: fetchSellerDashboard,
  });
}
