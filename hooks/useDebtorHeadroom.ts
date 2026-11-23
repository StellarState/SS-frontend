"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDebtorHeadroom } from "@/lib/api/exposure";
import { queryKeys } from "@/lib/queryKeys";

/** Missing cap data resolves to null, which hides the exposure meter. */
export function useDebtorHeadroom(debtorId?: string | null) {
  return useQuery({
    queryKey: queryKeys.debtorHeadroom(debtorId ?? "none"),
    queryFn: () => fetchDebtorHeadroom(debtorId as string),
    enabled: Boolean(debtorId),
    staleTime: 30_000,
  });
}
