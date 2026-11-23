"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithholding } from "@/lib/api/withholding";
import { queryKeys } from "@/lib/queryKeys";

export function useWithholding() {
  return useQuery({
    queryKey: queryKeys.withholding,
    queryFn: fetchWithholding,
    staleTime: 5 * 60_000,
  });
}
