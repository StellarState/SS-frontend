"use client";
import { useQuery } from "@tanstack/react-query";

export interface ApiUsageDay {
  date: string;
  requests: number;
  errors: number;
  rateLimitHits: number;
}

export interface ApiUsageResponse {
  days: ApiUsageDay[];
  quotaUsed: number;
  quotaLimit: number;
}

export const apiUsageQueryKey = (keyId: string, from: string, to: string) =>
  ["api-usage", keyId, from, to] as const;

async function fetchApiUsage(
  keyId: string,
  from: string,
  to: string
): Promise<ApiUsageResponse> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`/api/keys/${keyId}/usage?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch API usage");
  return res.json();
}

export function useApiUsage(keyId: string, from: string, to: string) {
  return useQuery({
    queryKey: apiUsageQueryKey(keyId, from, to),
    queryFn: () => fetchApiUsage(keyId, from, to),
    enabled: Boolean(keyId),
    staleTime: 60 * 1000,
  });
}
