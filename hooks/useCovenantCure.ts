"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CovenantBreach,
  CureProposal,
  CovenantTimelineEvent,
  CreateProposalInput,
} from "@/lib/analytics/covenantCure";

export const COVENANT_QUERY_KEY = ["covenant-breaches"] as const;
export const PROPOSALS_QUERY_KEY = ["covenant-proposals"] as const;
export const TIMELINE_QUERY_KEY = ["covenant-timeline"] as const;

// In-memory mock store
const mockBreaches: Map<string, CovenantBreach> = new Map();
const mockProposals: Map<string, CureProposal[]> = new Map();
const mockTimeline: Map<string, CovenantTimelineEvent[]> = new Map();

export async function fetchCovenantBreach(invoiceId: string): Promise<CovenantBreach | null> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/covenants/breach`);
    if (res.ok) {
      const data = await res.json();
      return data.breach ?? null;
    }
  } catch {
    // API route unavailable; return mock
  }

  if (!mockBreaches.has(invoiceId)) {
    const breach: CovenantBreach = {
      id: `breach-${invoiceId}`,
      invoice_id: invoiceId,
      issuer_address: "GBISSUER123",
      covenant_name: "Minimum Debt Service Coverage Ratio (DSCR)",
      threshold_metric: "DSCR Ratio >= 1.25",
      threshold_value: 1.25,
      actual_value: 1.10,
      breach_detected_at: "2026-11-15T08:00:00Z",
      status: "in_breach",
      cure_deadline: "2026-12-05T00:00:00Z",
    };
    mockBreaches.set(invoiceId, breach);

    mockTimeline.set(invoiceId, [
      {
        id: `ev-init-${invoiceId}`,
        breach_id: breach.id,
        timestamp: "2026-11-15T08:00:00Z",
        event_type: "breach_detected",
        title: "Covenant Breach Detected",
        details: "Actual DSCR 1.10 fell below required threshold 1.25. 20-day cure period commenced.",
        actor_address: "Protocol Monitor",
      },
    ]);
  }

  return mockBreaches.get(invoiceId) ?? null;
}

export async function fetchCureProposals(invoiceId: string): Promise<CureProposal[]> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/covenants/proposals`);
    if (res.ok) {
      const data = await res.json();
      return data.proposals ?? [];
    }
  } catch {
    // Fallback
  }

  return mockProposals.get(invoiceId) ?? [];
}

export async function fetchCovenantTimeline(invoiceId: string): Promise<CovenantTimelineEvent[]> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/covenants/timeline`);
    if (res.ok) {
      const data = await res.json();
      return data.events ?? [];
    }
  } catch {
    // Fallback
  }

  return mockTimeline.get(invoiceId) ?? [];
}

export function useCovenantBreach(invoiceId: string) {
  return useQuery({
    queryKey: [...COVENANT_QUERY_KEY, invoiceId],
    queryFn: () => fetchCovenantBreach(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 30 * 1000,
  });
}

export function useCureProposals(invoiceId: string) {
  return useQuery({
    queryKey: [...PROPOSALS_QUERY_KEY, invoiceId],
    queryFn: () => fetchCureProposals(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 15 * 1000,
  });
}

export function useCovenantTimeline(invoiceId: string) {
  return useQuery({
    queryKey: [...TIMELINE_QUERY_KEY, invoiceId],
    queryFn: () => fetchCovenantTimeline(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 15 * 1000,
  });
}

export function useCreateCureProposalMutation(invoiceId: string, issuerAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      const durationDays = input.voting_duration_days ?? 7;
      const deadline = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString();

      const newProposal: CureProposal = {
        id: `prop-${Date.now()}`,
        breach_id: input.breach_id,
        invoice_id: invoiceId,
        issuer_address: issuerAddress ?? "GBISSUER123",
        cure_type: input.cure_type,
        title: input.title,
        description: input.description,
        proposed_terms: input.proposed_terms,
        evidence_urls: input.evidence_urls ?? [],
        voting_deadline: deadline,
        quorum_percent_required: 50.0,
        approval_threshold_percent: 66.67,
        total_eligible_principal: 100000,
        voted_principal_for: 0,
        voted_principal_against: 0,
        voters: {},
        status: "active",
        created_at: new Date().toISOString(),
      };

      try {
        const res = await fetch(`/api/invoices/${invoiceId}/covenants/proposals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProposal),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockProposals.get(invoiceId) ?? [];
      existing.unshift(newProposal);
      mockProposals.set(invoiceId, existing);

      // Add to timeline
      const timeline = mockTimeline.get(invoiceId) ?? [];
      timeline.push({
        id: `ev-prop-${Date.now()}`,
        breach_id: input.breach_id,
        timestamp: new Date().toISOString(),
        event_type: "cure_proposed",
        title: `Cure Proposed: ${input.title} (${input.cure_type.toUpperCase()})`,
        details: input.description,
        actor_address: issuerAddress,
      });
      mockTimeline.set(invoiceId, timeline);

      // Update breach status
      const b = mockBreaches.get(invoiceId);
      if (b) {
        b.status = "cure_proposed";
        mockBreaches.set(invoiceId, b);
      }

      return newProposal;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...PROPOSALS_QUERY_KEY, invoiceId] });
      void queryClient.invalidateQueries({ queryKey: [...TIMELINE_QUERY_KEY, invoiceId] });
      void queryClient.invalidateQueries({ queryKey: [...COVENANT_QUERY_KEY, invoiceId] });
      toast.success("Covenant cure proposal published for investor voting!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to publish cure proposal");
    },
  });
}

export function useCastVoteMutation(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposalId,
      voterAddress,
      vote,
      eligiblePrincipal,
    }: {
      proposalId: string;
      voterAddress: string;
      vote: "for" | "against";
      eligiblePrincipal: number;
    }) => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/covenants/proposals/${proposalId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voterAddress, vote, eligiblePrincipal }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockProposals.get(invoiceId) ?? [];
      const updated = existing.map((p) => {
        if (p.id === proposalId) {
          const norm = voterAddress.toLowerCase();
          const voters = {
            ...p.voters,
            [norm]: { vote, principal: eligiblePrincipal, voted_at: new Date().toISOString() },
          };
          return {
            ...p,
            voted_principal_for: vote === "for" ? p.voted_principal_for + eligiblePrincipal : p.voted_principal_for,
            voted_principal_against:
              vote === "against" ? p.voted_principal_against + eligiblePrincipal : p.voted_principal_against,
            voters,
          };
        }
        return p;
      });
      mockProposals.set(invoiceId, updated);
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...PROPOSALS_QUERY_KEY, invoiceId] });
      toast.success("Principal-weighted vote cast successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to cast vote");
    },
  });
}
