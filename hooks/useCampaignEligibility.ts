"use client";

import { useMemo } from "react";
import { useActiveCampaigns } from "@/hooks/useActiveCampaigns";
import {
  evaluateCampaign,
  type CampaignEligibility,
} from "@/lib/promotions";

/**
 * Resolves the offer for a wallet from the single shared campaign query.
 * Pass `now` in tests to make expiry deterministic.
 */
export function useCampaignEligibility(
  wallet?: string | null,
  now?: number
): CampaignEligibility & { isLoading: boolean } {
  const { data, isLoading } = useActiveCampaigns();
  const evaluated = useMemo(
    () => evaluateCampaign(data ?? [], wallet, now),
    [data, wallet, now]
  );
  return { ...evaluated, isLoading };
}
