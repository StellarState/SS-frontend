"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInvoiceFundingDepth } from "@/lib/api";

export const FUNDING_DEPTH_POLL_INTERVAL_MS = 30_000;

export function useInvoiceFundingDepth(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: ["invoice-funding-depth", invoiceId],
    queryFn: ({ signal }) => fetchInvoiceFundingDepth(invoiceId as string, signal),
    enabled: Boolean(invoiceId),
    refetchInterval: FUNDING_DEPTH_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });
}
