"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDebtorStatus } from "@/lib/api/debtorStatus";
import { somaQueryKeys } from "@/lib/somaQueryKeys";

export function useDebtorStatus(debtorHash?: string | null) {
  return useQuery({
    queryKey: somaQueryKeys.debtorStatus(debtorHash ?? "unknown"),
    queryFn: () => fetchDebtorStatus(debtorHash as string),
    enabled: Boolean(debtorHash),
    staleTime: 30_000,
  });
}
