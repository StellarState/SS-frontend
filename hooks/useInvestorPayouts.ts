"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvestorPayouts } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

/** Shared payout query used by the dashboard card and portfolio tab. */
export function useInvestorPayouts() {
  return useInfiniteQuery({
    queryKey: queryKeys.investorPayouts,
    queryFn: ({ pageParam }) => fetchInvestorPayouts(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.has_more ? (last.next_cursor ?? undefined) : undefined,
  });
}
