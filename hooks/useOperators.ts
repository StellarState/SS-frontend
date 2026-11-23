"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { approveOperator, fetchOperators, revokeOperator, type PayoutOperator } from "@/lib/api";
import { countActiveOperators, MAX_ACTIVE_OPERATORS } from "@/lib/operators";

export const operatorsQueryKey = (wallet: string | null | undefined) =>
  ["operators", wallet ?? null] as const;

/**
 * Approved payout operators for the signed-in investor, with approve and
 * revoke mutations (#591). Revoke is optimistic so the row disappears the
 * moment the user confirms; it is restored if the contract call fails.
 */
export function useOperators() {
  const { address, jwt } = useAuth();
  const queryClient = useQueryClient();
  const key = operatorsQueryKey(address);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchOperators(address!, jwt ?? undefined),
    enabled: Boolean(address),
  });

  const operators = query.data ?? [];
  const activeCount = countActiveOperators(operators);

  const approve = useMutation({
    mutationFn: ({ operator, expiresAt }: { operator: string; expiresAt: string }) => {
      if (!address) throw new Error("Connect your wallet first");
      const current = queryClient.getQueryData<PayoutOperator[]>(key) ?? [];
      if (countActiveOperators(current) >= MAX_ACTIVE_OPERATORS) {
        throw new Error(`You can have at most ${MAX_ACTIVE_OPERATORS} active operators`);
      }
      return approveOperator(address, operator, expiresAt, jwt ?? undefined);
    },
    onSuccess: (created) => {
      queryClient.setQueryData<PayoutOperator[]>(key, (prev = []) => [
        ...prev.filter((op) => op.address !== created.address),
        created,
      ]);
      toast.success("Operator approved");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error: Error) => toast.error(error.message || "Could not approve operator"),
  });

  const revoke = useMutation({
    mutationFn: (operator: string) => {
      if (!address) throw new Error("Connect your wallet first");
      return revokeOperator(address, operator, jwt ?? undefined);
    },
    onMutate: async (operator) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PayoutOperator[]>(key);
      queryClient.setQueryData<PayoutOperator[]>(key, (prev = []) =>
        prev.filter((op) => op.address !== operator),
      );
      return { previous };
    },
    onError: (error: Error, _operator, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error.message || "Could not revoke operator");
    },
    onSuccess: () => toast.success("Operator revoked"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    ...query,
    operators,
    activeCount,
    limitReached: activeCount >= MAX_ACTIVE_OPERATORS,
    approve,
    revoke,
  };
}
