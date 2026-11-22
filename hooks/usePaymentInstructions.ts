"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPaymentInstructions } from "@/lib/api/paymentInstructions";
import { somaQueryKeys } from "@/lib/somaQueryKeys";

export function usePaymentInstructions(token: string) {
  return useQuery({
    queryKey: somaQueryKeys.paymentInstructions(token),
    queryFn: () => fetchPaymentInstructions(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}
