"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSettlementAllocation } from "@/lib/api/settlementAllocation";
import { queryKeys } from "@/lib/queryKeys";

export function useSettlementAllocation(invoiceId: string) {
  return useQuery({
    queryKey: queryKeys.settlementAllocation(invoiceId),
    queryFn: () => fetchSettlementAllocation(invoiceId),
    staleTime: 30_000,
  });
}
