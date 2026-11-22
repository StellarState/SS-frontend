"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAttestations } from "@/lib/api/attestations";
import { somaQueryKeys } from "@/lib/somaQueryKeys";

export function useAttestations(invoiceId: string) {
  return useQuery({
    queryKey: somaQueryKeys.attestations(invoiceId),
    queryFn: () => fetchAttestations(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 30_000,
  });
}
