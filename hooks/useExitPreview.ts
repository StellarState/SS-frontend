"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchExitPreview, withdrawCommitment } from "@/lib/api";
import { EXIT_PREVIEW_REFETCH_MS } from "@/lib/exitFee";

export const exitPreviewQueryKey = (invoiceId: string, wallet: string | null | undefined) =>
  ["invoice", invoiceId, "exit-preview", wallet ?? null] as const;

/**
 * Contract preview of the early-exit fee and refund (#593). Refetched every
 * 15 seconds while enabled (i.e. while the withdraw modal is open), because
 * the fee schedule changes over time.
 */
export function useExitPreview(
  invoiceId: string,
  wallet: string | null | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: exitPreviewQueryKey(invoiceId, wallet),
    queryFn: () => fetchExitPreview(invoiceId, wallet!),
    enabled: enabled && Boolean(invoiceId) && Boolean(wallet),
    refetchInterval: enabled ? EXIT_PREVIEW_REFETCH_MS : false,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

export function useWithdrawCommitmentMutation(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wallet }: { wallet: string }) => withdrawCommitment(invoiceId, wallet),
    onSuccess: () => {
      toast.success("Commitment withdrawn");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
