"use client";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface VelocityLimitData {
  limit: number | null;
  committed: number;
  windowEndTimes: string[];
  overrideLimit?: number;
}

export const VELOCITY_LIMIT_QUERY_KEY = ["investor-velocity"] as const;

export function useVelocityLimit() {
  return useQuery<VelocityLimitData>({
    queryKey: VELOCITY_LIMIT_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/investor/velocity`);
      if (!res.ok) throw new Error("Failed to fetch velocity limit");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
