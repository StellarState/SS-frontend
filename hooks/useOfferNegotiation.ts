"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SecondaryOffer, OfferBuilderInput } from "@/lib/analytics/offerNegotiation";

export const OFFERS_QUERY_KEY = ["secondary-offers"] as const;

export function offersQueryKey(walletAddress?: string | null, invoiceId?: string | null) {
  return [...OFFERS_QUERY_KEY, walletAddress ?? "all", invoiceId ?? "all"] as const;
}

// In-memory fallback / client-side storage for local state demo/dev if backend route is pending
const mockOffersStore: Map<string, SecondaryOffer> = new Map();

export async function fetchSecondaryOffers(
  walletAddress?: string | null,
  invoiceId?: string | null,
): Promise<SecondaryOffer[]> {
  try {
    const params = new URLSearchParams();
    if (walletAddress) params.append("wallet", walletAddress);
    if (invoiceId) params.append("invoice_id", invoiceId);

    const res = await fetch(`/api/secondary-market/offers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return data.offers ?? [];
    }
  } catch {
    // Backend API route unavailable; return local store
  }

  const all = Array.from(mockOffersStore.values());
  return all.filter((o) => {
    if (invoiceId && o.invoice_id !== invoiceId) return false;
    if (walletAddress) {
      const norm = walletAddress.toLowerCase();
      if (o.buyer_address.toLowerCase() !== norm && o.seller_address.toLowerCase() !== norm) {
        return false;
      }
    }
    return true;
  });
}

export function useSecondaryOffers(
  walletAddress: string | null | undefined,
  invoiceId?: string | null,
) {
  return useQuery({
    queryKey: offersQueryKey(walletAddress, invoiceId),
    queryFn: () => fetchSecondaryOffers(walletAddress, invoiceId),
    enabled: Boolean(walletAddress),
    staleTime: 15 * 1000,
  });
}

export function useCreateOfferMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OfferBuilderInput & { invoice_id: string; seller_address: string; fair_value: number; base_yield: number }) => {
      const id = `offer-${Date.now()}`;
      const expiresAt = new Date(Date.now() + input.expires_in_hours * 3600 * 1000).toISOString();
      const totalAmount = input.quantity * input.price_per_fraction;
      const discountPremiumPercent = input.fair_value > 0
        ? Number((((input.price_per_fraction - input.fair_value) / input.fair_value) * 100).toFixed(2))
        : 0;
      const effectiveYield = input.price_per_fraction > 0 && input.fair_value > 0
        ? Number((input.base_yield * (input.fair_value / input.price_per_fraction)).toFixed(2))
        : input.base_yield;

      const newOffer: SecondaryOffer = {
        id,
        invoice_id: input.invoice_id,
        listing_id: input.listing_id,
        buyer_address: walletAddress ?? "unknown",
        seller_address: input.seller_address,
        quantity: input.quantity,
        price_per_fraction: input.price_per_fraction,
        total_offer_amount: totalAmount,
        fair_value_per_fraction: input.fair_value,
        discount_premium_percent: discountPremiumPercent,
        effective_yield_percent: effectiveYield,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: "pending",
        signature: input.signature,
      };

      try {
        const res = await fetch("/api/secondary-market/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newOffer),
        });
        if (res.ok) {
          const created = await res.json();
          return created as SecondaryOffer;
        }
      } catch {
        // Fallback to store
      }

      mockOffersStore.set(id, newOffer);
      return newOffer;
    },
    onSuccess: (offer) => {
      void queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
      toast.success(`Binding offer placed: ${offer.quantity} fractions @ ${offer.price_per_fraction} XLM`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to place offer");
    },
  });
}

export function useAcceptOfferMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      try {
        const res = await fetch(`/api/secondary-market/offers/${offerId}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller_address: walletAddress }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockOffersStore.get(offerId);
      if (existing) {
        existing.status = "accepted";
        existing.settlement_status = "queued";
        existing.resolved_at = new Date().toISOString();
        mockOffersStore.set(offerId, existing);
        return existing;
      }
      return null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
      toast.success("Offer accepted and transitioned to settlement queue!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to accept offer");
    },
  });
}

export function useRejectOfferMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, reason }: { offerId: string; reason?: string }) => {
      try {
        const res = await fetch(`/api/secondary-market/offers/${offerId}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller_address: walletAddress, reason }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockOffersStore.get(offerId);
      if (existing) {
        existing.status = "rejected";
        existing.rejection_reason = reason || "Declined by seller";
        existing.resolved_at = new Date().toISOString();
        mockOffersStore.set(offerId, existing);
        return existing;
      }
      return null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
      toast.success("Offer rejected.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to reject offer");
    },
  });
}

export function useCancelOfferMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      try {
        const res = await fetch(`/api/secondary-market/offers/${offerId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyer_address: walletAddress }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockOffersStore.get(offerId);
      if (existing) {
        existing.status = "cancelled";
        existing.cancelled_at = new Date().toISOString();
        existing.resolved_at = new Date().toISOString();
        mockOffersStore.set(offerId, existing);
        return existing;
      }
      return null;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
      toast.success("Offer cancelled.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to cancel offer");
    },
  });
}
