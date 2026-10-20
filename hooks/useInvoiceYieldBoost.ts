"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInvoiceYieldBoost } from "@/lib/api";

export const INVOICE_YIELD_BOOST_QUERY_KEY = ["invoice", "yield-boost"] as const;

export function useInvoiceYieldBoost(
  invoiceId: string | null | undefined,
  wallet: string | null,
) {
  return useQuery({
    queryKey: [...INVOICE_YIELD_BOOST_QUERY_KEY, invoiceId, wallet],
    queryFn: () => fetchInvoiceYieldBoost(invoiceId as string, wallet as string),
    enabled: Boolean(invoiceId && wallet),
  });
}
