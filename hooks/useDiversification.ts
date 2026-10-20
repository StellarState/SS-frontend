"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchDiversificationLimit, setDiversificationLimit } from "@/lib/api";

export const DIVERSIFICATION_LIMIT_QUERY_KEY = ["investor", "diversification-limit"] as const;

export function useDiversificationLimit(wallet: string | null) {
  return useQuery({
    queryKey: [...DIVERSIFICATION_LIMIT_QUERY_KEY, wallet],
    queryFn: () => fetchDiversificationLimit(wallet as string),
    enabled: Boolean(wallet),
  });
}

export interface SetDiversificationLimitInput {
  wallet: string;
  limitPct: number;
}

export function useSetDiversificationLimitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetDiversificationLimitInput) =>
      setDiversificationLimit(input.wallet, input.limitPct),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: DIVERSIFICATION_LIMIT_QUERY_KEY });
      toast.success(`Diversification limit set to ${input.limitPct}%`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to save diversification limit");
    },
  });
}
