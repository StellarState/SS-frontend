"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchInvoiceCover,
  fetchUnderwritingPositions,
  releaseInvoiceCover,
  stakeInvoiceCover,
} from "@/lib/api";

export const invoiceCoverQueryKey = (invoiceId: string, wallet?: string | null) =>
  ["invoice", invoiceId, "cover", wallet ?? null] as const;

export const underwritingPositionsQueryKey = (wallet: string | null | undefined) =>
  ["underwriting-positions", wallet ?? null] as const;

/**
 * Staked cover and remaining capacity for an invoice, read from the contract
 * service (#587). Passing the connected wallet also returns its own stake so
 * the panel can offer Release.
 */
export function useInvoiceCover(invoiceId: string, wallet?: string | null) {
  return useQuery({
    queryKey: invoiceCoverQueryKey(invoiceId, wallet),
    queryFn: () => fetchInvoiceCover(invoiceId, wallet),
    enabled: Boolean(invoiceId),
    staleTime: 15_000,
  });
}

export function useUnderwritingPositions(wallet: string | null | undefined) {
  return useQuery({
    queryKey: underwritingPositionsQueryKey(wallet),
    queryFn: () => fetchUnderwritingPositions(wallet!),
    enabled: Boolean(wallet),
  });
}

function useInvalidateCover(invoiceId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId, "cover"] });
    queryClient.invalidateQueries({ queryKey: ["underwriting-positions"] });
  };
}

export function useStakeCoverMutation(invoiceId: string) {
  const invalidate = useInvalidateCover(invoiceId);
  return useMutation({
    mutationFn: ({ wallet, amount }: { wallet: string; amount: number }) =>
      stakeInvoiceCover(invoiceId, wallet, amount),
    onSuccess: () => {
      toast.success("Cover staked");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Could not stake cover"),
  });
}

export function useReleaseStakeMutation(invoiceId: string) {
  const invalidate = useInvalidateCover(invoiceId);
  return useMutation({
    mutationFn: ({ wallet }: { wallet: string }) => releaseInvoiceCover(invoiceId, wallet),
    onSuccess: () => {
      toast.success("Stake released");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Could not release stake"),
  });
}
