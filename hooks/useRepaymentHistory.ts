"use client";
import { useQuery } from "@tanstack/react-query";

export type RepaymentStatus = "received" | "matched" | "distributed";

export interface RepaymentEvent {
  id: string;
  amount: number;
  timestamp: string;
  status: RepaymentStatus;
  txHash: string;
  matchedAmount: number;
  distributedAmount: number;
}

export interface RepaymentHistoryResponse {
  events: RepaymentEvent[];
  totalReceived: number;
  amountDue: number;
}

export const repaymentHistoryQueryKey = (invoiceId: string) =>
  ["repayment-history", invoiceId] as const;

async function fetchRepaymentHistory(
  invoiceId: string
): Promise<RepaymentHistoryResponse> {
  const res = await fetch(`/api/invoices/${invoiceId}/repayments`);
  if (!res.ok) throw new Error("Failed to fetch repayment history");
  return res.json();
}

export function useRepaymentHistory(invoiceId: string) {
  return useQuery({
    queryKey: repaymentHistoryQueryKey(invoiceId),
    queryFn: () => fetchRepaymentHistory(invoiceId),
    enabled: Boolean(invoiceId),
    staleTime: 30 * 1000,
  });
}
