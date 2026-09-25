"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buyResaleListing,
  cancelResaleListing,
  createResaleListing,
  fetchResaleListings,
} from "@/lib/api";
import { toast } from "sonner";
import { PORTFOLIO_QUERY_KEY } from "./usePortfolio";

export function resaleListingsQueryKey(invoiceId: string) {
  return ["resale-listings", invoiceId] as const;
}

export function useResaleListings(invoiceId: string) {
  return useQuery({
    queryKey: resaleListingsQueryKey(invoiceId),
    queryFn: () => fetchResaleListings(invoiceId),
  });
}

interface CreateListingVars {
  invoiceId: string;
  shares: number;
  pricePerShare: number;
}

export function useCreateResaleListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, shares, pricePerShare }: CreateListingVars) =>
      createResaleListing(invoiceId, shares, pricePerShare),

    onSuccess: (_data, { invoiceId }) => {
      toast.success("Listing created successfully");
      queryClient.invalidateQueries({ queryKey: resaleListingsQueryKey(invoiceId) });
    },

    onError: () => {
      toast.error("Failed to create listing");
    },
  });
}

interface ListingActionVars {
  invoiceId: string;
  listingId: string;
}

export function useCancelResaleListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, listingId }: ListingActionVars) =>
      cancelResaleListing(invoiceId, listingId),

    onSuccess: (_data, { invoiceId }) => {
      toast.success("Listing cancelled");
      queryClient.invalidateQueries({ queryKey: resaleListingsQueryKey(invoiceId) });
    },

    onError: () => {
      toast.error("Failed to cancel listing");
    },
  });
}

export function useBuyResaleListingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, listingId }: ListingActionVars) =>
      buyResaleListing(invoiceId, listingId),

    onSuccess: (_data, { invoiceId }) => {
      toast.success("Shares purchased successfully");
      queryClient.invalidateQueries({ queryKey: resaleListingsQueryKey(invoiceId) });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },

    onError: () => {
      toast.error("Failed to buy shares");
    },
  });
}
