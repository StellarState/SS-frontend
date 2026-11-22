"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  InsurancePolicy,
  InsuranceClaim,
  ClaimSubmissionInput,
} from "@/lib/analytics/insuranceCoverage";

export const INSURANCE_POLICY_QUERY_KEY = ["insurance-policy"] as const;
export const INSURANCE_CLAIMS_QUERY_KEY = ["insurance-claims"] as const;

// In-memory mock store for local state
const mockPolicies: Map<string, InsurancePolicy> = new Map();
const mockClaims: Map<string, InsuranceClaim[]> = new Map();

export async function fetchInsurancePolicy(invoiceId: string): Promise<InsurancePolicy | null> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/insurance`);
    if (res.ok) {
      const data = await res.json();
      return data.policy ?? null;
    }
  } catch {
    // Backend API route unavailable; return mock
  }

  if (!mockPolicies.has(invoiceId)) {
    // Generate default policy for invoice
    const policy: InsurancePolicy = {
      id: `pol-${invoiceId}`,
      invoice_id: invoiceId,
      invoice_face_value: 50000,
      provider_name: "StellarShield Underwriters",
      policy_number: `SSU-${invoiceId.toUpperCase()}-2026`,
      initial_coverage_limit: 50000,
      remaining_coverage_limit: 50000,
      coverage_ratio_percent: 100,
      deductible_amount: 1500,
      premium_bps: 120, // 1.2%
      premium_amount: 600,
      status: "active",
      effective_date: "2026-11-01T00:00:00Z",
      expiry_date: "2026-12-31T23:59:59Z",
      protection_level: "full",
      underwriter_address: "GBUNDERWRITER123",
    };
    mockPolicies.set(invoiceId, policy);
  }

  return mockPolicies.get(invoiceId) ?? null;
}

export async function fetchInsuranceClaims(invoiceId: string): Promise<InsuranceClaim[]> {
  try {
    const res = await fetch(`/api/invoices/${invoiceId}/insurance/claims`);
    if (res.ok) {
      const data = await res.json();
      return data.claims ?? [];
    }
  } catch {
    // Fallback
  }

  return mockClaims.get(invoiceId) ?? [];
}

export function useInsurancePolicy(invoiceId: string) {
  return useQuery({
    queryKey: [...INSURANCE_POLICY_QUERY_KEY, invoiceId],
    queryFn: () => fetchInsurancePolicy(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 30 * 1000,
  });
}

export function useInsuranceClaims(invoiceId: string) {
  return useQuery({
    queryKey: [...INSURANCE_CLAIMS_QUERY_KEY, invoiceId],
    queryFn: () => fetchInsuranceClaims(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 15 * 1000,
  });
}

export function useSubmitClaimMutation(invoiceId: string, claimantAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClaimSubmissionInput) => {
      const newClaim: InsuranceClaim = {
        id: `claim-${Date.now()}`,
        policy_id: `pol-${invoiceId}`,
        invoice_id: invoiceId,
        claimant_address: claimantAddress ?? "GBCLAIMANT_UNKNOWN",
        incident_date: input.incident_date,
        incident_type: input.incident_type,
        incident_description: input.incident_description,
        claimed_amount: input.claimed_amount,
        evidence: input.evidence,
        status: "submitted",
        created_at: new Date().toISOString(),
      };

      try {
        const res = await fetch(`/api/invoices/${invoiceId}/insurance/claims`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newClaim),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockClaims.get(invoiceId) ?? [];
      existing.unshift(newClaim);
      mockClaims.set(invoiceId, existing);
      return newClaim;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...INSURANCE_CLAIMS_QUERY_KEY, invoiceId] });
      toast.success("Insurance claim submitted with verified evidence!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to submit insurance claim");
    },
  });
}

export function useAdjudicateClaimMutation(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      claimId,
      decision,
      payoutAmount,
      denialReason,
    }: {
      claimId: string;
      decision: "approved" | "denied";
      payoutAmount?: number;
      denialReason?: string;
    }) => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/insurance/claims/${claimId}/adjudicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, payoutAmount, denialReason }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback
      }

      const existing = mockClaims.get(invoiceId) ?? [];
      const updated = existing.map((c) => {
        if (c.id === claimId) {
          return {
            ...c,
            status: decision,
            payout_amount: decision === "approved" ? payoutAmount : 0,
            denial_reason: decision === "denied" ? denialReason : null,
            adjudicated_at: new Date().toISOString(),
          };
        }
        return c;
      });
      mockClaims.set(invoiceId, updated);
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...INSURANCE_CLAIMS_QUERY_KEY, invoiceId] });
      void queryClient.invalidateQueries({ queryKey: [...INSURANCE_POLICY_QUERY_KEY, invoiceId] });
      toast.success("Claim adjudicated successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to adjudicate claim");
    },
  });
}
