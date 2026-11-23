"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchActiveCampaigns } from "@/lib/api/campaigns";
import { queryKeys } from "@/lib/queryKeys";

/** One campaign query for the whole marketplace, including its modals. */
export function useActiveCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: fetchActiveCampaigns,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
