"use client";
/**
 * Per-invoice jurisdiction eligibility check (#618).
 *
 * Returns whether the connected investor is eligible to invest in a given
 * invoice, the reason when ineligible, the allowed regions list for restricted
 * invoices, and the investor's registered region.
 */
import { useQuery } from "@tanstack/react-query";

export type EligibilityStatus = "eligible" | "not_eligible" | "region_not_set";

export interface InvoiceEligibilityData {
  eligible: boolean;
  reason?: string;
  allowedRegions?: string[];
  investorRegion?: string | null;
}

export interface InvoiceEligibilityResult {
  status: EligibilityStatus;
  data: InvoiceEligibilityData | undefined;
  isLoading: boolean;
  error: Error | null;
}

async function fetchInvoiceEligibility(
  invoiceId: string,
): Promise<InvoiceEligibilityData> {
  const res = await fetch(`/api/invoices/${invoiceId}/eligibility`);
  if (!res.ok) throw new Error("Failed to fetch eligibility");
  return res.json() as Promise<InvoiceEligibilityData>;
}

export function useInvoiceEligibility(
  invoiceId: string,
): InvoiceEligibilityResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice-eligibility", invoiceId],
    queryFn: () => fetchInvoiceEligibility(invoiceId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  let status: EligibilityStatus = "eligible";
  if (data) {
    if (data.eligible) {
      status = "eligible";
    } else if (data.investorRegion == null) {
      status = "region_not_set";
    } else {
      status = "not_eligible";
    }
  }

  return { status, data, isLoading, error: error as Error | null };
}
