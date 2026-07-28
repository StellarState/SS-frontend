"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvoices, type InvoicesResponse } from "@/lib/api";

export function useInvoices() {
  return useInfiniteQuery<InvoicesResponse>({
    queryKey: ["invoices"],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
  });
}
