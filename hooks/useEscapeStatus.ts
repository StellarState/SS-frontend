"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchEscapePositions,
  fetchEscapeStatus,
  submitEscapeWithdraw,
  type EscapePosition,
} from "@/lib/api";
import { escapeErrorMessage, msUntil } from "@/lib/escape";

export const ESCAPE_STATUS_QUERY_KEY = ["protocol-escape-status"] as const;
export const escapePositionsQueryKey = (wallet: string | null | undefined) =>
  ["protocol-escape-positions", wallet ?? null] as const;

/**
 * Pause start and escape availability (#592). Polled so the banner flips to
 * "open" without a reload once the countdown ends.
 */
export function useEscapeStatus() {
  const query = useQuery({
    queryKey: ESCAPE_STATUS_QUERY_KEY,
    queryFn: fetchEscapeStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    // Mounted app-wide in the navbar and banner: one retry is enough, the
    // next poll will try again anyway.
    retry: 1,
  });
  const data = query.data;
  return {
    ...query,
    isPaused: Boolean(data?.paused),
    escapeEnabled: Boolean(data?.escape_enabled),
    pausedAt: data?.paused_at ?? null,
    escapeAvailableAt: data?.escape_available_at ?? null,
  };
}

/** Milliseconds left until `iso`, ticking every second. */
export function useLiveCountdown(iso: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return msUntil(iso, now);
}

export function useEscapePositions(wallet: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: escapePositionsQueryKey(wallet),
    queryFn: () => fetchEscapePositions(wallet!),
    enabled: Boolean(wallet) && enabled,
  });
}

export function useEscapeWithdrawMutation(wallet: string | null | undefined) {
  const queryClient = useQueryClient();
  const key = escapePositionsQueryKey(wallet);
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!wallet) throw new Error("Connect your wallet first");
      try {
        return await submitEscapeWithdraw(invoiceId, wallet);
      } catch (error) {
        throw new Error(escapeErrorMessage(error));
      }
    },
    onSuccess: (result, invoiceId) => {
      // Mark the row withdrawn straight away so it cannot be submitted twice
      // while the refetch is in flight.
      queryClient.setQueryData<EscapePosition[]>(key, (prev = []) =>
        prev.map((p) =>
          p.invoice_id === invoiceId
            ? { ...p, withdrawn: true, withdrawn_at: new Date().toISOString(), tx_hash: result?.tx_hash ?? null }
            : p,
        ),
      );
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
