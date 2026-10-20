"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAuction,
  fetchAuctionBids,
  fetchAuctionSettlement,
  placeBid,
} from "@/lib/api";
import { AUCTION_POLL_INTERVAL_MS } from "@/lib/auction";

export const AUCTION_QUERY_KEY = ["marketplace", "auction"] as const;

export function useAuction(auctionId: string | null | undefined) {
  return useQuery({
    queryKey: [...AUCTION_QUERY_KEY, auctionId],
    queryFn: ({ signal }) => fetchAuction(auctionId as string, signal),
    enabled: Boolean(auctionId),
  });
}

/**
 * The live bid list. Refreshes every 10 seconds so the price a bidder sees
 * is never more than one poll behind.
 */
export function useAuctionBids(auctionId: string | null | undefined) {
  return useQuery({
    queryKey: [...AUCTION_QUERY_KEY, auctionId, "bids"],
    queryFn: ({ signal }) => fetchAuctionBids(auctionId as string, signal),
    enabled: Boolean(auctionId),
    refetchInterval: AUCTION_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });
}

export function useAuctionSettlement(auctionId: string | null | undefined) {
  return useQuery({
    queryKey: [...AUCTION_QUERY_KEY, auctionId, "settlement"],
    queryFn: ({ signal }) => fetchAuctionSettlement(auctionId as string, signal),
    enabled: Boolean(auctionId),
  });
}

export function usePlaceBidMutation(auctionId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: number; wallet: string }) =>
      placeBid({ auction_id: auctionId as string, amount: input.amount, wallet: input.wallet }),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: AUCTION_QUERY_KEY });
      toast.success(`Bid placed at ${input.amount.toFixed(2)} XLM per fraction`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to place bid");
    },
  });
}
