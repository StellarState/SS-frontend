"use client";

import { useQuery } from "@tanstack/react-query";

interface FundingPaceData {
  cumulativeFunding: Array<{ time: number; amount: number }>;
  targetAmount: number;
  deadline: number;
  recentRate: number; // amount per day
  projectedCompletionDate: number;
  status: "on-track" | "at-risk" | "unlikely";
  hasEnoughData: boolean;
}

export const FUNDING_PACE_POLL_INTERVAL_MS = 30_000;

async function calculateFundingPace(invoiceId: string): Promise<FundingPaceData> {
  const res = await fetch(`/api/invoices/${invoiceId}/funding-pace`);
  if (!res.ok) throw new Error("Failed to fetch funding pace");
  return res.json();
}

export function useFundingPace(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: ["funding-pace", invoiceId],
    queryFn: () => calculateFundingPace(invoiceId as string),
    enabled: Boolean(invoiceId),
    refetchInterval: FUNDING_PACE_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });
}
